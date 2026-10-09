/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksTab with source="flow-tasks".
 *
 * @spec openspec/changes/tasks-tab-flow-task-source/tasks.md#task-2
 */
const mockStore = {
	fetchFor: jest.fn(),
	createTask: jest.fn(),
	runVerb: jest.fn(),
}
jest.mock('../../src/composables/useTaskInboxStore.js', () => ({ __esModule: true, useTaskInboxStore: () => mockStore }))
jest.mock('../../src/utils/userAutocomplete.js', () => ({ __esModule: true, searchNextcloudUsers: jest.fn(async () => [{ id: 'jan', label: 'Jan' }]) }))
jest.mock('../../src/utils/searchGroupSharees.js', () => ({ __esModule: true, searchGroupSharees: jest.fn(async () => [{ id: 'backoffice', label: 'Backoffice' }]) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

import { flushPromises, mount } from '@vue/test-utils'
import CnTasksTab from '../../src/components/CnObjectSidebar/CnTasksTab.vue'

const past = '2020-01-01T00:00:00Z'
const future = '2099-01-01T00:00:00Z'
const ROWS = [
	{ uuid: 'late', title: 'Later', dueAt: future, state: 'active', assignee: 'jan', can: [] },
	{ uuid: 'soon', title: 'Sooner', dueAt: past, overdue: true, daysOverdue: 3, state: 'active', assignee: 'ruben', can: ['unclaim', 'delegate', 'complete'] },
	{ uuid: 'done', title: 'Finished', dueAt: past, state: 'completed', isTerminal: true, assignee: 'jan', can: [] },
]

const stubs = {
	NcButton: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>' },
	NcTextField: { props: ['modelValue'], template: '<input class="tf" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
	NcDateTimePickerNative: true,
	NcSelect: { template: '<div class="sel" />' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcLoadingIcon: true,
}

function panel(w) {
	return w.findComponent({ name: 'CnFlowTasksPanel' })
}

function mountTab(props = {}) {
	return mount(CnTasksTab, {
		props: { objectId: 'o-1', register: 'dossiq', schema: 'case', source: 'flow-tasks', ...props },
		global: { stubs },
	})
}

beforeEach(() => {
	Object.values(mockStore).forEach((f) => f.mockReset())
	mockStore.fetchFor.mockResolvedValue({ results: ROWS, total: 3 })
	global.fetch = jest.fn()
})

describe('CnTasksTab source', () => {
	it('keeps vtodo as the default and does not call the flow-tasks store', async () => {
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: [] }) }))
		const w = mount(CnTasksTab, { props: { objectId: 'o-1', register: 'dossiq', schema: 'case' }, global: { stubs } })
		await flushPromises()
		expect(CnTasksTab.props.source.default).toBe('vtodo')
		expect(mockStore.fetchFor).not.toHaveBeenCalled()
		expect(global.fetch.mock.calls[0][0]).toContain('/objects/dossiq/case/o-1/tasks')
		expect(w.find('[data-testid="cn-flow-tasks-panel"]').exists()).toBe(false)
	})
})

describe('CnTasksTab flow-tasks: list', () => {
	it('asks for the record\'s tasks, lists open ones by due date and folds the finished', async () => {
		const w = mountTab()
		await flushPromises()
		expect(mockStore.fetchFor).toHaveBeenCalledWith({ objectUuid: 'o-1', scope: 'all' })
		const open = w.findAll('[data-testid="cn-flow-tasks-open"] li').map((li) => li.find('a').text())
		expect(open).toEqual(['Sooner', 'Later'])
		expect(w.find('[data-testid="cn-flow-tasks-done"]').exists()).toBe(false)
		await w.get('[data-testid="cn-flow-tasks-done-toggle"]').trigger('click')
		expect(w.findAll('[data-testid="cn-flow-tasks-done"] li').map((li) => li.find('a').text())).toEqual(['Finished'])
	})

	it('emits count with the number of open tasks', async () => {
		const w = mountTab()
		await flushPromises()
		expect(w.emitted('count').at(-1)).toEqual([2])
	})

	it('marks an overdue task in words and links the title to the task page', async () => {
		const w = mountTab()
		await flushPromises()
		const first = w.findAll('[data-testid="cn-flow-tasks-open"] li')[0]
		expect(first.get('[data-testid="cn-flow-tasks-due"]').classes()).toContain('cn-flow-tasks__due--overdue')
		expect(first.get('[data-testid="cn-flow-tasks-due"]').text()).toContain('Overdue by 3 days')
		expect(first.get('a').attributes('href')).toBe('/apps/openregister/flow-tasks/soon')
	})
})

describe('CnTasksTab flow-tasks: create', () => {
	it('posts the title, assignee and the record anchor, then relists', async () => {
		mockStore.createTask.mockResolvedValue({ ok: true, status: 201 })
		const w = mountTab()
		await flushPromises()
		await w.get('.tf').setValue('Bel aanvrager terug')
		panel(w).vm.assignee = { kind: 'user', id: 'jan', label: 'Jan' }
		await panel(w).vm.addTask()
		expect(mockStore.createTask).toHaveBeenCalledWith(expect.objectContaining({
			title: 'Bel aanvrager terug',
			anchor: { objectUuid: 'o-1', registerId: 'dossiq', schemaId: 'case' },
			assignee: { kind: 'user', id: 'jan' },
		}))
		expect(mockStore.fetchFor).toHaveBeenCalledTimes(2)
		expect(panel(w).vm.title).toBe('')
	})

	it('passes a group as a group assignee', async () => {
		mockStore.createTask.mockResolvedValue({ ok: true, status: 201 })
		const w = mountTab()
		await flushPromises()
		panel(w).vm.title = 'x'
		panel(w).vm.assignee = { kind: 'group', id: 'backoffice', label: 'Backoffice (group)' }
		await panel(w).vm.addTask()
		expect(mockStore.createTask.mock.calls[0][0].assignee).toEqual({ kind: 'group', id: 'backoffice' })
	})

	it('says the record can no longer be opened on a 404', async () => {
		mockStore.createTask.mockResolvedValue({ ok: false, status: 404, message: 'nope' })
		const w = mountTab()
		await flushPromises()
		panel(w).vm.title = 'x'
		await panel(w).vm.addTask()
		await flushPromises()
		expect(w.get('[data-testid="cn-flow-tasks-form-error"]').text()).toBe('You can no longer open this record.')
	})

	it('keeps the form open with the server message on any other refusal', async () => {
		mockStore.createTask.mockResolvedValue({ ok: false, status: 422, message: 'Title too long' })
		const w = mountTab()
		await flushPromises()
		panel(w).vm.title = 'x'
		await panel(w).vm.addTask()
		await flushPromises()
		expect(w.get('[data-testid="cn-flow-tasks-form-error"]').text()).toBe('Title too long')
		expect(panel(w).vm.title).toBe('x')
	})
})

describe('CnTasksTab flow-tasks: verbs from the row can list', () => {
	const verbsOn = (w, uuid) => w.findAll(`[data-task="${uuid}"] .cn-flow-tasks__verbs button`).map((b) => b.attributes('data-testid').replace('cn-flow-tasks-verb-', ''))

	it('offers only the verbs the tab has a control for, in order, and none for can: []', async () => {
		const w = mountTab()
		await flushPromises()
		expect(verbsOn(w, 'soon')).toEqual(['unclaim', 'complete'])
		expect(verbsOn(w, 'late')).toEqual([])
	})

	it('offers Claim and nothing else for a pool task', async () => {
		mockStore.fetchFor.mockResolvedValue({ results: [{ uuid: 'p', title: 'Pool', state: 'enabled', candidateGroups: ['backoffice'], can: ['claim'] }], total: 1 })
		const w = mountTab()
		await flushPromises()
		expect(verbsOn(w, 'p')).toEqual(['claim'])
		expect(w.text()).toContain('Pool: backoffice')
	})

	it('derives no verb from state or assignee when can is missing', async () => {
		mockStore.fetchFor.mockResolvedValue({ results: [{ uuid: 'x', title: 'Old', state: 'active', assignee: 'ruben' }], total: 1 })
		const w = mountTab()
		await flushPromises()
		expect(verbsOn(w, 'x')).toEqual([])
		expect(w.get('[data-task="x"] a').attributes('href')).toBe('/apps/openregister/flow-tasks/x')
	})

	it('shows the server message on the row and leaves it as it was when a verb is refused', async () => {
		mockStore.fetchFor.mockResolvedValue({ results: [{ uuid: 'p', title: 'Pool', state: 'enabled', candidateGroups: ['backoffice'], can: ['claim'] }], total: 1 })
		mockStore.runVerb.mockResolvedValue({ ok: false, status: 403, message: 'You left the pool' })
		const w = mountTab()
		await flushPromises()
		await w.get('[data-testid="cn-flow-tasks-verb-claim"]').trigger('click')
		await flushPromises()
		expect(mockStore.runVerb).toHaveBeenCalledWith('p', 'claim', {})
		expect(w.get('[data-testid="cn-flow-tasks-row-error"]').text()).toBe('You left the pool')
		expect(mockStore.fetchFor).toHaveBeenCalledTimes(1)
		expect(verbsOn(w, 'p')).toEqual(['claim'])
	})

	it('relists after a verb the server accepted', async () => {
		mockStore.runVerb.mockResolvedValue({ ok: true, status: 200 })
		const w = mountTab()
		await flushPromises()
		await w.get('[data-task="soon"] [data-testid="cn-flow-tasks-verb-complete"]').trigger('click')
		await flushPromises()
		expect(mockStore.runVerb).toHaveBeenCalledWith('soon', 'complete', {})
		expect(mockStore.fetchFor).toHaveBeenCalledTimes(2)
	})

	it('reassigns to the user picked in the row, sending the assignee', async () => {
		mockStore.fetchFor.mockResolvedValue({ results: [{ uuid: 'r', title: 'R', state: 'active', assignee: 'ruben', can: ['reassign'] }], total: 1 })
		mockStore.runVerb.mockResolvedValue({ ok: true, status: 200 })
		const w = mountTab()
		await flushPromises()
		await w.get('[data-testid="cn-flow-tasks-verb-reassign"]').trigger('click')
		await panel(w).vm.reassign({ uuid: 'r' }, { kind: 'user', id: 'jan' })
		expect(mockStore.runVerb).toHaveBeenCalledWith('r', 'reassign', { assignee: 'jan' })
	})
})
