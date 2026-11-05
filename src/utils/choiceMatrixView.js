/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rows a CnChoiceMatrix shows once its column heads sort and filter.
 *
 * @module utils/choiceMatrixView
 */

/** The sort key of the row column. */
export const ROW_COLUMN = '@row'

/**
 * How a view reads the rows.
 *
 * @typedef {object} RowReader
 * @property {(row: object, key: string) => string} valueAt A cell's value.
 * @property {(row: object) => string} labelOf A row's label.
 * @property {(value: string) => number} [rank] A value's place in the choices.
 */

/**
 * Whether a row passes every head's filter: the row column's text appears in
 * its label, and each column's cell holds one of the values kept there.
 *
 * @param {object} row The row.
 * @param {RowReader & {filters: object, text: string}} view The filters and how a row is read.
 * @return {boolean}
 * @spec openspec/changes/choice-matrix-sort-filter-pills/specs/choice-matrix/spec.md#requirement-a-column-head-filters-the-rows
 */
export function rowPasses(row, view) {
	const text = String(view.text || '').trim().toLocaleLowerCase()
	if (text !== '' && !String(view.labelOf(row)).toLocaleLowerCase().includes(text)) {
		return false
	}
	return Object.entries(view.filters || {})
		.every(([key, kept]) => kept.length === 0 || kept.includes(view.valueAt(row, key)))
}

/**
 * The order of two rows under a sort: by label on the row column, else by
 * the place of each cell's value in the choices, unknown values last.
 *
 * @param {Array<object>} pair The two rows.
 * @param {RowReader & {key: string}} view The sort and how a row is read.
 * @return {number}
 */
function compareRows(pair, view) {
	const [a, b] = pair
	if (view.key === ROW_COLUMN) {
		return String(view.labelOf(a)).localeCompare(String(view.labelOf(b)), undefined, { sensitivity: 'base' })
	}
	return view.rank(view.valueAt(a, view.key)) - view.rank(view.valueAt(b, view.key))
}

/**
 * The rows in a head's sort order, ties in their given order; the rows as
 * given while nothing sorts.
 *
 * @param {Array<object>} rows The rows.
 * @param {RowReader & {key: string, dir: string}} view The sort and how a row is read.
 * @return {Array<object>}
 * @spec openspec/changes/choice-matrix-sort-filter-pills/specs/choice-matrix/spec.md#requirement-a-column-head-sorts-the-rows
 */
export function sortRows(rows, view) {
	if (!view.key) {
		return rows
	}
	const sign = view.dir === 'desc' ? -1 : 1
	return rows
		.map((row, index) => ({ row, index }))
		.sort((a, b) => sign * compareRows([a.row, b.row], view) || a.index - b.index)
		.map(({ row }) => row)
}

/**
 * The next sort after a head is clicked: ascending on a new head, then
 * descending, then ascending again.
 *
 * @param {{key: string, dir: string}} current The sort now.
 * @param {string} key The head clicked.
 * @return {{key: string, dir: string}}
 */
export function nextSort(current, key) {
	return { key, dir: current.key === key && current.dir === 'asc' ? 'desc' : 'asc' }
}

/**
 * The values a column holds, once each, in the order of the choices, then
 * any value outside them.
 *
 * @param {Array<string>} held The column's cell values.
 * @param {Array<{value: string}>} choices The choices.
 * @return {Array<string>}
 */
export function valuesIn(held, choices) {
	const present = new Set(held)
	const known = choices.map((choice) => choice.value).filter((value) => present.has(value))
	return [...known, ...[...present].filter((value) => !known.includes(value))]
}
