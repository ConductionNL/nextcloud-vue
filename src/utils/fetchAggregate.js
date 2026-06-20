/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Shared helper for the abstract data widgets (CnStatWidget, CnDeltaWidget,
 * CnGaugeWidget, …) — fetches ONE scalar from OpenRegister's ad-hoc aggregation
 * `/value` endpoint given a `{ register, schema, metric, field, filter }`
 * descriptor. Filter values run through `resolveFilterTokens` first, so relative
 * tokens (`@me`, `@monthStart`, `@currentFiscalYear`, …) resolve at fetch time.
 *
 * @module utils/fetchAggregate
 */

import { resolveFilterTokens } from './resolveFilterTokens.js'

/**
 * Flatten a filter map into operator-aware `filter[key]` / `filter[key][op]`
 * query params (the OpenRegister aggregation filter vocabulary). Resolves
 * relative tokens before writing.
 *
 * @param {object} target The params object to write into.
 * @param {object} filter The filter map.
 * @return {void}
 */
export function flattenAggFilter(target, filter) {
	if (!filter || typeof filter !== 'object') return
	filter = resolveFilterTokens(filter)
	for (const [k, v] of Object.entries(filter)) {
		if (v && typeof v === 'object') {
			for (const [op, ov] of Object.entries(v)) target[`filter[${k}][${op}]`] = ov
		} else if (v !== '' && v !== null && v !== undefined) {
			target[`filter[${k}]`] = v
		}
	}
}

/**
 * Fetch one aggregated scalar from OpenRegister.
 *
 * @param {object} source The aggregate descriptor.
 * @param {string} source.register The register slug.
 * @param {string} source.schema The schema slug.
 * @param {string} [source.metric] count | sum | avg | min | max (default count).
 * @param {string} [source.field] The numeric field (required for non-count metrics).
 * @param {object} [source.filter] The filter map.
 * @return {Promise<number|null>} The aggregated value, or null when unavailable.
 */
export async function fetchAggregateValue(source) {
	const s = source || {}
	if (!s.register || !s.schema) return null
	const [{ default: axios }, { generateUrl }] = await Promise.all([
		import('@nextcloud/axios'),
		import('@nextcloud/router'),
	])
	const url = generateUrl(
		'/apps/openregister/api/objects/aggregations/{register}/{schema}/value',
		{ register: s.register, schema: s.schema },
	)
	const params = { metric: s.metric || 'count' }
	if (s.field) params.field = s.field
	flattenAggFilter(params, s.filter || {})
	const res = await axios.get(url, { params })
	return (res && res.data && res.data.value !== undefined) ? res.data.value : null
}
