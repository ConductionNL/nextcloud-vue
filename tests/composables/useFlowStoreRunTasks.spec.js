/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The tasks one run raised, read from the anchored task list.
 *
 * `GET /api/flow-tasks?runUuid={uuid}` ANCHORS rather than filters: when
 * `runUuid` is present the server ignores `scope`, so the read returns the
 * RUN's tasks and not the caller's inbox. Merged into openregister as
 * `801cc02b`. Visibility still applies on top, so a caller who is neither the
 * run's requester nor an admin can legitimately see fewer rows than the run
 * has — that is correct, and this store does nothing to work around it.
 *
 * TWO THINGS THIS FILE EXISTS TO HOLD
 * -----------------------------------
 * 1. AN EMPTY UUID IS NOT A QUERY. The server treats `?runUuid=` as absent and
 *    answers with the caller's ordinary inbox. Sending one would put somebody's
 *    own task list under a run's Tasks tab, so the call site guards instead of
 *    trusting the server to return nothing.
 * 2. AN OLDER SERVER IGNORES THE PARAMETER ENTIRELY. This is a library: a
 *    consuming app can be running an openregister from before `801cc02b`,
 *    where an unknown query parameter is not rejected but silently dropped —
 *    a perfectly valid 200 full of the reader's own tasks. Rows that do not
 *    name this run are therefore discarded rather than rendered.
 */

import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

describe('useFlowStore — the tasks one run raised', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { results: [] } })
	})

	it('anchors the read to the run, and asks for nothing else', async () => {
		const store = useFlowStore()
		await store.loadRunTasks('run-1')

		expect(axios.get).toHaveBeenCalledWith(
			'/apps/openregister/api/flow-tasks',
			{ params: { runUuid: 'run-1' } },
		)

		// No `scope`. The anchor overrides it server-side, so sending one would
		// be a parameter that reads as though it narrowed something.
		const [, config] = axios.get.mock.calls[0]
		expect(Object.keys(config.params)).toEqual(['runUuid'])
	})

	it('keeps a task assigned to a GROUP rather than to the reader', async () => {
		// The case the anchor exists for, verified live against openregister: a
		// run whose task is assigned to a group returns under the anchor and
		// returns NOTHING under the default inbox read. A Tasks tab that only
		// showed the reader's own assignments would be empty exactly when a
		// run is waiting on somebody else, which is when it is worth looking.
		axios.get.mockResolvedValue({
			data: {
				results: [
					{ uuid: 't-1', runUuid: 'run-1', title: 'Approve the mandate', state: 'open', assigneeGroup: 'juristen' },
				],
			},
		})

		const store = useFlowStore()
		await store.loadRunTasks('run-1')

		expect(store.runTasks).toHaveLength(1)
		expect(store.runTasks[0].uuid).toBe('t-1')
	})

	it('never sends an empty runUuid, because that reads as the caller\'s inbox', async () => {
		const store = useFlowStore()
		store.runTasks = [{ uuid: 'stale' }]

		await store.loadRunTasks('')

		expect(axios.get).not.toHaveBeenCalled()
		// And the previous run's rows go, rather than sitting under a run they
		// do not belong to.
		expect(store.runTasks).toEqual([])
	})

	it('discards rows that name another run, so an old server cannot leak an inbox', async () => {
		axios.get.mockResolvedValue({
			data: {
				results: [
					{ uuid: 't-1', runUuid: 'run-1', title: 'Mine' },
					// What an openregister from before the filter answers with:
					// the reader's own tasks, none of them this run's.
					{ uuid: 't-9', runUuid: 'run-other', title: 'Somebody else\'s inbox' },
					{ uuid: 't-8', title: 'A standalone task with no run at all' },
				],
			},
		})

		const store = useFlowStore()
		await store.loadRunTasks('run-1')

		expect(store.runTasks.map((t) => t.uuid)).toEqual(['t-1'])
	})

	it('empties the list on failure rather than leaving the last run\'s tasks up', async () => {
		axios.get.mockRejectedValue(new Error('boom'))

		const store = useFlowStore()
		store.runTasks = [{ uuid: 'stale', runUuid: 'run-0' }]
		await store.loadRunTasks('run-1')

		// Stale rows here read as "this run raised those", which is worse than
		// showing nothing.
		expect(store.runTasks).toEqual([])
	})
})
