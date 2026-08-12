/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnChartWidget's value-axis baseline guard.
 *
 * ApexCharts frames the data range by default, so a series of [7, 6]
 * renders as a full-height cliff — the reader sees a collapse where the
 * data says "one fewer". Bar and area encode magnitude by length/area, so
 * their baseline must be zero; line encodes position and may sit off zero,
 * but must not zoom until noise fills the plot.
 */

import { shallowMount } from '@vue/test-utils'

import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

/**
 * Mount a cartesian chart over a single explicit series.
 *
 * @param {number[]} data Series values.
 * @param {object} props Extra component props (e.g. type, valueAxisBaseline).
 * @return {object} The VTU wrapper.
 */
function mountChart(data, props = {}) {
	return shallowMount(CnChartWidget, {
		propsData: {
			type: 'area',
			series: [{ name: 'calls', data }],
			categories: data.map((_, i) => `d${i}`),
			...props,
		},
	})
}

describe('CnChartWidget — value-axis baseline', () => {
	// The reported bug: 7 calls on one day and 6 the next rendered as
	// top-of-plot vs bottom-of-plot, reading as a collapse.
	it('anchors an area chart at zero so a 7-vs-6 difference reads as small', () => {
		const vm = mountChart([7, 6]).vm
		expect(vm.valueAxisBounds).toEqual({ min: 0, max: 8 })
		expect(vm.mergedOptions.yaxis.min).toBe(0)
		expect(vm.mergedOptions.yaxis.max).toBe(8)
		expect(vm.mergedOptions.yaxis.forceNiceScale).toBe(true)
	})

	it('anchors bar charts at zero too', () => {
		expect(mountChart([7, 6], { type: 'bar' }).vm.valueAxisBounds)
			.toEqual({ min: 0, max: 8 })
	})

	it('puts the baseline on the x-axis for horizontal bars', () => {
		const vm = mountChart([7, 6], { type: 'bar', horizontal: true }).vm
		expect(vm.mergedOptions.xaxis.min).toBe(0)
		expect(vm.mergedOptions.yaxis.min).toBeUndefined()
	})

	it('rounds the ceiling up to a nice number rather than the data max', () => {
		expect(mountChart([62, 40]).vm.valueAxisBounds).toEqual({ min: 0, max: 80 })
		expect(mountChart([210, 90]).vm.valueAxisBounds).toEqual({ min: 0, max: 250 })
		expect(mountChart([1, 1]).vm.valueAxisBounds).toEqual({ min: 0, max: 1 })
	})

	it('leaves scaling to ApexCharts under baseline="fit"', () => {
		const vm = mountChart([7, 6], { valueAxisBaseline: 'fit' }).vm
		expect(vm.valueAxisBounds).toBeNull()
		expect(vm.mergedOptions.yaxis.min).toBeUndefined()
	})

	it('never clamps a series that goes negative', () => {
		expect(mountChart([5, -3]).vm.valueAxisBounds).toBeNull()
	})

	it('gives an all-zero series a token ceiling instead of collapsing', () => {
		expect(mountChart([0, 0]).vm.valueAxisBounds).toEqual({ min: 0, max: 1 })
	})

	it('does not touch pie-family charts', () => {
		const wrapper = shallowMount(CnChartWidget, {
			propsData: { type: 'donut', series: [7, 6], labels: ['a', 'b'] },
		})
		expect(wrapper.vm.valueAxisBounds).toBeNull()
	})

	it('ignores an empty series', () => {
		expect(mountChart([]).vm.valueAxisBounds).toBeNull()
	})

	describe('line charts keep a non-zero baseline but resist extreme zoom', () => {
		it('expands a window too narrow to be honest', () => {
			// Spread of 1 against a max of 1000 would otherwise fill the plot.
			const bounds = mountChart([1000, 999], { type: 'line' }).vm.valueAxisBounds
			expect(bounds).not.toBeNull()
			expect(bounds.max - bounds.min).toBeGreaterThanOrEqual(1000 * 0.25)
			// Still a non-zero baseline — a line chart need not start at zero.
			expect(bounds.min).toBeGreaterThan(0)
		})

		it('leaves an already-wide window alone', () => {
			// Spread of 60 against a max of 100 is well past the quarter floor.
			expect(mountChart([100, 40], { type: 'line' }).vm.valueAxisBounds).toBeNull()
		})

		it('honours an explicit baseline="zero" on a line chart', () => {
			expect(mountChart([1000, 999], { type: 'line', valueAxisBaseline: 'zero' }).vm.valueAxisBounds)
				.toEqual({ min: 0, max: 1000 })
		})
	})

	it('lets an explicit options.yaxis.min win through the deep-merge', () => {
		const vm = mountChart([7, 6], { options: { yaxis: { min: 5 } } }).vm
		expect(vm.mergedOptions.yaxis.min).toBe(5)
	})
})
