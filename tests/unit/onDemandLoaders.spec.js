/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

describe('loaders of the on-demand libraries', () => {
	it('loads the chart component once and keeps it for later charts', async () => {
		let loader
		jest.isolateModules(() => {
			loader = require('../../src/components/CnChartWidget/apexChartsLoader.js')
		})
		expect(loader.loadedApexCharts()).toBeNull()
		const [first, second] = await Promise.all([loader.loadApexCharts(), loader.loadApexCharts()])
		expect(first).toBeTruthy()
		expect(second).toBe(first)
		expect(loader.loadedApexCharts()).toBe(first)
	})

	it('loads the CodeMirror kit once and keeps it for later editors', async () => {
		let loader
		jest.isolateModules(() => {
			loader = require('../../src/components/CnJsonViewer/loadCodemirrorKit.js')
		})
		expect(loader.loadedCodemirrorKit()).toBeNull()
		const kit = await loader.loadCodemirrorKit()
		expect(typeof kit.jsonLang).toBe('function')
		expect(kit.CodeMirror).toBeTruthy()
		expect(await loader.loadCodemirrorKit()).toBe(kit)
		expect(loader.loadedCodemirrorKit()).toBe(kit)
	})

	it('renders a chart once its library has loaded, without a preload', async () => {
		let CnChartWidget, flushPromises, mount
		jest.isolateModules(() => {
			CnChartWidget = require('../../src/components/CnChartWidget/CnChartWidget.vue').default
			;({ flushPromises, mount } = require('@vue/test-utils'))
		})
		const w = mount(CnChartWidget, { props: { type: 'bar', series: [{ name: 'n', data: [1] }], categories: ['a'] } })
		expect(w.find('.cn-chart-widget__canvas').exists()).toBe(false)
		await flushPromises()
		expect(w.find('.cn-chart-widget__canvas').exists()).toBe(true)
	})
})
