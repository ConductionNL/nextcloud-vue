/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksWidget `content.delegate`: the viewer's own open task offers "Hand
 * to a colleague", the dialog asks for the colleague and the mandate and
 * posts them to the engine's `delegate` verb, and a delegated task shows on
 * whose behalf it is handled.
 *
 * @spec openspec/changes/task-widget-delegate/specs/task-widget-delegate/spec.md#requirement-the-tasks-widget-offers-delegation-on-the-viewers-own-open-task
 * @spec openspec/changes/task-widget-delegate/specs/task-widget-delegate/spec.md#requirement-a-delegated-task-names-who-it-is-handled-for
 */
var mockRefetch = jest.fn(() => Promise.resolve())
var mockState = { data: null, loading: false, error: '' }
var mockPost = jest.fn(() => Promise.resolve({ data: {} }))
var mockSearch = jest.fn(() => Promise.resolve([{ id: 'karin', label: 'Karin de Wit', subline: '' }]))

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
	default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path) => `/nc${path}`, generateOcsUrl: (path) => `/ocs/${path}` }))

jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))

jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: () => ({ uid: 'pieter' }) }))

jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: (uid) => ({ pieter: 'Pieter Jansen', lars: 'Lars de Koning', karin: 'Karin de Wit', jan: 'Jan Bakker' })[uid] || '' }))

jest.mock('../../src/utils/userAutocomplete.js', () => ({ searchNextcloudUsers: (...args) => mockSearch(...args) }))

import { flushPromises, mount } from '@vue/test-utils'

const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default
const CnTaskDelegateDialog = require('../../src/components/CnTasksWidget/CnTaskDelegateDialog.vue').default

const ROWS = [
	{ uuid: 'mine-1', displayTitle: 'Inkooporder PO-2026-040 goedkeuren', state: 'active', isTerminal: false, assignee: 'pieter' },
	{ uuid: 'other-1', displayTitle: 'Inkooporder PO-2026-041 goedkeuren', state: 'active', isTerminal: false, assignee: 'lars' },
	{ uuid: 'done-1', displayTitle: 'Inkooporder PO-2026-039 goedkeuren', state: 'completed', isTerminal: true, assignee: 'karin', onBehalfOf: 'jan' },
]

const DIALOG_STUBS = {
	NcDialog: { template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
	NcSelect: { props: ['modelValue', 'options'], emits: ['update:modelValue', 'search'], template: '<div class="select" />' },
	NcTextArea: { props: ['modelValue'], emits: ['update:modelValue'], template: '<textarea class="mandate" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
	NcButton: { props: ['disabled'], emits: ['click'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
}

/**
 * Mount the table.
 *
 * @param {object} content The widget content.
 * @return {import('@vue/test-utils').VueWrapper} The widget.
 */
function mountTable(content) {
	return mount(CnTasksWidget, {
		props: { content, objectId: 'po-1' },
		global: {
			stubs: {
				NcAvatar: true,
				NcActions: { template: '<div class="actions"><slot /></div>' },
				NcActionButton: { template: '<button class="action" @click="$emit(\'click\')"><slot /></button>' },
				CnTaskDelegateDialog: { name: 'CnTaskDelegateDialog', props: ['task', 'title'], emits: ['delegated', 'close'], template: '<div class="delegate-dialog-stub" />' },
			},
		},
	})
}

/**
 * Mount the dialog for one task.
 *
 * @return {import('@vue/test-utils').VueWrapper} The dialog.
 */
function mountDialog() {
	return mount(CnTaskDelegateDialog, {
		props: { task: { uuid: 'mine-1' }, title: 'PO-2026-040' },
		global: { stubs: DIALOG_STUBS },
	})
}

beforeEach(() => {
	mockState.data = { results: ROWS, total: 3 }
	mockPost.mockReset()
	mockPost.mockImplementation(() => Promise.resolve({ data: {} }))
	mockRefetch.mockClear()
	mockSearch.mockClear()
})

describe('CnTasksWidget content.delegate', () => {
	const CONTENT = { variant: 'table', objectUuid: '@objectId', includeDone: true, delegate: true }

	it('offers Hand to a colleague on the viewer\'s own open task only', () => {
		const w = mountTable(CONTENT)
		expect(w.find('[data-testid="cn-tasks-widget-delegate-mine-1"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-tasks-widget-delegate-other-1"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-tasks-widget-delegate-done-1"]').exists()).toBe(false)
	})

	it('offers nothing without the key', () => {
		const w = mountTable({ variant: 'table', objectUuid: '@objectId', includeDone: true })
		expect(w.find('[data-testid^="cn-tasks-widget-delegate-"]').exists()).toBe(false)
	})

	it('opens the dialog for the row, and refetches once the task is handed over', async () => {
		const w = mountTable(CONTENT)
		await w.find('[data-testid="cn-tasks-widget-delegate-mine-1"]').trigger('click')
		const dialog = w.findComponent({ name: 'CnTaskDelegateDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('task').uuid).toBe('mine-1')

		dialog.vm.$emit('delegated', { delegate: { id: 'karin', label: 'Karin de Wit' } })
		await flushPromises()
		expect(w.findComponent({ name: 'CnTaskDelegateDialog' }).exists()).toBe(false)
		expect(mockRefetch).toHaveBeenCalled()
	})

	it('names on whose behalf a delegated task is handled', () => {
		const w = mountTable(CONTENT)
		expect(w.find('[data-testid="cn-tasks-widget-on-behalf-of-done-1"]').text()).toBe('on behalf of Jan Bakker')
		expect(w.find('[data-testid="cn-tasks-widget-on-behalf-of-mine-1"]').exists()).toBe(false)
	})
})

describe('CnTaskDelegateDialog', () => {
	it('keeps Hand over disabled until a colleague and a mandate are given', async () => {
		const w = mountDialog()
		const submit = () => w.find('[data-testid="cn-task-delegate-submit"]')
		expect(submit().attributes('disabled')).toBeDefined()

		w.findComponent(DIALOG_STUBS.NcSelect).vm.$emit('update:modelValue', { id: 'karin', label: 'Karin de Wit' })
		await w.find('textarea').setValue('   ')
		expect(submit().attributes('disabled')).toBeDefined()

		await w.find('textarea').setValue('Absence of the team lead, mandate 2026-07')
		expect(submit().attributes('disabled')).toBeUndefined()
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('posts the colleague and the trimmed mandate to the delegate verb', async () => {
		mockPost.mockImplementation(() => Promise.resolve({ data: { task: { uuid: 'mine-1', assignee: 'karin', onBehalfOf: 'pieter' } } }))
		const w = mountDialog()
		w.findComponent(DIALOG_STUBS.NcSelect).vm.$emit('update:modelValue', { id: 'karin', label: 'Karin de Wit' })
		await w.find('textarea').setValue(' Absence of the team lead ')
		await w.find('[data-testid="cn-task-delegate-submit"]').trigger('click')
		await flushPromises()

		expect(mockPost).toHaveBeenCalledWith('/nc/apps/openregister/api/flow-tasks/mine-1/delegate', { delegate: 'karin', mandate: 'Absence of the team lead' })
		const delegated = w.emitted('delegated')[0][0]
		expect(delegated.task.onBehalfOf).toBe('pieter')
		expect(delegated.delegate.label).toBe('Karin de Wit')
	})

	it('shows a refusal in the server\'s words and stays open', async () => {
		mockPost.mockImplementation(() => Promise.reject({ response: { status: 403, data: { error: 'Only the performer may delegate this task.' } } }))
		const w = mountDialog()
		w.findComponent(DIALOG_STUBS.NcSelect).vm.$emit('update:modelValue', { id: 'karin', label: 'Karin de Wit' })
		await w.find('textarea').setValue('Mandate 2026-07')
		await w.find('[data-testid="cn-task-delegate-submit"]').trigger('click')
		await flushPromises()

		expect(w.find('[data-testid="cn-task-delegate-error"]').text()).toBe('Only the performer may delegate this task.')
		expect(w.emitted('delegated')).toBeUndefined()
		expect(w.emitted('close')).toBeUndefined()
	})

	it('searches colleagues without the viewer', async () => {
		const w = mountDialog()
		w.findComponent(DIALOG_STUBS.NcSelect).vm.$emit('search', 'kar')
		await flushPromises()
		expect(mockSearch).toHaveBeenCalledWith('kar', { includeCurrentUser: false })
		expect(w.findComponent(DIALOG_STUBS.NcSelect).props('options')).toEqual([{ id: 'karin', label: 'Karin de Wit', subline: '' }])
	})
})
