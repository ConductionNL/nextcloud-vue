/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `footnote` on the ApexCharts types (DqDoorlooptijd "Gemiddelde
 * doorlooptijd per maand"): the line under the plot that bar-list and matrix
 * already draw under their rows.
 *
 * @spec openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md#requirement-a-chart-can-draw-a-bar-list
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
import { nextTick } from 'vue'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const lineProps = {
	type: 'line',
	series: [{ name: 'Average', data: [42, 38, 51] }],
	categories: ['Jul', 'Aug', 'Sep'],
}

/**
 * Mount a chart and wait for the ApexCharts component to be set.
 *
 * @param {object} props The chart props.
 * @param {object} [provide] Values to provide.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The mounted chart.
 */
async function mountChart(props, provide = {}) {
	const wrapper = mount(CnChartWidget, { props, global: { provide } })
	await nextTick()
	return wrapper
}

describe('CnChartWidget footnote on ApexCharts types', () => {
	it.each(['line', 'area', 'bar'])('draws the footnote under a %s chart', async (type) => {
		const w = await mountChart({ ...lineProps, type, footnote: 'Closed cases only' })
		const note = w.find('[data-testid="cn-chart-widget-footnote"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('Closed cases only')
		expect(note.element.previousElementSibling.classList.contains('cn-chart-widget__canvas')).toBe(true)
	})

	it('reads the footnote through the host translate', async () => {
		const w = await mountChart(
			{ ...lineProps, footnote: 'Closed cases only' },
			{ cnTranslate: (key) => (key === 'Closed cases only' ? 'Alleen afgesloten zaken' : key) },
		)
		expect(w.find('[data-testid="cn-chart-widget-footnote"]').text()).toBe('Alleen afgesloten zaken')
	})

	it('draws no footnote without one', async () => {
		const w = await mountChart(lineProps)
		expect(w.find('.cn-chart-widget__footnote').exists()).toBe(false)
	})

	it('draws no footnote over the empty state', async () => {
		const w = await mountChart({ ...lineProps, series: [], footnote: 'Closed cases only', emptyLabel: 'No data' })
		expect(w.find('[data-testid="cn-chart-widget-empty"]').exists()).toBe(true)
		expect(w.find('.cn-chart-widget__footnote').exists()).toBe(false)
	})

	it('keeps one footnote under a bar-list', async () => {
		const w = await mountChart({ type: 'bar-list', categories: ['A'], series: [{ name: 'n', data: [1] }], footnote: 'Note' })
		expect(w.findAll('.cn-chart-widget__footnote')).toHaveLength(1)
	})
})
