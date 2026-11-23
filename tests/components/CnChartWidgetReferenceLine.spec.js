/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A line chart's reference (norm) line and month categories (board
 * DqDoorlooptijd: "Gemiddelde doorlooptijd per maand" with a dashed norm at
 * 28 days and the months as "jan", "feb", "mrt").
 */

jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({
		data: { value: null },
		loading: { value: false },
		error: { value: null },
		refetch: jest.fn(),
	}),
}))

import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import { userLocale } from '../../src/utils/userLocale.js'

const lineProps = {
	type: 'line',
	series: [{ name: 'Average lead time', data: [31, 29, 27] }],
	categories: ['2026-01', '2026-02', '2026-03'],
}

const month = (m, opts = { month: 'short' }) => new Date(2026, m, 1).toLocaleDateString(userLocale(), opts)

describe('CnChartWidget reference line', () => {
	it('draws a dashed line at each reference value, its label translated', () => {
		const w = mount(CnChartWidget, {
			props: { ...lineProps, referenceLines: [{ value: 28, label: 'Norm' }] },
			global: { provide: { cnTranslate: (s) => (s === 'Norm' ? 'Norm 28 dagen' : s) } },
		})
		const lines = w.vm.mergedOptions.annotations.yaxis
		expect(lines).toHaveLength(1)
		expect(lines[0].y).toBe(28)
		expect(lines[0].strokeDashArray).toBeGreaterThan(0)
		expect(lines[0].borderColor).toBeTruthy()
		expect(lines[0].label.text).toBe('Norm 28 dagen')
	})

	it('draws none without referenceLines', () => {
		const w = mount(CnChartWidget, { props: lineProps })
		expect(w.vm.mergedOptions.annotations).toBeUndefined()
	})
})

describe('CnChartWidget month categories', () => {
	it('shows year-month categories as short months', () => {
		const w = mount(CnChartWidget, { props: { ...lineProps, categoryFormat: 'month' } })
		expect(w.vm.mergedOptions.xaxis.categories).toEqual([month(0), month(1), month(2)])
	})

	it('adds the year with month-year', () => {
		const w = mount(CnChartWidget, { props: { ...lineProps, categoryFormat: 'month-year' } })
		expect(w.vm.mergedOptions.xaxis.categories[0]).toBe(month(0, { month: 'short', year: 'numeric' }))
	})

	it('leaves categories that are not dates alone', () => {
		const w = mount(CnChartWidget, { props: { ...lineProps, categories: ['Q1', 'Q2', 'Q3'], categoryFormat: 'month' } })
		expect(w.vm.mergedOptions.xaxis.categories).toEqual(['Q1', 'Q2', 'Q3'])
	})

	it('keeps the raw categories without a format', () => {
		const w = mount(CnChartWidget, { props: lineProps })
		expect(w.vm.mergedOptions.xaxis.categories).toEqual(['2026-01', '2026-02', '2026-03'])
	})
})

describe('the dashboard passes the new keys to the chart', () => {
	it('forwards referenceLines and categoryFormat', () => {
		const def = { id: 'lead', type: 'chart', props: { chartKind: 'line', referenceLines: [{ value: 28 }], categoryFormat: 'month' } }
		const out = CnDashboardPage.methods.getChartProps.call({ getWidgetDef: () => def }, { widgetId: 'lead' })
		expect(out.referenceLines).toEqual([{ value: 28 }])
		expect(out.categoryFormat).toBe('month')
	})
})
