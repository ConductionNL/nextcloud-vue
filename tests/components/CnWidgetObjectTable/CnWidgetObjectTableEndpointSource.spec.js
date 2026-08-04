/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnWidgetObjectTable's Wave-2 `endpointSource` binding
 * (nextcloud-vue#91): rows from the responsePath slice of an app REST
 * payload (the pipelinq SourcePerformance contract), columns/rowRoute
 * unchanged on top, external rows winning, non-array payload safety,
 * token-resolved params, and the refresh() force-refetch.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {} })),
}))

import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'

import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'
import { invalidateEndpointSourceCache } from '../../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const rowsPayload = [
	{ source: 'Website', total: 12, won: 4, conversionRate: 33.3 },
	{ source: 'Referral', total: 6, won: 3, conversionRate: 50 },
]

describe('CnWidgetObjectTable — endpointSource (Wave 2)', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('feeds CnDataTable the rows plucked at responsePath, columns unchanged on top', async () => {
		axios.get.mockResolvedValue({ data: { report: { sources: rowsPayload } } })
		const columns = [
			{ key: 'source', label: 'Source', sortable: true },
			{ key: 'conversionRate', label: 'Conversion %', format: (v) => `${v}%` },
		]
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource: { url: '/apps/pipelinq/api/reports/source-performance', responsePath: 'report.sources' },
				columns,
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/pipelinq/api/reports/source-performance', { params: {} })
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('rows')).toEqual(rowsPayload)
		expect(table.props('columns')).toEqual(columns)
		// The endpoint binding must NOT arm the OpenRegister self-fetch.
		expect(table.props('register')).toBeNull()
	})

	it('resolves @workspace params through the shared filter grammar', async () => {
		axios.get.mockResolvedValue({ data: [] })
		shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource: { url: '/api/report', params: { from: '@workspace.dateFrom?', to: '@workspace.dateTo?' } },
			},
			provide: {
				cnWorkspaceContext: { dateFrom: '2026-06-01', dateTo: '2026-07-01' },
			},
		})
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/nc/api/report', {
			params: { from: '2026-06-01', to: '2026-07-01' },
		})
	})

	it('external rows always win over endpointSource (no fetch fired)', async () => {
		const external = [{ id: 1, title: 'external' }]
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				rows: external,
				endpointSource: { url: '/api/report' },
			},
		})
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toEqual(external)
	})

	it('renders empty (not crashing) for a non-array payload', async () => {
		axios.get.mockResolvedValue({ data: { message: 'not rows' } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { endpointSource: { url: '/api/report' } },
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toEqual([])
	})

	it('endpointSource wins over a configured source when both slip past the validator', async () => {
		axios.get.mockResolvedValue({ data: rowsPayload })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource: { url: '/api/report' },
				source: { register: 'pipelinq', schema: 'lead' },
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(wrapper.vm.selfFetchActive).toBe(false)
		expect(table.props('rows')).toEqual(rowsPayload)
	})

	it('keeps rowRoute mapping on endpoint rows', async () => {
		axios.get.mockResolvedValue({ data: [{ id: '42', title: 'row' }] })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource: { url: '/api/report' },
				rowRoute: 'lead-detail',
			},
		})
		await flush()
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		const route = table.props('rowClickRoute')({ id: '42' })
		expect(route).toEqual({ name: 'lead-detail', params: { id: '42' } })
	})

	it('refresh() force-refetches the endpoint past the shared cache', async () => {
		axios.get.mockResolvedValue({ data: [] })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { endpointSource: { url: '/api/report' } },
		})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		wrapper.vm.refresh()
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})
})
