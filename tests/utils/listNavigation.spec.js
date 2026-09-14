/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The list a record was opened from, carried in the record's address.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import {
	LIST_CONTEXT_QUERY_KEY,
	listContextFromRoute,
	listContextToParams,
	listContextToQuery,
	neighboursOf,
} from '../../src/utils/listNavigation.js'

describe('listContextFromRoute', () => {
	it('reads the list, its search, its sort and its filters out of the address', () => {
		const context = listContextFromRoute({
			query: {
				_from: 'cases',
				_search: 'vergunning',
				_order: '[{"key":"createdAt","order":"desc"}]',
				status: 'open',
			},
		})

		expect(context).toEqual({
			pageId: 'cases',
			search: 'vergunning',
			sortKeys: [{ key: 'createdAt', order: 'desc' }],
			filters: { status: 'open' },
		})
	})

	it('answers a bare link with null, so nothing is offered rather than guessed', () => {
		expect(listContextFromRoute({ query: {} })).toBeNull()
		expect(listContextFromRoute({ query: { status: 'open' } })).toBeNull()
		expect(listContextFromRoute(null)).toBeNull()
	})

	it('keeps the reserved keys out of the filters, so the tab is never sent as one', () => {
		const context = listContextFromRoute({
			query: { _from: 'cases', _tab: 'documents', _page: '3', _limit: '20', status: 'open' },
		})

		expect(context.filters).toEqual({ status: 'open' })
	})

	it('reads a malformed sort as no sort rather than throwing', () => {
		expect(listContextFromRoute({ query: { _from: 'cases', _order: '{{{' } }).sortKeys).toEqual([])
	})

	it('drops a sort entry with no key, which would sort by undefined', () => {
		expect(listContextFromRoute({ query: { _from: 'cases', _order: '[{"order":"asc"},{"key":"id"}]' } }).sortKeys)
			.toEqual([{ key: 'id' }])
	})
})

describe('listContextToQuery', () => {
	it('round-trips through listContextFromRoute', () => {
		const context = { pageId: 'cases', search: 'a', sortKeys: [{ key: 'id', order: 'asc' }], filters: { status: 'open' } }

		expect(listContextFromRoute({ query: listContextToQuery(context) })).toEqual(context)
	})

	it('names the list under the reserved key', () => {
		expect(listContextToQuery({ pageId: 'cases' })).toEqual({ [LIST_CONTEXT_QUERY_KEY]: 'cases' })
	})

	it('writes nothing at all without a page id, so a half context never ships', () => {
		expect(listContextToQuery({ search: 'a' })).toEqual({})
		expect(listContextToQuery()).toEqual({})
	})

	it('unwraps a single-value filter the way the list sent it', () => {
		expect(listContextToQuery({ pageId: 'cases', filters: { status: ['open'] } }).status).toBe('open')
	})

	it('refuses a filter that would collide with a reserved key', () => {
		expect(listContextToQuery({ pageId: 'cases', filters: { _tab: 'evil', _from: 'other' } }))
			.toEqual({ _from: 'cases' })
	})
})

describe('listContextToParams', () => {
	it('reproduces the list the handler was looking at', () => {
		const params = listContextToParams({
			pageId: 'cases',
			search: 'vergunning',
			sortKeys: [{ key: 'createdAt', order: 'desc' }],
			filters: { status: 'open' },
		}, 50)

		expect(params).toEqual({
			_limit: 50,
			_page: 1,
			_search: 'vergunning',
			_order: { createdAt: 'desc' },
			status: 'open',
		})
	})

	it('answers no context with no params', () => {
		expect(listContextToParams(null)).toEqual({})
	})
})

describe('neighboursOf', () => {
	const ids = ['a', 'b', 'c', 'd']

	it('steps to the next record of that same list', () => {
		expect(neighboursOf(ids, 'b')).toEqual({
			position: 2, total: 4, previousId: 'a', nextId: 'c', isFirst: false, isLast: false, known: true,
		})
	})

	it('says the last record is the last, rather than wrapping to the first', () => {
		const last = neighboursOf(ids, 'd')

		expect(last.isLast).toBe(true)
		expect(last.nextId).toBeNull()
	})

	it('says the first record is the first, rather than wrapping to the last', () => {
		const first = neighboursOf(ids, 'a')

		expect(first.isFirst).toBe(true)
		expect(first.previousId).toBeNull()
	})

	it('offers nothing for a record that is not in the list, rather than a position it guessed', () => {
		expect(neighboursOf(ids, 'zz')).toEqual({
			position: 0, total: 4, previousId: null, nextId: null, isFirst: false, isLast: false, known: false,
		})
	})

	it('compares as strings, so a numeric id from the API still matches', () => {
		expect(neighboursOf([1, 2, 3], '2').nextId).toBe('3')
	})

	it('treats a single-record list as both the first and the last', () => {
		const only = neighboursOf(['a'], 'a')

		expect([only.isFirst, only.isLast, only.nextId, only.previousId]).toEqual([true, true, null, null])
	})

	it.each([[null], [undefined], [[]]])('offers nothing over %p', (input) => {
		expect(neighboursOf(input, 'a').known).toBe(false)
	})
})
