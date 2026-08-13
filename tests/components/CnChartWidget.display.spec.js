/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnChartWidget's display passthrough (Wave 1, nextcloud-vue#91):
 * horizontal bars, legend position, named value formatters (currency /
 * currency-compact / percent) on axis + tooltip, per-category color map,
 * and the declarative empty-state message. All additive — defaults keep
 * the pre-existing rendering byte-for-byte.
 */

// The apexcharts stub is supplied globally via jest.config.js moduleNameMapper
// (both `vue-apexcharts` and the Vue-3 `vue3-apexcharts` map to it). The local
// mock that used to live here carried a Vue-2 `render: (h) => h('div')`, which
// throws "h is not a function" under Vue 3.

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

const barProps = {
	type: 'bar',
	series: [{ name: 'Revenue', data: [10, 20] }],
	categories: ['Q1', 'Q2'],
}

const mountChart = (props = {}) => mount(CnChartWidget, { propsData: props })

describe('CnChartWidget — display passthrough', () => {
	describe('horizontal bars', () => {
		it('defaults to vertical bars (regression)', () => {
			const wrapper = mountChart(barProps)
			expect(wrapper.vm.mergedOptions.plotOptions.bar.horizontal).toBe(false)
		})

		it('renders horizontal bars when the prop is set', () => {
			const wrapper = mountChart({ ...barProps, horizontal: true })
			expect(wrapper.vm.mergedOptions.plotOptions.bar.horizontal).toBe(true)
		})

		it('an explicit options.plotOptions.bar.horizontal still wins', () => {
			const wrapper = mountChart({ ...barProps, horizontal: true, options: { plotOptions: { bar: { horizontal: false } } } })
			expect(wrapper.vm.mergedOptions.plotOptions.bar.horizontal).toBe(false)
		})
	})

	describe('legend position', () => {
		it('keeps the automatic placement by default (top cartesian, bottom pie)', () => {
			expect(mountChart(barProps).vm.mergedOptions.legend.position).toBe('top')
			expect(mountChart({ type: 'pie', series: [1, 2], labels: ['a', 'b'] }).vm.mergedOptions.legend.position).toBe('bottom')
		})

		it('honours the legendPosition override', () => {
			const wrapper = mountChart({ ...barProps, legendPosition: 'right' })
			expect(wrapper.vm.mergedOptions.legend.position).toBe('right')
		})
	})

	describe('named value formatters', () => {
		it('applies the currency formatter to the value axis AND the tooltip', () => {
			const wrapper = mountChart({ ...barProps, valueFormat: 'currency' })
			const opts = wrapper.vm.mergedOptions
			const axisFmt = opts.yaxis.labels.formatter
			const tooltipFmt = opts.tooltip.y.formatter
			expect(typeof axisFmt).toBe('function')
			expect(typeof tooltipFmt).toBe('function')
			expect(axisFmt(1000)).toContain('€')
			expect(tooltipFmt(1000)).toBe(axisFmt(1000))
		})

		it('formats the x-axis instead when bars are horizontal (value axis flips)', () => {
			const wrapper = mountChart({ ...barProps, horizontal: true, valueFormat: 'currency' })
			const opts = wrapper.vm.mergedOptions
			expect(typeof opts.xaxis.labels.formatter).toBe('function')
			expect(opts.yaxis.labels.formatter).toBeUndefined()
		})

		it('supports the object form with a currency override', () => {
			const wrapper = mountChart({ ...barProps, valueFormat: { name: 'currency', currency: 'USD' } })
			expect(wrapper.vm.mergedOptions.tooltip.y.formatter(5)).toContain('$')
		})

		it('currency-compact renders compact notation', () => {
			const wrapper = mountChart({ ...barProps, valueFormat: 'currency-compact' })
			const out = wrapper.vm.mergedOptions.tooltip.y.formatter(1200)
			expect(out).toContain('€')
			expect(out.length).toBeLessThan(8)
		})

		it('percent appends the percent sign', () => {
			const wrapper = mountChart({ ...barProps, valueFormat: 'percent' })
			expect(wrapper.vm.mergedOptions.tooltip.y.formatter(83.3)).toMatch(/83.*%$/)
		})

		it('passes non-numeric values through and applies no formatter by default', () => {
			const withFormat = mountChart({ ...barProps, valueFormat: 'percent' })
			expect(withFormat.vm.mergedOptions.tooltip.y.formatter('n/a')).toBe('n/a')
			const plain = mountChart(barProps)
			expect(plain.vm.mergedOptions.tooltip.y).toBeUndefined()
			expect(plain.vm.mergedOptions.yaxis.labels.formatter).toBeUndefined()
		})
	})

	describe('per-category color map', () => {
		it('maps pie slice colours by label with palette fallback', () => {
			const wrapper = mountChart({
				type: 'donut',
				series: [4, 2, 1],
				labels: ['open', 'closed', 'other'],
				colorMap: { open: '#00aa00', closed: '#aa0000' },
			})
			const colors = wrapper.vm.mergedOptions.colors
			expect(colors[0]).toBe('#00aa00')
			expect(colors[1]).toBe('#aa0000')
			// Unmapped category keeps the palette colour at its position.
			expect(colors[2]).toBe(wrapper.vm.defaultColors[2])
		})

		it('distributes bar colours per category when a colorMap is set', () => {
			const wrapper = mountChart({ ...barProps, colorMap: { Q1: '#123456' } })
			const opts = wrapper.vm.mergedOptions
			expect(opts.plotOptions.bar.distributed).toBe(true)
			expect(opts.colors[0]).toBe('#123456')
		})

		it('keeps the default palette (no distribution) without a colorMap', () => {
			const opts = mountChart(barProps).vm.mergedOptions
			expect(opts.plotOptions.bar.distributed).toBeUndefined()
			expect(opts.colors).toEqual(mountChart(barProps).vm.defaultColors)
		})
	})

	describe('empty-state message', () => {
		it('renders the emptyLabel instead of the chart when the series have no data', () => {
			const wrapper = mountChart({ type: 'bar', series: [], emptyLabel: 'No revenue yet' })
			const empty = wrapper.find('[data-testid="cn-chart-widget-empty"]')
			expect(empty.exists()).toBe(true)
			expect(empty.text()).toBe('No revenue yet')
			expect(wrapper.findComponent({ name: 'vue-apexcharts-stub' }).exists()).toBe(false)
		})

		it('treats cartesian series with empty data arrays as empty', () => {
			const wrapper = mountChart({ type: 'line', series: [{ name: 'x', data: [] }], emptyLabel: 'Nothing' })
			expect(wrapper.find('[data-testid="cn-chart-widget-empty"]').exists()).toBe(true)
		})

		it('renders the chart when data is present', () => {
			const wrapper = mountChart({ ...barProps, emptyLabel: 'Nothing' })
			expect(wrapper.find('[data-testid="cn-chart-widget-empty"]').exists()).toBe(false)
			expect(wrapper.findComponent({ name: 'vue-apexcharts-stub' }).exists()).toBe(true)
		})

		it('keeps the pre-existing empty-canvas behaviour without an emptyLabel', () => {
			const wrapper = mountChart({ type: 'bar', series: [] })
			expect(wrapper.find('[data-testid="cn-chart-widget-empty"]').exists()).toBe(false)
			expect(wrapper.findComponent({ name: 'vue-apexcharts-stub' }).exists()).toBe(true)
		})
	})
})
