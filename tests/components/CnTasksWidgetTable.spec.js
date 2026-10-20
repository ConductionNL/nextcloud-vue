/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksWidget's table: the tasks on one record (board DqZaakTaken), open
 * first and done after, with the summary and "New task" in the card header,
 * and the verbs a person had on the case page: claim, complete, cancel and
 * adding a task.
 *
 * @spec openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header
 */
var mockRefetch = jest.fn(() => Promise.resolve())
var mockState = { data: null, loading: false, error: '' }
var mockPost = jest.fn(() => Promise.resolve({ data: {} }))
var mockSource = null

jest.mock('../../src/composables/useEndpointSource.js', () => {
	const { computed } = require('vue')
	return {
		useEndpointSource: (source) => {
			mockSource = source
			return {
				data: computed(() => mockState.data),
				loading: computed(() => mockState.loading),
				error: computed(() => mockState.error),
				refetch: mockRefetch,
			}
		},
	}
})

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: () => ({ uid: 'pieter' }) }))

jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: (uid) => ({ pieter: 'Pieter Jansen', lars: 'Lars de Koning' })[uid] || '' }))

import { flushPromises, mount } from '@vue/test-utils'

const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default

const ROWS = [
	{ uuid: 'done-1', displayTitle: 'Ontvangst bevestigen', state: 'completed', isTerminal: true, assignee: 'pieter' },
	{ uuid: 'open-1', displayTitle: 'Documenten beoordelen', state: 'active', isTerminal: false, assignee: 'lars', priority: 'high', description: '3 van 7 nog open' },
	{ uuid: 'pool-1', displayTitle: 'Advies vragen', state: 'enabled', isTerminal: false },
]

const CONTENT = { variant: 'table', objectUuid: '@objectId', includeDone: true, create: { appId: 'dossiq' }, completeAny: true, cancel: true, limit: 25 }

/**
 * Mount the table.
 *
 * @param {object} [content] The widget content.
 * @return {import('@vue/test-utils').VueWrapper} The widget.
 */
function mountTable(content = CONTENT) {
	return mount(CnTasksWidget, {
		props: { content, objectId: 'case-1' },
		global: { stubs: { NcAvatar: true, NcActions: { template: '<div class="actions"><slot /></div>' }, NcActionButton: { template: '<button class="action" @click="$emit(\'click\')"><slot /></button>' } } },
	})
}

beforeEach(() => {
	mockState.data = { results: ROWS, total: 3 }
	mockPost.mockClear()
	mockRefetch.mockClear()
})

describe('CnTasksWidget table', () => {
	it('reads every task on the record, done included', () => {
		mountTable()
		const { params } = mockSource()
		expect(params).toMatchObject({ objectUuid: 'case-1', scope: 'all', sort: 'dueAt', limit: 25 })
		expect(params.isTerminal).toBeUndefined()
	})

	it('keeps the inbox read without a record', () => {
		mountTable({})
		const { params } = mockSource()
		expect(params).toMatchObject({ scope: 'assigned', isTerminal: 'false' })
		expect(params.objectUuid).toBeUndefined()
	})

	it('lists the open tasks first, then the done ones struck through', () => {
		const rows = mountTable().findAll('[data-testid^="cn-tasks-widget-row-"]')
		expect(rows.map((row) => row.attributes('data-testid'))).toEqual(['cn-tasks-widget-row-open-1', 'cn-tasks-widget-row-pool-1', 'cn-tasks-widget-row-done-1'])
		expect(rows[2].classes()).toContain('cn-tasks-widget__table-row--done')
		expect(rows[0].text()).toContain('Lars de Koning')
		expect(rows[0].text()).toContain('3 van 7 nog open')
	})

	it('reports the summary and New task for the card header', () => {
		const header = mountTable().emitted('header').at(-1)[0]
		expect(header.subtitle).toBe('2 open, 1 done · sorted by deadline')
		expect(header.action).toMatchObject({ label: 'New task', icon: 'Plus', variant: 'primary' })
	})

	it('offers claim on a pooled task and complete on any open one', async () => {
		const w = mountTable()
		await w.find('[data-testid="cn-tasks-widget-claim-pool-1"]').trigger('click')
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/pool-1/claim', {})
		await w.find('[data-testid="cn-tasks-widget-complete-open-1"]').trigger('click')
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/open-1/complete', { outcome: 'done' })
		expect(w.find('[data-testid="cn-tasks-widget-complete-done-1"]').exists()).toBe(false)
	})

	it('offers cancel on an open task with cancel', async () => {
		const w = mountTable()
		await w.find('[data-testid="cn-tasks-widget-cancel-open-1"]').trigger('click')
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/open-1/cancel', {})
	})

	it('adds a task on the record from the header action', async () => {
		const w = mountTable()
		w.emitted('header').at(-1)[0].action.run()
		await flushPromises()
		expect(w.find('[data-testid="cn-tasks-widget-create"]').exists()).toBe(true)
		w.findComponent('[data-testid="cn-tasks-widget-create-title"]').vm.$emit('update:modelValue', 'Stukken opvragen')
		await flushPromises()
		await w.find('[data-testid="cn-tasks-widget-create"]').trigger('submit')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks', { title: 'Stukken opvragen', objectUuid: 'case-1', state: 'available', appId: 'dossiq' })
		expect(mockRefetch).toHaveBeenCalled()
	})

	it('offers no New task without a record', () => {
		const header = mountTable({ variant: 'table', create: true }).emitted('header').at(-1)[0]
		expect(header.action).toBeUndefined()
	})
})
