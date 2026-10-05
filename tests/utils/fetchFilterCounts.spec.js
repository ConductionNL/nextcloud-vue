/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * fetchFilterCounts: counts per filter, in as few requests as possible.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */

import { fetchAggregateValue, fetchGroupedCounts } from '../../src/utils/fetchAggregate.js'
import { fetchFilterCounts, hasListValue, singleEqualityOf } from '../../src/utils/fetchFilterCounts.js'

jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(),
	fetchGroupedCounts: jest.fn(),
}))

beforeEach(() => {
	fetchAggregateValue.mockReset()
	fetchGroupedCounts.mockReset()
})

describe('singleEqualityOf', () => {
	it('names the field of a one-field equality', () => {
		expect(singleEqualityOf({ status: 'open' })).toEqual({ field: 'status', value: 'open' })
		expect(singleEqualityOf({ priority: 3 })).toEqual({ field: 'priority', value: '3' })
	})

	it('refuses anything a grouped result cannot answer', () => {
		expect(singleEqualityOf({ status: 'open', type: 'woo' })).toBeNull()
		expect(singleEqualityOf({ deadline: { lt: '2026-10-05' } })).toBeNull()
		expect(singleEqualityOf({ status: ['open', 'hold'] })).toBeNull()
		expect(singleEqualityOf({ assignee: '@me' })).toBeNull()
		expect(singleEqualityOf({})).toBeNull()
		expect(singleEqualityOf(null)).toBeNull()
	})
})

describe('hasListValue', () => {
	it('spots a list of values and nothing else', () => {
		expect(hasListValue({ status: ['open', 'hold'] })).toBe(true)
		expect(hasListValue({ status: 'open', deadline: { lt: '2026-10-05' } })).toBe(false)
		expect(hasListValue(null)).toBe(false)
	})
})

describe('fetchFilterCounts', () => {
	it('answers filters on the same field with ONE grouped request', async () => {
		fetchGroupedCounts.mockResolvedValue([{ key: 'open', count: 12 }, { key: 'closed', count: 30 }])

		const counts = await fetchFilterCounts({
			register: 'dossiq',
			schema: 'case',
			entries: [
				{ key: 'a', filter: { status: 'open' } },
				{ key: 'b', filter: { status: 'closed' } },
				{ key: 'c', filter: { status: 'hold' } },
			],
		})

		expect(fetchGroupedCounts).toHaveBeenCalledTimes(1)
		expect(fetchGroupedCounts.mock.calls[0][0]).toEqual({ register: 'dossiq', schema: 'case', groupBy: 'status', filter: {} })
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		// A value the grouped result does not hold has no records.
		expect(counts).toEqual({ a: 12, b: 30, c: 0 })
	})

	it('narrows the grouped request by the base filter', async () => {
		fetchGroupedCounts.mockResolvedValue([])
		await fetchFilterCounts({
			register: 'dossiq',
			schema: 'case',
			baseFilter: { assignee: 'pieter' },
			entries: [{ key: 'a', filter: { status: 'open' } }, { key: 'b', filter: { status: 'closed' } }],
		})
		expect(fetchGroupedCounts.mock.calls[0][0].filter).toEqual({ assignee: 'pieter' })
	})

	it('counts every other filter with one value request, merged with the base filter', async () => {
		fetchAggregateValue.mockResolvedValueOnce(4).mockResolvedValueOnce(7)

		const counts = await fetchFilterCounts({
			register: 'dossiq',
			schema: 'case',
			baseFilter: { type: 'woo' },
			entries: [
				{ key: 'late', filter: { deadline: { lt: '2026-10-05' } } },
				{ key: 'mine', filter: { assignee: '@me' } },
			],
		})

		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).toHaveBeenCalledTimes(2)
		expect(fetchAggregateValue.mock.calls[0][0]).toEqual({
			register: 'dossiq',
			schema: 'case',
			metric: 'count',
			filter: { type: 'woo', deadline: { lt: '2026-10-05' } },
		})
		expect(counts).toEqual({ late: 4, mine: 7 })
	})

	it('does not group a field the base filter already pins', async () => {
		fetchAggregateValue.mockResolvedValue(2)
		await fetchFilterCounts({
			register: 'dossiq',
			schema: 'case',
			baseFilter: { status: 'open' },
			entries: [{ key: 'a', filter: { status: 'open' } }, { key: 'b', filter: { status: 'closed' } }],
		})
		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).toHaveBeenCalledTimes(2)
	})

	it('uses a value request for a lone equality filter', async () => {
		fetchAggregateValue.mockResolvedValue(5)
		const counts = await fetchFilterCounts({ register: 'r', schema: 's', entries: [{ key: 'only', filter: { status: 'open' } }] })
		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(counts).toEqual({ only: 5 })
	})

	it('leaves an entry without a number when its request fails', async () => {
		fetchAggregateValue.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(3)
		const counts = await fetchFilterCounts({
			register: 'r',
			schema: 's',
			entries: [{ key: 'broken', filter: { a: { gt: 1 } } }, { key: 'fine', filter: { b: { gt: 1 } } }],
		})
		expect(counts).toEqual({ fine: 3 })
	})

	describe('a filter that holds a list of values', () => {
		const okResponse = (total) => ({ ok: true, json: async () => ({ total, results: [] }) })

		afterEach(() => {
			delete global.fetch
		})

		it('is never sent to an aggregation endpoint: it is counted through the list endpoint', async () => {
			global.fetch = jest.fn().mockResolvedValue(okResponse(9))

			const counts = await fetchFilterCounts({
				register: 'dossiq',
				schema: 'case',
				baseFilter: { caseType: 'woo' },
				entries: [{ key: 'active', filter: { status: ['open', 'hold'], priority: { gte: 2 } } }],
			})

			expect(fetchGroupedCounts).not.toHaveBeenCalled()
			expect(fetchAggregateValue).not.toHaveBeenCalled()
			expect(global.fetch).toHaveBeenCalledTimes(1)
			const url = new URL(global.fetch.mock.calls[0][0], 'http://localhost')
			expect(url.pathname).toMatch(/\/apps\/openregister\/api\/objects\/dossiq\/case$/)
			// The list as repeated `status[]=`, the way the list request sends it.
			expect(url.searchParams.getAll('status[]')).toEqual(['open', 'hold'])
			expect(url.searchParams.get('priority[gte]')).toBe('2')
			expect(url.searchParams.get('caseType')).toBe('woo')
			expect(url.searchParams.get('_limit')).toBe('1')
			// Nothing in the aggregation spelling.
			expect(Array.from(url.searchParams.keys()).some((key) => key.startsWith('filter['))).toBe(false)
			expect(counts).toEqual({ active: 9 })
		})

		it('still groups the other entries in one request', async () => {
			global.fetch = jest.fn().mockResolvedValue(okResponse(9))
			fetchGroupedCounts.mockResolvedValue([{ key: 'open', count: 5 }, { key: 'closed', count: 2 }])

			const counts = await fetchFilterCounts({
				register: 'dossiq',
				schema: 'case',
				entries: [
					{ key: 'open', filter: { status: 'open' } },
					{ key: 'closed', filter: { status: 'closed' } },
					{ key: 'active', filter: { status: ['open', 'hold'] } },
				],
			})

			expect(fetchGroupedCounts).toHaveBeenCalledTimes(1)
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(counts).toEqual({ open: 5, closed: 2, active: 9 })
		})

		it('counts every entry through the list endpoint when the base filter holds a list', async () => {
			global.fetch = jest.fn().mockResolvedValue(okResponse(3))

			const counts = await fetchFilterCounts({
				register: 'dossiq',
				schema: 'case',
				baseFilter: { caseType: ['woo', 'objection'] },
				entries: [{ key: 'open', filter: { status: 'open' } }, { key: 'closed', filter: { status: 'closed' } }],
			})

			expect(fetchGroupedCounts).not.toHaveBeenCalled()
			expect(fetchAggregateValue).not.toHaveBeenCalled()
			expect(global.fetch).toHaveBeenCalledTimes(2)
			const url = new URL(global.fetch.mock.calls[0][0], 'http://localhost')
			expect(url.searchParams.getAll('caseType[]')).toEqual(['woo', 'objection'])
			expect(counts).toEqual({ open: 3, closed: 3 })
		})

		it('leaves the entry without a number when the list request fails or has no total', async () => {
			global.fetch = jest.fn()
				.mockResolvedValueOnce({ ok: false, status: 500 })
				.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })
			const counts = await fetchFilterCounts({
				register: 'r',
				schema: 's',
				entries: [{ key: 'a', filter: { x: ['1', '2'] } }, { key: 'b', filter: { y: ['1'] } }],
			})
			expect(counts).toEqual({})
		})
	})

	it('makes no request without a register, a schema or entries', async () => {
		expect(await fetchFilterCounts({ register: '', schema: 's', entries: [{ key: 'a', filter: {} }] })).toEqual({})
		expect(await fetchFilterCounts({ register: 'r', schema: 's', entries: [] })).toEqual({})
		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).not.toHaveBeenCalled()
	})
})
