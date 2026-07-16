/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Helpers translating between the editable filter ROWS used by the widget
 * config forms (`{ key, op, value }[]`) and the OpenRegister filter OBJECT used
 * by the aggregation / object endpoints (`{ field: value }` for equality,
 * `{ field: { gt: value } }` for operators). One row per (field, operator) so a
 * range filter is two rows on the same field (`gte` + `lte`).
 *
 * @module components/CnFilterRowsEditor/filterRows
 */

/**
 * Supported operators. `eq` serialises to a bare `filter[field]=value`; every
 * other operator nests as `filter[field][op]=value` (OpenRegister's operator
 * filter vocabulary, applied in AggregationRunner + the object search path).
 *
 * @type {Array<{id: string, label: string}>}
 */
export const FILTER_OPERATORS = Object.freeze([
	{ id: 'eq', label: '=' },
	{ id: 'ne', label: '≠' },
	{ id: 'gt', label: '>' },
	{ id: 'lt', label: '<' },
	{ id: 'gte', label: '≥' },
	{ id: 'lte', label: '≤' },
])

/**
 * Build the OpenRegister filter object from editable rows.
 *
 * @param {Array<{key: string, op: string, value: *}>} rows The editable rows.
 * @return {object} The filter object (`{ field: value }` / `{ field: { op: value } }`).
 */
export function rowsToFilter(rows) {
	const out = {}
	for (const r of rows || []) {
		if (!r || typeof r.key !== 'string' || r.key.trim() === '') continue
		const key = r.key.trim()
		const op = r.op || 'eq'
		if (op === 'eq') {
			out[key] = r.value
		} else {
			const existing = (typeof out[key] === 'object' && out[key] !== null) ? out[key] : {}
			out[key] = { ...existing, [op]: r.value }
		}
	}
	return out
}

/**
 * Parse an OpenRegister filter object back into editable rows.
 *
 * @param {object} filter The filter object.
 * @return {Array<{key: string, op: string, value: string}>} The editable rows.
 */
export function filterToRows(filter) {
	const rows = []
	for (const [key, val] of Object.entries(filter || {})) {
		if (val && typeof val === 'object' && !Array.isArray(val)) {
			for (const [op, ov] of Object.entries(val)) {
				rows.push({ key, op, value: String(ov) })
			}
		} else {
			rows.push({ key, op: 'eq', value: String(val) })
		}
	}
	return rows
}
