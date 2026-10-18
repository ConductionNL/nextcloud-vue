/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page filter drawn as a segmented group (`control: "segmented"`), on the
 * description line with `placement: "description"` (DqProcesanalyse
 * "Gemiddeld | Mediaan" after "Alle zaaktypen").
 *
 * @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-page-filter-as-a-segmented-group-on-the-description-line
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
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options'], template: '<div class="nc-select-stub" />' },
}

const MEASURE = {
	key: 'measure',
	label: 'Measure',
	control: 'segmented',
	placement: 'description',
	default: 'mean',
	options: [{ value: 'mean', label: 'Average' }, { value: 'median', label: 'Median' }],
}

/**
 * Mount the page.
 *
 * @param {object} extra Extra props.
 * @param {object} [provide] Values to provide.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountDash(extra, provide = {}) {
	return mount(CnDashboardPage, {
		props: { title: 'Process analysis', description: 'All case types', layout: [], widgets: [], ...extra },
		global: { stubs, provide },
	})
}

describe('CnDashboardPage — a segmented page filter', () => {
	it('draws the group on the description line, after the description', () => {
		const w = mountDash({ pageFilters: [MEASURE] })
		const line = w.find('[data-testid="cn-dashboard-page-subtitle"]')
		expect(line.text()).toContain('All case types')
		const group = line.find('[data-testid="cn-page-filter-measure"]')
		expect(group.exists()).toBe(true)
		expect(group.findAll('button').map((b) => b.text())).toEqual(['Average', 'Median'])
		expect(w.find('[data-testid="cn-dashboard-page-page-filters"]').exists()).toBe(false)
	})

	it('seeds the default and writes the pick into the workspace context', async () => {
		const w = mountDash({ pageFilters: [MEASURE] })
		expect(w.vm.workspaceContext.measure).toBe('mean')
		const median = w.findAll('[data-testid="cn-page-filter-measure"] button')[1]
		expect(median.attributes('aria-pressed')).toBe('false')
		await median.trigger('click')
		expect(w.vm.workspaceContext.measure).toBe('median')
		expect(w.emitted('page-filter-change')).toEqual([[{ key: 'measure', value: 'median' }]])
		expect(median.attributes('aria-pressed')).toBe('true')
	})

	it('reads the labels through the host translate', () => {
		const nl = { Average: 'Gemiddeld', Median: 'Mediaan', Measure: 'Maat' }
		const w = mountDash({ pageFilters: [MEASURE] }, { cnTranslate: (key) => nl[key] ?? key })
		const group = w.find('[data-testid="cn-page-filter-measure"]')
		expect(group.findAll('button').map((b) => b.text())).toEqual(['Gemiddeld', 'Mediaan'])
		expect(group.attributes('aria-label')).toBe('Maat')
	})

	it('draws a segmented filter without a placement in the filter row', () => {
		const w = mountDash({ pageFilters: [{ ...MEASURE, placement: undefined }, { key: 'period', options: [{ value: '3m', label: '3 months' }] }] })
		const row = w.find('[data-testid="cn-dashboard-page-page-filters"]')
		expect(row.find('[data-testid="cn-page-filter-measure"]').exists()).toBe(true)
		expect(row.find('.nc-select-stub').exists()).toBe(true)
		expect(w.find('[data-testid="cn-dashboard-page-subtitle"]').element.tagName).toBe('P')
	})

	it('falls back to the filter row when the header is hidden', () => {
		const w = mountDash({ pageFilters: [MEASURE], showHeader: false })
		expect(w.find('[data-testid="cn-dashboard-page-page-filters"] [data-testid="cn-page-filter-measure"]').exists()).toBe(true)
	})
})
