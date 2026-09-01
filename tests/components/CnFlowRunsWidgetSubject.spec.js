/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFlowRunsWidget subject mode — the case detail page's view of the engine
 * (openspec change cn-flow-runs-widget-subject).
 *
 * The behaviours worth guarding:
 *  - a configured `subject` rides on the ACTIVE request and turns on a second,
 *    subject-required completed-runs request; without one, the widget stays
 *    the single-request org-wide surface it was;
 *  - the `@objectId` token binds the detail page's injected object context,
 *    so a manifest never hardcodes a uuid;
 *  - finished runs render in their own labelled section, marked terminal
 *    (never by colour alone), with an honest "+N earlier" remainder;
 *  - "no runs ever" and "nothing running right now" are different lines;
 *  - `runRoute` deep-links a row's RUN uuid and falls back to the original
 *    `rowRoute` flow-id behaviour when the row has no uuid.
 */
// `mock`-prefixed names are the only out-of-scope vars a jest.mock factory may
// reference. Declared with var so hoisting keeps them defined.
var mockCalls = []
var mockActive = { data: null, loading: false, error: '' }
var mockCompleted = { data: null, loading: false, error: '' }
var mockRefetchActive = jest.fn(() => Promise.resolve())
var mockRefetchCompleted = jest.fn(() => Promise.resolve())

// The composable is the fetch boundary — stub it so the tests drive both
// surfaces (active + completed) directly. The widget calls it twice, in a
// fixed setup order: even call = active runs, odd call = completed runs.
// Each call's `source` getter and `options` are captured so the tests can
// assert the REQUEST the widget would send, not just what it renders.
jest.mock('../../src/composables/useEndpointSource.js', () => {
	const { computed } = require('vue')
	return {
		useEndpointSource: (source, options) => {
			const index = mockCalls.length
			mockCalls.push({ source, options })
			const state = index % 2 === 0 ? mockActive : mockCompleted
			const refetch = index % 2 === 0 ? mockRefetchActive : mockRefetchCompleted
			return {
				data: computed(() => state.data),
				loading: computed(() => state.loading),
				error: computed(() => state.error),
				refetch,
			}
		},
	}
})

import { mount } from '@vue/test-utils'

const CnFlowRunsWidget = require('../../src/components/CnFlowRunsWidget/CnFlowRunsWidget.vue').default

const CASE_UUID = 'case-0f5b'

/**
 * A live run row as the active-runs endpoint returns it.
 *
 * @param {object} overrides Fields to override on the default row.
 * @return {object} The row.
 */
function liveRun(overrides = {}) {
	return {
		uuid: 'run-live-1',
		flowId: 'flow-1',
		flowName: 'Hersteltermijn',
		status: 'suspended',
		trigger: 'object.created',
		step: 'await-reply',
		created: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
		subject: { uuid: CASE_UUID, register: 'cases', schema: 'case' },
		...overrides,
	}
}

/**
 * A finished run row as the completed-runs endpoint returns it (same
 * summarise shape, terminal status).
 *
 * @param {object} overrides Fields to override on the default row.
 * @return {object} The row.
 */
function doneRun(overrides = {}) {
	return liveRun({
		uuid: 'run-done-1',
		status: 'completed',
		step: null,
		created: new Date(Date.now() - 2 * 86400_000).toISOString(),
		...overrides,
	})
}

function mountWidget({
	active = { results: [], total: 0 },
	completed = { results: [], total: 0 },
	activeError = '',
	completedError = '',
	loading = false,
	content = {},
	router = null,
	provide = {},
} = {}) {
	mockCalls = []
	mockActive.data = active
	mockActive.loading = loading
	mockActive.error = activeError
	mockCompleted.data = completed
	mockCompleted.loading = false
	mockCompleted.error = completedError
	mockRefetchActive.mockClear()
	mockRefetchCompleted.mockClear()
	return mount(CnFlowRunsWidget, {
		propsData: { content, translate: (k) => k },
		mocks: router ? { $router: router } : {},
		stubs: { NcLoadingIcon: true },
		provide,
	})
}

describe('CnFlowRunsWidget subject mode', () => {
	describe('the requests', () => {
		it('sends the subject on the active read and turns on the completed read', () => {
			mountWidget({ content: { subject: CASE_UUID, limit: 4 } })
			expect(mockCalls.length).toBe(2)
			const activeRequest = mockCalls[0].source()
			expect(activeRequest.url).toBe('/apps/openregister/api/flow-runs/active')
			expect(activeRequest.params).toEqual({ limit: 4, subject: CASE_UUID })
			const completedRequest = mockCalls[1].source()
			expect(completedRequest.url).toBe('/apps/openregister/api/flow-runs/completed')
			expect(completedRequest.params).toEqual({ limit: 4, subject: CASE_UUID })
		})

		it('sends no subject and no completed request without one — the org widget is unchanged', () => {
			mountWidget({ content: { limit: 4 } })
			const activeRequest = mockCalls[0].source()
			expect(activeRequest.params).toEqual({ limit: 4 })
			expect(activeRequest.params.subject).toBeUndefined()
			// A null source config means the composable never queries.
			expect(mockCalls[1].source()).toBeNull()
		})

		it('hands the detail page object context to both reads so @objectId can resolve', () => {
			mountWidget({
				content: { subject: '@objectId' },
				provide: {
					cnObjectContext: { objectId: CASE_UUID, object: null, register: 'cases', schema: 'case' },
				},
			})
			expect(mockCalls[0].options.ctx().objectId).toBe(CASE_UUID)
			expect(mockCalls[1].options.ctx().objectId).toBe(CASE_UUID)
			// The token itself travels in the params; the endpoint engine
			// resolves it against that ctx (and blocks while it cannot).
			expect(mockCalls[0].source().params.subject).toBe('@objectId')
		})
	})

	describe('the token and the loading state', () => {
		it('shows the loading state while @objectId has no context to resolve against', () => {
			const w = mountWidget({ content: { subject: '@objectId' } })
			expect(w.find('.cn-flow-runs-widget__loading').exists()).toBe(true)
			expect(w.find('.cn-flow-runs-widget__empty').exists()).toBe(false)
		})

		it('resolves @objectId against the injected context and leaves the loading state', () => {
			const w = mountWidget({
				content: { subject: '@objectId' },
				provide: {
					cnObjectContext: { objectId: CASE_UUID, object: null, register: '', schema: '' },
				},
			})
			expect(w.vm.resolvedSubject).toBe(CASE_UUID)
			expect(w.find('.cn-flow-runs-widget__loading').exists()).toBe(false)
		})
	})

	describe('the history section', () => {
		it('renders finished runs under their own label, marked terminal', () => {
			const w = mountWidget({
				content: { subject: CASE_UUID },
				active: { results: [liveRun()], total: 1 },
				completed: { results: [doneRun()], total: 1 },
			})
			expect(w.find('.cn-flow-runs-widget__history-title').text()).toBe('Earlier runs')
			const terminal = w.findAll('.cn-flow-runs-widget__row--terminal')
			expect(terminal.length).toBe(1)
			expect(terminal[0].attributes('data-status')).toBe('completed')
			expect(terminal[0].find('.cn-flow-runs-widget__dot--terminal').exists()).toBe(true)
			// The live run stays out of the history list.
			expect(w.findAll('.cn-flow-runs-widget__row').length).toBe(2)
		})

		it('states the completed remainder from the endpoint total', () => {
			const w = mountWidget({
				content: { subject: CASE_UUID, limit: 1 },
				completed: { results: [doneRun()], total: 15 },
			})
			const more = w.findAll('.cn-flow-runs-widget__more')
			expect(more[more.length - 1].text()).toContain('14')
		})

		it('labels a failed run as failed, not as decoration', () => {
			const w = mountWidget({
				content: { subject: CASE_UUID },
				completed: { results: [doneRun({ status: 'failed' })], total: 1 },
			})
			const row = w.find('.cn-flow-runs-widget__row--terminal')
			expect(row.find('.cn-flow-runs-widget__meta').text()).toContain('Failed')
		})

		it('renders no history section without a subject even if a payload leaks in', () => {
			const w = mountWidget({
				content: {},
				completed: { results: [doneRun()], total: 1 },
			})
			expect(w.find('.cn-flow-runs-widget__history-title').exists()).toBe(false)
			expect(w.find('.cn-flow-runs-widget__row--terminal').exists()).toBe(false)
		})

		it('shows one quiet history error line without dropping the live list', () => {
			const w = mountWidget({
				content: { subject: CASE_UUID },
				active: { results: [liveRun()], total: 1 },
				completedError: 'Request failed with status code 400',
			})
			expect(w.find('.cn-flow-runs-widget__error').text()).toBe('Could not load the run history')
			expect(w.text()).not.toContain('400')
			expect(w.findAll('.cn-flow-runs-widget__row').length).toBe(1)
		})
	})

	describe('the empty states', () => {
		it('says "never ran" when a subject has no runs at all', () => {
			const w = mountWidget({ content: { subject: CASE_UUID } })
			expect(w.find('.cn-flow-runs-widget__empty').text()).toBe('No flows have run yet')
		})

		it('says "nothing running" when only the history has runs', () => {
			const w = mountWidget({
				content: { subject: CASE_UUID },
				completed: { results: [doneRun()], total: 1 },
			})
			expect(w.find('.cn-flow-runs-widget__empty').text()).toBe('No flows are running')
			expect(w.find('.cn-flow-runs-widget__history-title').exists()).toBe(true)
		})

		it('keeps the org-wide empty line without a subject', () => {
			const w = mountWidget({ content: {} })
			expect(w.find('.cn-flow-runs-widget__empty').text()).toBe('No flows are running')
		})
	})

	describe('the run deep link', () => {
		it('opens the runRoute with the RUN uuid', () => {
			const push = jest.fn(() => Promise.resolve())
			const w = mountWidget({
				content: { subject: CASE_UUID, runRoute: 'RunDetail', rowRoute: 'GraphDetail' },
				active: { results: [liveRun({ uuid: 'run-77' })], total: 1 },
				router: { push },
			})
			w.find('.cn-flow-runs-widget__row').trigger('click')
			expect(push).toHaveBeenCalledWith({ name: 'RunDetail', params: { id: 'run-77' } })
		})

		it('falls back to the rowRoute flow id when the row has no run uuid', () => {
			const push = jest.fn(() => Promise.resolve())
			const w = mountWidget({
				content: { runRoute: 'RunDetail', rowRoute: 'GraphDetail' },
				active: { results: [liveRun({ uuid: undefined, flowId: 'flow-9' })], total: 1 },
				router: { push },
			})
			w.find('.cn-flow-runs-widget__row').trigger('click')
			expect(push).toHaveBeenCalledWith({ name: 'GraphDetail', params: { id: 'flow-9' } })
		})

		it('deep-links history rows too', () => {
			const push = jest.fn(() => Promise.resolve())
			const w = mountWidget({
				content: { subject: CASE_UUID, runRoute: 'RunDetail' },
				completed: { results: [doneRun({ uuid: 'run-done-9' })], total: 1 },
				router: { push },
			})
			w.find('.cn-flow-runs-widget__row--terminal').trigger('click')
			expect(push).toHaveBeenCalledWith({ name: 'RunDetail', params: { id: 'run-done-9' } })
		})

		it('stays inert with neither route configured', () => {
			const push = jest.fn()
			const w = mountWidget({
				content: { subject: CASE_UUID },
				active: { results: [liveRun()], total: 1 },
				router: { push },
			})
			w.find('.cn-flow-runs-widget__row').trigger('click')
			expect(push).not.toHaveBeenCalled()
		})
	})

	describe('polling', () => {
		afterEach(() => {
			jest.useRealTimers()
		})

		it('refetches BOTH reads on the interval with a subject', () => {
			jest.useFakeTimers()
			const w = mountWidget({ content: { subject: CASE_UUID, pollSeconds: 10 } })
			jest.advanceTimersByTime(20_000)
			expect(mockRefetchActive).toHaveBeenCalledTimes(2)
			expect(mockRefetchCompleted).toHaveBeenCalledTimes(2)
			w.unmount()
		})

		it('leaves the completed read alone without a subject', () => {
			jest.useFakeTimers()
			const w = mountWidget({ content: { pollSeconds: 10 } })
			jest.advanceTimersByTime(20_000)
			expect(mockRefetchActive).toHaveBeenCalledTimes(2)
			expect(mockRefetchCompleted).not.toHaveBeenCalled()
			w.unmount()
		})
	})
})
