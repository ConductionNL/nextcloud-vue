/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * What the queue shows, and what the count was hiding.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR. `countPending()` counts `pending`, `conflict`
 * and `syncing`. An operation that exhausted its retries or lost its permission
 * is `failed`, and `failed` is terminal for the replay loop. So it drops out of
 * the badge while still sitting in this browser's IndexedDB: an inspection a
 * citizen stood beside somebody to give, stranded with no reader anywhere. A
 * queue that loses a submission is worse than one that refuses it at the door.
 *
 * 🔴 AND NOTHING IS EVER DROPPED. Not on failure, not on age, not to make a
 * number smaller. The assertions below are as much about what stays as about
 * what is listed.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
import {
	__resetDbForTests,
	__setDexie,
	countPending,
	countStuck,
	enqueueMutation,
	getDb,
	listQueue,
	requeueOperation,
} from '../../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

/**
 * Queue one operation and force it into a terminal state.
 *
 * @param {object} fields The operation fields.
 * @param {object} [patch] A status patch to apply after queueing.
 * @return {Promise<string>} The operation id.
 */
async function queued(fields, patch = null) {
	const id = await enqueueMutation({
		deviceId: 'device-1',
		operationType: 'create',
		register: 'dossiq',
		schema: 'fieldInspection',
		payload: { note: 'op' },
		...fields,
	})

	if (patch) {
		await getDb().mutationQueue.update(id, patch)
	}

	return id
}

describe('the queue a person can read', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		// 🔴 THE TABLE IS EMPTIED, NOT JUST THE HANDLE. `__resetDbForTests()`
		// drops the cached Dexie instance; the fake-indexeddb data survives it,
		// so rows accumulate across tests and a count assertion reads whatever
		// the previous test left. Three assertions here failed that way first.
		await getDb().mutationQueue.clear()
	})
	afterEach(() => __resetDbForTests())

	it('lists a failed operation that the count leaves out', async () => {
		await queued({ payload: { note: 'waiting' } })
		const stuckId = await queued(
			{ payload: { note: 'stranded' } },
			{ status: 'failed', attemptCount: 5, lastError: '500 error' },
		)

		// The count as it stands: the stranded entry is invisible.
		expect(await countPending('device-1')).toBe(1)

		// 🔴 THE ONE THIS FILE EXISTS FOR. The list shows both, so the work is
		// not lost just because nothing will retry it.
		const rows = await listQueue('device-1')
		expect(rows).toHaveLength(2)
		expect(rows.map((row) => row.id)).toContain(stuckId)

		// And it is counted, apart, so a surface can say "1 waiting, 1 stuck"
		// rather than adding them and saying neither.
		expect(await countStuck('device-1')).toBe(1)
	})

	it('lists in the order the queue will replay', async () => {
		const first = await queued({ queuedAt: '2026-09-18T08:00:00.000Z' })
		const second = await queued({ queuedAt: '2026-09-18T09:00:00.000Z' })

		// FIFO, because a result that references evidence captured earlier has
		// to replay after it.
		expect((await listQueue('device-1')).map((row) => row.id)).toEqual([first, second])
	})

	it('lists only this device, so one browser profile is not one queue', async () => {
		await queued({ deviceId: 'device-1' })
		await queued({ deviceId: 'device-2' })

		expect(await listQueue('device-1')).toHaveLength(1)
		// The control: without a scope it sees both, so the filter is doing
		// the work rather than the store being empty.
		expect(await listQueue()).toHaveLength(2)
	})

	it('counts nothing stuck when nothing is', async () => {
		await queued({})

		// The control for the stuck count: it has to be able to say zero.
		expect(await countStuck('device-1')).toBe(0)
	})
})

describe('what happens to an entry that cannot be replayed', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		// 🔴 THE TABLE IS EMPTIED, NOT JUST THE HANDLE. `__resetDbForTests()`
		// drops the cached Dexie instance; the fake-indexeddb data survives it,
		// so rows accumulate across tests and a count assertion reads whatever
		// the previous test left. Three assertions here failed that way first.
		await getDb().mutationQueue.clear()
	})
	afterEach(() => __resetDbForTests())

	it('keeps it, with the server words and the attempt count', async () => {
		const id = await queued(
			{ payload: { note: 'the inspection' } },
			{ status: 'failed', attemptCount: 5, lastError: '500 error' },
		)

		const row = (await listQueue('device-1')).find((one) => one.id === id)

		// 🔴 NOTHING IS DELETED. The payload the inspector captured is still
		// there, with what the server actually said, so somebody can act.
		expect(row.payload).toEqual({ note: 'the inspection' })
		expect(row.lastError).toBe('500 error')
		expect(row.attemptCount).toBe(5)
	})

	it('can be put back in the queue by hand, with its attempts reset', async () => {
		const id = await queued({}, { status: 'failed', attemptCount: 5, lastError: '500 error' })

		expect(await requeueOperation(id)).toBe(true)

		const row = (await listQueue('device-1')).find((one) => one.id === id)
		expect(row.status).toBe('pending')
		expect(row.attemptCount).toBe(0)
		expect(row.lastError).toBeNull()
	})

	it('refuses to retry a lost permission, because retrying cannot help', async () => {
		const id = await queued(
			{},
			{ status: 'failed', attemptCount: 1, lastError: 'permission_lost' },
		)

		expect(await requeueOperation(id)).toBe(false)

		// It STAYS. Refusing the retry is not the same as discarding the work,
		// and somebody with the right to write it still needs to see it.
		const row = (await listQueue('device-1')).find((one) => one.id === id)
		expect(row.status).toBe('failed')
		expect(row.payload).toBeDefined()
	})

	it('refuses to retry something that is not stuck', async () => {
		const id = await queued({})

		// A pending operation is already going to replay; re-queueing it would
		// reset an attempt count that is doing its job.
		expect(await requeueOperation(id)).toBe(false)
		expect(await requeueOperation('no-such-operation')).toBe(false)
	})
})
