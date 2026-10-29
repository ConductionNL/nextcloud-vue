/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFlowRunsWidget with status pills, as the Dq case boards draw "Flows":
 * the finished runs only, each with its trigger in words, a pill and the
 * moment it started (r31: live added a quiet line, an "Earlier runs" heading
 * and "13d").
 *
 * @spec openspec/changes/flow-runs-ruled-with-pills/specs/cn-flow-runs-widget/spec.md
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
		mocks: router ? { $router: { resolve: (loc) => ({ href: `/${loc.name}/${loc.params.id}` }), ...router } } : {},
		stubs: { NcLoadingIcon: true },
		provide,
	})
}

describe('CnFlowRunsWidget status pills', () => {
	const board = {
		subject: CASE_UUID,
		statusPill: true,
		historyTitle: false,
		quietLineWithHistory: false,
		age: 'datetime',
		statusLabels: { completed: 'Succeeded' },
		triggerLabels: { 'object.created': 'Started when the case was created' },
	}
	const started = new Date(2026, 9, 3, 14, 32)

	it('lists the finished runs alone, each with its trigger in words, a pill and when it started', () => {
		const w = mountWidget({
			content: board,
			completed: { results: [doneRun({ flowName: 'Ontvangstbevestiging versturen', created: started.toISOString() })], total: 1 },
		})
		const text = w.text()
		expect(text).not.toContain('No flows are running')
		expect(text).not.toContain('Earlier runs')
		expect(text).toContain('Ontvangstbevestiging versturen')
		expect(text).toContain('Started when the case was created')
		expect(w.find('.cn-flow-runs-widget__pill').text()).toContain('Succeeded')
		expect(w.find('.cn-flow-runs-widget__dot').exists()).toBe(false)
		expect(w.find('.cn-flow-runs-widget__age').text()).toMatch(/3.*, 14:32$/)
		expect(w.classes()).toContain('cn-flow-runs-widget--pills')
	})

	it('draws no empty live list above the finished runs, so they start right under the title', () => {
		const w = mountWidget({
			content: board,
			completed: { results: [doneRun()], total: 1 },
		})
		const lists = w.findAll('.cn-flow-runs-widget__list')
		expect(lists).toHaveLength(1)
		expect(lists.at(0).findAll('.cn-flow-runs-widget__row--terminal')).toHaveLength(1)
	})

	it('gives a failed run the error tone and keeps the status out of the meta line', () => {
		const w = mountWidget({
			content: { ...board, triggerLabels: {} },
			completed: { results: [doneRun({ status: 'failed', step: null, trigger: 'object.updated' })], total: 1 },
		})
		expect(w.find('.cn-flow-runs-widget__meta').text()).toBe('object.updated')
		expect(w.vm.statusVariant('failed')).toBe('error')
		expect(w.vm.statusVariant('completed')).toBe('success')
	})

	it('keeps the default look without the options', () => {
		const w = mountWidget({ content: { subject: CASE_UUID }, completed: { results: [doneRun()], total: 1 } })
		expect(w.text()).toContain('Earlier runs')
		expect(w.find('.cn-flow-runs-widget__dot').exists()).toBe(true)
		expect(w.find('.cn-flow-runs-widget__pill').exists()).toBe(false)
	})
})
