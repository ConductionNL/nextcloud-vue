/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The chart and the map report `loaded` once, when their first load has
 * settled, failure included, so a host's placeholder never outlives a failed
 * read (widget-placeholder-shape task 6; launchpad first-paint-skeleton).
 *
 * @spec openspec/changes/widget-placeholder-shape/specs/widget-renderer/spec.md#requirement-the-renderer-reports-its-first-load
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('leaflet', () => ({ __esModule: true, default: {} }))

import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import CnMapWidget from '../../src/components/CnMapWidget/CnMapWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const bucket = { register: 'crm', schema: 'request', bucket: { field: 'created', interval: 'day' } }

describe('CnChartWidget reports loaded', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('declares the loaded event', () => {
		const wrapper = shallowMount(CnChartWidget, { propsData: { series: [1, 2] } })
		expect(wrapper.vm.$options.emits).toContain('loaded')
	})

	it('a chart with static series is loaded with its first render', async () => {
		const wrapper = shallowMount(CnChartWidget, { propsData: { series: [{ name: 'a', data: [1, 2] }] } })
		await flush()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('waits for the first REST read and emits loaded once it answered', async () => {
		let answer
		axios.get.mockReturnValue(new Promise((resolve) => {
			answer = resolve
		}))
		const wrapper = shallowMount(CnChartWidget, { propsData: { dataSource: bucket } })
		await flush()
		expect(wrapper.vm.loading).toBe(true)
		expect(wrapper.emitted('loaded')).toBeUndefined()
		answer({ data: { buckets: [] } })
		await flush()
		await flush()
		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('a failed first read still ends the wait', async () => {
		axios.get.mockRejectedValue(new Error('500'))
		const wrapper = shallowMount(CnChartWidget, { propsData: { dataSource: bucket } })
		await flush()
		await flush()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('a refresh does not emit loaded again', async () => {
		axios.get.mockResolvedValue({ data: { buckets: [] } })
		const wrapper = shallowMount(CnChartWidget, { propsData: { dataSource: bucket } })
		await flush()
		await flush()
		await wrapper.vm.refresh()
		await flush()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('counts the GraphQL and endpoint sources as part of the first load', () => {
		const loading = CnChartWidget.computed.loading
		expect(loading.call({ restFirstPending: 0, dsLoading: true, epLoading: false })).toBe(true)
		expect(loading.call({ restFirstPending: 0, dsLoading: false, epLoading: true })).toBe(true)
		expect(loading.call({ restFirstPending: 1, dsLoading: false, epLoading: false })).toBe(true)
		expect(loading.call({ restFirstPending: 0, dsLoading: false, epLoading: false })).toBe(false)
	})
})

describe('CnMapWidget reports loaded', () => {
	/**
	 * A map's `this` for its mounted hook.
	 *
	 * @param {object} overrides Fields to set.
	 * @return {object}
	 */
	function mapCtx(overrides = {}) {
		return { content: {}, loading: true, imageLayerPending: false, leafletAvailable: true, ...overrides }
	}

	it('declares the loaded event and starts loading', () => {
		expect(CnMapWidget.mixins[0].emits).toContain('loaded')
		expect(CnMapWidget.data.call({ content: {} }).loading).toBe(true)
	})

	it('stays loading until the first marker read answered', async () => {
		let answer
		const ctx = mapCtx()
		ctx.initMap = () => {
			ctx._firstMarkers = new Promise((resolve) => {
				answer = resolve
			})
		}
		const done = CnMapWidget.mounted.call(ctx)
		await flush()
		expect(ctx.loading).toBe(true)
		answer()
		await done
		expect(ctx.loading).toBe(false)
	})

	it('a failed marker read still ends the wait', async () => {
		const ctx = mapCtx()
		ctx.initMap = () => {
			ctx._firstMarkers = Promise.reject(new Error('500'))
		}
		await expect(CnMapWidget.mounted.call(ctx)).rejects.toThrow('500')
		expect(ctx.loading).toBe(false)
	})

	it('a map whose picture waits for the record is loaded with its frame', async () => {
		const ctx = mapCtx({ imageLayerPending: true, initMap: jest.fn() })
		await CnMapWidget.mounted.call(ctx)
		expect(ctx.initMap).not.toHaveBeenCalled()
		expect(ctx.loading).toBe(false)
	})
})
