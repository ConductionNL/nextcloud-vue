/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-dashboard-i18n: the dashboard date-range labels ("Last 30 days")
 * and a chart's view labels and series names read in the user's language
 * (PqVerkoopoverzicht printed them in English).
 *
 * @spec openspec/changes/screens-dashboard-i18n/specs/dashboard-page/spec.md
 */
jest.mock('@nextcloud/l10n', () => {
	const actual = jest.requireActual('@nextcloud/l10n')
	const nl = { 'Last 30 days': 'Laatste 30 dagen', 'Custom range': 'Aangepaste periode' }
	return {
		...actual,
		translate: jest.fn((app, key, vars) => {
			const text = (app === 'nextcloud-vue' && nl[key]) || key
			return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : text
		}),
	}
})

import { mount } from '@vue/test-utils'
import CnDateRangePicker, { DEFAULT_DATE_RANGE_PRESETS, translatePresetLabel } from '../../src/components/CnDateRangePicker/CnDateRangePicker.vue'

describe('translatePresetLabel', () => {
	it('uses the library catalogue for a default label', () => {
		expect(translatePresetLabel('Last 30 days')).toBe('Laatste 30 dagen')
	})

	it('prefers the app catalogue when it has the key', () => {
		expect(translatePresetLabel('Last 30 days', (k) => (k === 'Last 30 days' ? 'Afgelopen maand' : k))).toBe('Afgelopen maand')
	})

	it('runs an app label through the host translate and keeps an unknown one as written', () => {
		expect(translatePresetLabel('This quarter', (k) => (k === 'This quarter' ? 'Dit kwartaal' : k))).toBe('Dit kwartaal')
		expect(translatePresetLabel('Fiscal year', (k) => k)).toBe('Fiscal year')
		expect(translatePresetLabel('')).toBe('')
	})
})

describe('CnDateRangePicker: preset options', () => {
	it('offers the default presets in the user language', () => {
		const w = mount(CnDateRangePicker, {
			propsData: { presets: DEFAULT_DATE_RANGE_PRESETS, value: { from: null, to: null, preset: 'last-30' } },
			global: { stubs: { NcSelect: true, NcDateTimePicker: true } },
		})
		const labels = w.vm.presetOptions.map((o) => o.label)
		expect(labels).toContain('Laatste 30 dagen')
		expect(labels).toContain('Aangepaste periode')
		expect(labels).not.toContain('Last 30 days')
	})
})

describe('CnDashboardPage: preset labels', () => {
	it('translates the effective presets, the default ones and an app preset', async () => {
		jest.doMock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
		const { default: CnDashboardPage } = await import('../../src/components/CnDashboardPage/CnDashboardPage.vue')
		const page = (dateRange, provide = {}) => mount(CnDashboardPage, {
			propsData: { widgets: [], layout: [], dateRange },
			global: { stubs: { CnDashboardGrid: true, CnActionsMenu: true, CnBuildiqEditButton: true, CnDateRangePicker: true }, provide },
		})
		const def = page({ enabled: true, control: 'pills' })
		expect(def.vm.effectivePresets.find((p) => p.id === 'last-30').label).toBe('Laatste 30 dagen')
		const own = page({ enabled: true, presets: [{ id: 'q', label: 'This quarter', days: 90 }] }, { cnTranslate: (k) => (k === 'This quarter' ? 'Dit kwartaal' : k) })
		expect(own.vm.effectivePresets[0].label).toBe('Dit kwartaal')
	})
})

describe('CnChartWidget: view labels and series names', () => {
	it('translates the view pills and the plotted series names, and filters views on the name as written', async () => {
		const { default: CnChartWidget } = await import('../../src/components/CnChartWidget/CnChartWidget.vue')
		const nl = { Revenue: 'Omzet', Margin: 'Marge', 'By month': 'Per maand' }
		const w = mount(CnChartWidget, {
			propsData: {
				type: 'bar',
				series: [{ name: 'Revenue', data: [1, 2] }, { name: 'Margin', data: [3, 4] }],
				categories: ['Jan', 'Feb'],
				views: [{ key: 'm', label: 'By month', series: ['Revenue'] }, { key: 'all', label: 'All' }],
			},
			global: { provide: { cnTranslate: (k) => nl[k] || k }, stubs: { VueApexCharts: true, apexchart: true } },
		})
		expect(w.find('[data-testid="cn-chart-widget-view-m"]').text()).toBe('Per maand')
		expect(w.vm.plottedSeries.map((s) => s.name)).toEqual(['Omzet'])
		expect(w.vm.displayedSeries.map((s) => s.name)).toEqual(['Revenue'])
	})

	it('leaves the series as they are without a host translation', async () => {
		const { default: CnChartWidget } = await import('../../src/components/CnChartWidget/CnChartWidget.vue')
		const w = mount(CnChartWidget, {
			propsData: { type: 'bar', series: [{ name: 'Revenue', data: [1] }], categories: ['Jan'] },
			global: { stubs: { VueApexCharts: true, apexchart: true } },
		})
		expect(w.vm.plottedSeries.map((s) => s.name)).toEqual(['Revenue'])
	})
})
