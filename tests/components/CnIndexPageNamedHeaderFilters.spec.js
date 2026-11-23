/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 *
 * DqTaken: the task list's column headers filter through the sidebar's search
 * fields. A column with a search field behind it gets a funnel built from that
 * field; one without gets none; a header choice is the sidebar's own filter.
 *
 * @spec openspec/changes/named-source-header-filters/specs/index-page/spec.md#requirement-a-named-source-can-filter-from-its-column-headers-through-its-search-fields
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { columnFilterDef } from '../../src/utils/columnFilters.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ data: { results: [], total: 0 } }) },
}))

const FIELDS = {
	objectUuid: { type: 'string', title: 'Case', inputControl: 'reference', optionsSource: { register: 'dossiq', schema: 'case', labelField: 'title' } },
	state: { type: 'string', title: 'State', inputControl: 'multiselect', enum: ['enabled', 'active'], enumLabels: { enabled: 'Ready to claim', active: 'In execution' } },
	priority: { type: 'string', title: 'Priority', inputControl: 'select', enum: ['normal', 'high'] },
	dueAt: { type: 'string', format: 'date', title: 'Due between', inputControl: 'date-range' },
}

const COLUMNS = [
	{ key: 'title', label: 'Task' },
	{ key: 'subjectLabel', label: 'Subject', filterField: 'objectUuid' },
	{ key: 'state', label: 'Status', enum: ['enabled', 'active'] },
	{ key: 'priorityLabel', label: 'Priority', filterField: 'priority' },
	{ key: 'dueAt', label: 'Deadline' },
	{ key: 'assignee', label: 'Handler' },
]

function mountPage(extra = {}) {
	const replace = jest.fn(() => Promise.resolve())
	const route = { query: {}, params: {}, path: '/tasks' }
	return mount(CnIndexPage, {
		propsData: { title: 'Tasks', entitySource: 'tasks', columns: COLUMNS, sidebar: { enabled: true, fields: FIELDS }, ...extra },
		global: { mocks: { $route: route, $router: { replace } } },
		mocks: { $route: route, $router: { replace } },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnIndexSidebar: true },
	})
}

/**
 * The header filter a column would draw on this page.
 *
 * @param {object} vm The page.
 * @param {string} key The column key.
 * @return {object|null} The definition.
 */
function defFor(vm, key) {
	const col = vm.renderedColumns.find((c) => c.key === key)
	return col && col.filterable !== false ? columnFilterDef(col, vm.headerFilterSchema) : null
}

describe('header filters on the task list (DqTaken)', () => {
	it('turns header filters on for the tasks source', () => {
		const w = mountPage()
		expect(w.vm.tableHeaderFilters).toBe(true)
	})

	it('gives a funnel to the columns with a search field behind them, built from that field', () => {
		const w = mountPage()
		expect(defFor(w.vm, 'state')).toMatchObject({ key: 'state', kind: 'enum' })
		expect(defFor(w.vm, 'priorityLabel')).toMatchObject({ key: 'priority', kind: 'enum' })
		expect(defFor(w.vm, 'dueAt')).toMatchObject({ key: 'dueAt', kind: 'date' })
		expect(defFor(w.vm, 'subjectLabel')).toMatchObject({ key: 'objectUuid', kind: 'reference', reference: { schema: 'case', register: 'dossiq' } })
	})

	it('draws no funnel where nothing could answer', () => {
		const w = mountPage()
		expect(defFor(w.vm, 'title')).toBeNull()
		expect(defFor(w.vm, 'assignee')).toBeNull()
	})

	it('writes a header choice as the sidebar\'s own filter', () => {
		const w = mountPage()
		w.vm.onColumnFilterEvent({ params: { state: ['active'] } })
		expect(w.vm.namedActiveFilters).toEqual({ state: ['active'] })
	})

	it('writes a header date range as one window', () => {
		const w = mountPage()
		w.vm.onColumnFilterEvent({ params: { 'dueAt[gte]': ['2026-10-01'], 'dueAt[lte]': ['2026-10-31'] } })
		expect(w.vm.namedActiveFilters).toEqual({ dueAt: { from: '2026-10-01', to: '2026-10-31' } })
		w.vm.onColumnFilterEvent({ params: { 'dueAt[gte]': [], 'dueAt[lte]': [] } })
		expect(w.vm.namedActiveFilters).toEqual({})
	})

	it('shows a window as the funnel\'s range, so a default deadline filter reads active', () => {
		const w = mountPage()
		w.vm.onColumnFilterEvent({ params: { 'dueAt[gte]': ['2026-10-01'], 'dueAt[lte]': ['2026-10-31'] } })
		expect(w.vm.tableActiveFilters).toMatchObject({ 'dueAt[gte]': '2026-10-01', 'dueAt[lte]': '2026-10-31' })
	})
})
