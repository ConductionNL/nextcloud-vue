/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A select-type page filter draws its label and its option labels through
 * the app's translate, as the segmented one already does (DqProcesanalyse:
 * "Periode", "Afgelopen 12 maanden").
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
	// Model contract: `modelValue` / `update:modelValue`. `@nextcloud/vue` 9
	// (Vue 3) dropped vue-select's Vue-2-era `value` prop + `input` event for
	// Vue 3's standard `v-model` names, and CnDashboardPage binds the new ones —
	// a stub still emitting `input` fires an event nobody listens for, so the
	// selection never reaches `onPageFilterChange` and the assertion reads the
	// seeded default instead.
	NcSelect: {
		name: 'NcSelect',
		props: ['modelValue', 'options', 'inputLabel', 'label', 'clearable'],
		emits: ['update:modelValue'],
		template: '<div class="nc-select-stub"><button v-for="o in options" :key="o.value" class="opt" :data-value="o.value" @click="$emit(\'update:modelValue\', o)">{{ o.label }}</button></div>',
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

const DUTCH = { Period: 'Periode', 'Last 7 days': 'Afgelopen 7 dagen', 'Last 30 days': 'Afgelopen 30 dagen' }

/**
 * @return {object} The wrapper.
 */
function mountDash() {
	return mount(CnDashboardPage, {
		propsData: { layout: [], widgets: [], pageFilters: [PERIOD_FILTER] },
		global: { stubs, provide: { cnTranslate: (s) => DUTCH[s] || s } },
	})
}

describe('CnDashboardPage select page filter translation', () => {
	it('translates the label', () => {
		const w = mountDash()
		expect(w.find('.cn-dashboard-page__page-filter-label').text()).toBe('Periode')
		expect(w.findComponent({ name: 'NcSelect' }).props('inputLabel')).toBe('Periode')
	})

	it('translates the option labels and keeps their values', async () => {
		const w = mountDash()
		const select = w.findComponent({ name: 'NcSelect' })
		expect(select.props('options').map((o) => o.label)).toEqual(['Afgelopen 7 dagen', 'Afgelopen 30 dagen'])
		expect(select.props('modelValue')).toEqual({ value: 'last-30', label: 'Afgelopen 30 dagen' })
		await w.find('.opt[data-value="last-7"]').trigger('click')
		expect(w.emitted('page-filter-change').at(-1)[0]).toEqual({ key: 'period', value: 'last-7' })
	})
})
