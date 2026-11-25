/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * fetchRowAggregates: a count over many rows goes out as ONE request to
 * OpenRegister's batch count endpoint instead of one list request per row
 * (pipelinq Clients fired 8x GET objects/pipelinq/ticket for its "Open
 * tickets" column, measured 25 Nov 2026). Falls back to per-row requests.
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const { fetchRowAggregates } = require('../../src/utils/rowAggregate.js')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const COUNTS_URL = '/index.php/apps/openregister/api/objects/counts'
const openTickets = { register: 'pipelinq', schema: 'ticket', op: 'count', where: { client: '@self.id', status: { ne: 'closed' } } }
const rows = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c1' }]

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
})

describe('fetchRowAggregates', () => {
	it('asks every row count in one request, one entry per distinct filter', async () => {
		axios.post.mockResolvedValue({ data: { results: [{ count: 2 }, { count: 0 }, { count: 5 }] } })

		const out = await fetchRowAggregates(openTickets, rows)

		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.get).not.toHaveBeenCalled()
		const [url, body] = axios.post.mock.calls[0]
		expect(url).toBe(COUNTS_URL)
		expect(body.counts).toEqual([
			{ register: 'pipelinq', schema: 'ticket', filter: { client: 'c1', status: { ne: 'closed' } } },
			{ register: 'pipelinq', schema: 'ticket', filter: { client: 'c2', status: { ne: 'closed' } } },
			{ register: 'pipelinq', schema: 'ticket', filter: { client: 'c3', status: { ne: 'closed' } } },
		])
		expect(out).toEqual([{ value: 2 }, { value: 0 }, { value: 5 }, { value: 2 }])
	})

	it('falls back to one list request per row when the batch fails', async () => {
		axios.post.mockRejectedValue(new Error('404'))
		axios.get.mockImplementation((url, { params }) => Promise.resolve({ data: { total: params.client === 'c2' ? 7 : 1 } }))

		const out = await fetchRowAggregates(openTickets, rows.slice(0, 2))

		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[0][1].params).toEqual({ client: 'c1', status: { ne: 'closed' }, _limit: 0 })
		expect(out).toEqual([{ value: 1 }, { value: 7 }])
	})

	it('falls back when the batch answers a different number of results', async () => {
		axios.post.mockResolvedValue({ data: { results: [{ count: 1 }] } })
		axios.get.mockResolvedValue({ data: { total: 3 } })

		const out = await fetchRowAggregates(openTickets, rows.slice(0, 2))

		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(out).toEqual([{ value: 3 }, { value: 3 }])
	})

	it('reports a count the endpoint withholds as an error for that row only', async () => {
		axios.post.mockResolvedValue({ data: { results: [{ count: null }, { count: 4 }] } })

		const out = await fetchRowAggregates(openTickets, rows.slice(0, 2))

		expect('error' in out[0]).toBe(true)
		expect(out[1]).toEqual({ value: 4 })
	})

	it('asks a max per row', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ at: '2026-11-01' }] } })

		const out = await fetchRowAggregates({ register: 'r', schema: 's', op: 'max', field: 'at', where: { client: '@self.id' } }, rows.slice(0, 2))

		expect(axios.post).not.toHaveBeenCalled()
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(out).toEqual([{ value: '2026-11-01' }, { value: '2026-11-01' }])
	})

	it('asks a row whose filter keeps a token on its own', async () => {
		axios.post.mockResolvedValue({ data: { results: [{ count: 1 }, { count: 2 }] } })
		axios.get.mockResolvedValue({ data: { total: 9 } })
		const mine = { register: 'r', schema: 's', op: 'count', where: { client: '@self.id', owner: '@self.owner' } }

		const out = await fetchRowAggregates(mine, [{ id: 'a', owner: 'x' }, { id: 'b', owner: 'y' }, { id: 'c', owner: '@me' }])

		expect(axios.post.mock.calls[0][1].counts).toHaveLength(2)
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(out).toEqual([{ value: 1 }, { value: 2 }, { value: 9 }])
	})

	it('asks a single row with its own list request', async () => {
		axios.get.mockResolvedValue({ data: { total: 6 } })

		expect(await fetchRowAggregates(openTickets, [{ id: 'c1' }])).toEqual([{ value: 6 }])
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('CnDataTable aggregate column', () => {
	it('fills every row of a count column from one batch request', async () => {
		axios.post.mockResolvedValue({ data: { results: [{ count: 3 }, { count: 0 }] } })
		const wrapper = mount(CnDataTable, {
			propsData: {
				rows: [{ id: 'c1', name: 'Acme' }, { id: 'c2', name: 'Globex' }],
				columns: [{ key: 'name', label: 'Name' }, { key: 'openTickets', label: 'Open tickets', aggregate: openTickets }],
			},
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
		})
		await new Promise((resolve) => setTimeout(resolve))
		await wrapper.vm.$nextTick()

		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.vm.aggregateValues.c1.openTickets).toBe(3)
		expect(wrapper.vm.aggregateValues.c2.openTickets).toBe(0)
	})
})
