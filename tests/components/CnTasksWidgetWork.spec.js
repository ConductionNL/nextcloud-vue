/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksWidget working on a record's tasks in place: the focus card, an
 * opened table row, completing through an app route, claim behind a
 * capability, and a task's form.
 *
 * @spec openspec/changes/task-widget-on-the-record/specs/task-widget-on-the-record/spec.md#requirement-the-first-open-task-can-be-worked-on-in-place
 * @spec openspec/changes/task-widget-on-the-record/specs/task-widget-on-the-record/spec.md#requirement-claim-follows-a-capability
 */
var mockRefetch = jest.fn(() => Promise.resolve())
var mockState = { data: null, loading: false, error: '' }
var mockPost = jest.fn(() => Promise.resolve({ data: {} }))
var mockGet = jest.fn(() => Promise.resolve({ data: {} }))
var mockShowError = jest.fn()
var mockShowSuccess = jest.fn()

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
	default: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showError: (...args) => mockShowError(...args),
	showSuccess: (...args) => mockShowSuccess(...args),
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: () => ({ uid: 'pieter' }) }))

jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: () => '' }))

import { flushPromises, mount } from '@vue/test-utils'

const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default

const FORM = { kind: 'fields', state: 'ready', fields: [{ field: 'verslag', required: true, renderable: true, order: 0 }] }

const ROWS = [
	{ uuid: 'open-1', displayTitle: 'Documenten beoordelen', state: 'active', isTerminal: false, assignee: 'lars', number: 'T-12', form: FORM },
	{ uuid: 'pool-1', displayTitle: 'Advies vragen', state: 'enabled', isTerminal: false, candidateGroups: ['team-vergunningen'] },
	{ uuid: 'done-1', displayTitle: 'Ontvangst bevestigen', state: 'completed', isTerminal: true, assignee: 'pieter' },
]

const COMPLETE_URL = '/apps/dossiq/api/case-tasks/{id}/complete'

/**
 * @param {object} content The widget content.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function mountWidget(content) {
	return mount(CnTasksWidget, {
		props: { content: { objectUuid: '@objectId', includeDone: true, ...content }, objectId: 'case-1' },
		global: {
			stubs: {
				NcAvatar: true,
				NcActions: { template: '<div class="actions"><slot /></div>' },
				NcActionButton: { template: '<button class="action" @click="$emit(\'click\')"><slot /></button>' },
				CnTaskFormDialog: { name: 'CnTaskFormDialog', props: ['task', 'completeUrl', 'outcome'], template: '<div class="form-dialog" />' },
			},
		},
	})
}

beforeEach(() => {
	mockState.data = { results: ROWS, total: 3 }
	mockPost.mockClear()
	mockGet.mockReset()
	mockGet.mockImplementation(() => Promise.resolve({ data: {} }))
	mockShowError.mockClear()
	mockShowSuccess.mockClear()
})

describe('CnTasksWidget focus card', () => {
	it('shows the first open task with its number, lock and form, and the other open tasks under it', () => {
		const w = mountWidget({ variant: 'focus' })
		expect(w.find('[data-testid="cn-tasks-widget-work-title"]').text()).toBe('Documenten beoordelen')
		expect(w.find('[data-testid="cn-tasks-widget-work-reference"]').text()).toBe('T-12')
		expect(w.find('[data-testid="cn-tasks-widget-work-lock"]').text()).toBe('Not tracked')
		expect(w.find('[data-testid="cn-tasks-widget-work-form-verslag"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-tasks-widget-other-pool-1"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-tasks-widget-other-done-1"]').exists()).toBe(false)
	})

	it('names a required field left empty and posts nothing', async () => {
		const w = mountWidget({ variant: 'focus', completeUrl: COMPLETE_URL })
		await w.find('[data-testid="cn-tasks-widget-work-complete"]').trigger('click')
		expect(mockShowError).toHaveBeenCalledWith('Fill in {field} before completing this task'.replace('{field}', 'verslag'))
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('completes through the app route with the answers and says so', async () => {
		const w = mountWidget({ variant: 'focus', completeUrl: COMPLETE_URL })
		w.findComponent({ name: 'CnTaskWorkCard' }).vm.$emit('answer', { field: 'verslag', value: 'Akkoord' })
		await w.find('[data-testid="cn-tasks-widget-work-complete"]').trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/apps/dossiq/api/case-tasks/open-1/complete', { outcome: 'done', data: { verslag: 'Akkoord' } })
		expect(mockShowSuccess).toHaveBeenCalledWith('Task Documenten beoordelen finished')
	})

	it('shows the server sentence when the app refuses the completion', async () => {
		mockPost.mockImplementationOnce(() => Promise.reject({ response: { data: { message: 'Het besluit ontbreekt nog' } } }))
		const w = mountWidget({ variant: 'focus' })
		w.findComponent({ name: 'CnTaskWorkCard' }).vm.$emit('answer', { field: 'verslag', value: 'x' })
		await w.find('[data-testid="cn-tasks-widget-work-complete"]').trigger('click')
		await flushPromises()
		expect(mockShowError).toHaveBeenCalledWith('Het besluit ontbreekt nog')
	})
})

describe('CnTasksWidget focus card view all', () => {
	it('draws "View all" under the list, scoped to the record, and not in the card header', () => {
		const w = mount(CnTasksWidget, {
			props: { content: { variant: 'focus', objectUuid: '@objectId', viewAllRoute: { name: 'Tasks', query: { case: '@objectId' } } }, objectId: 'case-1' },
			global: {
				mocks: { $router: {} },
				stubs: { NcAvatar: true, RouterLink: { props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' } },
			},
		})
		const link = w.find('[data-testid="cn-tasks-widget-view-all"]')
		expect(link.text()).toBe('View all')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'Tasks', query: { case: 'case-1' } })
		expect(w.emitted('header').at(-1)[0].link).toBeNull()
	})
})

describe('CnTasksWidget claim behind a capability', () => {
	it('offers no Claim and says to assign when the engine cannot claim', async () => {
		mockGet.mockImplementation(() => Promise.resolve({ data: { claim: false } }))
		mockState.data = { results: [ROWS[1]], total: 1 }
		const w = mountWidget({ variant: 'focus', claimCapabilityUrl: '/apps/dossiq/api/case-tasks/capabilities' })
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/apps/dossiq/api/case-tasks/capabilities')
		expect(w.find('[data-testid="cn-tasks-widget-work-claim"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-tasks-widget-work-candidates"]').text()).toContain('Nobody can claim it here yet')
	})

	it('offers Claim when the engine can claim, and toasts the claim', async () => {
		mockGet.mockImplementation(() => Promise.resolve({ data: { claim: true } }))
		mockState.data = { results: [ROWS[1]], total: 1 }
		const w = mountWidget({ variant: 'focus', claimCapabilityUrl: '/caps' })
		await flushPromises()
		expect(w.find('[data-testid="cn-tasks-widget-work-candidates"]').text()).toBe('Waiting for someone from team-vergunningen')
		await w.find('[data-testid="cn-tasks-widget-work-claim"]').trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/pool-1/claim', {})
		expect(mockShowSuccess).toHaveBeenCalledWith('Task Advies vragen is yours')
	})

	it('leaves Claim off when the capability read fails', async () => {
		mockGet.mockImplementation(() => Promise.reject(new Error('500')))
		mockState.data = { results: [ROWS[1]], total: 1 }
		const w = mountWidget({ variant: 'table', claimCapabilityUrl: '/caps' })
		await flushPromises()
		expect(w.find('[data-testid="cn-tasks-widget-claim-pool-1"]').exists()).toBe(false)
	})
})

describe('CnTasksWidget table rows opened in place', () => {
	it('opens a row under the table and says so on its toggle', async () => {
		const w = mountWidget({ variant: 'table', expandRows: true, completeAny: true, rowRoute: 'TaskDetail' })
		const toggle = w.find('[data-testid="cn-tasks-widget-expand-pool-1"]')
		expect(toggle.attributes('aria-expanded')).toBe('false')
		await toggle.trigger('click')
		expect(toggle.attributes('aria-expanded')).toBe('true')
		expect(w.find('[data-testid="cn-tasks-widget-work-title"]').text()).toBe('Advies vragen')
		await toggle.trigger('click')
		expect(w.find('[data-testid="cn-tasks-widget-work"]').exists()).toBe(false)
	})

	it('completes a task with a form through the form dialog, on the app route', async () => {
		const w = mountWidget({ variant: 'table', completeAny: true, completeUrl: COMPLETE_URL })
		await w.find('[data-testid="cn-tasks-widget-complete-open-1"]').trigger('click')
		const dialog = w.findComponent({ name: 'CnTaskFormDialog' })
		expect(dialog.props('task').uuid).toBe('open-1')
		expect(dialog.props('completeUrl')).toBe(COMPLETE_URL)
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('completes a task without a form on the app route', async () => {
		mockState.data = { results: [{ ...ROWS[0], form: null }], total: 1 }
		const w = mountWidget({ variant: 'table', completeAny: true, completeUrl: COMPLETE_URL })
		await w.find('[data-testid="cn-tasks-widget-complete-open-1"]').trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/apps/dossiq/api/case-tasks/open-1/complete', { outcome: 'done' })
	})
})
