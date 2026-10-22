/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A filter whose value is an object reads in words on the Active line, never
 * as "[object Object]": a date range as one range chip (DqTaken's month
 * default, "Deadline: 1 tot en met 31 oktober"), a test for no value as
 * "not set" or "set" (nl "niet ingevuld", "ingevuld"), and another operator object by its operands.
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const NL = { Deadline: 'Deadline' }

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Tasks',
			schema: { title: 'Task', properties: { assignee: { title: 'Assignee', type: 'string' }, priority: { title: 'Priority', type: 'string' } } },
			objects: [],
			pagination: { page: 1, pages: 1, total: 0, limit: 20 },
			...extra,
		},
		global: {
			provide: { cnLook: 'board', cnTranslate: (key, params) => (NL[key] || key).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m)) },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Tasks' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true },
		},
	})
}

const labels = (w) => w.vm.activeFilterChips.map((c) => c.label)

describe('an object value on the Active line', () => {
	it('reads the month default of a task list as one range', () => {
		const w = mountPage({ activeFilters: { dueAt: { from: '2026-10-01', to: '2026-10-31' } }, filterLabels: { dueAt: { label: 'Deadline' } } })
		expect(labels(w)[0]).toMatch(/^Deadline: 1 through /)
		expect(labels(w)[0]).not.toContain('[object Object]')
	})

	it('names a test for no value, and for any value', () => {
		expect(labels(mountPage({ activeFilters: { assignee: { isnull: true } } }))).toEqual(['Assignee: not set'])
		expect(labels(mountPage({ activeFilters: { assignee: { isnull: false } } }))).toEqual(['Assignee: set'])
	})

	it('names another operator object by its operands', () => {
		expect(labels(mountPage({ activeFilters: { priority: { in: ['high', 'urgent'] } } }))).toEqual(['Priority: high and urgent'])
		expect(labels(mountPage({ activeFilters: { priority: { eq: 'high' } } }))).toEqual(['Priority: high'])
	})
})
