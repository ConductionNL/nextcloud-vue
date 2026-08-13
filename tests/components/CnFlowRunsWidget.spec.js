/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFlowRunsWidget — the live flow runs for the viewer's organisation.
 *
 * The behaviours worth guarding are the ones that make it either honest or
 * dishonest:
 *  - it shows ALL non-terminal statuses, so an idle-looking widget means idle;
 *  - it states the endpoint's TOTAL, not the length of the page it rendered;
 *  - nothing running is a quiet line, not an error and not a void;
 *  - it polls, pauses on a hidden tab, and clears the timer on unmount;
 *  - rows are inert until a route is configured, then carry the FLOW id.
 */
// `mock`-prefixed names are the only out-of-scope vars a jest.mock factory may
// reference. Declared with var so hoisting keeps them defined.
var mockRefetch = jest.fn(() => Promise.resolve())
var mockState = { data: null, loading: false, error: '' }

// The composable is the fetch boundary — stub it so the tests drive the
// payload / loading / error surface directly instead of the network. Real
// computed REFS, not plain `{ value }` objects: setup()'s return is only
// unwrapped for actual refs, so a plain object would reach the component as
// `{ value: … }` and every row assertion would silently see nothing.
jest.mock('../../src/composables/useEndpointSource.js', () => {
	const { computed } = require('vue')
	return {
		useEndpointSource: () => ({
			data: computed(() => mockState.data),
			loading: computed(() => mockState.loading),
			error: computed(() => mockState.error),
			refetch: mockRefetch,
		}),
	}
})

import { mount } from '@vue/test-utils'

const CnFlowRunsWidget = require('../../src/components/CnFlowRunsWidget/CnFlowRunsWidget.vue').default

/**
 * A run row as the active-runs endpoint returns it.
 *
 * @param {object} overrides Fields to override on the default row.
 * @return {object} The row.
 */
function run(overrides = {}) {
	return {
		uuid: 'run-1',
		flowId: 'flow-1',
		flowName: 'Hydra Triage',
		status: 'suspended',
		trigger: 'object.created',
		startedBy: 'alice',
		step: 'await-approval',
		created: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
		...overrides,
	}
}

function mountWidget({ payload = null, loading = false, error = '', content = {}, router = null } = {}) {
	mockState.data = payload
	mockState.loading = loading
	mockState.error = error
	mockRefetch.mockClear()
	return mount(CnFlowRunsWidget, {
		propsData: { content, translate: (k) => k },
		mocks: router ? { $router: router } : {},
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFlowRunsWidget', () => {
	afterEach(() => {
		jest.useRealTimers()
	})

	it('renders one row per live run with its flow name, status and step', () => {
		const w = mountWidget({ payload: { results: [run()], total: 1 } })
		const rows = w.findAll('.cn-flow-runs-widget__row')
		expect(rows.length).toBe(1)
		expect(w.text()).toContain('Hydra Triage')
		expect(w.text()).toContain('await-approval')
		expect(w.text()).toContain('object.created')
	})

	it('marks the row with the run status so queued / running / waiting are distinguishable', () => {
		const w = mountWidget({ payload: { results: [run({ status: 'running' })], total: 1 } })
		expect(w.find('.cn-flow-runs-widget__dot--running').exists()).toBe(true)
	})

	it('caps the rendered rows at the configured limit', () => {
		const results = [run({ uuid: 'a' }), run({ uuid: 'b' }), run({ uuid: 'c' })]
		const w = mountWidget({ payload: { results, total: 3 }, content: { limit: 2 } })
		expect(w.findAll('.cn-flow-runs-widget__row').length).toBe(2)
	})

	it('states the remainder from the endpoint total, not from the rendered length', () => {
		const w = mountWidget({ payload: { results: [run()], total: 47 }, content: { limit: 1 } })
		expect(w.find('.cn-flow-runs-widget__more').text()).toContain('46')
	})

	it('shows no remainder line when the page is everything', () => {
		const w = mountWidget({ payload: { results: [run()], total: 1 } })
		expect(w.find('.cn-flow-runs-widget__more').exists()).toBe(false)
	})

	it('treats nothing running as a quiet line, not an error', () => {
		const w = mountWidget({ payload: { results: [], total: 0 } })
		expect(w.find('.cn-flow-runs-widget__empty').exists()).toBe(true)
		expect(w.find('.cn-flow-runs-widget__error').exists()).toBe(false)
	})

	it('honours an overridden empty text', () => {
		const w = mountWidget({ payload: { results: [], total: 0 }, content: { emptyText: 'All quiet' } })
		expect(w.find('.cn-flow-runs-widget__empty').text()).toBe('All quiet')
	})

	it('shows one quiet error line and never the raw request status text', () => {
		const w = mountWidget({ error: 'Request failed with status code 404' })
		expect(w.find('.cn-flow-runs-widget__error').exists()).toBe(true)
		expect(w.text()).not.toContain('404')
	})

	describe('polling', () => {
		it('refetches on the configured interval', () => {
			jest.useFakeTimers()
			const w = mountWidget({ payload: { results: [], total: 0 }, content: { pollSeconds: 10 } })
			jest.advanceTimersByTime(30_000)
			expect(mockRefetch).toHaveBeenCalledTimes(3)
			w.unmount()
		})

		it('does not start a timer when polling is switched off', () => {
			jest.useFakeTimers()
			const w = mountWidget({ payload: { results: [], total: 0 }, content: { pollSeconds: 0 } })
			jest.advanceTimersByTime(120_000)
			expect(mockRefetch).not.toHaveBeenCalled()
			w.unmount()
		})

		it('floors a too-eager interval at five seconds', () => {
			const w = mountWidget({ content: { pollSeconds: 0.1 } })
			expect(w.vm.pollMs).toBe(5000)
		})

		it('stops polling while the tab is hidden and resumes with one refetch', () => {
			jest.useFakeTimers()
			const w = mountWidget({ payload: { results: [], total: 0 }, content: { pollSeconds: 10 } })

			const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true)
			w.vm.onVisibilityChange()
			jest.advanceTimersByTime(60_000)
			expect(mockRefetch).not.toHaveBeenCalled()

			hidden.mockReturnValue(false)
			w.vm.onVisibilityChange()
			expect(mockRefetch).toHaveBeenCalledTimes(1)
			hidden.mockRestore()
			w.unmount()
		})

		it('clears the timer on unmount so a route change leaves nothing running', () => {
			jest.useFakeTimers()
			const w = mountWidget({ payload: { results: [], total: 0 }, content: { pollSeconds: 10 } })
			w.unmount()
			jest.advanceTimersByTime(60_000)
			expect(mockRefetch).not.toHaveBeenCalled()
		})
	})

	describe('row clicks', () => {
		it('are inert without a configured route', () => {
			const push = jest.fn()
			const w = mountWidget({ payload: { results: [run()], total: 1 }, router: { push } })
			w.find('.cn-flow-runs-widget__row').trigger('click')
			expect(push).not.toHaveBeenCalled()
		})

		it('open the configured route with the FLOW id', () => {
			const push = jest.fn(() => Promise.resolve())
			const w = mountWidget({
				payload: { results: [run({ flowId: 'flow-9' })], total: 1 },
				content: { rowRoute: 'GraphDetail' },
				router: { push },
			})
			w.find('.cn-flow-runs-widget__row').trigger('click')
			expect(push).toHaveBeenCalledWith({ name: 'GraphDetail', params: { id: 'flow-9' } })
		})
	})

	describe('age label', () => {
		it('reads "now" under a minute', () => {
			const w = mountWidget()
			expect(w.vm.ageLabel({ created: new Date().toISOString() })).toBe('now')
		})

		it('is coarse in minutes, hours and days', () => {
			const w = mountWidget()
			const ago = (ms) => ({ created: new Date(Date.now() - ms).toISOString() })
			expect(w.vm.ageLabel(ago(8 * 60_000))).toBe('8m')
			expect(w.vm.ageLabel(ago(3 * 3600_000))).toBe('3h')
			expect(w.vm.ageLabel(ago(2 * 86400_000))).toBe('2d')
		})

		it('is empty when the run carries no start time', () => {
			const w = mountWidget()
			expect(w.vm.ageLabel({})).toBe('')
		})
	})
})

describe('flow-runs registry entry', () => {
	it('registers a renderer and a form under the flow-runs type', () => {
		require('../../src/components/CnFlowRunsWidget/index.js')
		const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		const entry = getWidgetTypeEntry('flow-runs')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
	})
})
