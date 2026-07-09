/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnDeltaWidget's Wave-2 `endpointSource` binding
 * (nextcloud-vue#91): both legs read from ONE payload via valueField /
 * previousField (the pipelinq previousPeriod contract), a server-computed
 * deltaField, and the exactly-one-of precedence over the OpenRegister legs.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
// The OpenRegister two-leg fetcher must never fire in endpoint mode.
jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(() => Promise.resolve(0)),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'

import CnDeltaWidget from '../../src/components/CnDeltaWidget/CnDeltaWidget.vue'
import { fetchAggregateValue } from '../../src/utils/fetchAggregate.js'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountWidget(content, { workspace } = {}) {
	return mount(CnDeltaWidget, {
		propsData: { content },
		stubs,
		provide: {
			cnWorkspaceContext: workspace !== undefined ? workspace : {},
		},
	})
}

describe('CnDeltaWidget — endpointSource (Wave 2)', () => {
	beforeEach(() => {
		axios.get.mockReset()
		fetchAggregateValue.mockClear()
		invalidateEndpointSourceCache()
	})

	it('reads current + previous from one payload and renders the delta percent', async () => {
		axios.get.mockResolvedValue({ data: { revenue: 120, previousPeriod: { revenue: 100 } } })
		const wrapper = mountWidget({
			label: 'Revenue',
			endpointSource: { url: '/apps/pipelinq/api/analytics/commercial' },
			valueField: 'revenue',
			previousField: 'previousPeriod.revenue',
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(wrapper.vm.effectiveCurrent).toBe(120)
		expect(wrapper.vm.effectivePrevious).toBe(100)
		expect(wrapper.vm.deltaPct).toBeCloseTo(20)
		expect(wrapper.find('.cn-delta-widget__delta').text()).toContain('+20.0%')
		expect(wrapper.vm.deltaColor).toBe('var(--color-success)')
	})

	it('uses a server-computed deltaField directly and honours top-level goodDirection', async () => {
		axios.get.mockResolvedValue({ data: { v: 80, pct: -10 } })
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'v',
			deltaField: 'pct',
			goodDirection: 'down',
		})
		await flush()
		expect(wrapper.vm.deltaPct).toBe(-10)
		// Falling + goodDirection down = good = green.
		expect(wrapper.vm.deltaColor).toBe('var(--color-success)')
	})

	it('resolves @workspace params so the dashboard range drives the period', async () => {
		axios.get.mockResolvedValue({ data: { v: 1, prev: 1 } })
		mountWidget(
			{
				endpointSource: { url: '/api/x', params: { period: '@workspace.datePreset?' } },
				valueField: 'v',
				previousField: 'prev',
			},
			{ workspace: { datePreset: 'quarter' } },
		)
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/nc/api/x', { params: { period: 'quarter' } })
	})

	it('never fires the two OpenRegister legs while endpoint-bound', async () => {
		axios.get.mockResolvedValue({ data: { v: 1, prev: 2 } })
		mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'v',
			previousField: 'prev',
			source: {
				register: 'pipelinq',
				schema: 'lead',
				metric: 'sum',
				field: 'value',
				current: { filter: {} },
				previous: { filter: {} },
			},
		})
		await flush()
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		expect(axios.get).toHaveBeenCalledTimes(1)
	})

	it('renders the error state when the endpoint fails', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const wrapper = mountWidget({
			endpointSource: { url: '/api/x' },
			valueField: 'v',
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.displayError).toBe('down')
		expect(wrapper.find('.cn-delta-widget__error').exists()).toBe(true)
	})
})
