/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stats-block entry can read its value from an app endpoint
 * (stats-block-entry-endpoint): entries naming the same endpoint share one
 * request and each reads its own `valueField`; a failure or a non-number shows
 * no value; an entry without an endpoint still reads OpenRegister.
 *
 * @spec openspec/changes/stats-block-entry-endpoint/specs/stats-block/spec.md#requirement-a-stats-block-entry-can-read-its-value-from-an-endpoint
 */

import { mount } from '@vue/test-utils'
import { invalidateEndpointSourceCache } from '../../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const CnStatsBlockWidget = require('../../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue').default

const StatsBlockStub = {
	name: 'CnStatsBlock',
	props: ['title', 'count', 'countLabel', 'loading', 'variant', 'clickable', 'route', 'showZeroCount', 'horizontal'],
	template: '<div class="stats-stub" :data-title="title" :data-count="count" />',
}

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
}

function mountWidget(entries) {
	return mount(CnStatsBlockWidget, { propsData: { entries }, stubs: { CnStatsBlock: StatsBlockStub } })
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnStatsBlockWidget — entries read from an endpoint', () => {
	it('shares one request between entries and reads each valueField', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('/summary')) {
				return Promise.resolve({ data: { totals: { open: 4, late: 2 } } })
			}
			return Promise.resolve({ data: { value: 9 } })
		})
		const wrapper = mountWidget([
			{ title: 'Open', endpointSource: { url: '/apps/x/api/summary', responsePath: 'totals' }, valueField: 'open' },
			{ title: 'Late', endpointSource: { url: '/apps/x/api/summary', responsePath: 'totals' }, valueField: 'late' },
			{ title: 'Stored', register: 'r', schema: 's' },
		])
		await flush()
		const counts = wrapper.findAll('.stats-stub').map((b) => [b.attributes('data-title'), b.attributes('data-count')])
		expect(counts).toEqual([['Open', '4'], ['Late', '2'], ['Stored', '9']])
		const summaryCalls = axios.get.mock.calls.filter(([url]) => url.includes('/summary'))
		expect(summaryCalls).toHaveLength(1)
		expect(axios.get.mock.calls.some(([url]) => url.includes('/aggregations/r/s/value'))).toBe(true)
	})

	it('shows no value for a failed endpoint or a value that is not a number', async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes('/broken')) {
				return Promise.reject(new Error('down'))
			}
			return Promise.resolve({ data: { label: 'many' } })
		})
		const wrapper = mountWidget([
			{ title: 'Broken', endpointSource: { url: '/apps/x/api/broken' }, valueField: 'n' },
			{ title: 'Text', endpointSource: { url: '/apps/x/api/text' }, valueField: 'label' },
		])
		await flush()
		expect(wrapper.vm.entryCounts).toEqual([null, null])
	})
})
