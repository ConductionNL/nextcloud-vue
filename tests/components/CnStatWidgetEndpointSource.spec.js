/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnStatWidget's Wave-2 `endpointSource` binding (nextcloud-vue#91):
 * valueField plucking, the previousField/deltaField trend sublabel (arrow +
 * percent-vs-previous — the pipelinq KPI contract), variantWhen threshold
 * styling, clickRoute click-through, and the W1 formatter styles.
 */

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

import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountWidget(content, { workspace } = {}) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs,
		provide: {
			cnWorkspaceContext: workspace !== undefined ? workspace : {},
		},
	})
}

describe('CnStatWidget — endpointSource (Wave 2)', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('plucks the display value at valueField (with responsePath) and formats it', async () => {
		axios.get.mockResolvedValue({ data: { data: { revenue: 12500, other: 1 } } })
		const wrapper = mountWidget({
			label: 'Revenue',
			format: { style: 'currency', currency: 'EUR', decimals: 0 },
			endpointSource: { url: '/apps/pipelinq/api/analytics/commercial', responsePath: 'data' },
			valueField: 'revenue',
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/pipelinq/api/analytics/commercial', { params: {} })
		expect(wrapper.vm.displayValue).toBe(12500)
		expect(wrapper.find('.cn-stat-widget__value').text()).toContain('12')
	})

	it('resolves @workspace params through the shared filter grammar', async () => {
		axios.get.mockResolvedValue({ data: { revenue: 1 } })
		mountWidget(
			{
				endpointSource: { url: '/api/x', params: { period: '@workspace.datePreset?' } },
				valueField: 'revenue',
			},
			{ workspace: { datePreset: 'month' } },
		)
		await flush()

		expect(axios.get).toHaveBeenCalledWith('/nc/api/x', { params: { period: 'month' } })
	})

	it('renders the trend sublabel from previousField (arrow + percent-vs-previous)', async () => {
		axios.get.mockResolvedValue({ data: { revenue: 120, previousPeriod: { revenue: 100 } } })
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'revenue',
			previousField: 'previousPeriod.revenue',
		})
		await flush()
		await wrapper.vm.$nextTick()

		const trend = wrapper.find('[data-testid="cn-stat-widget-trend"]')
		expect(trend.exists()).toBe(true)
		expect(trend.text()).toContain('+20.0%')
		expect(wrapper.vm.trendIcon).toBe('TrendingUp')
		// Rising + goodDirection up (default) tints green.
		expect(wrapper.vm.trendColor).toBe('var(--color-success)')
	})

	it('tints a falling trend red on goodDirection up, green on goodDirection down', async () => {
		axios.get.mockResolvedValue({ data: { v: 80, prev: 100 } })
		const up = mountWidget({
			endpointSource: { url: '/api/up' },
			valueField: 'v',
			previousField: 'prev',
		})
		await flush()
		expect(up.vm.trendPct).toBeCloseTo(-20)
		expect(up.vm.trendIcon).toBe('TrendingDown')
		expect(up.vm.trendColor).toBe('var(--color-error)')

		const down = mountWidget({
			endpointSource: { url: '/api/down' },
			valueField: 'v',
			previousField: 'prev',
			goodDirection: 'down',
		})
		await flush()
		expect(down.vm.trendColor).toBe('var(--color-success)')
	})

	it('uses a server-computed deltaField directly (wins over previousField)', async () => {
		axios.get.mockResolvedValue({ data: { v: 5, deltaPct: -12.5, prev: 5 } })
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'v',
			previousField: 'prev',
			deltaField: 'deltaPct',
		})
		await flush()
		expect(wrapper.vm.trendPct).toBe(-12.5)
		expect(wrapper.vm.formattedTrend).toBe('-12.5%')
	})

	it('hides the trend when previous is 0 or missing', async () => {
		axios.get.mockResolvedValue({ data: { v: 5, prev: 0 } })
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'v',
			previousField: 'prev',
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.trendPct).toBeNull()
		expect(wrapper.find('[data-testid="cn-stat-widget-trend"]').exists()).toBe(false)
	})

	it('applies the first matching variantWhen rule (colour + icon override)', async () => {
		axios.get.mockResolvedValue({ data: { pending: 7 } })
		const wrapper = mountWidget({
			icon: 'Cash',
			endpointSource: { url: '/api/x' },
			valueField: 'pending',
			variantWhen: [
				{ op: 'gte', value: 10, variant: 'error' },
				{ op: 'gt', value: 0, variant: 'warning', icon: 'AlertOutline' },
				{ op: 'eq', value: 0, variant: 'success' },
			],
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.activeVariantRule.variant).toBe('warning')
		expect(wrapper.vm.variantColor).toBe('var(--color-warning)')
		expect(wrapper.vm.resolvedIcon).toBe('AlertOutline')
		expect(wrapper.vm.valueStyle).toEqual({ color: 'var(--color-warning)' })
	})

	it('accepts the doriath "danger" variant as an alias of error and keeps colours on default', async () => {
		axios.get.mockResolvedValue({ data: { n: 99 } })
		const wrapper = mountWidget({
			valueColor: '#123456',
			endpointSource: { url: '/api/x' },
			valueField: 'n',
			variantWhen: [{ op: 'gt', value: 50, variant: 'danger' }],
		})
		await flush()
		expect(wrapper.vm.variantColor).toBe('var(--color-error)')

		const noMatch = mountWidget({
			valueColor: '#123456',
			endpointSource: { url: '/api/y' },
			valueField: 'n',
			variantWhen: [{ op: 'lt', value: 0, variant: 'error' }],
		})
		await flush()
		expect(noMatch.vm.activeVariantRule).toBeNull()
		expect(noMatch.vm.valueStyle).toEqual({ color: '#123456' })
	})

	it('turns the tile into a router-link via clickRoute', async () => {
		axios.get.mockResolvedValue({ data: { n: 1 } })
		const wrapper = mount(CnStatWidget, {
			propsData: {
				content: {
					endpointSource: { url: '/api/x' },
					valueField: 'n',
					clickRoute: 'leads',
				},
			},
			stubs: {
				...stubs,
				// No real router in jsdom — stub the root link tag.
				'router-link': { name: 'router-link', template: '<a class="rl-stub"><slot /></a>' },
			},
			provide: { cnWorkspaceContext: {} },
		})
		await flush()
		expect(wrapper.vm.linkTag).toBe('router-link')
		expect(wrapper.vm.linkRoute).toBe('leads')
		expect(wrapper.vm.isLinked).toBe(true)
	})

	it('formats duration-hours per the pipelinq resolution-time contract (42.5h)', async () => {
		axios.get.mockResolvedValue({ data: { avg: 42.51 } })
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'avg',
			format: { style: 'duration-hours' },
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-stat-widget__value').text()).toBe('42.5h')
	})

	it('never fires the OpenRegister path while endpoint-bound (endpointSource wins)', async () => {
		axios.get.mockResolvedValue({ data: { n: 3 } })
		mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'n',
			// A meaningfully configured OR source that must NOT be queried.
			source: { register: 'pipelinq', schema: 'lead', metric: 'count' },
		})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe('/nc/api/x')
	})

	it('renders the em-dash error state when the endpoint fails', async () => {
		axios.get.mockRejectedValue(new Error('boom'))
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'n',
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-stat-widget__error').exists()).toBe(true)
		expect(wrapper.vm.displayError).toBe('boom')
	})
})
