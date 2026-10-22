/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The page filters on the description line stand in the order the page
 * declares them, whatever their control (DqProcesanalyse "Gemiddeld |
 * Mediaan", then "Laatste 12 maanden" and "Alle zaaktypen").
 *
 * @spec openspec/changes/dashboard-description-filters-in-order/specs/dashboard-description-filters-in-order/spec.md
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div class="cn-dashboard-grid-stub" />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnChartWidget: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcLoadingIcon: { template: '<div />' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'placeholder', 'ariaLabelCombobox', 'clearable'], emits: ['update:modelValue'], template: '<div class="nc-select-stub" />' },
	CnSegmentedControl: { name: 'CnSegmentedControl', props: ['options', 'modelValue', 'ariaLabel'], template: '<div class="segmented-stub" />' },
}

const STATISTIC = { key: 'statistic', label: 'Measure', control: 'segmented', placement: 'description', default: 'mean', options: [{ value: 'mean', label: 'Mean' }, { value: 'median', label: 'Median' }] }
const PERIOD = { key: 'period', label: 'Period', placement: 'description', default: '12m', options: [{ value: '12m', label: 'Last 12 months' }, { value: 'all', label: 'All time' }] }
const CASE_TYPE = { key: 'caseType', label: 'Filter by case type', placement: 'description', clearable: true, placeholder: 'All case types', options: [{ value: 'woo', label: 'Woo request' }] }

/**
 * The description line of a mounted page.
 *
 * @param {Array<object>} pageFilters The page filters.
 * @return {import('@vue/test-utils').DOMWrapper} The line.
 */
function mountLine(pageFilters) {
	return mount(CnDashboardPage, {
		props: { title: 'Process analysis', description: 'Closed cases', layout: [], widgets: [], pageFilters },
		global: { stubs },
	}).find('[data-testid="cn-dashboard-page-subtitle"]')
}

/**
 * The page filter keys on the description line, in the order drawn.
 *
 * @param {Array<object>} pageFilters The page filters.
 * @return {Array<string>} The keys.
 */
function drawnOrder(pageFilters) {
	return mountLine(pageFilters).findAll('[data-testid^="cn-page-filter-"]')
		.map((node) => node.attributes('data-testid').replace('cn-page-filter-', ''))
}

describe('CnDashboardPage — description filters in declared order', () => {
	it('draws a segmented filter declared first before the selects', () => {
		expect(drawnOrder([STATISTIC, PERIOD, CASE_TYPE])).toEqual(['statistic', 'period', 'caseType'])
	})

	it('draws a select declared first before the segmented filter (DqDoorlooptijd)', () => {
		expect(drawnOrder([CASE_TYPE, STATISTIC])).toEqual(['caseType', 'statistic'])
	})

	it('sets a select off from a following segmented group with a dot, not from a select or the end', () => {
		const dots = (filters) => mountLine(filters).findAll('span[aria-hidden="true"]').length
		// One dot after the description text in each case.
		expect(dots([CASE_TYPE, STATISTIC])).toBe(2)
		expect(dots([STATISTIC, PERIOD, CASE_TYPE])).toBe(1)
	})
})
