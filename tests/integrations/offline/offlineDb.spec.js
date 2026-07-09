/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Offline IndexedDB store tests, backed by fake-indexeddb so the Dexie store
 * runs in a Node/jsdom environment.
 */

import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {
	__setDexie,
	__resetDbForTests,
	cacheKey,
	storePlanning,
	getPlannedItems,
	getCachedObject,
	getPlanningMeta,
	enqueueMutation,
	countPending,
	resolveDeviceId,
} from '../../../src/integrations/offline/offlineDb.js'

describe('offlineDb', () => {
	beforeEach(() => {
		__setDexie(Dexie)
	})

	afterEach(() => {
		__resetDbForTests()
	})

	it('builds a stable composite cache key', () => {
		expect(cacheKey('reg', 'sch', 'planning', 'id1')).toBe('reg::sch::planning::id1')
	})

	it('stores planning + references atomically and reads them back', async () => {
		await storePlanning({
			register: 'procest',
			schema: 'fieldInspection',
			items: [{ id: 'i1', caseRef: 'CASE-1' }, { id: 'i2', caseRef: 'CASE-2' }],
			references: [{ id: 't1', items: [] }],
			referenceSchema: 'inspectionChecklist',
		})

		const items = await getPlannedItems('procest', 'fieldInspection')
		expect(items.map((i) => i.id).sort()).toEqual(['i1', 'i2'])

		const template = await getCachedObject('procest', 'inspectionChecklist', 'references', 't1')
		expect(template).toMatchObject({ id: 't1' })

		const meta = await getPlanningMeta('procest', 'fieldInspection')
		expect(meta.status).toBe('ready_offline')
		expect(meta.count).toBe(2)
		expect(meta.expiresAt).toBeTruthy()
	})

	it('keeps separate apps/schemas from colliding', async () => {
		await storePlanning({ register: 'r1', schema: 's1', items: [{ id: 'a' }] })
		await storePlanning({ register: 'r2', schema: 's2', items: [{ id: 'b' }] })
		expect((await getPlannedItems('r1', 's1')).map((i) => i.id)).toEqual(['a'])
		expect((await getPlannedItems('r2', 's2')).map((i) => i.id)).toEqual(['b'])
	})

	it('enqueues mutations and counts pending by device', async () => {
		await enqueueMutation({ deviceId: 'dev-1', operationType: 'create', register: 'r', schema: 's', payload: { x: 1 } })
		await enqueueMutation({ deviceId: 'dev-1', operationType: 'create', register: 'r', schema: 's', payload: { x: 2 } })
		await enqueueMutation({ deviceId: 'dev-2', operationType: 'create', register: 'r', schema: 's', payload: { x: 3 } })

		expect(await countPending('dev-1')).toBe(2)
		expect(await countPending('dev-2')).toBe(1)
		expect(await countPending()).toBe(3)
	})

	describe('resolveDeviceId', () => {
		it('persists and reuses a generated id', () => {
			const store = (() => {
				const m = {}
				return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v } }
			})()
			const first = resolveDeviceId(store)
			const second = resolveDeviceId(store)
			expect(first).toBe(second)
			expect(first).toMatch(/^device-/)
		})
	})
})
