/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the daily-planning fetch contract and the queue replay service.
 */

import 'fake-indexeddb/auto'
import Dexie from 'dexie'

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => p,
}))

const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: mockAxios }))

const { buildPlanningQuery, fetchPlanning, fetchReferences, toDayString } = require('../../../src/integrations/offline/planningFetch.js')
const { drainQueue } = require('../../../src/integrations/offline/syncReplayService.js')
const offlineDb = require('../../../src/integrations/offline/offlineDb.js')

describe('planningFetch', () => {
	beforeEach(() => {
		mockAxios.get.mockReset()
	})

	it('builds an assignee + date filter query', () => {
		const q = buildPlanningQuery({ assigneeField: 'inspectorRef', assignee: 'alice', dateField: 'scheduledAt', date: '2026-06-26' })
		expect(q).toMatchObject({ inspectorRef: 'alice', scheduledAt: '2026-06-26', _limit: 200 })
	})

	it('defaults the date to today and folds in extra filters', () => {
		const q = buildPlanningQuery({ dateField: 'd', extraFilters: { status: 'planned' }, limit: 50 })
		expect(q.d).toBe(toDayString(new Date()))
		expect(q.status).toBe('planned')
		expect(q._limit).toBe(50)
	})

	it('fetches planning via the standard OR object API', async () => {
		mockAxios.get.mockResolvedValue({ data: { results: [{ id: 'i1' }] } })
		const items = await fetchPlanning({ register: 'procest', schema: 'fieldInspection', assigneeField: 'inspectorRef', assignee: 'alice', dateField: 'scheduledAt' })
		expect(items).toEqual([{ id: 'i1' }])
		expect(mockAxios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/procest/fieldInspection', expect.objectContaining({ params: expect.any(Object) }))
	})

	it('fetches references when a referenceSchema is set, else returns []', async () => {
		mockAxios.get.mockResolvedValue({ data: { items: [{ id: 't1' }] } })
		expect(await fetchReferences({ register: 'r', referenceSchema: 'inspectionChecklist' })).toEqual([{ id: 't1' }])
		expect(await fetchReferences({ register: 'r' })).toEqual([])
	})
})

describe('syncReplayService.drainQueue', () => {
	beforeEach(() => {
		offlineDb.__setDexie(Dexie)
		mockAxios.post.mockReset()
		mockAxios.put.mockReset()
		mockAxios.delete.mockReset()
	})

	afterEach(() => {
		offlineDb.__resetDbForTests()
	})

	it('replays a queued create to the OR object API and marks it synced', async () => {
		mockAxios.post.mockResolvedValue({ status: 201, data: { id: 'new' } })
		await offlineDb.enqueueMutation({ deviceId: 'dev-1', operationType: 'create', register: 'procest', schema: 'checklistResult', payload: { a: 1 } })

		const tally = await drainQueue('dev-1')
		expect(tally.processed).toBe(1)
		expect(tally.synced).toBe(1)
		expect(mockAxios.post).toHaveBeenCalledWith('/apps/openregister/api/objects/procest/checklistResult', { a: 1 })
		expect(await offlineDb.countPending('dev-1')).toBe(0)
	})

	it('marks a 409 replay as a conflict (stays pending in the badge)', async () => {
		mockAxios.post.mockRejectedValue({ response: { status: 409, data: { v: 2 } } })
		await offlineDb.enqueueMutation({ deviceId: 'dev-2', operationType: 'create', register: 'r', schema: 's', payload: {} })

		const tally = await drainQueue('dev-2')
		expect(tally.conflicts).toBe(1)
		expect(await offlineDb.countPending('dev-2')).toBe(1)
	})
})
