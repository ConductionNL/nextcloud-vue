/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Header sort and filter applied to rows the table already holds (an
 * `endpointSource` table): the same `{ field, dir }` sort and
 * `{ paramKey: values[] }` filter map a self-fetching table sends to the
 * server, read here in the browser.
 *
 * @module utils/localHeaderRows
 */

import { CONTAINS_OPERATOR } from './columnFilters.js'

/**
 * A row value as one comparable scalar: an array counts as its joined items.
 *
 * @param {unknown} value The raw value.
 * @return {string|number|null} The value to compare.
 */
function scalar(value) {
	if (value === null || value === undefined) {
		return null
	}
	if (Array.isArray(value)) {
		return value.map((item) => (item && typeof item === 'object' ? (item.title || item.name || '') : String(item))).join(', ')
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return typeof value === 'boolean' ? String(value) : value
	}
	return typeof value === 'object' ? (value.title || value.name || '') : String(value)
}

/**
 * Whether a row holds a value the filter entry asks for.
 *
 * @param {object} row The row.
 * @param {string} param The filter key (`field`, `field[like]`, `field[gte]`, `field[lte]`).
 * @param {Array<string>} values The chosen values.
 * @return {boolean} True when the row passes.
 */
function passes(row, param, values) {
	const match = /^(.+)\[(\w+)\]$/.exec(param)
	const field = match ? match[1] : param
	const op = match ? match[2] : ''
	const value = scalar(row[field])
	if (op === CONTAINS_OPERATOR) {
		const term = String(values[0]).toLowerCase()
		return value !== null && String(value).toLowerCase().includes(term)
	}
	if (op === 'gte' || op === 'lte') {
		if (value === null) {
			return false
		}
		const left = typeof value === 'number' ? value : String(value)
		const right = typeof value === 'number' ? Number(values[0]) : String(values[0])
		return op === 'gte' ? left >= right : left <= right
	}
	return value !== null && values.map(String).includes(String(value))
}

/**
 * The rows that pass every active header filter, in the header sort's order.
 *
 * @param {Array<object>} rows The rows.
 * @param {{field: string, dir: string}|null} sort The header sort.
 * @param {object} filters The header filters, `{ paramKey: values[] }`.
 * @return {Array<object>} The rows to show (the same array when nothing applies).
 */
export function localHeaderRows(rows, sort, filters) {
	if (!Array.isArray(rows)) {
		return []
	}
	const active = Object.entries(filters || {}).filter(([, values]) => Array.isArray(values) && values.length > 0)
	let out = active.length > 0 ? rows.filter((row) => row && active.every(([param, values]) => passes(row, param, values))) : rows
	if (sort && sort.field) {
		const sign = sort.dir === 'desc' ? -1 : 1
		out = [...out].sort((a, b) => {
			const left = scalar(a && a[sort.field])
			const right = scalar(b && b[sort.field])
			if (left === null || right === null) {
				return left === right ? 0 : (left === null ? 1 : -1)
			}
			if (typeof left === 'number' && typeof right === 'number') {
				return sign * (left - right)
			}
			return sign * String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
		})
	}
	return out
}
