/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnChartWidget draws ApexCharts inside its canvas box's shadow root, so a
 * chart redraw no longer re-checks the page's `:has()` rules on every label
 * it measures. The shadow root carries the chart's own rules; the container
 * exists before the chart mounts, so ApexCharts finds its shadow root at
 * create time and puts its stylesheet there.
 */

import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import { loadApexCharts } from '../../src/components/CnChartWidget/apexChartsLoader.js'
import { attachChartShadow, CHART_SHADOW_CLASS, CHART_SHADOW_CSS, createChartContainer } from '../../src/components/CnChartWidget/chartShadow.js'

// The chart component loads on demand; load it once so mounts render it at once.
beforeAll(() => loadApexCharts())

describe('attachChartShadow', () => {
	it('puts the container and the chart rules in a shadow root of the host', () => {
		const host = document.createElement('div')
		const container = createChartContainer()
		attachChartShadow(host, container)
		expect(container.parentNode).toBe(host.shadowRoot)
		expect(container.className).toBe(CHART_SHADOW_CLASS)
		const style = host.shadowRoot.querySelector('style[data-cn-chart]')
		const adopted = host.shadowRoot.adoptedStyleSheets || []
		expect(style !== null || adopted.length === 1).toBe(true)
		if (style) {
			expect(style.textContent).toBe(CHART_SHADOW_CSS)
		}
	})

	it('adds nothing the second time for the same host and container', () => {
		const host = document.createElement('div')
		const container = createChartContainer()
		attachChartShadow(host, container)
		attachChartShadow(host, container)
		expect(host.shadowRoot.querySelectorAll(`.${CHART_SHADOW_CLASS}`)).toHaveLength(1)
		expect(host.shadowRoot.querySelectorAll('style[data-cn-chart]').length).toBeLessThanOrEqual(1)
	})

	it('falls back to the host itself, with the rules in the document, without shadow DOM', () => {
		const host = document.createElement('div')
		host.attachShadow = undefined
		const container = createChartContainer()
		attachChartShadow(host, container)
		expect(container.parentNode).toBe(host)
		expect(document.head.querySelector('style[data-cn-chart]').textContent).toBe(CHART_SHADOW_CSS)
	})
})

describe('CnChartWidget shadow root', () => {
	it('mounts the chart inside the canvas box shadow root, on the first render', () => {
		const wrapper = mount(CnChartWidget, { props: { type: 'bar', series: [{ name: 'n', data: [1] }], categories: ['a'] }, attachTo: document.body })
		const canvas = wrapper.find('.cn-chart-widget__canvas').element
		expect(canvas.shadowRoot).not.toBeNull()
		expect(canvas.shadowRoot.querySelector(`.${CHART_SHADOW_CLASS} .vue-apexcharts-stub`)).not.toBeNull()
		expect(canvas.querySelector('.vue-apexcharts-stub')).toBeNull()
		wrapper.unmount()
	})
})
