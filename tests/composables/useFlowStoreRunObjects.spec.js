/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a run TOUCHED, as distinct from what it did.
 *
 * A run's own record names only the object that triggered it, so the objects it
 * went on to create or change are answerable only from the attribution the
 * engine stamps on the audit trail. `loadRunObjects()` is that read.
 *
 * The case worth testing hardest is the FAILURE one. If a failed request left
 * the previous run's objects in place, the panel would attribute one run's
 * writes to another — a wrong answer rendered exactly like a right one, which
 * is worse than an empty list.
 */
import { createPinia, setActivePinia } from 'pinia'
import axios from '@nextcloud/axios'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(),
		put: jest.fn(),
		delete: jest.fn(),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

describe('useFlowStore — objects touched by a run', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useFlowStore()
		jest.clearAllMocks()
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		console.error.mockRestore()
	})

	it('reads the run objects endpoint and stores the node groups', async () => {
		axios.get.mockResolvedValueOnce({
			data: {
				run: 'run-1',
				nodes: [
					{ node: 'create-case', step: 0, objects: [{ objectUuid: 'obj-a', action: 'create' }] },
				],
			},
		})

		await store.loadRunObjects('run-1')

		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/flow-runs/run-1/objects')
		expect(store.runObjects).toHaveLength(1)
		expect(store.runObjects[0].node).toBe('create-case')
	})

	it('empties the list when the request fails, rather than keeping the previous run', async () => {
		store.runObjects = [
			{ node: 'from-an-earlier-run', step: 0, objects: [{ objectUuid: 'stale', action: 'update' }] },
		]

		axios.get.mockRejectedValueOnce(new Error('network'))

		await store.loadRunObjects('run-2')

		expect(store.runObjects).toEqual([])
	})

	it('treats a response with no nodes key as no objects, not as a crash', async () => {
		axios.get.mockResolvedValueOnce({ data: {} })

		await store.loadRunObjects('run-3')

		expect(store.runObjects).toEqual([])
	})

	it('inspectRun loads the steps AND the objects together', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { log: [{ transition: 'create-case', status: 'completed' }] } })
			.mockResolvedValueOnce({ data: { nodes: [{ node: 'create-case', step: 0, objects: [] }] } })

		await store.inspectRun('run-4')

		expect(axios.get).toHaveBeenNthCalledWith(1, '/apps/openregister/api/flow-runs/run-4')
		expect(axios.get).toHaveBeenNthCalledWith(2, '/apps/openregister/api/flow-runs/run-4/objects')
		expect(store.steps).toHaveLength(1)
		expect(store.runObjects).toHaveLength(1)
	})

	it('a failed step read still attempts the objects read', async () => {
		// The two are separate questions. A run whose log cannot be read may
		// still have attributable writes, and dropping the second request would
		// make one failure look like two.
		axios.get
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({ data: { nodes: [{ node: 'n', step: 0, objects: [] }] } })

		await store.inspectRun('run-5')

		expect(store.steps).toEqual([])
		expect(store.runObjects).toHaveLength(1)
	})

	it('keeps the run’s own record, which holds what the audit read cannot', async () => {
		// The record carries `subjects` and `placeItems`: the objects the run is
		// ABOUT. `inspectRun` used to take the log and the version off it and
		// drop the rest, so a run that changed nothing had nothing to show even
		// though its own error named the object it was waiting for.
		axios.get
			.mockResolvedValueOnce({
				data: {
					uuid: 'run-7',
					status: 'failed',
					flowVersion: 1,
					log: [],
					subjects: { trigger: { uuid: 'case-1' } },
					placeItems: { lock: [{ json: { id: 'case-1', title: 'A case' } }] },
				},
			})
			.mockResolvedValueOnce({ data: { nodes: [] } })
			.mockResolvedValueOnce({ data: { results: [] } })

		await store.inspectRun('run-7')

		expect(store.runDetail?.uuid).toBe('run-7')
		expect(store.runDetail?.subjects?.trigger?.uuid).toBe('case-1')
	})

	it('drops the record when the run cannot be read, rather than keeping the last one', async () => {
		store.runDetail = { uuid: 'run-from-before', status: 'completed' }

		axios.get
			.mockRejectedValueOnce(new Error('network'))
			.mockResolvedValueOnce({ data: { nodes: [] } })
			.mockResolvedValueOnce({ data: { results: [] } })

		await store.inspectRun('run-8')

		// Showing the previous run's status and error under this run's number
		// is a wrong answer rendered exactly like a right one.
		expect(store.runDetail).toBeNull()
	})

	it('closing the run clears its record with the rest of the run state', async () => {
		store.runDetail = { uuid: 'run-9', status: 'failed' }
		store.inspectedRunUuid = 'run-9'

		store.closeRun()

		expect(store.runDetail).toBeNull()
	})

	it('opening another flow clears the objects with the rest of the run state', async () => {
		axios.get.mockResolvedValueOnce({
			data: { nodes: [{ node: 'n', step: 0, objects: [{ objectUuid: 'o', action: 'create' }] }] },
		})
		await store.loadRunObjects('run-6')
		expect(store.runObjects).toHaveLength(1)

		store.open('new')

		expect(store.runObjects).toEqual([])
	})
})
