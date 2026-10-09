/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-3
 */
import { createJourneyRunStore } from '../../src/store/journeyRun.js'
import { fakeRunApi } from '../support/journeyHarness.js'

jest.mock('../../src/utils/cnFetch.js', () => ({
	cnFetchJson: (...args) => global.__runApi(...args),
}))

let server
beforeEach(() => {
	server = fakeRunApi()
	global.__runApi = server.api
})

describe('createJourneyRunStore', () => {
	it('writes nothing until a step completes, then creates the run', async () => {
		const store = createJourneyRunStore({ journeyId: 'permit' })
		expect(server.calls).toHaveLength(0)
		await store.save('who', { name: 'Jan' }, 'kind')
		expect(server.calls[0].method).toBe('POST')
		expect(store.state.runId).toBe('run-1')
		await store.save('kind', { kind: 'a' }, 'review')
		expect(server.calls[1]).toMatchObject({ method: 'PUT', body: { answers: { who: { name: 'Jan' }, kind: { kind: 'a' } }, position: 'review' } })
	})

	it('a second store resumes the run at the same step with the same answers', async () => {
		const first = createJourneyRunStore({ journeyId: 'permit' })
		await first.save('who', { name: 'Jan' }, 'kind')
		const second = createJourneyRunStore({ journeyId: 'permit' })
		await second.resume(first.state.runId)
		expect(second.state.position).toBe('kind')
		expect(second.state.answers).toEqual({ who: { name: 'Jan' } })
	})

	it('does not refetch a run it already holds', async () => {
		const store = createJourneyRunStore({})
		await store.save('a', { x: 1 }, 'b')
		const before = server.calls.length
		await store.resume(store.state.runId)
		expect(server.calls).toHaveLength(before)
	})

	it('refuses to submit a run that was never saved', async () => {
		await expect(createJourneyRunStore({}).submit()).rejects.toThrow()
	})

	it('keeps a reported failure on the store', async () => {
		const store = createJourneyRunStore({})
		await store.report(new Error('boom'), { field: 'x' })
		expect(store.state.failures[0].message).toBe('boom')
	})
})
