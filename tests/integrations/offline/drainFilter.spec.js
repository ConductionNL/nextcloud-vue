/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `drainQueue`'s `filter` option (manifest-offline-block task 5): only the
 * rows it keeps are replayed, in the same order; the rest stay queued.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-an-offline-form-queues-its-submission-and-the-root-sends-it
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import Dexie from 'dexie'
/* eslint-enable perfectionist/sort-imports */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => p,
}))

const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: mockAxios }))

const offlineDb = require('../../../src/integrations/offline/offlineDb.js')
const { drainQueue } = require('../../../src/integrations/offline/syncReplayService.js')

describe('drainQueue with a filter', () => {
	beforeEach(() => {
		offlineDb.__setDexie(Dexie)
		mockAxios.post.mockReset()
		mockAxios.post.mockResolvedValue({ status: 201, data: { id: 'new' } })
	})

	afterEach(async () => {
		await offlineDb.getDb().delete()
		offlineDb.__resetDbForTests()
	})

	it('sends only the kept rows, oldest first, and leaves the rest queued', async () => {
		await offlineDb.enqueueMutation({ id: 'op-b', deviceId: 'dev', operationType: 'create', register: 'toezicht', schema: 'report', payload: { n: 2 }, queuedAt: '2026-11-25T10:00:00Z' })
		await offlineDb.enqueueMutation({ id: 'op-x', deviceId: 'dev', operationType: 'create', register: 'other', schema: 'fieldInspection', payload: { n: 'x' }, queuedAt: '2026-11-25T08:30:00Z' })
		await offlineDb.enqueueMutation({ id: 'op-a', deviceId: 'dev', operationType: 'create', register: 'toezicht', schema: 'report', payload: { n: 1 }, queuedAt: '2026-11-25T09:00:00Z' })

		const tally = await drainQueue('dev', {}, { filter: (row) => row.register === 'toezicht' && row.schema === 'report' })

		expect(tally).toEqual({ processed: 2, synced: 2, conflicts: 0, failed: 0 })
		expect(mockAxios.post.mock.calls.map((call) => call[1])).toEqual([{ n: 1 }, { n: 2 }])
		const left = (await offlineDb.listQueue('dev')).filter((row) => row.status === 'pending')
		expect(left.map((row) => row.id)).toEqual(['op-x'])
	})

	it('sends every row of the device without a filter, as before', async () => {
		await offlineDb.enqueueMutation({ deviceId: 'dev', operationType: 'create', register: 'toezicht', schema: 'report', payload: {} })
		await offlineDb.enqueueMutation({ deviceId: 'dev', operationType: 'create', register: 'other', schema: 'fieldInspection', payload: {} })

		expect((await drainQueue('dev')).synced).toBe(2)
	})
})
