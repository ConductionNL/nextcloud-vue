/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget: the per-tile period picker starts on a real preset, and the
 * tile's link resolves the same context tokens its endpoint does.
 *
 * Found by portaliq's KPI cards (portaliq#666). The picker opened BLANK (its
 * value '' matched no option), so the app added a preset with id '' as a
 * trick; and `@object.slug` in the tile's route was silently dropped, so the
 * app wrapped the tile just to build its link.
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	'router-link': { name: 'router-link', template: '<a class="rl-stub"><slot /></a>' },
}

const PRESETS = [
	{ id: '7', label: 'Last 7 days' },
	{ id: '30', label: 'Last 30 days' },
	{ id: '90', label: 'Last 90 days' },
]

function mountWidget(content, provide = {}) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs,
		provide: { cnWorkspaceContext: {}, ...provide },
	})
}

describe('CnStatWidget: per-tile period picker default', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { n: 1 } })
		invalidateEndpointSourceCache()
	})

	it('starts on the first preset when nothing else sets a period', async () => {
		const wrapper = mountWidget({
			label: 'Page views',
			dateRange: { presets: PRESETS },
			endpointSource: { url: '/api/summary', params: { days: '@range.preset' } },
			valueField: 'n',
		})
		await flush()

		expect(wrapper.vm.activeRangePreset).toBe('7')
		expect(wrapper.find('[data-testid="cn-stat-widget-range"]').element.value).toBe('7')
		// The first request already carries the range, instead of being
		// blocked on an unresolved required token.
		expect(axios.get).toHaveBeenCalledWith('/nc/api/summary', { params: { days: '7' } })
	})

	it('starts on dateRange.default when the tile names one', async () => {
		const wrapper = mountWidget({
			dateRange: { presets: PRESETS, default: '30' },
			endpointSource: { url: '/api/summary', params: { days: '@range.preset?' } },
			valueField: 'n',
		})
		await flush()

		expect(wrapper.vm.activeRangePreset).toBe('30')
		expect(axios.get).toHaveBeenCalledWith('/nc/api/summary', { params: { days: '30' } })
	})

	it('refetches with the preset the reader picks', async () => {
		const wrapper = mountWidget({
			dateRange: { presets: PRESETS, default: '30' },
			endpointSource: { url: '/api/summary', params: { days: '@range.preset' } },
			valueField: 'n',
		})
		await flush()
		wrapper.vm.selectRange('90')
		await flush()

		expect(wrapper.vm.activeRangePreset).toBe('90')
		expect(axios.get).toHaveBeenLastCalledWith('/nc/api/summary', { params: { days: '90' } })
	})

	it('follows the dashboard range, not its own default, while the page sets one', async () => {
		const wrapper = mountWidget(
			{
				dateRange: { presets: PRESETS, default: '30' },
				endpointSource: { url: '/api/summary', params: { days: '@range.preset' } },
				valueField: 'n',
			},
			{ cnDashboardDateRange: { preset: '90', from: null, to: null } },
		)
		await flush()

		expect(wrapper.vm.activeRangePreset).toBe('90')
	})

	it('gives no default to a tile without its own presets', async () => {
		const wrapper = mountWidget({
			dateRange: {},
			endpointSource: { url: '/api/summary', params: { days: '@range.preset?' } },
			valueField: 'n',
		})
		await flush()

		expect(wrapper.vm.activeRange()).toBeNull()
		expect(axios.get).toHaveBeenCalledWith('/nc/api/summary', { params: {} })
	})
})

describe('CnStatWidget: context tokens in the tile link', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { n: 1 } })
		invalidateEndpointSourceCache()
	})

	it('resolves @object.<field> in the route on a detail page', async () => {
		const wrapper = mountWidget(
			{
				endpointSource: { url: '/api/x' },
				valueField: 'n',
				route: { name: 'Traffic', query: { portal: '@object.slug' } },
			},
			{ cnDetailObjectContext: { objectId: 'p-1', objectData: { slug: 'open-tilburg' } } },
		)
		await flush()

		expect(wrapper.vm.linkRoute).toEqual({ name: 'Traffic', query: { portal: 'open-tilburg' } })
	})

	it('resolves @range.preset in the route to the active period', async () => {
		const wrapper = mountWidget({
			dateRange: { presets: PRESETS, default: '30' },
			endpointSource: { url: '/api/x' },
			valueField: 'n',
			route: { name: 'Traffic', query: { days: '@range.preset' } },
		})
		await flush()
		expect(wrapper.vm.linkRoute).toEqual({ name: 'Traffic', query: { days: '30' } })

		wrapper.vm.selectRange('7')
		await flush()
		expect(wrapper.vm.linkRoute).toEqual({ name: 'Traffic', query: { days: '7' } })
	})

	it('still drops a token that stays unresolved', async () => {
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'n',
			route: { name: 'Traffic', query: { portal: '@object.slug', fixed: 'yes' } },
		})
		await flush()

		expect(wrapper.vm.linkRoute).toEqual({ name: 'Traffic', query: { fixed: 'yes' } })
	})
})
