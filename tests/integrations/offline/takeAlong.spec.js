/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Take-along sets (manifest-offline-block task 2): download with resolved
 * tokens and the limit, read back with the expiry, and a clear that leaves
 * other sets and the queue alone.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-offline-core-downloads-reads-and-clears-a-take-along-set
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
/* eslint-enable perfectionist/sort-imports */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => p,
}))

jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: () => ({ uid: 'jvdberg', displayName: 'J. van der Berg' }),
}))

const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: mockAxios }))

const offlineDb = require('../../../src/integrations/offline/offlineDb.js')
const { toDayString } = require('../../../src/integrations/offline/planningFetch.js')
const {
	clearTakeAlong,
	downloadTakeAlong,
	readTakeAlong,
	TAKE_ALONG_COLLECTION,
} = require('../../../src/integrations/offline/takeAlong.js')

const HOUR = 60 * 60 * 1000

/**
 * A manifest taking today's inspections of the signed-in inspector along.
 *
 * @param {object} [entry] Overrides for the take-along entry.
 * @return {object} The manifest.
 */
function manifest(entry = {}) {
	return {
		pages: [{ id: 'inspections', type: 'index', config: { register: 'toezicht', schema: 'inspection' } }],
		offline: {
			takeAlong: [{ schema: 'inspection', filter: { inspector: '@me', plannedDate: '@today' }, limit: 50, ttlHours: 12, ...entry }],
		},
	}
}

describe('take-along sets', () => {
	beforeEach(() => {
		offlineDb.__setDexie(Dexie)
		mockAxios.get.mockReset()
	})

	afterEach(async () => {
		await offlineDb.getDb().delete()
		offlineDb.__resetDbForTests()
	})

	it('downloads today\'s inspections of the signed-in inspector with a 12-hour expiry', async () => {
		mockAxios.get.mockResolvedValue({ data: { results: [{ id: 'i1', title: 'Kerkstraat 12' }, { id: 'i2', title: 'Molenweg 4' }] } })
		const before = Date.now()

		const outcomes = await downloadTakeAlong(manifest())

		expect(outcomes).toEqual([{ register: 'toezicht', schema: 'inspection', count: 2, error: null }])
		expect(mockAxios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/toezicht/inspection', {
			params: { inspector: 'jvdberg', plannedDate: toDayString(new Date()), _limit: 50 },
		})
		const set = await readTakeAlong('toezicht', 'inspection')
		expect(set.rows.map((r) => r.title)).toEqual(['Kerkstraat 12', 'Molenweg 4'])
		expect(set.expired).toBe(false)
		const lifetime = new Date(set.expiresAt).getTime() - new Date(set.syncedAt).getTime()
		expect(Math.abs(lifetime - 12 * HOUR)).toBeLessThan(1000)
		expect(new Date(set.syncedAt).getTime()).toBeGreaterThanOrEqual(before - 1000)
	})

	it('stores no more than the limit even when the server answers more', async () => {
		mockAxios.get.mockResolvedValue({ data: { results: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } })
		await downloadTakeAlong(manifest({ limit: 2 }))
		expect((await readTakeAlong('toezicht', 'inspection')).rows).toHaveLength(2)
	})

	it('reads no rows once the set has expired', async () => {
		mockAxios.get.mockResolvedValue({ data: { results: [{ id: 'i1' }] } })
		await downloadTakeAlong(manifest({ ttlHours: 12 }))

		const tomorrow = new Date(Date.now() + 13 * HOUR)
		const set = await readTakeAlong('toezicht', 'inspection', tomorrow)

		expect(set.expired).toBe(true)
		expect(set.rows).toEqual([])
		expect(set.syncedAt).not.toBeNull()
	})

	it('reads an empty, unexpired set for a schema never downloaded', async () => {
		expect(await readTakeAlong('toezicht', 'inspection')).toEqual({ rows: [], syncedAt: null, expiresAt: null, expired: false })
	})

	it('reports a failing entry and carries on with the next', async () => {
		mockAxios.get
			.mockRejectedValueOnce(new Error('Network Error'))
			.mockResolvedValueOnce({ data: { results: [{ id: 'p1' }] } })
		const m = manifest()
		m.offline.takeAlong.push({ register: 'toezicht', schema: 'permit' })

		const outcomes = await downloadTakeAlong(m)

		expect(outcomes).toEqual([
			{ register: 'toezicht', schema: 'inspection', count: 0, error: 'Network Error' },
			{ register: 'toezicht', schema: 'permit', count: 1, error: null },
		])
	})

	it('clears this app\'s set and leaves another app\'s set and the queue', async () => {
		mockAxios.get.mockResolvedValue({ data: { results: [{ id: 'i1' }, { id: 'i2' }] } })
		await downloadTakeAlong(manifest())
		await offlineDb.storePlanning({ register: 'other', schema: 'inspection', items: [{ id: 'x1' }], collection: TAKE_ALONG_COLLECTION })
		await offlineDb.enqueueMutation({ deviceId: 'dev-1', operationType: 'create', register: 'other', schema: 'fieldInspection', payload: { note: 'queued' } })

		const removed = await clearTakeAlong(manifest())

		expect(removed).toBe(2)
		expect(await offlineDb.getPlanningMeta('toezicht', 'inspection', TAKE_ALONG_COLLECTION)).toBeNull()
		expect(await offlineDb.getPlannedItems('toezicht', 'inspection', TAKE_ALONG_COLLECTION)).toEqual([])
		expect(await offlineDb.getPlannedItems('other', 'inspection', TAKE_ALONG_COLLECTION)).toEqual([{ id: 'x1' }])
		expect(await offlineDb.countPending('dev-1')).toBe(1)
	})

	it('clearCollection leaves the other collections of the same schema', async () => {
		await offlineDb.storePlanning({ register: 'toezicht', schema: 'inspection', items: [{ id: 'p1' }], collection: 'planning' })
		await offlineDb.storePlanning({ register: 'toezicht', schema: 'inspection', items: [{ id: 't1' }], collection: TAKE_ALONG_COLLECTION })

		expect(await offlineDb.clearCollection('toezicht', 'inspection', TAKE_ALONG_COLLECTION)).toBe(1)
		expect(await offlineDb.getPlannedItems('toezicht', 'inspection', 'planning')).toEqual([{ id: 'p1' }])
		expect(await offlineDb.getPlanningMeta('toezicht', 'inspection', 'planning')).not.toBeNull()
	})
})
