/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnChartWidget's Wave-3 OBJECT-form `dataSource.aggregate`
 * (nextcloud-vue#91): server /grouped facet aggregation (count + sum),
 * top-N + folded "Other" bucket (larpingapp skill-usage contract),
 * labelResolve label/colour resolution (fkResolve pattern), the
 * client-side collection fallback when the facet endpoint is missing,
 * and `dataSource.drilldown` segment-click navigation with the RAW key.
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper; the
// local Vue-2 `render: (h) => h('div')` mock that lived here throws under Vue 3.
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		for (const [k, v] of Object.entries(params || {})) out = out.replace(`{${k}}`, v)
		return `/nc${out}`
	}),
}))

import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'

import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const GROUPED_URL = '/nc/apps/openregister/api/objects/aggregations/crm/request/grouped'

// shallowMount stubs the apexcharts child `<component :is>` so the real
// apexcharts renderer never runs (its DOM draw is irrelevant here — the
// assertions read vm computeds like resolvedSeries / drilldownKeys and the
// widget's OWN template, e.g. the views pills). This also makes the suite
// immune to any cross-file vue-apexcharts mock ordering in the full run.
function mountChart(props = {}, mocks = {}) {
	return shallowMount(CnChartWidget, {
		propsData: props,
		mocks,
	})
}

describe('CnChartWidget — dataSource.aggregate (Wave 3)', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('aggregates via the OR /grouped facet endpoint (count) and renders pie labels + values', async () => {
		axios.get.mockResolvedValue({
			data: {
				groups: [
					{ key: 'new', value: 4 },
					{ key: 'in_progress', value: 9 },
					{ key: null, value: 2 },
				],
			},
		})
		const wrapper = mountChart({
			type: 'donut',
			dataSource: {
				register: 'crm',
				schema: 'request',
				filter: { active: true },
				aggregate: { groupBy: 'status' },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith(GROUPED_URL, {
			params: { groupBy: 'status', metric: 'count', 'filter[active]': true },
		})
		// Sorted by value desc; the null key renders as an em-dash label
		// with an EMPTY raw key.
		expect(wrapper.vm.resolvedSeries).toEqual([9, 4, 2])
		expect(wrapper.vm.resolvedLabels).toEqual(['in_progress', 'new', '—'])
		expect(wrapper.vm.drilldownKeys).toEqual(['in_progress', 'new', ''])
	})

	it('sums a numeric field (metric: sum + sumField) and shapes a cartesian series (pipelinq billing contract)', async () => {
		axios.get.mockResolvedValue({
			data: {
				groups: [
					{ key: 'consulting', value: 12.5 },
					{ key: 'support', value: 40 },
				],
			},
		})
		const wrapper = mountChart({
			type: 'bar',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: { groupBy: 'billingCategory', metric: 'sum', sumField: 'hours' },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith(GROUPED_URL, {
			params: { groupBy: 'billingCategory', metric: 'sum', field: 'hours' },
		})
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'hours', data: [40, 12.5] }])
		expect(wrapper.vm.resolvedCategories).toEqual(['support', 'consulting'])
	})

	it('skips (with a warn) when metric sum is declared without sumField', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountChart({
			type: 'bar',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: { groupBy: 'billingCategory', metric: 'sum' },
			},
		})
		await flush()

		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.vm.aggregateData).toBeNull()
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sumField'))
		warnSpy.mockRestore()
	})

	it('applies topN + folds the remainder into a translated Other bucket (larpingapp top-10 contract)', async () => {
		axios.get.mockResolvedValue({
			data: {
				groups: [
					{ key: 'a', value: 10 },
					{ key: 'b', value: 8 },
					{ key: 'c', value: 5 },
					{ key: 'd', value: 3 },
					{ key: 'e', value: 1 },
				],
			},
		})
		const wrapper = mountChart({
			type: 'donut',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: { groupBy: 'skill', topN: 2, otherBucket: true },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.resolvedSeries).toEqual([10, 8, 9])
		expect(wrapper.vm.resolvedLabels).toEqual(['a', 'b', 'Other'])
		// The Other bucket carries the sentinel raw key so drilldown skips it.
		expect(wrapper.vm.drilldownKeys).toEqual(['a', 'b', '__other__'])
	})

	it('truncates WITHOUT an Other bucket when otherBucket is not set (additive default)', async () => {
		axios.get.mockResolvedValue({
			data: {
				groups: [
					{ key: 'a', value: 10 },
					{ key: 'b', value: 8 },
					{ key: 'c', value: 5 },
				],
			},
		})
		const wrapper = mountChart({
			type: 'donut',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: { groupBy: 'skill', topN: 2 },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.resolvedSeries).toEqual([10, 8])
		expect(wrapper.vm.resolvedLabels).toEqual(['a', 'b'])
	})

	it('resolves reference keys to labels + colours via labelResolve (fkResolve pattern, axios path)', async () => {
		axios.get.mockImplementation((url) => {
			if (url === GROUPED_URL) {
				return Promise.resolve({
					data: { groups: [{ key: 'uuid-1', value: 6 }, { key: 'uuid-2', value: 3 }] },
				})
			}
			if (url.endsWith('/uuid-1')) {
				return Promise.resolve({ data: { name: 'Consulting', color: '#ff0000' } })
			}
			if (url.endsWith('/uuid-2')) {
				return Promise.resolve({ data: { name: 'Support', color: '#00ff00' } })
			}
			return Promise.reject(new Error(`unexpected url ${url}`))
		})
		const wrapper = mountChart({
			type: 'donut',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: {
					groupBy: 'billingCategory',
					labelResolve: { schema: 'billingCategory', labelField: 'name', colorField: 'color' },
				},
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		// Labels swap to the referenced objects' names; raw uuids stay for drilldown.
		expect(wrapper.vm.resolvedLabels).toEqual(['Consulting', 'Support'])
		expect(wrapper.vm.drilldownKeys).toEqual(['uuid-1', 'uuid-2'])
		// The colour map feeds the per-category palette (mappedColors path).
		expect(wrapper.vm.effectiveColorMap).toEqual({ Consulting: '#ff0000', Support: '#00ff00' })
		expect(wrapper.vm.mappedColors).toEqual(['#ff0000', '#00ff00'])
	})

	it('an explicit colorMap prop wins over labelResolve colours', async () => {
		axios.get.mockImplementation((url) => {
			if (url === GROUPED_URL) {
				return Promise.resolve({ data: { groups: [{ key: 'uuid-1', value: 6 }] } })
			}
			return Promise.resolve({ data: { name: 'Consulting', color: '#ff0000' } })
		})
		const wrapper = mountChart({
			type: 'donut',
			colorMap: { Consulting: '#123456' },
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: {
					groupBy: 'billingCategory',
					labelResolve: { schema: 'billingCategory', colorField: 'color' },
				},
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.mappedColors).toEqual(['#123456'])
	})

	it('falls back to client-side collection aggregation when the facet endpoint is unavailable (petstore chart-by-field contract)', async () => {
		axios.get.mockImplementation((url) => {
			if (url === GROUPED_URL) {
				return Promise.reject(new Error('404'))
			}
			return Promise.resolve({
				data: {
					results: [
						{ status: 'available', price: 5 },
						{ status: 'available', price: 7 },
						{ status: 'sold' },
						{ status: '' },
					],
				},
			})
		})
		const wrapper = mountChart({
			type: 'donut',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: { groupBy: 'status' },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/crm/request', {
			params: { _limit: 1000 },
		})
		expect(wrapper.vm.resolvedSeries).toEqual([2, 1, 1])
		expect(wrapper.vm.resolvedLabels).toEqual(['available', 'sold', '—'])
	})

	it('client-side fallback sums sumField when metric is sum', async () => {
		axios.get.mockImplementation((url) => {
			if (url === GROUPED_URL) return Promise.reject(new Error('404'))
			return Promise.resolve({
				data: {
					results: [
						{ cat: 'a', hours: 2 },
						{ cat: 'a', hours: 3.5 },
						{ cat: 'b', hours: 1 },
					],
				},
			})
		})
		const wrapper = mountChart({
			type: 'bar',
			dataSource: {
				register: 'crm',
				schema: 'request',
				aggregate: { groupBy: 'cat', metric: 'sum', sumField: 'hours' },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'hours', data: [5.5, 1] }])
		expect(wrapper.vm.resolvedCategories).toEqual(['a', 'b'])
	})

	describe('drilldown (segment/bar click → route with filter)', () => {
		const groups = [{ key: 'uuid-1', value: 6 }, { key: 'uuid-2', value: 3 }]

		it('wires chart.events.dataPointSelection and pushes the route NAME with the RAW key in the query', async () => {
			axios.get.mockResolvedValue({ data: { groups } })
			const push = jest.fn(() => Promise.resolve())
			const wrapper = mountChart({
				type: 'donut',
				dataSource: {
					register: 'crm',
					schema: 'request',
					aggregate: { groupBy: 'billingCategory' },
					drilldown: { route: 'TimeEntries', filterParam: 'billingCategory' },
				},
			}, { $router: { push } })
			await flush()
			await wrapper.vm.$nextTick()

			const events = wrapper.vm.mergedOptions.chart.events
			expect(typeof events.dataPointSelection).toBe('function')

			events.dataPointSelection(null, null, { dataPointIndex: 1 })
			expect(push).toHaveBeenCalledWith({ name: 'TimeEntries', query: { billingCategory: 'uuid-2' } })
		})

		it('treats a route starting with / as a PATH (pipelinq billing contract)', async () => {
			axios.get.mockResolvedValue({ data: { groups } })
			const push = jest.fn(() => Promise.resolve())
			const wrapper = mountChart({
				type: 'donut',
				dataSource: {
					register: 'crm',
					schema: 'request',
					aggregate: { groupBy: 'billingCategory' },
					drilldown: { route: '/time-entries', filterParam: 'billingCategory' },
				},
			}, { $router: { push } })
			await flush()

			wrapper.vm.onDataPointSelection(null, null, { dataPointIndex: 0 })
			expect(push).toHaveBeenCalledWith({ path: '/time-entries', query: { billingCategory: 'uuid-1' } })
		})

		it('never navigates on the folded Other bucket', async () => {
			axios.get.mockResolvedValue({
				data: { groups: [{ key: 'a', value: 5 }, { key: 'b', value: 4 }, { key: 'c', value: 1 }] },
			})
			const push = jest.fn(() => Promise.resolve())
			const wrapper = mountChart({
				type: 'donut',
				dataSource: {
					register: 'crm',
					schema: 'request',
					aggregate: { groupBy: 'status', topN: 1, otherBucket: true },
					drilldown: { route: 'Requests', filterParam: 'status' },
				},
			}, { $router: { push } })
			await flush()
			await wrapper.vm.$nextTick()

			// Index 1 is the folded Other bucket (topN: 1).
			wrapper.vm.onDataPointSelection(null, null, { dataPointIndex: 1 })
			expect(push).not.toHaveBeenCalled()
			// The real slice still navigates.
			wrapper.vm.onDataPointSelection(null, null, { dataPointIndex: 0 })
			expect(push).toHaveBeenCalledWith({ name: 'Requests', query: { status: 'a' } })
		})

		it('drilldown also rides the legacy groupBy form via its rawKeys', async () => {
			axios.get.mockResolvedValue({ data: { groups } })
			const push = jest.fn(() => Promise.resolve())
			const wrapper = mountChart({
				type: 'donut',
				dataSource: {
					register: 'crm',
					schema: 'request',
					groupBy: { field: 'billingCategory' },
					drilldown: { route: 'TimeEntries', filterParam: 'billingCategory' },
				},
			}, { $router: { push } })
			await flush()
			await wrapper.vm.$nextTick()

			wrapper.vm.onDataPointSelection(null, null, { dataPointIndex: 0 })
			expect(push).toHaveBeenCalledWith({ name: 'TimeEntries', query: { billingCategory: 'uuid-1' } })
		})

		it('does not wire chart events without a drilldown block', async () => {
			axios.get.mockResolvedValue({ data: { groups } })
			const wrapper = mountChart({
				type: 'donut',
				dataSource: {
					register: 'crm',
					schema: 'request',
					aggregate: { groupBy: 'status' },
				},
			}, { $router: { push: jest.fn() } })
			await flush()

			expect(wrapper.vm.mergedOptions.chart.events).toBeUndefined()
		})
	})

	describe('views[] in-widget switcher (Wave-4 amendment)', () => {
		const series = [
			{ name: 'Margin €', data: [100, 200] },
			{ name: 'Margin %', data: [10, 20] },
		]

		it('renders a pill per view and filters the displayed series to the active view (shillinq € / % contract)', async () => {
			const wrapper = mountChart({
				type: 'bar',
				series,
				categories: ['Jan', 'Feb'],
				valueFormat: 'currency',
				views: [
					{ key: 'eur', label: '€', series: ['Margin €'], valueFormat: 'currency' },
					{ key: 'pct', label: '%', series: ['Margin %'], valueFormat: 'percent' },
				],
			})
			await wrapper.vm.$nextTick()

			expect(wrapper.find('[data-testid="cn-chart-widget-views"]').exists()).toBe(true)
			// First view active by default → only the € series renders.
			expect(wrapper.vm.displayedSeries).toEqual([series[0]])
			expect(wrapper.vm.valueFormatterFn(1000)).toContain('1')

			await wrapper.find('[data-testid="cn-chart-widget-view-pct"]').trigger('click')
			expect(wrapper.vm.displayedSeries).toEqual([series[1]])
			// The active view's valueFormat overrides the widget-level one.
			expect(wrapper.vm.valueFormatterFn(10)).toBe('10%')
		})

		it('falls back to ALL series when the view filter matches nothing (typo safety)', async () => {
			const wrapper = mountChart({
				type: 'bar',
				series,
				views: [
					{ key: 'a', label: 'A', series: ['Nope'] },
					{ key: 'b', label: 'B' },
				],
			})
			expect(wrapper.vm.displayedSeries).toEqual(series)
		})

		it('renders no switcher for zero or one view', async () => {
			const wrapper = mountChart({ type: 'bar', series, views: [{ key: 'only' }] })
			expect(wrapper.find('[data-testid="cn-chart-widget-views"]').exists()).toBe(false)
			expect(wrapper.vm.displayedSeries).toEqual(series)
		})
	})

	it('refresh() re-runs the aggregate source', async () => {
		axios.get.mockResolvedValue({ data: { groups: [{ key: 'a', value: 1 }] } })
		const wrapper = mountChart({
			type: 'donut',
			dataSource: { register: 'crm', schema: 'request', aggregate: { groupBy: 'status' } },
		})
		await flush()
		const callsBefore = axios.get.mock.calls.length
		wrapper.vm.refresh()
		await flush()
		expect(axios.get.mock.calls.length).toBeGreaterThan(callsBefore)
	})
})
