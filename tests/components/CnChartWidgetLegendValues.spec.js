/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `legendValues`: a ring's legend names each slice with its count, "Afval 18",
 * as board PqOperationeel draws "Verzoeken per categorie". The name is text,
 * never markup.
 *
 * @spec openspec/changes/chart-legend-values/specs/chart-widget/spec.md#requirement-a-ring-legend-can-carry-each-slices-value
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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const donut = { type: 'donut', series: [18, 12], labels: ['Afval', '<b>Parkeren</b>'] }
const opts = (index) => ({ seriesIndex: index, w: { globals: { series: [18, 12] } } })

describe('CnChartWidget: legend values', () => {
	it('keeps the plain legend by default', () => {
		const w = mount(CnChartWidget, { propsData: donut })
		expect(w.vm.mergedOptions.legend.formatter).toBeUndefined()
	})

	it('writes each slice\'s value after its name', () => {
		const w = mount(CnChartWidget, { propsData: { ...donut, legendValues: true } })
		expect(w.vm.mergedOptions.legend.formatter('Afval', opts(0))).toBe('Afval <strong class="cn-chart-widget__legend-value">18</strong>')
	})

	it('escapes the name', () => {
		const w = mount(CnChartWidget, { propsData: { ...donut, legendValues: true } })
		expect(w.vm.mergedOptions.legend.formatter('<b>Parkeren</b>', opts(1))).toBe('&lt;b&gt;Parkeren&lt;/b&gt; <strong class="cn-chart-widget__legend-value">12</strong>')
	})

	it('reaches the chart from a dashboard manifest', () => {
		const page = readFileSync(resolve(__dirname, '../../src/components/CnDashboardPage/CnDashboardPage.vue'), 'utf8')
		const keys = page.slice(page.indexOf('const CHART_PROP_KEYS = ['), page.indexOf(']', page.indexOf('const CHART_PROP_KEYS = [')))
		expect(keys).toContain("'legendValues',")
	})
})
