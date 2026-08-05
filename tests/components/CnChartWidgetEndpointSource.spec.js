/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnChartWidget's Wave-2 `endpointSource` binding
 * (nextcloud-vue#91): labelsPath / series[] {name, path} mapping over
 * array-of-points AND object payloads, pie-family flattening, params
 * re-resolution + refetch on a workspace (date-range) change, and the
 * ref-callable refresh() force-refetch.
 */

jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub', render: (h) => h('div') }), { virtual: true })
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountChart(props = {}, { workspace } = {}) {
	return mount(CnChartWidget, {
		propsData: props,
		provide: {
			cnWorkspaceContext: workspace !== undefined ? workspace : {},
		},
	})
}

describe('CnChartWidget — endpointSource (Wave 2)', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('maps an ARRAY-of-points payload via per-item labelsPath / series[].path (pipelinq trends contract)', async () => {
		axios.get.mockResolvedValue({
			data: {
				metric: 'leads',
				series: [
					{ date: '2026-05', value: 4 },
					{ date: '2026-06', value: 7 },
					{ date: '2026-07', value: 5 },
				],
			},
		})
		const wrapper = mountChart({
			type: 'line',
			endpointSource: {
				url: '/apps/pipelinq/api/analytics/trends',
				params: { metric: 'leads' },
				responsePath: 'series',
				labelsPath: 'date',
				series: [{ name: 'Leads', path: 'value' }],
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/pipelinq/api/analytics/trends', { params: { metric: 'leads' } })
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'Leads', data: [4, 7, 5] }])
		expect(wrapper.vm.resolvedCategories).toEqual(['2026-05', '2026-06', '2026-07'])
		expect(wrapper.vm.hasChartData).toBe(true)
	})

	it('maps an OBJECT payload via parallel-array labelsPath / series[].path', async () => {
		axios.get.mockResolvedValue({
			data: { labels: ['New', 'Qualified', 'Won'], open: [10, 6, 2], weighted: [5, 4, 2] },
		})
		const wrapper = mountChart({
			type: 'bar',
			endpointSource: {
				url: '/api/pipeline-by-stage',
				labelsPath: 'labels',
				series: [
					{ name: 'Open value', path: 'open' },
					{ name: 'Weighted', path: 'weighted' },
				],
			},
		})
		await flush()

		expect(wrapper.vm.resolvedSeries).toEqual([
			{ name: 'Open value', data: [10, 6, 2] },
			{ name: 'Weighted', data: [5, 4, 2] },
		])
		expect(wrapper.vm.resolvedLabels).toEqual(['New', 'Qualified', 'Won'])
	})

	it('flattens the first series into the flat value array for pie-family charts', async () => {
		axios.get.mockResolvedValue({
			data: [
				{ bucket: '0-7d', count: 3 },
				{ bucket: '8-30d', count: 5 },
			],
		})
		const wrapper = mountChart({
			type: 'donut',
			endpointSource: {
				url: '/api/aging',
				labelsPath: 'bucket',
				series: [{ name: 'Leads', path: 'count' }],
			},
		})
		await flush()

		expect(wrapper.vm.resolvedSeries).toEqual([3, 5])
		expect(wrapper.vm.resolvedLabels).toEqual(['0-7d', '8-30d'])
	})

	it('defaults a series name to its path and coerces non-numeric values to 0', async () => {
		axios.get.mockResolvedValue({ data: [{ v: 'x' }, { v: 2 }] })
		const wrapper = mountChart({
			type: 'line',
			endpointSource: { url: '/api/x', series: [{ path: 'v' }] },
		})
		await flush()
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'v', data: [0, 2] }])
	})

	it('re-resolves params + refetches when the workspace date range changes', async () => {
		axios.get.mockResolvedValue({ data: [] })
		const workspace = ref({ datePreset: 'month' })
		mountChart({
			type: 'line',
			endpointSource: {
				url: '/api/trends',
				params: { period: '@workspace.datePreset?' },
				series: [{ path: 'value' }],
			},
		}, { workspace })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { period: 'month' } })

		workspace.value = { datePreset: 'year' }
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[1][1]).toEqual({ params: { period: 'year' } })
	})

	it('falls back to the static series/labels props while the endpoint has not resolved', async () => {
		let resolveFetch
		axios.get.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))
		const wrapper = mountChart({
			type: 'line',
			series: [{ name: 'Static', data: [1] }],
			categories: ['a'],
			endpointSource: { url: '/api/x', labelsPath: 'date', series: [{ name: 'Live', path: 'value' }] },
		})
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'Static', data: [1] }])

		resolveFetch({ data: [{ date: 'b', value: 9 }] })
		await flush()
		expect(wrapper.vm.resolvedSeries).toEqual([{ name: 'Live', data: [9] }])
		expect(wrapper.vm.resolvedCategories).toEqual(['b'])
	})

	it('refresh() force-refetches the endpoint past the shared cache', async () => {
		axios.get.mockResolvedValue({ data: [] })
		const wrapper = mountChart({
			type: 'line',
			endpointSource: { url: '/api/x', series: [{ path: 'v' }] },
		})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)

		wrapper.vm.refresh()
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})
})
