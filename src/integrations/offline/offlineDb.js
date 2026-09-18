/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Generic IndexedDB (Dexie.js) store for the offline data-collection core.
 *
 * Unlike procest's bespoke six-table schema, this store is keyed by
 * `register` + `schema` so ANY consuming app can cache its planned objects and
 * queue mutations through one shared database. Three generic tables:
 *
 *  - `objectCache`   — cached OpenRegister objects (the planned items plus any
 *                      reference data, e.g. checklist templates). Each row is a
 *                      `{ key, register, schema, collection, objectId, object }`
 *                      envelope so multiple apps/schemas never collide.
 *  - `mutationQueue` — the offline sync queue: one row per pending create /
 *                      update / delete to be replayed against the OR object API.
 *  - `meta`          — singleton rows (per-collection planning state / expiry).
 *
 * Dexie is imported here only — the pure engine (`syncQueueEngine.js`) and the
 * pure helpers carry the unit-test surface and import nothing from this module,
 * so they stay importable in a Node environment with no IndexedDB. Tests for
 * THIS module inject a fake-indexeddb-backed Dexie via `__setDexie`.
 *
 * Dexie is a REQUIRED peer dependency, not an optional one. It reads as though
 * only apps using the offline core need it, but the import below is static and
 * this module is reachable from the package root: `src/index.js` exports
 * `offlineCollection`, which reaches `integrations/builtin/field-inspection`,
 * which reaches here. Every consumer therefore has to resolve `dexie` at BUILD
 * time whether or not it ever collects a field inspection. Declaring it
 * optional told npm not to install it and not to warn, which is the shape that
 * fails as a bare "Module not found" in someone else's build. Making the import
 * dynamic is what would earn the optional marker back.
 *
 * @module integrations/offline/offlineDb
 */

import Dexie from 'dexie'
import { resolveConflictChoice } from './syncQueueEngine.js'

const DB_NAME = 'conduction-offline-collection'

let dbInstance = null
let DexieCtor = Dexie

/**
 * Build the composite cache key for an object.
 *
 * @param {string} register   Register slug or id.
 * @param {string} schema     Schema slug or id.
 * @param {string} collection Logical collection name (e.g. 'planning', 'templates').
 * @param {string} objectId   The object id.
 *
 * @return {string} A stable composite key.
 */
export function cacheKey(register, schema, collection, objectId) {
	return `${register}::${schema}::${collection}::${objectId}`
}

/**
 * Set the Dexie constructor explicitly (test seam / SSR override).
 *
 * Production code never calls this — `getDb()` lazy-imports `dexie`. Tests pass
 * a fake-indexeddb-backed Dexie so the store can be exercised in Node.
 *
 * @param {new (name: string) => object} ctor The Dexie class.
 *
 * @return {void}
 */
export function __setDexie(ctor) {
	DexieCtor = ctor
	dbInstance = null
}

/**
 * Open (and memoise) the Dexie database.
 *
 * @return {object} The opened database handle.
 *
 * @throws {Error} When Dexie is not available and was not injected.
 */
export function getDb() {
	if (dbInstance !== null) {
		return dbInstance
	}

	const db = new DexieCtor(DB_NAME)
	db.version(1).stores({
		// Composite key + indexes so a single DB serves every app/schema.
		objectCache: 'key, register, schema, collection, objectId',
		mutationQueue: 'id, deviceId, status, queuedAt, register, schema',
		meta: 'key',
	})

	dbInstance = db
	return db
}

/**
 * Persist a downloaded planning payload into the local cache atomically.
 *
 * Stores the planned items as one collection and any reference data
 * (e.g. checklist templates) as a second collection, plus a per-collection
 * planning meta row recording the offline-ready expiry. Every write happens in
 * one Dexie transaction so a connection drop mid-write never leaves the cache
 * half-populated.
 *
 * @param {object}   args               Planning storage arguments.
 * @param {string}   args.register      Register slug or id.
 * @param {string}   args.schema        Schema slug of the planned items.
 * @param {Array}    args.items         The planned objects to cache.
 * @param {Array}    [args.references]  Optional reference objects (templates).
 * @param {string}   [args.referenceSchema] Schema slug of the references.
 * @param {string}   [args.collection]  Planning collection name (default 'planning').
 * @param {object}   [args.manifest]    Optional download manifest.
 * @param {number}   [args.ttlMs]       Offline lifetime (default 24h).
 *
 * @return {Promise<void>} Resolves when the planning is stored.
 */
export async function storePlanning({
	register,
	schema,
	items = [],
	references = [],
	referenceSchema = null,
	collection = 'planning',
	manifest = null,
	ttlMs = 24 * 60 * 60 * 1000,
}) {
	const db = getDb()
	const planned = Array.isArray(items) ? items : []
	const refs = Array.isArray(references) ? references : []
	const refSchema = referenceSchema || schema
	const expiresAt = new Date(Date.now() + ttlMs).toISOString()

	const objectIdOf = (obj) => String(obj?.id ?? obj?.['@self']?.id ?? obj?.uuid ?? '')

	const cacheRows = planned
		.filter((obj) => objectIdOf(obj) !== '')
		.map((obj) => ({
			key: cacheKey(register, schema, collection, objectIdOf(obj)),
			register,
			schema,
			collection,
			objectId: objectIdOf(obj),
			object: obj,
		}))

	const refRows = refs
		.filter((obj) => objectIdOf(obj) !== '')
		.map((obj) => ({
			key: cacheKey(register, refSchema, 'references', objectIdOf(obj)),
			register,
			schema: refSchema,
			collection: 'references',
			objectId: objectIdOf(obj),
			object: obj,
		}))

	await db.transaction('rw', db.objectCache, db.meta, async () => {
		await db.objectCache.bulkPut(cacheRows.concat(refRows))
		await db.meta.put({
			key: `planning::${register}::${schema}::${collection}`,
			register,
			schema,
			collection,
			status: 'ready_offline',
			expiresAt,
			syncedAt: new Date().toISOString(),
			count: cacheRows.length,
			manifest,
		})
	})
}

/**
 * Read the cached planned items for a register/schema/collection.
 *
 * @param {string} register   Register slug or id.
 * @param {string} schema     Schema slug.
 * @param {string} [collection] Collection name (default 'planning').
 *
 * @return {Promise<Array>} The cached objects (unwrapped from the envelope).
 */
export async function getPlannedItems(register, schema, collection = 'planning') {
	const db = getDb()
	const rows = await db.objectCache
		.where('collection').equals(collection)
		.and((row) => row.register === register && row.schema === schema)
		.toArray()
	return rows.map((row) => row.object)
}

/**
 * Read a single cached object by id.
 *
 * @param {string} register   Register slug or id.
 * @param {string} schema     Schema slug.
 * @param {string} collection Collection name.
 * @param {string} objectId   The object id.
 *
 * @return {Promise<object|null>} The cached object, or null.
 */
export async function getCachedObject(register, schema, collection, objectId) {
	const db = getDb()
	const row = await db.objectCache.get(cacheKey(register, schema, collection, objectId))
	return row ? row.object : null
}

/**
 * Read the planning meta row (or null when never synced) for a collection.
 *
 * @param {string} register   Register slug or id.
 * @param {string} schema     Schema slug.
 * @param {string} [collection] Collection name (default 'planning').
 *
 * @return {Promise<object|null>} The planning meta row.
 */
export async function getPlanningMeta(register, schema, collection = 'planning') {
	const db = getDb()
	return (await db.meta.get(`planning::${register}::${schema}::${collection}`)) ?? null
}

/**
 * Enqueue one offline mutation against the OR object API.
 *
 * @param {object} operation                  The mutation operation.
 * @param {string} operation.deviceId         Owning device id (IDOR scope).
 * @param {string} operation.operationType    create / update / delete.
 * @param {string} operation.register         Target register slug or id.
 * @param {string} operation.schema           Target schema slug or id.
 * @param {string} [operation.targetId]       Existing object id (update/delete).
 * @param {object} [operation.payload]        The object body (create/update).
 *
 * @return {Promise<string>} The queued operation id.
 */
export async function enqueueMutation(operation) {
	const db = getDb()
	const id = operation.id || `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	await db.mutationQueue.put({
		id,
		deviceId: operation.deviceId,
		operationType: operation.operationType,
		register: operation.register,
		schema: operation.schema,
		targetId: operation.targetId ?? null,
		payload: operation.payload ?? {},
		queuedAt: operation.queuedAt || new Date().toISOString(),
		attemptCount: 0,
		status: 'pending',
	})
	return id
}

/**
 * Count all queue operations not yet synced — drives the pending badge.
 *
 * @param {string} [deviceId] Optional device scope.
 *
 * @return {Promise<number>} The number of pending/conflict/syncing operations.
 */
export async function countPending(deviceId) {
	const db = getDb()
	let collection = db.mutationQueue.where('status').anyOf(['pending', 'conflict', 'syncing'])
	if (typeof deviceId === 'string' && deviceId !== '') {
		collection = collection.and((op) => op.deviceId === deviceId)
	}
	return await collection.count()
}

/**
 * Every queued operation, in the order they will replay.
 *
 * 🔴 INCLUDING THE FAILED ONES, WHICH IS THE POINT. `countPending()` counts
 * `pending`, `conflict` and `syncing` and leaves `failed` out, so an operation
 * that exhausted its retries or lost its permission drops out of the badge
 * entirely. The row is still on the device; nothing tells anybody. An
 * inspection a citizen stood beside somebody to give is then stranded in one
 * browser's IndexedDB with no reader, which is worse than having refused it at
 * the door.
 *
 * FIFO by `queuedAt`, the same order the replay loop uses, so the list reads
 * as what will happen next rather than as a set.
 *
 * @param {string} [deviceId] Optional device scope.
 *
 * @return {Promise<object[]>} Every operation, oldest first.
 */
export async function listQueue(deviceId) {
	const db = getDb()
	let collection = db.mutationQueue.orderBy('queuedAt')
	if (typeof deviceId === 'string' && deviceId !== '') {
		collection = collection.and((op) => op.deviceId === deviceId)
	}

	return await collection.toArray()
}

/**
 * How many operations will not replay again without somebody acting.
 *
 * Counted apart from `countPending()` rather than folded into it: "12 waiting"
 * and "12 waiting, 1 stuck" are different sentences, and a surface that adds
 * them together says neither. Nothing is ever dropped to make this number
 * smaller.
 *
 * @param {string} [deviceId] Optional device scope.
 *
 * @return {Promise<number>} The number of failed operations.
 */
export async function countStuck(deviceId) {
	const db = getDb()
	let collection = db.mutationQueue.where('status').equals('failed')
	if (typeof deviceId === 'string' && deviceId !== '') {
		collection = collection.and((op) => op.deviceId === deviceId)
	}

	return await collection.count()
}

/**
 * Put a failed operation back in the queue, by hand.
 *
 * 🔴 BY HAND, AND NEVER AUTOMATICALLY. `failed` is terminal for the replay
 * loop on purpose: an operation the server refused five times will be refused
 * a sixth, and a queue that retries forever is a queue that never drains. But
 * terminal must not mean forgotten, so somebody who has fixed whatever the
 * server was complaining about can ask for it again, and the attempt count
 * starts over.
 *
 * It does NOT reset a `permission_lost` row. The right to write is gone and
 * retrying cannot bring it back; offering the button would be offering a
 * gesture that fails every time.
 *
 * @param {string} operationId The operation to retry.
 *
 * @return {Promise<boolean>} True when it was re-queued.
 */
export async function requeueOperation(operationId) {
	const db = getDb()
	const operation = await db.mutationQueue.get(operationId)
	if (!operation || operation.status !== 'failed') {
		return false
	}

	if (operation.lastError === 'permission_lost') {
		return false
	}

	await db.mutationQueue.update(operationId, {
		status: 'pending',
		attemptCount: 0,
		lastError: null,
	})

	return true
}

/**
 * The prefix of a conflict-record operation's id.
 *
 * Derived from the id of the operation that conflicted, so the record is
 * idempotent by construction: a second drain of the same conflicting row
 * computes the same id and finds it already there.
 */
export const CONFLICT_RECORD_PREFIX = 'conflict-'

/**
 * Write a classified conflict to the register as an object of its own.
 *
 * A conflict kept only in this browser's IndexedDB is invisible to everyone who
 * could act on it: the colleague whose edit collided, the supervisor who has to
 * decide, the audit that has to show the decision was taken at all. So the
 * conflict becomes an OpenRegister object, carrying both versions and a
 * reference back to the queue row.
 *
 * The write goes through the queue rather than straight to the network, because
 * the moment a conflict is classified is exactly the moment the connection is
 * unreliable. It replays with everything else.
 *
 * It is written ONCE. The record's id is derived from the conflicting
 * operation's id, so a second drain finds it and leaves it alone rather than
 * filing the same collision twice under two ids.
 *
 * With no `conflictSchema` configured nothing is written, and the queue row is
 * marked so the list can say plainly that this conflict is local to this
 * device. Silently keeping it would be the worse half of both options.
 *
 * @param {object}      args               Recording arguments.
 * @param {object}      args.operation     The queue row that conflicted.
 * @param {string}      args.conflictType  concurrent_edit / deleted_remote / permission_lost.
 * @param {object|null} [args.serverObject] The server's version, when it sent one.
 * @param {string}      [args.register]    Register to write the record to (default: the operation's).
 * @param {string}      [args.conflictSchema] Schema holding conflict records.
 *
 * @return {Promise<string|null>} The record operation id, or null when nothing was written.
 */
export async function recordConflict({
	operation,
	conflictType,
	serverObject = null,
	register = '',
	conflictSchema = '',
}) {
	const db = getDb()

	if (typeof conflictSchema !== 'string' || conflictSchema === '') {
		await db.mutationQueue.update(operation.id, { conflictScope: 'local', conflictType })
		return null
	}

	const recordId = `${CONFLICT_RECORD_PREFIX}${operation.id}`
	const existing = await db.mutationQueue.get(recordId)
	if (existing !== undefined) {
		return recordId
	}

	await enqueueMutation({
		id: recordId,
		deviceId: operation.deviceId,
		operationType: 'create',
		register: register || operation.register,
		schema: conflictSchema,
		payload: {
			queueOperationId: operation.id,
			conflictType,
			deviceId: operation.deviceId,
			targetRegister: operation.register,
			targetSchema: operation.schema,
			targetId: operation.targetId ?? null,
			clientVersion: operation.payload ?? {},
			serverVersion: serverObject ?? null,
			detectedAt: new Date().toISOString(),
		},
	})

	await db.mutationQueue.update(operation.id, {
		conflictScope: 'register',
		conflictType,
		conflictRecordId: recordId,
		serverVersion: serverObject ?? null,
	})

	return recordId
}

/**
 * Write the resolution onto the conflict object, wherever it currently is.
 *
 * Still queued: its payload is amended in place, so it reaches the register
 * already carrying the decision. Already sent: a follow-up `update` is queued
 * against the id the server gave it. Never sent at all (no schema configured):
 * there is nothing to write to, and the queue row keeps the decision.
 *
 * @param {object} db          The Dexie handle.
 * @param {object} operation   The conflicting queue row.
 * @param {string} resolution  The choice made.
 * @param {string} resolvedBy  The uid settling it.
 *
 * @return {Promise<void>} Nothing.
 */
async function recordResolutionOnConflictObject(db, operation, resolution, resolvedBy) {
	const recordId = operation.conflictRecordId
	if (typeof recordId !== 'string' || recordId === '') {
		return
	}

	const record = await db.mutationQueue.get(recordId)
	if (record === undefined) {
		return
	}

	const decision = { resolution, resolvedBy, resolvedAt: new Date().toISOString() }

	if (record.status !== 'synced') {
		await db.mutationQueue.update(recordId, { payload: { ...(record.payload ?? {}), ...decision } })
		return
	}

	const serverId = String(record.serverObjectId ?? '')
	if (serverId === '') {
		return
	}

	await enqueueMutation({
		id: `${recordId}-resolution`,
		deviceId: record.deviceId,
		operationType: 'update',
		register: record.register,
		schema: record.schema,
		targetId: serverId,
		payload: { ...(record.payload ?? {}), ...decision },
	})
}

/**
 * Apply a person's conflict resolution to the queue and to the record.
 *
 * The decision itself is the pure engine's (`resolveConflictChoice`); this puts
 * the result where it has to live. Three things happen, and the third is the
 * one that is easy to forget:
 *
 *  1. The queue row takes the engine's patch, so keep-mine replays and
 *     keep-theirs stops.
 *  2. Keep theirs leaves the local cache holding the SERVER's version. Marking
 *     the row synced while the device still shows the abandoned local text is
 *     how somebody reads their own discarded answer as the current record.
 *  3. The resolution, who made it and when are written onto the conflict
 *     object. A conflict record that says a collision happened and not how it
 *     was settled cannot answer the only question anybody asks later.
 *
 * @param {object} args              Resolution arguments.
 * @param {string} args.operationId  The conflicting queue row.
 * @param {string} args.resolution   client_wins / server_wins / manual_merge.
 * @param {object} [args.mergedPayload] The merged body, for a manual merge.
 * @param {string} [args.resolvedBy] The uid settling it.
 *
 * @return {Promise<boolean>} True when a conflict was resolved.
 */
export async function applyConflictResolution({
	operationId,
	resolution,
	mergedPayload = null,
	resolvedBy = '',
}) {
	const db = getDb()
	const operation = await db.mutationQueue.get(operationId)

	if (operation === undefined || operation.status !== 'conflict') {
		return false
	}

	const { patch } = resolveConflictChoice(resolution, mergedPayload)
	await db.mutationQueue.update(operationId, {
		...patch,
		resolution,
		resolvedBy,
		resolvedAt: new Date().toISOString(),
	})

	if (resolution === 'server_wins' && operation.serverVersion !== null && operation.serverVersion !== undefined) {
		const objectId = String(operation.targetId ?? '')
		if (objectId !== '') {
			await db.objectCache.put({
				key: cacheKey(operation.register, operation.schema, 'planning', objectId),
				register: operation.register,
				schema: operation.schema,
				collection: 'planning',
				objectId,
				object: operation.serverVersion,
			})
		}
	}

	await recordResolutionOnConflictObject(db, operation, resolution, resolvedBy)

	return true
}

/**
 * Resolve a stable per-device id, persisted in localStorage.
 *
 * The device id scopes the mutation queue so the server can re-authorize that
 * only the owning device pushes its own queued operations (IDOR is enforced
 * server-side, never client-asserted).
 *
 * @param {object} [storage] localStorage-like object (test seam).
 *
 * @return {string} The device id.
 */
export function resolveDeviceId(storage) {
	const store = storage || (typeof window !== 'undefined' ? window.localStorage : null)
	const STORAGE_KEY = 'cn-offline-device-id'
	if (store === null || store === undefined) {
		return `device-${Math.random().toString(36).slice(2, 10)}`
	}
	let id = store.getItem(STORAGE_KEY)
	if (!id) {
		id = `device-${Math.random().toString(36).slice(2, 10)}`
		store.setItem(STORAGE_KEY, id)
	}
	return id
}

/**
 * Reset the memoised handle — test/teardown only.
 *
 * @return {void}
 */
export function __resetDbForTests() {
	dbInstance = null
}
