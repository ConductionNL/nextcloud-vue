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
import { countFilterParams } from './fetchFilterCounts.js'
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
 * One row's figures in a map of rows, created on first use. Rows live in a
 * Map and figures in a prototype-less object, so a row id or figure key such
 * as `__proto__` stays an ordinary key.
 *
 * @param {Map<string, object>} rows The figures by row id.
 * @param {string|number} rowId The row id (read as a string).
 * @return {object} The row's figures, by key.
 */
export function cellsOf(rows, rowId) {
	const key = String(rowId)
	let cells = rows.get(key)
	if (!cells) {
		cells = Object.create(null)
		rows.set(key, cells)
	}
	return cells
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

/**
 * Whether a resolved filter still holds a token (`@me`, `@today`): the list
 * endpoint resolves those itself, so such a row is asked on its own.
 *
 * @param {object} filter The resolved filter.
 * @return {boolean}
 */
function holdsToken(filter) {
	return Object.values(filter).some((value) => (typeof value === 'string' && value.charAt(0) === '@')
		|| (value && typeof value === 'object' && !Array.isArray(value) && holdsToken(value)))
}

/**
 * Ask OpenRegister for one aggregate over many rows.
 *
 * A `count` goes out as ONE request to the batch count endpoint
 * (`POST /api/objects/counts`), one entry per distinct row filter, instead of
 * one list request per row: a table of 20 clients with an "open tickets"
 * column asked 20 times. When the endpoint fails or is not there, each row is
 * asked on its own as before. A `max`, and a row whose filter still holds a
 * token, is asked per row.
 *
 * @param {object} agg The declaration.
 * @param {Array<object>} rows The rows.
 * @param {Function} [readValue] How a path is read off a row.
 * @return {Promise<Array<{value: unknown}|{error: unknown}>>} One outcome per row, in order.
 * @spec openspec/changes/record-list-row-aggregates/specs/record-list/spec.md#requirement-a-record-list-row-can-carry-a-figure-over-its-related-objects
 */
export async function fetchRowAggregates(agg, rows, readValue = readPath) {
	const list = Array.isArray(rows) ? rows : []
	const one = (row) => fetchRowAggregate(agg, row, readValue).then((value) => ({ value }), (error) => ({ error }))
	if (agg.op !== 'count' || list.length < 2) {
		return Promise.all(list.map(one))
	}
	const filters = list.map((row) => resolveRowWhere(agg.where, row, readValue))
	const batched = []
	const slotOf = new Map()
	const slots = filters.map((filter) => {
		if (holdsToken(filter)) {
			return -1
		}
		const params = countFilterParams(filter)
		const key = JSON.stringify(params)
		if (!slotOf.has(key)) {
			slotOf.set(key, batched.length)
			batched.push({ register: agg.register, schema: agg.schema, filter: params })
		}
		return slotOf.get(key)
	})
	let counts = null
	if (batched.length > 1) {
		try {
			const res = await axios.post(generateUrl('/apps/openregister/api/objects/counts'), { counts: batched })
			const results = res && res.data && res.data.results
			if (Array.isArray(results) && results.length === batched.length) {
				counts = results.map((result) => (result && typeof result.count === 'number' ? result.count : null))
			}
		} catch {
			counts = null
		}
	}
	return Promise.all(list.map((row, index) => {
		const slot = slots[index]
		if (counts === null || slot < 0) {
			return one(row)
		}
		return counts[slot] === null ? { error: new Error('count withheld or unknown') } : { value: counts[slot] }
	}))
}
