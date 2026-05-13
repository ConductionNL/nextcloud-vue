/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnRoadmapTab — reaction-sorted GitHub issues feed with the four
 * documented degraded states (PAT-not-configured, rate-limited, network error,
 * empty list) plus the happy path.
 *
 * @spec openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md
 *       (requirement "CnRoadmapTab")
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'

import CnRoadmapTab from '../../src/components/CnRoadmapTab/CnRoadmapTab.vue'

// flushPromises — let the mounted() async fetch settle.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name', 'description'],
		template: '<div class="empty"><h2>{{ name }}</h2><p>{{ description }}</p><div class="empty-action"><slot name="action" /></div></div>',
	},
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	NcButton: { name: 'NcButton', template: '<button class="btn" @click="$emit(\'click\')"><slot /></button>' },
	AlertCircleOutline: true,
	ClockOutline: true,
	InformationOutline: true,
	KeyOutline: true,
	RoadVariant: true,
	// CnRoadmapItem rendered as a lightweight stub — its own behaviour is covered in CnRoadmapItem.spec.js.
	CnRoadmapItem: { name: 'CnRoadmapItem', props: ['item'], template: '<li class="roadmap-item" :data-number="item.number" />' },
}

describe('CnRoadmapTab', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('renders the loading state before the fetch resolves', async () => {
		axios.get.mockReturnValue(new Promise(() => {})) // never resolves
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.loading').exists()).toBe(true)
	})

	it('renders items sorted by reactions.total_count descending on success', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				items: [
					{ number: 1, reactions: { total_count: 3 } },
					{ number: 2, reactions: { total_count: 9 } },
					{ number: 3, reactions: { total_count: 5 } },
				],
			},
		})
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await flush()
		await wrapper.vm.$nextTick()

		const numbers = wrapper.findAll('.roadmap-item').wrappers.map((w) => w.attributes('data-number'))
		expect(numbers).toEqual(['2', '3', '1'])
	})

	it('sends labels=enhancement,feature with the request', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { items: [] } })
		mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await flush()

		expect(axios.get).toHaveBeenCalledTimes(1)
		const [, config] = axios.get.mock.calls[0]
		expect(config.params).toMatchObject({ repo: 'ConductionNL/openregister', labels: 'enhancement,feature' })
	})

	it('renders the PAT-not-configured empty state on hint', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { items: [], hint: 'github_pat_not_configured' } })
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.empty').exists()).toBe(true)
		expect(wrapper.text().toLowerCase()).toContain('roadmap not yet configured'.toLowerCase())
	})

	it('renders the rate-limited message on HTTP 429', async () => {
		axios.get.mockRejectedValue({ response: { status: 429, data: { error: 'github_rate_limited' } } })
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.text().toLowerCase()).toContain('temporarily unavailable')
	})

	it('renders the generic error + retry button on a network error', async () => {
		axios.get.mockRejectedValue(new Error('Network down'))
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.text().toLowerCase()).toContain('could not load the roadmap')
		expect(wrapper.find('.btn').exists()).toBe(true)
	})

	it('renders the empty state when the items array is []', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { items: [] } })
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister' } })
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.text().toLowerCase()).toContain('no roadmap items yet')
	})

	it('renders the admin-disabled empty state and does NOT fetch when disabled', async () => {
		const wrapper = mount(CnRoadmapTab, { stubs, propsData: { repo: 'ConductionNL/openregister', disabled: true } })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.text().toLowerCase()).toContain('disabled by your administrator')
	})
})
