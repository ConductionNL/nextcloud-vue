/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksWidget — the viewer's open tasks (cn-tasks-entity-source).
 *
 * The behaviours worth guarding are the ones that make it honest or
 * dishonest:
 *  - the count and the remainder state the endpoint's TOTAL, never the
 *    rendered length;
 *  - an empty inbox, a failed read and loading are three different states;
 *  - only verbs the row's contract can accept are offered, and a refusal is
 *    toasted in the SERVER'S words, never swallowed;
 *  - every verb refetches, so a lost claim race corrects the row;
 *  - it polls, pauses on a hidden tab, and clears the timer on unmount.
 */
var mockRefetch = jest.fn(() => Promise.resolve())
var mockState = { data: null, loading: false, error: '' }
var mockPost = jest.fn(() => Promise.resolve({ data: {} }))
var mockUid = { uid: 'alice' }

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

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: {} })),
		post: (...args) => mockPost(...args),
	},
}))

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => mockUid,
}))

import { mount } from '@vue/test-utils'
import { showError } from '@nextcloud/dialogs'

const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default

/**
 * A task row as the inbox read returns it.
 *
 * @param {object} overrides Fields to override on the default row.
 * @return {object} The row.
 */
function task(overrides = {}) {
	return {
		uuid: 'task-1',
		displayTitle: 'Beoordeel offerte serverhal',
		state: 'active',
		isTerminal: false,
		priority: 'high',
		assignee: 'alice',
		subject: { uuid: 'o-1', register: 'dossiq', schema: 'case', title: 'Dossier 12' },
		dueAt: '2026-09-04T17:00:00+02:00',
		overdue: false,
		daysUntilDue: 3,
		daysOverdue: null,
		...overrides,
	}
}

function mountWidget({ payload = null, loading = false, error = '', content = {}, router = null } = {}) {
	mockState.data = payload
	mockState.loading = loading
	mockState.error = error
	mockRefetch.mockClear()
	mockPost.mockClear()
	showError.mockClear()
	return mount(CnTasksWidget, {
		propsData: { content, translate: (k) => k },
		mocks: router ? { $router: router } : {},
		stubs: { NcLoadingIcon: true },
	})
}

/** Flush pending microtasks so an awaited verb settles. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnTasksWidget', () => {
	afterEach(() => {
		jest.useRealTimers()
		mockUid = { uid: 'alice' }
	})

	it('renders one row per task with its title, subject, state and due wording', () => {
		const w = mountWidget({ payload: { results: [task()], total: 1 } })
		const rows = w.findAll('.cn-tasks-widget__row')
		expect(rows.length).toBe(1)
		expect(w.text()).toContain('Beoordeel offerte serverhal')
		expect(w.text()).toContain('Dossier 12')
		expect(w.text()).toContain('In progress')
		expect(w.text()).toContain('Due in 3 days')
	})

	it('states the count from the endpoint total, not the rendered length', () => {
		const w = mountWidget({ payload: { results: [task()], total: 12 }, content: { limit: 1 } })
		expect(w.find('.cn-tasks-widget__count').text()).toContain('12')
		expect(w.find('.cn-tasks-widget__more').text()).toContain('11')
	})

	it('caps the rendered rows at the configured limit', () => {
		const results = [task({ uuid: 'a' }), task({ uuid: 'b' }), task({ uuid: 'c' })]
		const w = mountWidget({ payload: { results, total: 3 }, content: { limit: 2 } })
		expect(w.findAll('.cn-tasks-widget__row').length).toBe(2)
	})

	it('marks an overdue row by wording and weight, not colour alone', () => {
		const w = mountWidget({
			payload: { results: [task({ overdue: true, daysOverdue: 3, daysUntilDue: null })], total: 1 },
		})
		const due = w.find('.cn-tasks-widget__due')
		expect(due.text()).toBe('Overdue by 3 days')
		expect(due.classes()).toContain('cn-tasks-widget__due--overdue')
	})

	it('treats an empty inbox as a quiet line, not an error', () => {
		const w = mountWidget({ payload: { results: [], total: 0 } })
		expect(w.find('.cn-tasks-widget__empty').exists()).toBe(true)
		expect(w.find('.cn-tasks-widget__error').exists()).toBe(false)
	})

	it('shows one quiet error line and never the raw request status text', () => {
		const w = mountWidget({ error: 'Request failed with status code 500' })
		expect(w.find('.cn-tasks-widget__error').exists()).toBe(true)
		expect(w.text()).not.toContain('500')
	})

	describe('the quick-action offer follows the row contract', () => {
		it('offers claim on a pooled row', () => {
			const w = mountWidget({
				payload: { results: [task({ state: 'enabled', assignee: null })], total: 1 },
			})
			expect(w.findComponent({ name: 'NcActions' }).exists()).toBe(true)
			expect(w.vm.canClaim(task({ assignee: null }))).toBe(true)
		})

		it('offers complete on the viewer\'s own open row, per declared outcome', () => {
			const row = task({ outcomes: [{ id: 'approved', label: 'Approve' }, { id: 'rejected', label: 'Reject' }] })
			const w = mountWidget({ payload: { results: [row], total: 1 } })
			expect(w.vm.canComplete(row)).toBe(true)
			expect(w.vm.outcomesOf(row).length).toBe(2)
			expect(w.vm.completeLabel(row.outcomes[0])).toBe('Complete: Approve')
		})

		it('offers a single default complete when the row declares no outcomes', () => {
			const w = mountWidget({ payload: { results: [task()], total: 1 } })
			expect(w.vm.outcomesOf(task())).toEqual(['done'])
			expect(w.vm.completeLabel('done')).toBe('Complete')
		})

		it('offers nothing on a row assigned to someone else', () => {
			const row = task({ assignee: 'bob' })
			const w = mountWidget({ payload: { results: [row], total: 1 } })
			expect(w.vm.canClaim(row)).toBe(false)
			expect(w.vm.canComplete(row)).toBe(false)
			expect(w.findComponent({ name: 'NcActions' }).exists()).toBe(false)
		})

		it('never offers a verb on a terminal row', () => {
			const row = task({ isTerminal: true, assignee: null })
			const w = mountWidget({ payload: { results: [row], total: 1 } })
			expect(w.vm.canClaim(row)).toBe(false)
			expect(w.vm.canComplete(row)).toBe(false)
		})
	})

	describe('the verbs', () => {
		it('claim posts the claim and refetches', async () => {
			const w = mountWidget({ payload: { results: [task({ assignee: null })], total: 1 } })
			await w.vm.claim(task({ uuid: 'task-9', assignee: null }))
			expect(mockPost.mock.calls[0][0]).toContain('/apps/openregister/api/flow-tasks/task-9/claim')
			expect(mockRefetch).toHaveBeenCalledWith(true)
			expect(showError).not.toHaveBeenCalled()
		})

		it('complete posts the chosen outcome', async () => {
			const w = mountWidget({ payload: { results: [task()], total: 1 } })
			await w.vm.complete(task(), 'approved')
			expect(mockPost.mock.calls[0][0]).toContain('/flow-tasks/task-1/complete')
			expect(mockPost.mock.calls[0][1]).toEqual({ outcome: 'approved' })
		})

		it('a refusal is toasted in the server\'s words, and the list refetches anyway', async () => {
			mockPost.mockRejectedValueOnce({
				response: { status: 409, data: { error: "Task 'task-1' was not claimable: another claim won, or the task is no longer open." } },
			})
			const w = mountWidget({ payload: { results: [task({ assignee: null })], total: 1 } })
			await w.vm.claim(task({ assignee: null }))
			await flush()
			expect(showError).toHaveBeenCalledWith(expect.stringContaining('another claim won'))
			expect(mockRefetch).toHaveBeenCalledWith(true)
		})

		it('a refusal without a message falls back to a generic line', async () => {
			mockPost.mockRejectedValueOnce(new Error('Network Error'))
			const w = mountWidget({ payload: { results: [task({ assignee: null })], total: 1 } })
			await w.vm.claim(task({ assignee: null }))
			await flush()
			expect(showError).toHaveBeenCalledWith('The task action was refused')
		})
	})

	describe('row clicks', () => {
		it('opens the configured route with the task uuid', () => {
			const push = jest.fn(() => Promise.resolve())
			const w = mountWidget({
				payload: { results: [task()], total: 1 },
				content: { rowRoute: 'TaskDetail' },
				router: { push },
			})
			w.vm.onRowClick(task({ uuid: 'task-4' }))
			expect(push).toHaveBeenCalledWith({ name: 'TaskDetail', params: { id: 'task-4' } })
		})

		it('falls back to the openregister deep link without a route', () => {
			const original = window.location
			delete window.location
			window.location = { assign: jest.fn(), href: original.href, pathname: original.pathname }
			try {
				const w = mountWidget({ payload: { results: [task()], total: 1 } })
				w.vm.onRowClick(task({ uuid: 'task-4' }))
				expect(window.location.assign.mock.calls[0][0]).toContain('/apps/openregister/flow-tasks/task-4')
			} finally {
				window.location = original
			}
		})
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

		it('clears the timer on unmount', () => {
			jest.useFakeTimers()
			const w = mountWidget({ payload: { results: [], total: 0 }, content: { pollSeconds: 10 } })
			w.unmount()
			jest.advanceTimersByTime(60_000)
			expect(mockRefetch).not.toHaveBeenCalled()
		})
	})
})
