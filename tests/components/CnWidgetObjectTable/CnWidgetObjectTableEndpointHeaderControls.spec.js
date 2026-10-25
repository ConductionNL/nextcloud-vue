/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An `endpointSource` table with `sortable` / `filterable` draws the head
 * controls and sorts and filters the endpoint's rows in the browser
 * (DqCatalogus Objecttypen).
 */

import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'
import { invalidateEndpointSourceCache } from '../../../src/composables/useEndpointSource.js'

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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const ROWS = [
	{ title: 'Openbare ruimte', caseTypes: 1 },
	{ title: 'Boom', caseTypes: 3 },
]

/**
 * Mount an endpoint table.
 *
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper, rows loaded.
 */
async function mountTable(props) {
	axios.get.mockResolvedValue({ data: { results: ROWS } })
	const wrapper = shallowMount(CnWidgetObjectTable, {
		propsData: {
			endpointSource: { url: '/apps/dossiq/api/catalogue/object-types', responsePath: 'results' },
			columns: [{ key: 'title', label: 'Object type' }, { key: 'caseTypes', label: 'Used in', type: 'number' }],
			...props,
		},
	})
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('CnWidgetObjectTable — endpoint rows with head controls', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('keeps plain heads and the endpoint order without the opt-in', async () => {
		const table = (await mountTable({})).findComponent({ name: 'CnDataTable' })
		expect(table.props('filterable')).toBe(false)
		expect(table.props('rows').map((r) => r.title)).toEqual(['Openbare ruimte', 'Boom'])
	})

	it('makes the heads sortable and filterable and sorts the rows on a head sort', async () => {
		const wrapper = await mountTable({ sortable: true, filterable: true })
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('filterable')).toBe(true)
		expect(table.props('columns').every((col) => col.sortable)).toBe(true)
		table.vm.$emit('sort', { key: 'title', order: 'asc' })
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows').map((r) => r.title)).toEqual(['Boom', 'Openbare ruimte'])
		expect(axios.get).toHaveBeenCalledTimes(1)
	})

	it('filters the rows on a head filter', async () => {
		const wrapper = await mountTable({ sortable: true, filterable: true })
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('columnFilter', { key: 'caseTypes', params: { 'caseTypes[gte]': ['2'], 'caseTypes[lte]': [] } })
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows').map((r) => r.title)).toEqual(['Boom'])
	})
})

describe('CnWidgetObjectTable — a row navigate action reads its row', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('resolves @object.<field> in the target against the row before dispatching', async () => {
		const dispatch = jest.fn()
		axios.get.mockResolvedValue({ data: { results: ROWS } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource: { url: '/apps/dossiq/api/catalogue/object-types', responsePath: 'results' },
				columns: [{ key: 'title', label: 'Object type' }],
				actions: [{ id: 'open-schema', label: 'Open schema', type: 'navigate', target: '/index.php/apps/openregister/schemas/@object.schemaId' }],
			},
			global: { provide: { cnDispatchAction: dispatch } },
		})
		await flush()
		await wrapper.vm.runAction(wrapper.vm.actions[0], { id: 'Boom', schemaId: '42' })
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ target: '/index.php/apps/openregister/schemas/42' }))
	})
})
