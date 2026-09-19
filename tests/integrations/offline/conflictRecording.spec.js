/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * A conflict becomes an object, or the row says it did not.
 *
 * 🔴 WHAT A CONFLICT KEPT ON THE DEVICE COSTS. Before this, a collision was a
 * status on one row in one browser's IndexedDB. The colleague whose edit it
 * collided with never heard of it, the supervisor who has to decide could not
 * see it, and the audit that has to show a decision was taken had nothing to
 * read. The inspector holding the phone was the only person in the
 * organisation who knew, and they are the one person who often cannot settle
 * it.
 *
 * The write is queued rather than sent, because a conflict is classified at
 * exactly the moment the connection is unreliable.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
import {
	__resetDbForTests,
	__setDexie,
	applyConflictResolution,
	CONFLICT_RECORD_PREFIX,
	enqueueMutation,
	getCachedObject,
	getDb,
	listQueue,
	recordConflict,
} from '../../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const DEVICE = 'device-conflict-1'
const SERVER_VERSION = { id: 'obj-9', note: 'the colleague wrote this', status: 'closed' }

/**
 * Queue one conflicting operation.
 *
 * @param {object} [patch] A status patch to apply after queueing.
 * @return {Promise<object>} The stored row.
 */
async function conflicting(patch = { status: 'conflict' }) {
	const id = await enqueueMutation({
		deviceId: DEVICE,
		operationType: 'update',
		register: 'dossiq',
		schema: 'fieldInspection',
		targetId: 'obj-9',
		payload: { note: 'I wrote this in the cellar', status: 'open' },
	})
	await getDb().mutationQueue.update(id, patch)
	return await getDb().mutationQueue.get(id)
}

describe('a conflict written to the register', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
		await getDb().objectCache.clear()
	})

	afterEach(() => __resetDbForTests())

	it('files an object carrying both versions and a way back to the queue row', async () => {
		const operation = await conflicting()

		await recordConflict({
			operation,
			conflictType: 'concurrent_edit',
			serverObject: SERVER_VERSION,
			register: 'dossiq',
			conflictSchema: 'syncConflict',
		})

		const record = await getDb().mutationQueue.get(`${CONFLICT_RECORD_PREFIX}${operation.id}`)

		expect(record.schema).toBe('syncConflict')
		expect(record.status).toBe('pending')
		expect(record.payload.queueOperationId).toBe(operation.id)
		expect(record.payload.conflictType).toBe('concurrent_edit')
		expect(record.payload.clientVersion.note).toBe('I wrote this in the cellar')
		expect(record.payload.serverVersion.note).toBe('the colleague wrote this')
	})

	// 🔴 ONE COLLISION, ONE RECORD. The record id is derived from the
	// conflicting operation's id, so a second drain of the same row finds it
	// rather than filing the same collision twice under two ids. A register
	// holding two objects for one event makes a count of conflicts meaningless.
	it('writes it once however many times the drain comes back to it', async () => {
		const operation = await conflicting()
		const args = {
			operation,
			conflictType: 'concurrent_edit',
			serverObject: SERVER_VERSION,
			conflictSchema: 'syncConflict',
		}

		await recordConflict(args)
		await recordConflict(args)
		await recordConflict(args)

		const records = (await listQueue(DEVICE)).filter((row) => row.schema === 'syncConflict')

		expect(records).toHaveLength(1)
	})

	// 🔴 AND THE ROW COUNT IS NOT THE ASSERTION THAT MATTERS. The record's id is
	// derived, so a second write lands on the same row either way and a count
	// of one proves nothing. What a missing guard actually does is reset a
	// record the server has ALREADY accepted back to `pending`, which sends the
	// same collision a second time under a second object id. This is the line
	// that reddens when the guard goes.
	it('does not re-send a conflict record the server has already accepted', async () => {
		const operation = await conflicting()
		const args = {
			operation,
			conflictType: 'concurrent_edit',
			serverObject: SERVER_VERSION,
			conflictSchema: 'syncConflict',
		}
		await recordConflict(args)
		const recordId = `${CONFLICT_RECORD_PREFIX}${operation.id}`
		await getDb().mutationQueue.update(recordId, { status: 'synced', serverObjectId: 'conflict-obj-77' })

		await recordConflict(args)

		const record = await getDb().mutationQueue.get(recordId)

		expect(record.status).toBe('synced')
		expect(record.serverObjectId).toBe('conflict-obj-77')
	})

	// 🔴 SAYING SO IS THE POINT. With no schema configured there is nowhere to
	// file it, and the honest outcome is a row that says the clash is local.
	// Marking it "Conflict" and nothing else leaves somebody waiting for a
	// colleague who will never see it.
	it('writes nothing with no schema configured, and says the clash is local', async () => {
		const operation = await conflicting()

		const recordId = await recordConflict({ operation, conflictType: 'concurrent_edit', serverObject: SERVER_VERSION })

		expect(recordId).toBeNull()
		expect((await getDb().mutationQueue.get(operation.id)).conflictScope).toBe('local')
		expect(await listQueue(DEVICE)).toHaveLength(1)
	})

	it('records a lost permission too, which is the one nobody on this device can settle', async () => {
		const operation = await conflicting({ status: 'failed', lastError: 'permission_lost' })

		await recordConflict({
			operation,
			conflictType: 'permission_lost',
			serverObject: null,
			conflictSchema: 'syncConflict',
		})

		const record = await getDb().mutationQueue.get(`${CONFLICT_RECORD_PREFIX}${operation.id}`)

		expect(record.payload.conflictType).toBe('permission_lost')
		expect(record.payload.clientVersion.note).toBe('I wrote this in the cellar')
	})
})

describe('settling a conflict from the queue', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
		await getDb().objectCache.clear()
	})

	afterEach(() => __resetDbForTests())

	/**
	 * A conflicting row with its conflict already filed.
	 *
	 * @return {Promise<object>} The conflicting row.
	 */
	async function filed() {
		const operation = await conflicting()
		await recordConflict({
			operation,
			conflictType: 'concurrent_edit',
			serverObject: SERVER_VERSION,
			conflictSchema: 'syncConflict',
		})
		return await getDb().mutationQueue.get(operation.id)
	}

	it('keep mine puts the row back in the queue to be sent again', async () => {
		const operation = await filed()

		const settled = await applyConflictResolution({
			operationId: operation.id,
			resolution: 'client_wins',
			resolvedBy: 'jdoe',
		})
		const row = await getDb().mutationQueue.get(operation.id)

		expect(settled).toBe(true)
		expect(row.status).toBe('pending')
		expect(row.forceUpdate).toBe(true)
		expect(row.attemptCount).toBe(0)
	})

	// 🔴 THE CACHE HAS TO MOVE WITH THE DECISION. Marking the row synced while
	// the device still renders the abandoned local text is how somebody reads
	// their own discarded answer back as the current record, and acts on it.
	it('keep theirs ends the row and leaves the cache holding the server version', async () => {
		const operation = await filed()

		await applyConflictResolution({ operationId: operation.id, resolution: 'server_wins', resolvedBy: 'jdoe' })

		const row = await getDb().mutationQueue.get(operation.id)
		const cached = await getCachedObject('dossiq', 'fieldInspection', 'planning', 'obj-9')

		expect(row.status).toBe('synced')
		expect(cached.note).toBe('the colleague wrote this')
	})

	it('a merge by hand replays the merged body, not either version whole', async () => {
		const operation = await filed()

		await applyConflictResolution({
			operationId: operation.id,
			resolution: 'manual_merge',
			mergedPayload: { note: 'I wrote this in the cellar', status: 'closed' },
			resolvedBy: 'jdoe',
		})
		const row = await getDb().mutationQueue.get(operation.id)

		expect(row.status).toBe('pending')
		expect(row.payload).toEqual({ note: 'I wrote this in the cellar', status: 'closed' })
	})

	// 🔴 A RECORD OF THE COLLISION WITHOUT THE OUTCOME ANSWERS NOTHING. The
	// question anybody asks a year later is not "did two people collide" but
	// "who decided, and which way".
	it('writes the resolution, the person and the time onto the conflict object', async () => {
		const operation = await filed()

		await applyConflictResolution({ operationId: operation.id, resolution: 'client_wins', resolvedBy: 'jdoe' })

		const record = await getDb().mutationQueue.get(`${CONFLICT_RECORD_PREFIX}${operation.id}`)

		expect(record.payload.resolution).toBe('client_wins')
		expect(record.payload.resolvedBy).toBe('jdoe')
		expect(typeof record.payload.resolvedAt).toBe('string')
	})

	it('queues a follow-up write when the conflict object has already been sent', async () => {
		const operation = await filed()
		const recordId = `${CONFLICT_RECORD_PREFIX}${operation.id}`
		await getDb().mutationQueue.update(recordId, { status: 'synced', serverObjectId: 'conflict-obj-77' })

		await applyConflictResolution({ operationId: operation.id, resolution: 'server_wins', resolvedBy: 'jdoe' })

		const followUp = await getDb().mutationQueue.get(`${recordId}-resolution`)

		expect(followUp.operationType).toBe('update')
		expect(followUp.targetId).toBe('conflict-obj-77')
		expect(followUp.payload.resolution).toBe('server_wins')
	})

	it('refuses to resolve a row that is not in conflict', async () => {
		const operation = await conflicting({ status: 'pending' })

		expect(await applyConflictResolution({ operationId: operation.id, resolution: 'client_wins' })).toBe(false)
	})
})
