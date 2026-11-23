/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A data change reaches a drawn chart as ONE unanimated `updateOptions` that
 * carries the series, never as the wrapper's `updateOptions` + `updateSeries`
 * pair or a rebuild: each ApexCharts update clears and redraws the whole SVG
 * and measures every label again. The wrapper's bound options and series stay
 * the same objects, filled in place, so a chart it (re)builds starts from the
 * current data.
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import { loadApexCharts } from '../../src/components/CnChartWidget/apexChartsLoader.js'

/**
 * Mount a bar chart and give its wrapper a live ApexCharts double.
 *
 * @param {object} props Extra props.
 * @return {{wrapper: object, apex: {updateOptions: Function}, stub: object}} The mount.
 */
function mountDrawn(props = {}) {
	const wrapper = mount(CnChartWidget, {
		props: {
			type: 'bar',
			series: [{ name: 'count', data: [1, 2] }],
			categories: ['GM0300', 'GM0307'],
			...props,
		},
	})
	const apex = { updateOptions: jest.fn() }
	wrapper.vm.$refs.chart.chart = apex
	return { wrapper, apex, stub: wrapper.findComponent({ name: 'vue-apexcharts-stub' }) }
}

// The chart component loads on demand; load it once so mounts render it at once.
beforeAll(() => loadApexCharts())

describe('CnChartWidget in-place update', () => {
	it('binds the wrapper to the current options and series before the first draw', () => {
		const { wrapper, stub } = mountDrawn()
		expect(stub.vm.$attrs.options).toEqual(wrapper.vm.mergedOptions)
		expect(stub.vm.$attrs.series).toEqual([{ name: 'count', data: [1, 2] }])
	})

	it('sends new series and categories as one unanimated updateOptions', async () => {
		const { wrapper, apex } = mountDrawn()
		await wrapper.setProps({
			series: [{ name: 'count', data: [5, 6, 7] }],
			categories: ['WK030000', 'WK030001', 'WK030002'],
		})
		expect(apex.updateOptions).toHaveBeenCalledTimes(1)
		const [payload, redraw, animate] = apex.updateOptions.mock.calls[0]
		expect(payload.series).toEqual([{ name: 'count', data: [5, 6, 7] }])
		expect(payload.xaxis.categories).toEqual(['WK030000', 'WK030001', 'WK030002'])
		expect(redraw).toBe(false)
		expect(animate).toBe(false)
	})

	it('keeps the wrapper bound to the same objects, filled with the new data', async () => {
		const { wrapper, stub } = mountDrawn()
		const options = stub.vm.$attrs.options
		const series = stub.vm.$attrs.series
		await wrapper.setProps({ series: [{ name: 'count', data: [9] }], categories: ['WK030100'] })
		expect(stub.vm.$attrs.options).toBe(options)
		expect(stub.vm.$attrs.series).toBe(series)
		expect(options.xaxis.categories).toEqual(['WK030100'])
		expect(series).toEqual([{ name: 'count', data: [9] }])
	})

	it('does not update the chart when nothing it draws changed', async () => {
		const { wrapper, apex } = mountDrawn()
		await wrapper.setProps({ widgetId: 'w1' })
		await nextTick()
		expect(apex.updateOptions).not.toHaveBeenCalled()
	})

	it('only fills the binding while no chart is drawn yet', async () => {
		const wrapper = mount(CnChartWidget, { props: { type: 'bar', series: [{ name: 'count', data: [1] }], categories: ['a'] } })
		await wrapper.setProps({ series: [{ name: 'count', data: [3] }], categories: ['b'] })
		const stub = wrapper.findComponent({ name: 'vue-apexcharts-stub' })
		expect(stub.vm.$attrs.series).toEqual([{ name: 'count', data: [3] }])
		expect(stub.vm.$attrs.options.xaxis.categories).toEqual(['b'])
	})
})
