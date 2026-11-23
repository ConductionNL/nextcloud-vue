/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A chart shows the categories a host marks as selected (`selected`), so a
 * dashboard can echo the filter a pick made (launchpad
 * drill-down-cross-widget-filter).
 *
 * @spec openspec/changes/chart-widget-selected/specs/chart-widget-selected/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import { CHART_SHADOW_CSS } from '../../src/components/CnChartWidget/chartShadow.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const global = { provide: { cnWorkspaceContext: {} } }

/**
 * Put fake ApexCharts marks in the chart's container.
 *
 * @param {HTMLElement} root The chart container.
 * @param {string} cls The mark class.
 * @param {number} count How many.
 * @return {HTMLElement[]} The marks.
 */
function drawMarks(root, cls, count) {
	return Array.from({ length: count }, (_, j) => {
		const mark = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		mark.setAttribute('class', cls)
		mark.setAttribute('j', String(j))
		root.appendChild(mark)
		return mark
	})
}

describe('CnChartWidget selected', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('rings and presses the selected bar-list row, and follows a changed selection', async () => {
		const w = mount(CnChartWidget, {
			props: { type: 'bar-list', selectable: true, categories: ['GM0355', 'GM0344'], series: [{ name: 'n', data: [4, 2] }], selected: ['GM0344'] },
			global,
		})
		await flush()
		const rows = () => w.findAll('[data-testid="cn-chart-widget-bar-row"]')
		expect(rows()[0].attributes('aria-pressed')).toBe('false')
		expect(rows()[1].attributes('aria-pressed')).toBe('true')
		expect(rows()[1].attributes('data-selected')).toBe('true')
		expect(rows()[1].classes()).toContain('cn-chart-widget__bar-line--selected')

		await w.setProps({ selected: [] })
		expect(rows().map((row) => row.attributes('aria-pressed'))).toEqual(['false', 'false'])
		expect(w.findAll('.cn-chart-widget__bar-line--selected')).toHaveLength(0)
	})

	it('marks a selected row without selectable but gives it no pressed state', async () => {
		const w = mount(CnChartWidget, {
			props: { type: 'bar-list', categories: ['a', 'b'], series: [{ name: 'n', data: [1, 2] }], selected: ['a'] },
			global,
		})
		await flush()
		const [first] = w.findAll('[data-testid="cn-chart-widget-bar-row"]')
		expect(first.classes()).toContain('cn-chart-widget__bar-line--selected')
		expect(first.attributes('aria-pressed')).toBeUndefined()
	})

	it('matches the selection on the raw keys, never on the folded Other bucket', async () => {
		axios.get.mockResolvedValue({ data: { groups: [{ key: 'new', value: 5 }, { key: 'done', value: 4 }, { key: 'old', value: 1 }] } })
		const w = shallowMount(CnChartWidget, {
			props: { type: 'pie', selectable: true, selected: ['done', 7], dataSource: { register: 'r', schema: 's', aggregate: { groupBy: 'state', topN: 2, otherBucket: true } } },
		})
		await flush()
		await w.vm.$nextTick()
		expect(w.vm.selectedIndices).toEqual([1])
	})

	it('outlines the drawn bars of the selection and clears marks that left it', async () => {
		const w = shallowMount(CnChartWidget, {
			props: { type: 'bar', selectable: true, categories: ['a', 'b', 'c'], series: [{ name: 'n', data: [1, 2, 3] }], selected: ['b'] },
		})
		const marks = drawMarks(w.vm.chartTarget, 'apexcharts-bar-area', 3)
		w.vm.markSelection()
		expect(marks.map((mark) => mark.getAttribute('data-cn-selected'))).toEqual([null, 'true', null])

		await w.setProps({ selected: ['c'] })
		expect(marks.map((mark) => mark.getAttribute('data-cn-selected'))).toEqual([null, null, 'true'])
	})

	it('outlines a selected slice the same way', () => {
		const w = shallowMount(CnChartWidget, {
			props: { type: 'donut', selectable: true, labels: ['x', 'y'], series: [3, 4], selected: ['x'] },
		})
		const marks = drawMarks(w.vm.chartTarget, 'apexcharts-pie-area', 2)
		w.vm.markSelection()
		expect(marks[0].getAttribute('data-cn-selected')).toBe('true')
		expect(marks[1].hasAttribute('data-cn-selected')).toBe(false)
	})

	it('puts the selection back after every draw and turns off ApexCharts\' own click state', () => {
		const bar = shallowMount(CnChartWidget, { props: { type: 'bar', selectable: true, categories: ['a'], series: [{ name: 'n', data: [1] }] } })
		const events = bar.vm.mergedOptions.chart.events
		expect(events.mounted).toBe(bar.vm.markSelection)
		expect(events.updated).toBe(bar.vm.markSelection)
		expect(bar.vm.mergedOptions.states.active.filter.type).toBe('none')

		const pie = shallowMount(CnChartWidget, { props: { type: 'pie', selectable: true, labels: ['a'], series: [1] } })
		expect(pie.vm.mergedOptions.plotOptions.pie.expandOnClick).toBe(false)

		const plain = shallowMount(CnChartWidget, { props: { type: 'bar', categories: ['a'], series: [{ name: 'n', data: [1] }] } })
		expect(plain.vm.mergedOptions.states).toBeUndefined()
	})

	it('styles a selected mark in the shadow root with a token outline', () => {
		expect(CHART_SHADOW_CSS).toContain('.cn-chart-widget__chart [data-cn-selected]')
		expect(CHART_SHADOW_CSS).toMatch(/\[data-cn-selected\] \{\s*stroke: var\(--color-main-text\)/)
		expect(CHART_SHADOW_CSS).toContain('stroke: Highlight')
	})
})
