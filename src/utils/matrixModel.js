/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * matrixModel: the pure part of the `matrix` widget. Turns lists of objects
 * into the rows and columns CnDataMatrix draws, and computes the writes, norm
 * marks and bulk targets, so the widget only fetches and saves.
 *
 * @module utils/matrixModel
 */

import { fillTemplate } from './fillTemplate.js'
import { readPath } from './readPath.js'

/**
 * The index key of one cell.
 *
 * @param {unknown} rowId The row id.
 * @param {unknown} colKey The column key.
 * @return {string} The key.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function cellKey(rowId, colKey) {
	return `${String(rowId)}\u0000${String(colKey)}`
}

/**
 * The id of a list item: the item itself for a scalar, else the value at `path`.
 *
 * @param {unknown} item The item.
 * @param {string} [path] Dot-path of the id on an object item.
 * @return {string} The id, or '' when it has none.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function itemId(item, path) {
	if (item === null || item === undefined) {
		return ''
	}
	if (typeof item !== 'object') {
		return String(item)
	}
	const value = readPath(item, path || 'id') ?? (path ? undefined : item.uuid)
	return value === null || value === undefined ? '' : String(value)
}

/**
 * The label of a list item: a `{path}` template or a dot-path filled from it.
 *
 * @param {unknown} item The item.
 * @param {string} [label] A template (`{givenName} {familyName}`) or a dot-path.
 * @param {string} fallback What to show when the label is empty.
 * @return {string} The label.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function itemLabel(item, label, fallback) {
	if (!label || item === null || typeof item !== 'object') {
		return fallback
	}
	const text = label.includes('{') ? fillTemplate(label, item) : readPath(item, label)
	return text === null || text === undefined || text === '' ? fallback : String(text)
}

/**
 * Index cell objects by their row and column key.
 *
 * @param {Array<object>} cells The cell objects.
 * @param {{rowKey: string, columnKey: string}} config Where each object names its row and column.
 * @return {Map<string, object>} Cell objects by {@link cellKey}.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function cellIndex(cells, config) {
	const index = new Map()
	for (const cell of Array.isArray(cells) ? cells : []) {
		const row = readPath(cell, config.rowKey)
		const col = readPath(cell, config.columnKey)
		if (row !== undefined && row !== null && col !== undefined && col !== null) {
			index.set(cellKey(row, col), cell)
		}
	}
	return index
}

/**
 * The value a cell object shows: the value at `value`, mapped through `valueMap`.
 *
 * @param {object|undefined} cell The cell object.
 * @param {{value?: string, valueMap?: object}} config The cell configuration.
 * @return {unknown} The value, or undefined for an empty cell.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function cellValue(cell, config) {
	if (!cell) {
		return undefined
	}
	const raw = readPath(cell, config.value || 'value')
	const map = config.valueMap
	if (map && typeof map === 'object' && raw !== undefined && raw !== null && Object.hasOwn(map, String(raw))) {
		return map[String(raw)]
	}
	return raw
}

/**
 * Columns from a list: objects or scalars, keyed by `key` and labelled by `label`.
 *
 * @param {Array<unknown>} items The list.
 * @param {{key?: string, label?: string, type?: string, readOnly?: boolean}} [config] How to read each item.
 * @return {Array<{key: string, label: string}>} The columns, in list order, without duplicates.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function columnsFrom(items, config = {}) {
	const seen = new Set()
	const out = []
	for (const item of Array.isArray(items) ? items : []) {
		const key = itemId(item, config.key)
		if (key === '' || seen.has(key)) {
			continue
		}
		seen.add(key)
		const column = { key, label: itemLabel(item, config.label, key) }
		if (config.type) {
			column.type = config.type
		}
		if (config.readOnly) {
			column.readOnly = true
		}
		out.push(column)
	}
	return out
}

/**
 * One matrix row per row item, with each column's cell value.
 *
 * @param {object} args The inputs.
 * @param {Array<unknown>} args.items The row items: ids or objects.
 * @param {string} [args.rowKey] Dot-path of the id on an object item.
 * @param {string} [args.rowLabel] Label template or path of an object item.
 * @param {object} [args.labels] Labels by id, for scalar items (a lookup).
 * @param {string} [args.groupBy] Dot-path of the group of an object item.
 * @param {Array<{key: string}>} args.columns The columns.
 * @param {Map<string, object>} args.index The cell index from {@link cellIndex}.
 * @param {{value?: string, valueMap?: object}} args.cells The cell configuration.
 * @return {Array<object>} Rows: `id`, `label`, `group`, `item`, `cells` (objects by column key) and one value per column key.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
 */
export function matrixRows({ items, rowKey, rowLabel, labels = {}, groupBy, columns, index, cells }) {
	const seen = new Set()
	const rows = []
	for (const item of Array.isArray(items) ? items : []) {
		const id = itemId(item, rowKey)
		if (id === '' || seen.has(id)) {
			continue
		}
		seen.add(id)
		const row = {
			id,
			label: labels[id] || itemLabel(item, rowLabel, id),
			group: groupBy && item && typeof item === 'object' ? String(readPath(item, groupBy) ?? '') : '',
			item,
			cells: {},
		}
		for (const column of columns) {
			const cell = index.get(cellKey(id, column.key))
			row.cells[column.key] = cell
			row[column.key] = cellValue(cell, cells)
		}
		rows.push(row)
	}
	return rows
}

/**
 * The values of one field entry: the entry itself, or its `valueKey` map.
 *
 * @param {object} entry The entry.
 * @param {string} [valueKey] The property holding the values by column key.
 * @return {object} The values.
 */
function entryValues(entry, valueKey) {
	if (!valueKey) {
		return entry || {}
	}
	const values = entry ? entry[valueKey] : null
	return values && typeof values === 'object' ? values : {}
}

/**
 * One matrix row per entry of an array field of the page object.
 *
 * @param {Array<object>} list The stored array.
 * @param {{rowKey: string, label?: string, valueKey?: string, groupBy?: string}} field The field configuration.
 * @param {Array<{key: string}>} columns The columns.
 * @return {Array<object>} Rows like {@link matrixRows}, without cell objects.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-can-edit-one-array-field-of-the-page-object
 */
export function fieldRows(list, field, columns) {
	return (Array.isArray(list) ? list : [])
		.filter((entry) => entry && typeof entry === 'object')
		.map((entry) => {
			const id = itemId(entry, field.rowKey)
			const values = entryValues(entry, field.valueKey)
			const row = {
				id,
				label: itemLabel(entry, field.label, id),
				group: field.groupBy ? String(readPath(entry, field.groupBy) ?? '') : '',
				item: entry,
				cells: {},
			}
			for (const column of columns) {
				row[column.key] = values[column.key]
			}
			return row
		})
}

/**
 * A copy of the stored array with one cell changed. Untouched entries keep
 * their identity.
 *
 * @param {Array<object>} list The stored array.
 * @param {{rowKey: string, valueKey?: string}} field The field configuration.
 * @param {string} rowId The row id.
 * @param {string} colKey The column key.
 * @param {unknown} value The new value.
 * @return {Array<object>} The new array.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-can-edit-one-array-field-of-the-page-object
 */
export function withFieldCell(list, field, rowId, colKey, value) {
	return (Array.isArray(list) ? list : []).map((entry) => {
		if (!entry || typeof entry !== 'object' || itemId(entry, field.rowKey) !== String(rowId)) {
			return entry
		}
		if (field.valueKey) {
			return { ...entry, [field.valueKey]: { ...entryValues(entry, field.valueKey), [colKey]: value } }
		}
		return { ...entry, [colKey]: value }
	})
}

/**
 * Which column totals are above their norm.
 *
 * @param {object} totals Column totals by column key.
 * @param {object} norms Norms by column key.
 * @return {object} `'over'` or `''` by column key.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-shows-totals-and-checks-them-against-norms
 */
export function normMarks(totals, norms) {
	const out = {}
	for (const [key, total] of Object.entries(totals || {})) {
		const norm = norms ? Number(norms[key]) : NaN
		out[key] = Number.isFinite(norm) && Number(total) > norm ? 'over' : ''
	}
	return out
}

/**
 * Whether an object matches a when-rule: every field equal to the value, or
 * one of the values when the rule gives a list. No rule matches everything.
 *
 * @param {object} object The object.
 * @param {object|null} [when] The rule.
 * @return {boolean} Whether it matches.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-runs-row-actions-and-one-bulk-transition
 */
export function matchesWhen(object, when) {
	if (!when || typeof when !== 'object') {
		return true
	}
	return Object.entries(when).every(([path, expected]) => {
		const actual = readPath(object || {}, path)
		return Array.isArray(expected) ? expected.includes(actual) : actual === expected
	})
}

/**
 * The objects a bulk transition runs on.
 *
 * @param {Array<object>} objects The candidates (cell or row objects).
 * @param {{when?: object, column?: string, columnKey?: string}} scope The rule, and optionally one column.
 * @return {Array<object>} The targets.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-runs-row-actions-and-one-bulk-transition
 */
export function bulkTargets(objects, { when, column, columnKey } = {}) {
	return (Array.isArray(objects) ? objects : []).filter((object) => object
		&& matchesWhen(object, when)
		&& (!column || !columnKey || String(readPath(object, columnKey)) === String(column)))
}

/**
 * Parse what a person typed into a cell. A number column takes a decimal
 * comma or point; an empty cell clears the value.
 *
 * @param {unknown} raw The typed text.
 * @param {{type?: string}} column The column.
 * @return {{ok: boolean, value: unknown}} The value, and whether it parsed.
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-writes-one-cell-at-a-time
 */
export function parseCellInput(raw, column) {
	const text = raw === null || raw === undefined ? '' : String(raw).trim()
	if (column && column.type === 'number') {
		if (text === '') {
			return { ok: true, value: null }
		}
		const n = Number(text.replace(',', '.'))
		return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, value: null }
	}
	return { ok: true, value: text }
}
