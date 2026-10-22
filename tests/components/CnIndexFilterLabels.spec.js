/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Active line names a filter the way a person reads it: a page's
 * `filterLabels` first, a named source's sidebar field next, and a range as
 * one chip whose removal clears both ends.
 *
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-page-names-its-filters
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-is-one-chip
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const NL = { Status: 'Status', Ongoing: 'lopend', Deadline: 'Deadline' }

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			schema: {
				title: 'Case',
				properties: {
					isFinalStatus: { title: 'Is Final Status', type: 'boolean' },
					deadline: { title: 'Deadline', type: 'string', format: 'date' },
					status: { title: 'Status', oneOf: [{ const: 'open', title: 'Open' }] },
				},
			},
			objects: [],
			pagination: { page: 1, pages: 1, total: 0, limit: 20 },
			...extra,
		},
		global: {
			provide: { cnLook: 'board', cnTranslate: (key) => NL[key] || key },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true },
		},
	})
}

describe('a page names its filters', () => {
	it('names the field and the value from filterLabels, translated', () => {
		const w = mountPage({
			activeFilters: { isFinalStatus: 'false' },
			filterLabels: { isFinalStatus: { label: 'Status', values: { false: 'Ongoing', true: 'Finished' } } },
		})
		expect(w.vm.activeFilterChips.map((c) => c.label)).toEqual(['Status: lopend'])
	})

	it('joins several values as a list in the locale', () => {
		const w = mountPage({
			activeFilters: { status: ['active', 'ending'] },
			filterLabels: { status: { values: { active: 'active', ending: 'ending' } } },
		})
		expect(w.vm.activeFilterChips.map((c) => c.label)).toEqual(['Status: active and ending'])
	})

	it('keeps the schema names for a key filterLabels does not list', () => {
		const w = mountPage({ activeFilters: { status: 'open' }, filterLabels: { isFinalStatus: { label: 'Status' } } })
		expect(w.vm.activeFilterChips.map((c) => c.label)).toEqual(['Status: Open'])
	})

	it('names a value filterLabels lists only the field of, as before', () => {
		const w = mountPage({ activeFilters: { isFinalStatus: 'true' }, filterLabels: { isFinalStatus: { label: 'Status' } } })
		expect(w.vm.activeFilterChips.map((c) => c.label)).toEqual(['Status: true'])
	})

	it('falls back to a named source\'s sidebar field title and enumLabels', () => {
		const w = mountPage({
			schema: null,
			activeFilters: { priority: ['high'] },
			sidebar: { enabled: true, fields: { priority: { title: 'Priority', facetable: true, enum: ['high'], enumLabels: { high: 'High' } } } },
		})
		expect(w.vm.activeFilterChips.map((c) => c.label)).toEqual(['Priority: High'])
	})
})

describe('a range is one chip', () => {
	beforeAll(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date(2026, 9, 22, 12, 0, 0))
	})
	afterAll(() => jest.useRealTimers())

	it('shows a {from, to} value as one chip', () => {
		const w = mountPage({
			schema: null,
			activeFilters: { dueAt: { from: '2026-10-01', to: '2026-10-31' } },
			filterLabels: { dueAt: { label: 'Deadline' } },
			sidebar: { enabled: true, fields: { dueAt: { title: 'Due between', facetable: true, inputControl: 'date-range' } } },
		})
		const chips = w.vm.activeFilterChips
		expect(chips).toHaveLength(1)
		expect(chips[0].key).toBe('dueAt')
		expect(chips[0].label).toMatch(/^Deadline: /)
		expect(chips[0].label).not.toContain('[object Object]')
		expect(chips[0].label).toContain('31')
	})

	it('joins a [gte]/[lte] pair under the field and clears both when removed', () => {
		const w = mountPage({ activeFilters: { 'deadline[gte]': '2026-10-01', 'deadline[lte]': '2026-11-15' } })
		const chips = w.vm.activeFilterChips
		expect(chips).toHaveLength(1)
		expect(chips[0].label.startsWith('Deadline: ')).toBe(true)
		expect(chips[0].keys).toEqual(['deadline[gte]', 'deadline[lte]'])
		const spy = jest.spyOn(w.vm, 'onFilterEvent').mockImplementation(() => {})
		w.vm.onRemoveActiveFilter(chips[0])
		expect(spy.mock.calls.map((c) => c[0])).toEqual([
			{ key: 'deadline[gte]', values: [] },
			{ key: 'deadline[lte]', values: [] },
		])
	})
})
