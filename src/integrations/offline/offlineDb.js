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
 * THIS module inject a fake-indexeddb-backed Dexie via `__setDexie`. Dexie is an
 * OPTIONAL peer dependency: only apps that use the offline core need it.
 *
 * @module integrations/offline/offlineDb
 */

import Dexie from 'dexie'

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
 * @param {Function} ctor The Dexie class.
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
