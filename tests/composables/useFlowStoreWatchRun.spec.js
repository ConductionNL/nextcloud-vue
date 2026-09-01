/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store watches ONE run while it is active — and stops by itself.
 *
 * Pressing Run used to refresh the run LIST once and discard the uuid the
 * POST returned, so the canvas never learned what happened. `watchRun()`
 * polls that one run on an interval, floored at 2s, pauses while the tab is
 * hidden (one refetch on return — the CnFlowRunsWidget behaviour), exposes
 * the log as ordered index-diffed steps, and tears itself down on a terminal
 * status, a re-watch, or `stopWatching()`.
 *
 * These tests pin the lifecycle, because every failure mode here is silent:
 * a poll that never stops is a request per 3s forever, and a diff that
 * replays a step animates the same hop twice.
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

/**
 * A run payload the way `FlowRun::jsonSerialize()` shapes it.
 *
 * @param {string} status The run status.
 * @param {Array<object>} log The step log.
 * @return {object} The payload.
 */
function runPayload(status, log = []) {
	return { uuid: 'run-1', status, log, marking: {}, error: null }
}

/**
 * How many polls hit the single-run endpoint.
 *
 * @return {number} The count.
 */
function runFetchCount() {
	return axios.get.mock.calls.filter(
		([url]) => String(url).includes('/api/flow-runs/run-1'),
	).length
}

describe('useFlowStore.watchRun', () => {
	/** The store under test, so afterEach can tear its watch down. */
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useFlowStore()
		jest.clearAllMocks()
		jest.useFakeTimers()
		axios.get.mockResolvedValue({ data: runPayload('running') })
	})

	afterEach(() => {
		// The watch registers a document-level visibility listener; a test
		// that leaves it behind makes a LATER test's visibilitychange fan out
		// into every previous store — the polls multiply and the counts lie.
		store.stopWatching()
		jest.useRealTimers()
	})

	it('polls on the interval while the status is non-terminal', async () => {
		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)
		expect(runFetchCount()).toBe(1)

		await jest.advanceTimersByTimeAsync(3000)
		expect(runFetchCount()).toBe(2)

		await jest.advanceTimersByTimeAsync(3000)
		expect(runFetchCount()).toBe(3)
	})

	it('stops by itself when the status turns terminal', async () => {
		axios.get.mockResolvedValueOnce({ data: runPayload('running') })
			.mockResolvedValueOnce({ data: runPayload('completed', [{ transition: 'a', status: 'completed' }]) })

		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)
		await jest.advanceTimersByTimeAsync(3000)

		expect(store.watching).toBe(false)
		// The final state is KEPT for the canvas's last paint.
		expect(store.watchedRun.status).toBe('completed')
		expect(store.watchedSteps).toHaveLength(1)

		// And no further poll ever fires.
		await jest.advanceTimersByTimeAsync(30000)
		expect(runFetchCount()).toBe(2)
	})

	it('floors a too-eager interval at 2 seconds', async () => {

		store.watchRun('run-1', { intervalMs: 100 })
		await jest.advanceTimersByTimeAsync(0)
		expect(runFetchCount()).toBe(1)

		// 100ms would have fired 10 more times by now; the floor allows none.
		await jest.advanceTimersByTimeAsync(1999)
		expect(runFetchCount()).toBe(1)

		await jest.advanceTimersByTimeAsync(1)
		expect(runFetchCount()).toBe(2)
	})

	it('exposes only the appended entries as new across a suspend and resume', async () => {
		const firstPass = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'completed' },
			{ transition: 'c', status: 'suspended' },
		]
		const resumed = [
			...firstPass,
			{ transition: 'c', status: 'completed' },
			{ transition: 'd', status: 'completed' },
			{ transition: 'e', status: 'completed' },
			{ transition: 'f', status: 'completed' },
		]
		axios.get.mockResolvedValueOnce({ data: runPayload('suspended', firstPass) })
			.mockResolvedValueOnce({ data: runPayload('completed', resumed) })

		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)
		expect(store.watchedSteps).toHaveLength(3)
		expect(store.newWatchedSteps).toHaveLength(3)

		// `suspended` is in the engine's ACTIVE set, so the watch stays live.
		expect(store.watching).toBe(true)

		await jest.advanceTimersByTimeAsync(3000)
		expect(store.watchedSteps).toHaveLength(7)
		// Only entries four to seven are new — the first three never replay.
		expect(store.newWatchedSteps).toHaveLength(4)
		expect(store.newWatchedSteps[0].transition).toBe('c')
		expect(store.newWatchedSteps[3].transition).toBe('f')
	})

	it('pauses while the document is hidden and refetches once on return', async () => {
		let hidden = false
		Object.defineProperty(document, 'hidden', {
			configurable: true,
			get: () => hidden,
		})

		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)
		expect(runFetchCount()).toBe(1)

		hidden = true
		document.dispatchEvent(new Event('visibilitychange'))
		await jest.advanceTimersByTimeAsync(30000)
		expect(runFetchCount()).toBe(1)

		hidden = false
		document.dispatchEvent(new Event('visibilitychange'))
		await jest.advanceTimersByTimeAsync(0)
		// One immediate fetch on return…
		expect(runFetchCount()).toBe(2)
		// …and the interval resumes.
		await jest.advanceTimersByTimeAsync(3000)
		expect(runFetchCount()).toBe(3)

		delete document.hidden
	})

	it('replaces the watch when a different run is watched', async () => {

		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)

		axios.get.mockClear()
		axios.get.mockResolvedValue({ data: { uuid: 'run-2', status: 'running', log: [] } })
		store.watchRun('run-2')
		await jest.advanceTimersByTimeAsync(3000)

		// Every poll since the re-watch names run-2; run-1's loop is gone.
		const urls = axios.get.mock.calls.map(([url]) => String(url))
		expect(urls.length).toBeGreaterThan(0)
		expect(urls.every((url) => url.includes('run-2'))).toBe(true)
		expect(store.watchedRunUuid).toBe('run-2')
	})

	it('stops polling on stopWatching, keeping the fetched state', async () => {

		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)
		store.stopWatching()

		await jest.advanceTimersByTimeAsync(30000)
		expect(runFetchCount()).toBe(1)
		expect(store.watchedRun.status).toBe('running')
	})

	it('run() keeps the uuid the POST returns and starts the watch', async () => {
		store.flow.id = 'flow-9'
		axios.post.mockResolvedValue({ data: { uuid: 'run-1', status: 'queued', log: [] } })
		axios.get.mockImplementation((url) => {
			if (String(url).includes('/api/flow-runs/run-1')) {
				return Promise.resolve({ data: runPayload('queued') })
			}

			return Promise.resolve({ data: { results: [] } })
		})

		await store.run()
		await jest.advanceTimersByTimeAsync(0)

		expect(store.watchedRunUuid).toBe('run-1')
		expect(runFetchCount()).toBeGreaterThanOrEqual(1)
	})

	it('requestReplay raises the token for the inspected run and stops a live watch', async () => {
		store.watchRun('run-1')
		await jest.advanceTimersByTimeAsync(0)

		store.inspectedRunUuid = 'run-0'
		store.steps = [{ transition: 'a', status: 'completed' }]
		store.requestReplay()

		expect(store.replayUuid).toBe('run-0')
		expect(store.replayToken).toBe(1)
		expect(store.watching).toBe(false)

		// A second request is a second token — replaying twice is two plays.
		store.requestReplay()
		expect(store.replayToken).toBe(2)
	})
})
