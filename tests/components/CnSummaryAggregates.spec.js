/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnSummaryAggregates — declarative count/sum/avg stat chips scoped
 * to the detail-page object via @objectId / @object.<field> filter tokens.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		if (params) for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, v)
		return `/nc${out}`
	}),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnSummaryAggregates from '../../src/components/CnSummaryAggregates/CnSummaryAggregates.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

function mountAgg(aggregates, { objectContext } = {}) {
	return mount(CnSummaryAggregates, {
		propsData: { aggregates },
		stubs,
		provide: {
			cnObjectContext: objectContext !== undefined ? objectContext : ref({ objectId: 'o1', object: { id: 'o1' } }),
		},
	})
}

describe('CnSummaryAggregates', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('fetches one aggregate per descriptor and renders labelled chips', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { value: 12 } })
			.mockResolvedValueOnce({ data: { value: 4200 } })
		const wrapper = mountAgg([
			{ label: 'Open cases', register: 'pipelinq', schema: 'case', metric: 'count', filter: { client: '@objectId', status: 'open' } },
			{ label: 'Outstanding', register: 'pipelinq', schema: 'invoice', metric: 'sum', field: 'amount', filter: { client: '@objectId' }, format: 'currency' },
		])
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledTimes(2)
		// @objectId resolved to the detail object's id in the filter params
		const firstParams = axios.get.mock.calls[0][1].params
		expect(firstParams['filter[client]']).toBe('o1')
		expect(firstParams['filter[status]']).toBe('open')
		expect(firstParams.metric).toBe('count')

		const chips = wrapper.findAll('[data-testid^="cn-summary-aggregate-"]')
		expect(chips.length).toBe(2)
		expect(wrapper.find('[data-testid="cn-summary-aggregate-0"]').text()).toContain('Open cases')
		expect(wrapper.find('[data-testid="cn-summary-aggregate-0"]').text()).toContain('12')
		// currency formatting
		expect(wrapper.find('[data-testid="cn-summary-aggregate-1"]').text()).toMatch(/4.?200/)
	})

	it('renders nothing when no aggregates are configured', async () => {
		const wrapper = mountAgg([])
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-summary-aggregates"]').exists()).toBe(false)
	})

	it('shows a dash when a value is unavailable', async () => {
		axios.get.mockResolvedValue({ data: {} })
		const wrapper = mountAgg([
			{ label: 'Cases', register: 'r', schema: 's', metric: 'count', filter: {} },
		])
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-summary-aggregate-0"]').text()).toContain('—')
	})
})
