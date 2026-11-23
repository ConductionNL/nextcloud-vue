/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * fetchFilterCounts: counts per filter, in as few requests as possible.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */

import { fetchAggregateValue, fetchGroupedCounts } from '../../src/utils/fetchAggregate.js'
import { fetchFilterCounts, fetchListTotals, hasListValue, hasNullTest, hasOperatorKey, needsListEndpoint, parsePhpQuery, singleEqualityOf } from '../../src/utils/fetchFilterCounts.js'

jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(),
	fetchGroupedCounts: jest.fn(),
}))

beforeEach(() => {
	fetchAggregateValue.mockReset()
	fetchGroupedCounts.mockReset()
})

/**
 * A fake OpenRegister on `global.fetch`: a list request answers its total, a
 * batch count request one total per filter. Every count it answers is recorded
 * as the list request's query parameters, whichever way it came in.
 *
 * @param {function(URLSearchParams): number} totalFor The total for a query.
 * @return {URLSearchParams[]} The counted queries, in order.
 */
function listServer(totalFor) {
	const queries = []
	const toParams = (value, prefix, out) => {
		for (const [key, item] of Object.entries(value)) {
			const name = prefix === '' ? key : (Array.isArray(value) ? `${prefix}[]` : `${prefix}[${key}]`)
			if (item !== null && typeof item === 'object') {
				toParams(item, name, out)
			} else {
				out.append(name, item)
			}
		}
		return out
	}
	global.fetch = jest.fn(async (url, init) => {
		if (init && init.method === 'POST') {
			const results = JSON.parse(init.body).counts.map(({ filter }) => {
				const params = toParams(filter, '', new URLSearchParams())
				queries.push(params)
				return { count: totalFor(params) }
			})
			return { ok: true, json: async () => ({ results }) }
		}
		const params = new URL(url, 'http://localhost').searchParams
		queries.push(params)
		return { ok: true, json: async () => ({ total: totalFor(params), results: [] }) }
	})
	return queries
}

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
			const queries = listServer(() => 3)

			const counts = await fetchFilterCounts({
				register: 'dossiq',
				schema: 'case',
				baseFilter: { caseType: ['woo', 'objection'] },
				entries: [{ key: 'open', filter: { status: 'open' } }, { key: 'closed', filter: { status: 'closed' } }],
			})

			expect(fetchGroupedCounts).not.toHaveBeenCalled()
			expect(fetchAggregateValue).not.toHaveBeenCalled()
			// Both lists in one batch count request.
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(queries).toHaveLength(2)
			expect(queries[0].getAll('caseType[]')).toEqual(['woo', 'objection'])
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

describe('hasNullTest', () => {
	it('spots a null value and an isnull operator, and nothing else', () => {
		expect(hasNullTest({ assignee: null })).toBe(true)
		expect(hasNullTest({ supersededBy: { isnull: true } })).toBe(true)
		expect(hasNullTest({ supersededBy: { isNull: false } })).toBe(true)
		expect(hasNullTest({ status: 'open', deadline: { lt: '2026-10-05' }, owners: ['a'] })).toBe(false)
		expect(hasNullTest(null)).toBe(false)
	})
})

describe('a lens whose filter tests a field for no value', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('is counted through the list endpoint, not the aggregation endpoint that has no null operator', async () => {
		const queries = listServer(() => 48)
		const counts = await fetchFilterCounts({
			register: 'dossiq',
			schema: 'caseType',
			entries: [
				{ key: 'current', filter: { supersededBy: { isnull: true } } },
				{ key: 'unassigned', filter: { assignee: null } },
			],
		})
		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(queries.map((q) => q.get('supersededBy[isnull]')).filter(Boolean)).toEqual(['true'])
		expect(queries.map((q) => q.get('assignee[isnull]')).filter(Boolean)).toEqual(['true'])
		expect(counts).toEqual({ current: 48, unassigned: 48 })
	})

	it('sends a null-testing base filter through the list endpoint for every entry', async () => {
		const queries = listServer(() => 3)
		await fetchFilterCounts({
			register: 'r',
			schema: 's',
			baseFilter: { supersededBy: { isnull: true } },
			entries: [{ key: 'a', filter: { status: 'open' } }, { key: 'b', filter: { status: 'closed' } }],
		})
		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(queries.every((q) => q.get('supersededBy[isnull]') === 'true')).toBe(true)
	})
})

describe('a lens that spells its operator in the key (screens-operator-key-lens-counts)', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('is no single equality and needs the list endpoint', () => {
		expect(hasOperatorKey({ 'scheduledDate[gte]': '2026-10-13' })).toBe(true)
		expect(hasOperatorKey({ status: 'open' })).toBe(false)
		expect(hasOperatorKey({ deadline: { lt: '2026-10-05' } })).toBe(false)
		expect(hasOperatorKey(null)).toBe(false)
		expect(singleEqualityOf({ 'scheduledDate[gte]': '2026-10-13' })).toBeNull()
		expect(needsListEndpoint({ 'scheduledDate[gte]': '2026-10-13' })).toBe(true)
		expect(needsListEndpoint({ status: 'open' })).toBe(false)
	})

	it('is counted through the list endpoint with the key as the list request sends it, never as an aggregate', async () => {
		const queries = listServer((q) => (q.get('scheduledDate[lt]') ? 2 : 5))
		fetchGroupedCounts.mockResolvedValue([{ key: 'closed', count: 9 }, { key: 'scheduled', count: 4 }])
		const counts = await fetchFilterCounts({
			register: 'decidiq',
			schema: 'meeting',
			entries: [
				{ key: 'upcoming', filter: { 'scheduledDate[gte]': '2026-10-13T00:00:00Z' } },
				{ key: 'month', filter: { 'scheduledDate[gte]': '2026-10-01T00:00:00Z', 'scheduledDate[lt]': '2026-11-01T00:00:00Z' } },
				{ key: 'closed', filter: { lifecycle: 'closed' } },
				{ key: 'scheduled', filter: { lifecycle: 'scheduled' } },
			],
		})
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		expect(fetchGroupedCounts).toHaveBeenCalledTimes(1)
		expect(fetchGroupedCounts.mock.calls[0][0].groupBy).toBe('lifecycle')
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(global.fetch.mock.calls[0][1].method).toBe('POST')
		expect(queries[0].get('scheduledDate[gte]')).toBe('2026-10-13T00:00:00Z')
		expect(queries[1].get('scheduledDate[lt]')).toBe('2026-11-01T00:00:00Z')
		expect(counts).toEqual({ upcoming: 5, month: 2, closed: 9, scheduled: 4 })
	})

	it('sends every entry through the list endpoint when the base filter spells an operator in a key', async () => {
		const queries = listServer(() => 1)
		await fetchFilterCounts({
			register: 'r',
			schema: 's',
			baseFilter: { 'scheduledDate[gte]': '2026-10-13' },
			entries: [{ key: 'a', filter: { status: 'open' } }, { key: 'b', filter: { status: 'closed' } }],
		})
		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(queries.map((q) => q.get('scheduledDate[gte]'))).toEqual(['2026-10-13', '2026-10-13'])
	})
})

describe('counts read through the list endpoint (`via: list`)', () => {
	afterEach(() => {
		delete global.fetch
	})

	// An index page's chip counts what its list shows: the same request the list
	// sends, so the number and the list cannot disagree (BOARD-SYNC 25 Oct: the
	// case list's "Alles" chip read 173 where the list's total was 111).
	it('asks the list endpoint for every entry, grouped or single, never an aggregation', async () => {
		const queries = listServer((q) => (q.get('status') === 'open' ? 5 : 11))

		const counts = await fetchFilterCounts({
			register: 'dossiq',
			schema: 'case',
			baseFilter: { isTemplate: false },
			via: 'list',
			entries: [
				{ key: 'all', filter: { isDraft: false } },
				{ key: 'open', filter: { status: 'open' } },
				{ key: 'closed', filter: { status: 'closed' } },
			],
		})

		expect(fetchGroupedCounts).not.toHaveBeenCalled()
		expect(fetchAggregateValue).not.toHaveBeenCalled()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(queries).toHaveLength(3)
		expect(counts).toEqual({ all: 11, open: 5, closed: 11 })
	})
})

describe('parsePhpQuery', () => {
	it('reads a query string the way PHP does', () => {
		expect(parsePhpQuery('?a=1&b[lt]=2026-11-23&c[]=x&c[]=y&d[e][]=z&f=IS+NULL')).toEqual({
			a: '1',
			b: { lt: '2026-11-23' },
			c: ['x', 'y'],
			d: { e: ['z'] },
			f: 'IS NULL',
		})
		expect(parsePhpQuery('')).toEqual({})
	})
})

describe('fetchListTotals', () => {
	const batch = (counts) => ({ ok: true, json: async () => ({ results: counts.map((count) => ({ count })) }) })
	const total = (value) => ({ ok: true, json: async () => ({ total: value, results: [] }) })

	afterEach(() => {
		delete global.fetch
	})

	it('counts several lists in one batch request, each filter as the list request sends it', async () => {
		global.fetch = jest.fn().mockResolvedValue(batch([4, 0]))

		const totals = await fetchListTotals([
			{ register: 'dossiq', schema: 'case', filter: { status: ['open', 'hold'], deadline: { lt: '2026-11-23' }, isDraft: false } },
			{ register: 'dossiq', schema: 'task', filter: { assignee: null } },
		])

		expect(totals).toEqual([4, 0])
		expect(global.fetch).toHaveBeenCalledTimes(1)
		const [url, init] = global.fetch.mock.calls[0]
		expect(url).toMatch(/\/apps\/openregister\/api\/objects\/counts$/)
		expect(init.method).toBe('POST')
		expect(JSON.parse(init.body)).toEqual({
			counts: [
				{ register: 'dossiq', schema: 'case', filter: { status: ['open', 'hold'], deadline: { lt: '2026-11-23' }, isDraft: 'false' } },
				{ register: 'dossiq', schema: 'task', filter: { assignee: { isnull: 'true' } } },
			],
		})
	})

	it('resolves filter tokens before sending', async () => {
		global.fetch = jest.fn().mockResolvedValue(batch([1, 2]))

		await fetchListTotals([
			{ register: 'r', schema: 's', filter: { owner: '@objectId' } },
			{ register: 'r', schema: 's', filter: {} },
		], { objectId: 'abc' })

		expect(JSON.parse(global.fetch.mock.calls[0][1].body).counts[0].filter).toEqual({ owner: 'abc' })
	})

	it('counts a single list with its own list request', async () => {
		global.fetch = jest.fn().mockResolvedValue(total(7))

		expect(await fetchListTotals([{ register: 'dossiq', schema: 'case', filter: { status: 'open' } }])).toEqual([7])
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(new URL(global.fetch.mock.calls[0][0], 'http://localhost').pathname).toMatch(/\/api\/objects\/dossiq\/case$/)
	})

	it('falls back to one list request per list when the batch endpoint fails', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: false, status: 404 })
			.mockResolvedValueOnce(total(3))
			.mockResolvedValueOnce({ ok: false, status: 500 })

		const totals = await fetchListTotals([
			{ register: 'r', schema: 's', filter: { a: '1' } },
			{ register: 'r', schema: 's', filter: { b: '1' } },
		])

		expect(totals).toEqual([3, null])
		expect(global.fetch).toHaveBeenCalledTimes(3)
	})

	it('falls back when the batch answers a different number of results', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(batch([1]))
			.mockResolvedValue(total(5))

		expect(await fetchListTotals([{ register: 'r', schema: 's', filter: {} }, { register: 'r', schema: 's', filter: { a: 1 } }])).toEqual([5, 5])
	})

	it('gives null for a count the batch withheld, and nothing for no lists', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ count: 2 }, { count: null }] }) })

		expect(await fetchListTotals([{ register: 'r', schema: 's', filter: {} }, { register: 'r', schema: 'hidden', filter: {} }])).toEqual([2, null])
		expect(await fetchListTotals([])).toEqual([])
	})
})
