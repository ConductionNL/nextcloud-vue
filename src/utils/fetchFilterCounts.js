/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * fetchFilterCounts: how many records each of a set of filters matches, in as
 * few requests as the API allows.
 *
 * Quick filters and saved views usually differ in ONE field (`status: open`,
 * `status: closed`, ...). Those are answered by one `/grouped` request on that
 * field. A filter that narrows on something else (two fields, an operator, a
 * list of values) cannot be read off a grouped result, so each of those costs
 * one `/value` count. A filter that holds a LIST of values, or tests a field
 * for no value (`isnull`), is counted through the list endpoint, because the
 * aggregation endpoints cannot express it. So is a filter that spells its
 * operator in the key (`scheduledDate[gte]`): only the list endpoint reads it.
 * Nothing is requested for an entry that did not ask.
 *
 * @module utils/fetchFilterCounts
 */

import { fetchAggregateValue, fetchGroupedCounts } from './fetchAggregate.js'
import { buildHeaders, buildQueryString, prefixUrl } from './headers.js'
import { resolveFilterTokens } from './resolveFilterTokens.js'

/**
 * Whether a filter holds a list of values (`{ status: ['open', 'hold'] }`).
 *
 * The aggregation endpoints have no spelling for "one of these values", so a
 * filter like this is never sent to them. It is counted through the list
 * endpoint instead, which is where the page's own request sends it.
 *
 * @param {object} filter A filter map.
 * @return {boolean} True when any value is an array.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */
export function hasListValue(filter) {
	if (!filter || typeof filter !== 'object') {
		return false
	}
	return Object.values(filter).some((value) => Array.isArray(value))
}

/**
 * Whether a filter tests a field for "no value" (`{ assignee: null }` or
 * `{ supersededBy: { isnull: true } }`).
 *
 * OpenRegister's aggregation endpoints have no null operator: `isnull` is
 * refused there and an empty value is dropped or matches nothing, so such a
 * filter counted 0 while the list showed rows. The list endpoint does read
 * `field[isnull]=true`, so a filter like this is counted through it.
 *
 * @param {object} filter A filter map.
 * @return {boolean} True when any value is null or carries an `isnull` operator.
 */
export function hasNullTest(filter) {
	if (!filter || typeof filter !== 'object') {
		return false
	}
	return Object.values(filter).some((value) => value === null
		|| (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).some((op) => op.toLowerCase() === 'isnull')))
}

/**
 * Matches a filter key that carries its operator, `field[op]`.
 *
 * @type {RegExp}
 */
const OPERATOR_KEY = /\[[A-Za-z_]+\]$/

/**
 * Whether a filter spells an operator in a KEY (`{ 'scheduledDate[gte]': '2026-10-13' }`).
 *
 * A lens on a date range needs this flat spelling, because the list request
 * would JSON-encode a nested `{ gte }` object. The aggregation endpoints do
 * not read it: they take the key as a field name, find no such field and
 * answer 0, so the lens read 0 while the list beside it showed rows. The list
 * endpoint reads the key exactly as the page's own request sends it.
 *
 * @param {object} filter A filter map.
 * @return {boolean} True when any key ends in `[op]`.
 * @spec openspec/changes/screens-operator-key-lens-counts/specs/index-page/spec.md
 */
export function hasOperatorKey(filter) {
	if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
		return false
	}
	return Object.keys(filter).some((key) => OPERATOR_KEY.test(key))
}

/**
 * Whether a filter narrows on a field inside an object property, a dotted
 * path (`{ 'residence.city': 'Zuiddrecht' }`). `@self.*` metadata keys are not
 * paths.
 *
 * The aggregation endpoints answer 0 for such a key while the list endpoint
 * reads it, so the lens read 0 beside a list that showed rows.
 *
 * @param {object} filter A filter map.
 * @return {boolean} True when any key is a dotted path.
 */
export function hasNestedPath(filter) {
	if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
		return false
	}
	return Object.keys(filter).some((key) => key.includes('.') && !key.startsWith('@self.'))
}

/**
 * Whether the aggregation endpoints cannot express a filter, so it is counted
 * through the list endpoint: a list of values, a test for no value, an
 * operator spelled in a key, or a dotted path.
 *
 * @param {object} filter A filter map.
 * @return {boolean} True when the filter needs the list endpoint.
 * @spec openspec/changes/screens-operator-key-lens-counts/specs/index-page/spec.md
 */
export function needsListEndpoint(filter) {
	return hasListValue(filter) || hasNullTest(filter) || hasOperatorKey(filter) || hasNestedPath(filter)
}

/**
 * Count the records a filter matches by asking the LIST endpoint for one
 * record and reading its `total`. The filter is sent the way the list request
 * sends it: a list of values as repeated `field[]=`, an operator as
 * `field[op]=`.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {object} filter The filter map.
 * @param {object} [ctx] Token-resolution context for the filter.
 * @return {Promise<number|null>} The total, or null when the response carries none.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */
export async function fetchListTotal(register, schema, filter, ctx) {
	const resolved = resolveFilterTokens(filter || {}, ctx || {})
	const params = {}
	for (const [key, value] of Object.entries(resolved || {})) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			for (const [op, operand] of Object.entries(value)) {
				params[`${key}[${op}]`] = operand
			}
		} else if (value === null) {
			// "No value": the list endpoint reads it as the isnull operator.
			params[`${key}[isnull]`] = 'true'
		} else {
			params[key] = value
		}
	}
	const qs = buildQueryString({ ...params, _limit: 1 })
	const url = prefixUrl(`/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}${qs}`)
	const response = await fetch(url, { headers: buildHeaders() })
	if (!response.ok) {
		throw new Error(`list returned ${response.status}`)
	}
	const data = await response.json()
	return typeof data.total === 'number' ? data.total : null
}

/**
 * The single field a filter narrows on with a plain equality, or null when the
 * filter is anything else, including an operator spelled in the key
 * (`scheduledDate[gte]`), which is a comparison and not a field name.
 *
 * @param {object} filter A filter map.
 * @return {{field: string, value: string}|null} The field and the value it must equal.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */
export function singleEqualityOf(filter) {
	if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
		return null
	}
	const keys = Object.keys(filter)
	if (keys.length !== 1 || OPERATOR_KEY.test(keys[0])) {
		return null
	}
	const value = filter[keys[0]]
	if (value === null || value === undefined || value === '' || typeof value === 'object') {
		return null
	}
	// A token (`@me`, `@today`) resolves to a value the grouped keys are
	// compared against only after resolution, which the count request does.
	if (typeof value === 'string' && value.charAt(0) === '@') {
		return null
	}
	return { field: keys[0], value: String(value) }
}

/**
 * Count the records each entry's filter matches.
 *
 * @param {object} options The request.
 * @param {string} options.register The register slug.
 * @param {string} options.schema The schema slug.
 * @param {Array<{key: (string|number), filter: object}>} options.entries The filters to count, each under its own key.
 * @param {object} [options.baseFilter] A filter every count is narrowed by (the page's fixed filter).
 * @param {object} [options.ctx] Token-resolution context for the filters.
 * @return {Promise<{[key: string]: number}>} The count per entry key. An entry whose count failed is left out.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */
export async function fetchFilterCounts({ register, schema, entries, baseFilter, ctx } = {}) {
	const counts = {}
	if (!register || !schema || !Array.isArray(entries) || entries.length === 0) {
		return counts
	}
	const base = (baseFilter && typeof baseFilter === 'object') ? baseFilter : {}

	// Entries that share one equality field go into one grouped request, but
	// only when at least two do: a lone entry costs one request either way,
	// and `/value` returns exactly its number.
	// A list of values anywhere in a request rules the aggregation endpoints
	// out for it. A base filter with one rules them out for every entry.
	const baseHasList = needsListEndpoint(base)
	const byField = {}
	const single = []
	const viaList = []
	for (const entry of entries) {
		if (baseHasList || needsListEndpoint(entry.filter)) {
			viaList.push(entry)
			continue
		}
		const eq = singleEqualityOf(entry.filter)
		if (eq !== null && !(eq.field in base)) {
			(byField[eq.field] = byField[eq.field] || []).push({ entry, value: eq.value })
		} else {
			single.push(entry)
		}
	}
	const jobs = []
	for (const [field, members] of Object.entries(byField)) {
		if (members.length < 2) {
			single.push(members[0].entry)
			continue
		}
		jobs.push(fetchGroupedCounts({ register, schema, groupBy: field, filter: base }, ctx)
			.then((groups) => {
				const map = {}
				for (const group of groups) {
					map[group.key] = group.count
				}
				for (const member of members) {
					counts[member.entry.key] = map[member.value] || 0
				}
			})
			.catch(() => {}))
	}
	for (const entry of single) {
		jobs.push(fetchAggregateValue({ register, schema, metric: 'count', filter: { ...base, ...(entry.filter || {}) } }, ctx)
			.then((value) => {
				if (value !== null && Number.isFinite(Number(value))) {
					counts[entry.key] = Number(value)
				}
			})
			.catch(() => {}))
	}
	for (const entry of viaList) {
		jobs.push(fetchListTotal(register, schema, { ...base, ...(entry.filter || {}) }, ctx)
			.then((total) => {
				if (total !== null) {
					counts[entry.key] = total
				}
			})
			.catch(() => {}))
	}
	await Promise.all(jobs)
	return counts
}
