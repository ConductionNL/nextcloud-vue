/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record task table's column heads sort and filter, as DqZaakTaken
 * draws them (a chevron and a funnel on every head; r26c head 37 vs 42.5):
 * `content.sortable` sorts by a column on its head, `content.filterable`
 * keeps the rows with the chosen values of a column.
 *
 * @spec openspec/changes/tasks-table-head-sort-filter/specs/record-task-table/spec.md
 */
var mockState = { data: null, loading: false, error: '' }
jest.mock('../../src/composables/useEndpointSource.js', () => {
	const { computed } = require('vue')
	return {
		useEndpointSource: () => ({
			data: computed(() => mockState.data),
			loading: computed(() => mockState.loading),
			error: computed(() => mockState.error),
			refetch: jest.fn(() => Promise.resolve()),
		}),
	}
})
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: jest.fn() } }))
jest.mock('@nextcloud/auth', () => ({ __esModule: true, getCurrentUser: () => ({ uid: 'pieter' }) }))
jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: () => '' }))

import { mount } from '@vue/test-utils'
const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default

const ROWS = [
	{ uuid: 'a', displayTitle: 'Besluit opstellen', state: 'active', isTerminal: false, assignee: 'pieter', dueAt: '2026-10-20T00:00:00Z' },
	{ uuid: 'b', displayTitle: 'Advies vragen', state: 'active', isTerminal: false, assignee: 'lars', dueAt: '2026-10-12T00:00:00Z' },
	{ uuid: 'c', displayTitle: 'Ontvangst bevestigen', state: 'completed', isTerminal: true, assignee: 'pieter', dueAt: '2026-10-04T00:00:00Z' },
]

function mountTable(extra = {}) {
	return mount(CnTasksWidget, {
		props: { content: { variant: 'table', objectUuid: '@objectId', includeDone: true, ...extra }, objectId: 'case-1' },
		global: { mocks: { $router: {} }, stubs: { NcAvatar: true, CnStatusBadge: { props: ['label'], template: '<b>{{ label }}</b>' }, RouterLink: true } },
	})
}

const titles = (w) => w.findAll('.cn-tasks-widget__name').map((n) => n.text())

beforeEach(() => {
	mockState.data = { results: ROWS, total: 3 }
})

describe('CnTasksWidget table heads', () => {
	it('draws plain heads without the options', () => {
		const w = mountTable()
		expect(w.find('[data-testid="cn-tasks-widget-sort-title"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-tasks-widget-filter-title"]').exists()).toBe(false)
	})

	it('sorts by a column from its head, ascending then descending', async () => {
		const w = mountTable({ sortable: true })
		await w.find('[data-testid="cn-tasks-widget-sort-title"]').trigger('click')
		expect(titles(w)).toEqual(['Advies vragen', 'Besluit opstellen', 'Ontvangst bevestigen'])
		expect(w.find('[data-testid="cn-tasks-widget-head-title"]').attributes('aria-sort')).toBe('ascending')
		await w.find('[data-testid="cn-tasks-widget-sort-title"]').trigger('click')
		expect(titles(w)).toEqual(['Ontvangst bevestigen', 'Besluit opstellen', 'Advies vragen'])
	})

	it('sorts the deadline by date', async () => {
		const w = mountTable({ sortable: true })
		await w.find('[data-testid="cn-tasks-widget-sort-due"]').trigger('click')
		expect(titles(w)).toEqual(['Ontvangst bevestigen', 'Advies vragen', 'Besluit opstellen'])
	})

	it('keeps the rows with a chosen value of a column', async () => {
		const w = mountTable({ filterable: true })
		expect(w.find('[data-testid="cn-tasks-widget-filter-title"]').exists()).toBe(true)
		w.vm.toggleHeadFilter('handler', 'lars')
		await w.vm.$nextTick()
		expect(titles(w)).toEqual(['Advies vragen'])
		w.vm.toggleHeadFilter('handler', 'lars')
		await w.vm.$nextTick()
		expect(titles(w)).toHaveLength(3)
	})
})
