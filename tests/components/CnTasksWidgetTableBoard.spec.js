/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record task table as DqZaakTaken draws it: the deadline as a date
 * ("18 okt") rather than "Overdue by 4 days", a task's state in the app's own
 * words and tone ("In behandeling" purple, "Klaar"), and "All tasks of this
 * case" under the table instead of in the card header.
 *
 * @spec openspec/changes/tasks-table-board-options/specs/record-task-table/spec.md#requirement-the-task-table-can-show-dates-its-own-state-words-and-a-footer-link
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
	{ uuid: 'open-1', displayTitle: 'Documenten beoordelen', state: 'active', isTerminal: false, assignee: 'lars', dueAt: '2026-10-18T00:00:00Z', overdue: true, daysOverdue: 4 },
	{ uuid: 'done-1', displayTitle: 'Ontvangst bevestigen', state: 'completed', isTerminal: true, assignee: 'pieter', dueAt: '2026-10-04T00:00:00Z' },
]
const BASE = { variant: 'table', objectUuid: '@objectId', includeDone: true, viewAllRoute: { name: 'Tasks' }, viewAllLabel: 'All tasks of this case' }

/**
 * @param {object} extra Extra content.
 * @return {object} The widget.
 */
function mountTable(extra = {}) {
	return mount(CnTasksWidget, {
		props: { content: { ...BASE, ...extra }, objectId: 'case-1' },
		global: { mocks: { $router: {} }, stubs: { NcAvatar: true, CnStatusBadge: { props: ['label', 'variant', 'colorMap', 'colorKey'], template: '<b class="badge" :data-variant="variant" :data-key="colorKey" :data-map="JSON.stringify(colorMap)">{{ label }}</b>' }, RouterLink: { props: ['to'], template: '<a class="router-link"><slot /></a>' } } },
	})
}

const row = (w, id) => w.find(`[data-testid="cn-tasks-widget-row-${id}"]`)

beforeEach(() => {
	mockState.data = { results: ROWS, total: 2 }
})

describe('CnTasksWidget table on the board', () => {
	it('shows the deadline as a date with dueFormat date, still saying overdue to a screen reader', () => {
		const due = row(mountTable({ dueFormat: 'date' }), 'open-1').find('.cn-tasks-widget__cell-due')
		expect(due.text()).toContain('18')
		expect(due.text()).not.toContain('Overdue by')
		expect(due.find('.hidden-visually').text()).toBe('Overdue')
		expect(due.classes()).toContain('cn-tasks-widget__due--overdue')
	})

	it('keeps the relative deadline by default', () => {
		expect(row(mountTable(), 'open-1').find('.cn-tasks-widget__cell-due').text()).toBe('Overdue by 4 days')
	})

	it('words and colours a state the app declares', () => {
		const w = mountTable({ stateLabels: { completed: 'Done', active: 'In progress' }, stateColors: { active: 'purple' } })
		const open = row(w, 'open-1').find('.badge')
		expect(open.text()).toBe('In progress')
		expect(JSON.parse(open.attributes('data-map'))).toEqual({ active: 'purple' })
		expect(open.attributes('data-key')).toBe('active')
		expect(row(w, 'done-1').find('.badge').text()).toBe('Done')
	})

	it('draws the view-all link under the table, not in the card header, with viewAllPlacement footer', () => {
		const w = mountTable({ viewAllPlacement: 'footer' })
		expect(w.emitted('header').at(-1)[0].link).toBeNull()
		expect(w.find('[data-testid="cn-tasks-widget-footer-link"]').text()).toBe('All tasks of this case')
	})

	it('keeps the link in the card header by default', () => {
		const w = mountTable()
		expect(w.emitted('header').at(-1)[0].link).not.toBeNull()
		expect(w.find('[data-testid="cn-tasks-widget-footer-link"]').exists()).toBe(false)
	})
})
