/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * sortSourceRows: the rows of a sort option that names an endpoint `source`
 * (CnIndexPage `sortSelectOptions[].source`), and the search, facet filters
 * and paging the page runs over them in the browser.
 *
 * An order the server cannot sort by, such as an urgency computed per
 * request, arrives as an endpoint's ranked rows. The page keeps its own
 * search box and sidebar and applies them to those rows, so choosing that
 * order narrows the same way the self-fetched list does.
 *
 * @module utils/sortSourceRows
 */

import { readPath } from './readPath.js'

/**
 * The rows of an endpoint answer.
 *
 * `source.rowsPath` names where the entries sit (`results` by default; a bare
 * array is taken as is). With `source.rowPath` each entry carries its row at
 * that path and entries without one are left out; `source.carry` lists entry
 * fields copied onto the row, such as a rank or a tier the endpoint computed.
 *
 * @param {unknown} body The response body.
 * @param {{rowsPath?: string, rowPath?: string, carry?: Array<string>}} source The option's source.
 * @return {Array<object>} The rows, in the endpoint's order.
 * @spec openspec/changes/index-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
 */
export function rowsFromSourceBody(body, source = {}) {
	const entries = Array.isArray(body) ? body : readPath(body, source.rowsPath || 'results')
	if (!Array.isArray(entries)) {
		return []
	}
	const carry = Array.isArray(source.carry) ? source.carry.filter((key) => typeof key === 'string' && key !== '') : []
	const rows = []
	for (const entry of entries) {
		if (!entry || typeof entry !== 'object') {
			continue
		}
		const row = source.rowPath ? readPath(entry, source.rowPath) : entry
		if (!row || typeof row !== 'object' || Array.isArray(row)) {
			continue
		}
		if (carry.length === 0) {
			rows.push(row)
			continue
		}
		const carried = {}
		for (const key of carry) {
			if (entry[key] !== undefined) {
				carried[key] = entry[key]
			}
		}
		rows.push({ ...row, ...carried })
	}
	return rows
}

/**
 * A row's value for a filter or search field: the field itself, else the
 * same key in the row's `@self` metadata.
 *
 * @param {object} row The row.
 * @param {string} key The field.
 * @return {unknown} The value.
 */
function fieldOf(row, key) {
	const value = readPath(row, key)
	if (value !== undefined) {
		return value
	}
	return row && row['@self'] ? row['@self'][key] : undefined
}

/**
 * The comparable spellings of a value: a reference reads as its id, a list
 * as each of its entries.
 *
 * @param {unknown} value The value.
 * @return {Array<string>} The spellings.
 */
function spellingsOf(value) {
	const list = Array.isArray(value) ? value : [value]
	return list
		.map((entry) => (entry && typeof entry === 'object' ? (entry.id ?? entry.uuid ?? entry.value) : entry))
		.filter((entry) => entry !== undefined && entry !== null)
		.map((entry) => String(entry))
}

/**
 * Whether a row passes one facet filter: a list of wanted values (any of
 * them), or a `{ from, to }` range compared as text, which orders ISO dates
 * and zero-padded numbers correctly.
 *
 * @param {object} row The row.
 * @param {string} key The field.
 * @param {unknown} wanted The chosen values or range.
 * @return {boolean}
 */
function passes(row, key, wanted) {
	if (wanted && typeof wanted === 'object' && !Array.isArray(wanted)) {
		const value = fieldOf(row, key)
		if (value === undefined || value === null || value === '') {
			return !wanted.from && !wanted.to
		}
		const text = String(value)
		return (!wanted.from || text >= String(wanted.from)) && (!wanted.to || text <= String(wanted.to))
	}
	const values = spellingsOf(wanted)
	if (values.length === 0) {
		return true
	}
	const have = spellingsOf(fieldOf(row, key))
	return have.some((value) => values.includes(value))
}

/**
 * The rows a search term and the sidebar's filters leave.
 *
 * The term matches case-insensitively against `searchFields` when given,
 * else against every top-level text or number on the row.
 *
 * @param {Array<object>} rows The rows.
 * @param {{search?: string, filters?: object, searchFields?: Array<string>}} [query] The query.
 * @return {Array<object>} The matching rows, in their order.
 * @spec openspec/changes/index-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
 */
export function filterSourceRows(rows, query = {}) {
	const needle = String(query.search || '').trim().toLowerCase()
	const filters = query.filters && typeof query.filters === 'object' ? query.filters : {}
	const fields = Array.isArray(query.searchFields) && query.searchFields.length > 0 ? query.searchFields : null
	return (rows || []).filter((row) => {
		if (needle) {
			const values = fields
				? fields.map((key) => fieldOf(row, key))
				: Object.values(row || {})
			const haystack = values
				.filter((value) => typeof value === 'string' || typeof value === 'number')
				.join(' ')
				.toLowerCase()
			if (!haystack.includes(needle)) {
				return false
			}
		}
		return Object.entries(filters).every(([key, wanted]) => passes(row, key, wanted))
	})
}

/**
 * One page of rows and the pagination the pager draws for it.
 *
 * @param {Array<object>} rows The rows.
 * @param {number} page The page, from 1.
 * @param {number} limit Rows per page.
 * @return {{rows: Array<object>, pagination: {page: number, limit: number, total: number, pages: number}}}
 * @spec openspec/changes/index-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
 */
export function pageSourceRows(rows, page, limit) {
	const size = Number(limit) > 0 ? Number(limit) : 20
	const total = (rows || []).length
	const pages = Math.max(1, Math.ceil(total / size))
	const current = Math.min(Math.max(1, Number(page) || 1), pages)
	const start = (current - 1) * size
	return {
		rows: (rows || []).slice(start, start + size),
		pagination: { page: current, limit: size, total, pages },
	}
}

/**
 * Copy the carried fields of the source rows onto other rows of the same
 * record, so a card part reading such a field (a tier pill) still draws when
 * another order is chosen.
 *
 * @param {Array<object>} rows The rows on screen.
 * @param {Array<object>} sourceRows The source's rows.
 * @param {{carry?: Array<string>, idPath?: string}} source The option's source.
 * @return {Array<object>} The rows, annotated where a source row matches.
 * @spec openspec/changes/index-sort-source/specs/index-page/spec.md#requirement-a-row-field-the-source-supplies-reaches-every-order
 */
export function annotateRows(rows, sourceRows, source = {}) {
	const carry = Array.isArray(source.carry) ? source.carry : []
	if (carry.length === 0 || !Array.isArray(sourceRows) || sourceRows.length === 0) {
		return rows || []
	}
	const idPath = source.idPath || 'id'
	const idOf = (row) => {
		const id = readPath(row, idPath) ?? (row && row['@self'] ? row['@self'].id : undefined)
		return id === undefined || id === null ? '' : String(id)
	}
	const byId = new Map()
	for (const row of sourceRows) {
		const id = idOf(row)
		if (id !== '') {
			byId.set(id, row)
		}
	}
	return (rows || []).map((row) => {
		const match = byId.get(idOf(row))
		if (!match) {
			return row
		}
		const carried = {}
		for (const key of carry) {
			if (match[key] !== undefined && row[key] === undefined) {
				carried[key] = match[key]
			}
		}
		return Object.keys(carried).length > 0 ? { ...row, ...carried } : row
	})
}
