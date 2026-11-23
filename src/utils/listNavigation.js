/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The list a record was opened from, carried in the record's address.
 *
 * Next and previous need the list, not just an id. Frappe Helpdesk keeps
 * `get_navigation_tickets`, `get_navigation_filters` and
 * `get_navigation_order_by` together for exactly this reason: stepping to
 * "the next case" is meaningless until you know next in WHICH list, filtered
 * how and sorted how.
 *
 * The context lives in the route rather than in a store, so a reload keeps
 * it and a link without it offers nothing rather than guessing an order. A
 * guessed order is worse than no next button: it steps a handler through a
 * sequence they never chose and never see.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module utils/listNavigation
 */

import { parseSortKeys } from './routeFilters.js'

/** Query key naming the list a record was opened from. */
export const LIST_CONTEXT_QUERY_KEY = '_from'

/**
 * Query keys that describe the list rather than filter it.
 *
 * Everything else in the query is a filter, which is the same rule
 * `resolveQueryFilters` already applies, kept in one place so the two cannot
 * drift into disagreeing about what a filter is.
 */
const RESERVED_QUERY_KEYS = new Set([LIST_CONTEXT_QUERY_KEY, '_search', '_page', '_limit', '_order', '_tab'])

/**
 * Read the list context out of a record's address.
 *
 * @param {object} route A vue-router route object (`$route`).
 * @return {{ pageId: string, search: string, sortKeys: Array<{key: string, order: string}>, filters: object }|null} The context, or null when the address carries none.
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */
export function listContextFromRoute(route) {
	const query = route?.query || {}
	const pageId = query[LIST_CONTEXT_QUERY_KEY]
	if (typeof pageId !== 'string' || pageId === '') {
		return null
	}

	const filters = {}
	for (const [key, value] of Object.entries(query)) {
		if (!RESERVED_QUERY_KEYS.has(key) && value !== undefined && value !== null && value !== '') {
			filters[key] = value
		}
	}

	return {
		pageId,
		search: typeof query._search === 'string' ? query._search : '',
		sortKeys: parseSortKeys(query._order),
		filters,
	}
}

/**
 * The query a record's address carries so it can step through the list it
 * came from.
 *
 * @param {object} context The list context.
 * @param {string} context.pageId The list page's id.
 * @param {string} [context.search] The search term the list was under.
 * @param {Array<{key: string, order: string}>} [context.sortKeys] The list's sort.
 * @param {object} [context.filters] The list's active filters.
 * @return {object} The query to merge into the record's route.
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */
export function listContextToQuery({ pageId, search, sortKeys, filters } = {}) {
	if (typeof pageId !== 'string' || pageId === '') {
		return {}
	}
	const query = { [LIST_CONTEXT_QUERY_KEY]: pageId }
	if (typeof search === 'string' && search !== '') {
		query._search = search
	}
	if (Array.isArray(sortKeys) && sortKeys.length > 0) {
		query._order = JSON.stringify(sortKeys)
	}
	for (const [key, value] of Object.entries(filters || {})) {
		if (!RESERVED_QUERY_KEYS.has(key) && value !== undefined && value !== null && value !== '') {
			query[key] = Array.isArray(value) && value.length === 1 ? value[0] : value
		}
	}
	return query
}

/**
 * The API params that reproduce the list a record was opened from.
 *
 * @param {object|null} context The list context.
 * @param {number} [limit] How many records to ask for.
 * @return {object} Params for `fetchCollection`.
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */
export function listContextToParams(context, limit = 200) {
	if (!context) {
		return {}
	}
	const params = { _limit: limit, _page: 1 }
	if (context.search) {
		params._search = context.search
	}
	if (context.sortKeys?.length > 0) {
		params._order = Object.fromEntries(context.sortKeys.map((k) => [k.key, k.order || 'asc']))
	}
	for (const [key, value] of Object.entries(context.filters || {})) {
		params[key] = value
	}
	return params
}

/**
 * Where a record sits in a list, and what is either side of it.
 *
 * The first and the last record say so rather than wrapping. A next button
 * on the last case that silently returns to the first is a handler who
 * believes they are still working forwards through a queue they already
 * finished.
 *
 * @param {Array<string>} ids The record ids, in the list's order.
 * @param {string} currentId The record open now.
 * @return {{ position: number, total: number, previousId: string|null, nextId: string|null, isFirst: boolean, isLast: boolean, known: boolean }} The neighbours. `known` is false when the record is not in the list at all.
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */
export function neighboursOf(ids, currentId) {
	const list = (Array.isArray(ids) ? ids : []).map(String)
	const index = currentId === undefined || currentId === null ? -1 : list.indexOf(String(currentId))

	if (index === -1) {
		// The record is not on the page of the list that was loaded, or the
		// list has moved on. Offering a next from a position we do not know
		// would step somewhere arbitrary, so nothing is offered.
		return { position: 0, total: list.length, previousId: null, nextId: null, isFirst: false, isLast: false, known: false }
	}

	return {
		position: index + 1,
		total: list.length,
		previousId: index > 0 ? list[index - 1] : null,
		nextId: index < list.length - 1 ? list[index + 1] : null,
		isFirst: index === 0,
		isLast: index === list.length - 1,
		known: true,
	}
}
