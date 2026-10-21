/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Rows read from an endpoint sort when a sortable header is clicked: numbers
 * as numbers (10 after 9), text in the reader's collation, empty values last.
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

const rows = [
	{ agent: 'bob', seconds: 540 },
	{ agent: 'Alice', seconds: 600 },
	{ agent: 'carol', seconds: null },
	{ agent: 'dave', seconds: 90 },
]

/**
 * Mount on the endpoint rows.
 *
 * @return {Promise<object>} The wrapper.
 */
async function mountTable() {
	axios.get.mockResolvedValue({ data: { rows } })
	const wrapper = shallowMount(CnWidgetObjectTable, {
		propsData: {
			endpointSource: { url: '/apps/x/api/agents', responsePath: 'rows' },
			columns: [{ key: 'agent', label: 'Agent', sortable: true }, { key: 'seconds', label: 'Time', sortable: true }],
		},
	})
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('CnWidgetObjectTable — sorting endpoint rows', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('keeps the endpoint order until a header is clicked', async () => {
		const wrapper = await mountTable()
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows').map((r) => r.agent)).toEqual(['bob', 'Alice', 'carol', 'dave'])
	})

	it('sorts numbers as numbers, empty values last', async () => {
		const wrapper = await mountTable()
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		table.vm.$emit('sort', { key: 'seconds', order: 'desc', keys: [{ key: 'seconds', order: 'desc' }] })
		await wrapper.vm.$nextTick()
		expect(table.props('rows').map((r) => r.agent)).toEqual(['Alice', 'bob', 'dave', 'carol'])
		expect(table.props('sortKey')).toBe('seconds')
		expect(table.props('sortOrder')).toBe('desc')

		table.vm.$emit('sort', { key: 'seconds', order: 'asc', keys: [{ key: 'seconds', order: 'asc' }] })
		await wrapper.vm.$nextTick()
		expect(table.props('rows').map((r) => r.agent)).toEqual(['dave', 'bob', 'Alice', 'carol'])
	})

	it('sorts text in the reader\'s collation, and a cleared sort restores the endpoint order', async () => {
		const wrapper = await mountTable()
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		table.vm.$emit('sort', { key: 'agent', order: 'asc', keys: [{ key: 'agent', order: 'asc' }] })
		await wrapper.vm.$nextTick()
		expect(table.props('rows').map((r) => r.agent)).toEqual(['Alice', 'bob', 'carol', 'dave'])

		table.vm.$emit('sort', { key: null, order: null, keys: [] })
		await wrapper.vm.$nextTick()
		expect(table.props('rows').map((r) => r.agent)).toEqual(['bob', 'Alice', 'carol', 'dave'])
	})
})

describe('CnWidgetObjectTable — a note filled from the endpoint answer', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('fills the translated note from the answer, and shows nothing before it', async () => {
		axios.get.mockResolvedValue({ data: { results: [], counts: { sent: 146, refused: 9, failed: 1 } } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource: { url: '/apps/x/api/journeys/j/runs', responsePath: 'results' },
				columns: ['contactId'],
				note: '{counts.sent} sent, {counts.refused} refused, {counts.failed} failed',
			},
			global: { provide: { cnTranslate: (s) => s.replace('sent,', 'verstuurd,') } },
		})
		expect(wrapper.find('[data-testid="cn-widget-object-table-note"]').exists()).toBe(false)
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-widget-object-table-note"]').text()).toBe('146 verstuurd, 9 refused, 1 failed')
	})
})
