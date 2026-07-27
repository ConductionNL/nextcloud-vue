/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDashboardPage's `pageFilters` — page-level select controls that
 * write into the reactive workspace context so endpoint-bound widgets can
 * interpolate a `@page.<key>` / `@workspace.<key>` token (e.g. a period
 * selector every KPI reads).
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div class="cn-dashboard-grid-stub" />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	CnWidgetRenderer: { template: '<div />' },
	CnTileWidget: { template: '<div />' },
	CnChartWidget: { template: '<div />' },
	CnStatsBlockWidget: { template: '<div />' },
	CnWidgetRefItem: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	CnDateRangePicker: { template: '<div />', props: ['value', 'presets', 'disabled'] },
	// Lightweight NcSelect: renders option labels, emits the option object on click.
	NcSelect: {
		name: 'NcSelect',
		props: ['value', 'options', 'inputLabel', 'label', 'clearable'],
		template: '<div class="nc-select-stub"><button v-for="o in options" :key="o.value" class="opt" :data-value="o.value" @click="$emit(\'input\', o)">{{ o.label }}</button></div>',
	},
}

const PERIOD_FILTER = {
	key: 'period',
	label: 'Period',
	type: 'select',
	options: [
		{ value: 'last-7', label: 'Last 7 days' },
		{ value: 'last-30', label: 'Last 30 days' },
	],
	default: 'last-30',
}

function mountDash(extra = {}) {
	return mount(CnDashboardPage, {
		propsData: { layout: [], widgets: [], ...extra },
		stubs,
	})
}

describe('CnDashboardPage — pageFilters', () => {
	it('renders no filter controls when the prop is omitted (backwards compat)', () => {
		const wrapper = mountDash()
		expect(wrapper.find('[data-testid="cn-dashboard-page-page-filters"]').exists()).toBe(false)
	})

	it('renders a control per filter and seeds the workspace context with its default', () => {
		const wrapper = mountDash({ pageFilters: [PERIOD_FILTER] })
		expect(wrapper.find('[data-testid="cn-dashboard-page-page-filters"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-page-filter-period"]').exists()).toBe(true)
		expect(wrapper.vm.workspaceContext.period).toBe('last-30')
	})

	it('seeds from the first option when no default is given', () => {
		const wrapper = mountDash({ pageFilters: [{ key: 'scope', options: [{ value: 'mine', label: 'Mine' }, { value: 'all', label: 'All' }] }] })
		expect(wrapper.vm.workspaceContext.scope).toBe('mine')
	})

	it('writes a new selection into the workspace context and emits @page-filter-change', async () => {
		const wrapper = mountDash({ pageFilters: [PERIOD_FILTER] })
		// Click the "Last 7 days" option in the stubbed select.
		const opt = wrapper.findAll('.opt').find((w) => w.attributes('data-value') === 'last-7')
		await opt.trigger('click')

		expect(wrapper.vm.workspaceContext.period).toBe('last-7')
		const emitted = wrapper.emitted('page-filter-change')
		expect(emitted).toBeTruthy()
		expect(emitted[emitted.length - 1][0]).toEqual({ key: 'period', value: 'last-7' })
	})

	it('does not overwrite a context key another widget already set', () => {
		// Pre-set the key via a parent-provided reactive context is awkward in a
		// unit mount; instead assert initPageFilters is a no-op when present.
		const wrapper = mountDash({ pageFilters: [PERIOD_FILTER] })
		wrapper.vm.$set(wrapper.vm.workspaceContext, 'period', 'custom')
		wrapper.vm.initPageFilters()
		expect(wrapper.vm.workspaceContext.period).toBe('custom')
	})
})
