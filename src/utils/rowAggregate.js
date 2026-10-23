/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * rowAggregate: one row's figure over its related OpenRegister objects, as
 * a table's `aggregate` column and a record list's `aggregates` read it.
 * `op: "count"` asks `_limit=0` for the total; `op: "max"` asks for the one
 * object with the highest `field` (`_limit=1`, sorted descending) and keeps
 * that value, null when there is none.
 *
 * @module utils/rowAggregate
 * @spec openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { readPath } from './readPath.js'

/**
 * Whether an aggregate declaration can be asked.
 *
 * @param {object} agg The declaration `{ register, schema, op, field?, where? }`.
 * @return {boolean} True for a count, or a max that names its field.
 */
export function isRowAggregate(agg) {
	return Boolean(agg && agg.register && agg.schema && (agg.op === 'count' || (agg.op === 'max' && agg.field)))
}

/**
 * Fill an aggregate's `where` for one row: a string `"@self.<path>"` reads
 * that path of the row, everything else is passed through.
 *
 * @param {object} where The `where` map (may be undefined).
 * @param {object} row The row.
 * @param {Function} [readValue] How a path is read off the row; `readPath` by default.
 * @return {object} The filter map.
 */
export function resolveRowWhere(where, row, readValue = readPath) {
	const out = {}
	for (const [key, value] of Object.entries(where || {})) {
		out[key] = typeof value === 'string' && value.startsWith('@self.') ? readValue(row, value.slice('@self.'.length)) : value
	}
	return out
}

/**
 * Ask OpenRegister for one row's aggregate.
 *
 * @param {object} agg The declaration.
 * @param {object} row The row.
 * @param {Function} [readValue] How a path is read off the row.
 * @return {Promise<number|unknown|null>} The count, the highest value, or null when there is none.
 */
export async function fetchRowAggregate(agg, row, readValue = readPath) {
	const where = resolveRowWhere(agg.where, row, readValue)
	const isMax = agg.op === 'max'
	const params = isMax
		? { ...where, _limit: 1, [`_order[${agg.field}]`]: 'desc' }
		: { ...where, _limit: 0 }
	const res = await axios.get(generateUrl(`/apps/openregister/api/objects/${agg.register}/${agg.schema}`), { params })
	const data = res && res.data
	if (isMax) {
		const first = data && Array.isArray(data.results) ? data.results[0] : undefined
		const top = first === undefined ? undefined : readPath(first, agg.field)
		return top === undefined || top === '' ? null : top
	}
	return (data && (data.total ?? (Array.isArray(data.results) ? data.results.length : undefined))) ?? 0
}
