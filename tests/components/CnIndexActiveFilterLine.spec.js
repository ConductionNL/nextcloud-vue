/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's Active line: a selected quick filter with an `activeLabel`
 * joins it (and the Filter badge, which counts the chips), removing it goes
 * back to the default tab, and a filter value is named by its label, not its
 * id. Plus the end-of-month filter tokens.
 *
 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-a-quick-filter-with-an-active-label-joins-the-active-line
 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-an-active-chip-names-the-value-not-its-id
 * @spec openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-the-filter-vocabulary-names-the-end-of-the-month
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveFilterValue } from '../../src/utils/resolveFilterTokens.js'
import { SENTINEL_TOKEN_PATTERNS } from '../../src/utils/sentinelTokens.js'

const BarStub = {
	name: 'CnActionsBar',
	props: ['activeFilterChips'],
	emits: ['remove-filter', 'clear-filters'],
	template: '<div class="bar"><span v-for="c in activeFilterChips" :key="c.key" class="chip">{{ c.label }}</span></div>',
}

const QUICK = [
	{ label: 'All', filter: {}, default: true },
	{ label: 'Mine', filter: { owner: '@me' } },
	{ label: 'Sales', filter: { pipeline: 'sales' }, activeLabel: 'Pipeline: Sales' },
]

function mountPage(extra = {}, look = 'board') {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Leads',
			schema: {
				title: 'Lead',
				properties: {
					caseType: { title: 'Case type' },
					status: { title: 'Status', oneOf: [{ const: 'open', title: 'Open' }] },
				},
			},
			objects: [],
			pagination: { page: 1, pages: 1, total: 0, limit: 20 },
			quickFilters: QUICK,
			...extra,
		},
		global: {
			provide: { cnLook: look, cnTranslate: (key) => ({ 'Pipeline: Sales': 'Pijplijn: Verkoop', Open: 'Open (nl)' }[key] || key) },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Leads' } },
			stubs: { CnActionsBar: BarStub, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true },
		},
	})
}

describe('a quick filter with an activeLabel joins the Active line', () => {
	it('adds no chip for a tab without activeLabel', () => {
		const w = mountPage()
		expect(w.vm.activeFilterChips).toEqual([])
		w.vm.onQuickFilterChange(1)
		expect(w.vm.activeFilterChips).toEqual([])
	})

	it('adds a translated chip while the named tab is selected', async () => {
		const w = mountPage()
		w.vm.onQuickFilterChange(2)
		await w.vm.$nextTick()
		expect(w.vm.activeFilterChips).toEqual([{ key: 'quick-filter:2', label: 'Pijplijn: Verkoop', quickFilterIndex: 2 }])
		expect(w.find('.chip').text()).toBe('Pijplijn: Verkoop')
	})

	it('goes back to the default tab when the chip is removed', () => {
		const w = mountPage()
		w.vm.onQuickFilterChange(2)
		w.vm.onRemoveActiveFilter(w.vm.activeFilterChips[0])
		expect(w.vm.activeQuickFilterIndex).toBe(0)
		expect(w.vm.activeFilterChips).toEqual([])
	})

	it('selects no tab when the default tab itself is the named one', () => {
		const tabs = [{ label: 'Open', filter: { pipeline: 'sales' }, activeLabel: 'Pipeline: Sales', default: true }, { label: 'Won', filter: { stage: 'won' } }]
		const w = mountPage({ quickFilters: tabs })
		w.vm.onQuickFilterChange(0)
		expect(w.vm.activeFilterChips).toHaveLength(1)
		w.vm.onRemoveActiveFilter(w.vm.activeFilterChips[0])
		expect(w.vm.activeQuickFilterIndex).toBe(null)
	})

	it('lets Clear all undo the named quick filter too', () => {
		const w = mountPage()
		w.vm.onQuickFilterChange(2)
		w.vm.onClearFilters()
		expect(w.vm.activeQuickFilterIndex).toBe(0)
	})

	it('draws nothing without the board look', () => {
		const w = mountPage({}, 'nextcloud')
		w.vm.onQuickFilterChange(2)
		expect(w.vm.activeFilterChips).toEqual([])
	})
})

describe('an active chip names the value, not its id', () => {
	it('reads a resolved reference label, a facet label and a oneOf title', () => {
		const w = mountPage({ activeFilters: { caseType: ['3c0f5a00-1111'], status: 'open' } })
		w.vm.refLabels = { caseType: { '3c0f5a00-1111': 'Woo-verzoek' } }
		expect(w.vm.activeFilterChips.map((c) => c.label)).toEqual(['Case type: Woo-verzoek', 'Status: Open (nl)'])
	})

	it('keeps the raw value when nothing names it', () => {
		const w = mountPage({ activeFilters: { caseType: 'abc' } })
		expect(w.vm.activeFilterChips[0].label).toBe('Case type: abc')
	})

	it('asks for the label of a reference filter that no column resolves', () => {
		const w = mountPage({
			schema: { title: 'Case', properties: { caseType: { title: 'Case type', type: 'string', $ref: 'caseType' } } },
			register: 'dossiq',
			activeFilters: { caseType: 'uuid-1' },
		})
		expect(w.vm.activeFilterRefSpecs).toEqual([{ key: 'caseType', labelField: '', register: 'dossiq', schema: 'caseType' }])
		expect(w.vm.activeFilterRefIds).toEqual({ caseType: ['uuid-1'] })
	})
})

describe('the filter vocabulary names the end of the month', () => {
	beforeAll(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date(2026, 9, 9, 15, 0, 0))
	})
	afterAll(() => jest.useRealTimers())

	it('resolves @monthEnd and @nextMonthStart', () => {
		expect(resolveFilterValue('@monthEnd')).toBe('2026-10-31')
		expect(resolveFilterValue('@nextMonthStart')).toBe('2026-11-01')
	})

	it('handles a 28-day February and the year boundary', () => {
		jest.setSystemTime(new Date(2027, 1, 10))
		expect(resolveFilterValue('@monthEnd')).toBe('2027-02-28')
		jest.setSystemTime(new Date(2026, 11, 5))
		expect(resolveFilterValue('@nextMonthStart')).toBe('2027-01-01')
	})

	it('is part of the closed filter vocabulary', () => {
		const re = new RegExp(SENTINEL_TOKEN_PATTERNS.filter)
		expect(re.test('@monthEnd')).toBe(true)
		expect(re.test('@nextMonthStart')).toBe(true)
		expect(re.test('@monthEndish')).toBe(false)
	})
})
