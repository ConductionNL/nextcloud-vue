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
 * one `/value` count. A filter that holds a LIST of values is counted through
 * the list endpoint, because the aggregation endpoints cannot express it.
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
 * filter is anything else.
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
	if (keys.length !== 1) {
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
	const baseHasList = hasListValue(base)
	const byField = {}
	const single = []
	const viaList = []
	for (const entry of entries) {
		if (baseHasList || hasListValue(entry.filter)) {
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
