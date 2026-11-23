/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * matrixCells: lay out records that each hold one matrix cell as the rows and
 * columns a `matrix` chart draws.
 *
 * A matrix kept as data is often stored one record per cell: the row it sits
 * in, the column, and the value. This turns such a list into one series per
 * row with a value per column, in a stable order, so the chart reads the same
 * matrix the app computes with instead of a copy written into a manifest.
 *
 * @module utils/matrixCells
 * @spec openspec/changes/matrix-cell-records/specs/matrix-cell-records/spec.md#requirement-a-matrix-can-read-its-cells-from-records
 */

import { readPath } from './readPath.js'

/**
 * A stored key as text, or null when there is none.
 *
 * @param {unknown} value The stored value.
 * @return {string|null} The key.
 */
function keyOf(value) {
	if (value === null || value === undefined || value === '' || typeof value === 'object') {
		return null
	}
	return String(value)
}

/**
 * The keys in the order they are drawn: the listed order first, then keys
 * with an order value (lowest first), then the rest in natural order.
 *
 * @param {Map<string, {order: number}>} found The keys seen, with their lowest order value.
 * @param {Array<string|number>|undefined} listed An explicit order.
 * @return {string[]} The ordered keys.
 */
function orderKeys(found, listed) {
	const explicit = Array.isArray(listed) ? listed.map((k) => String(k)).filter((k) => found.has(k)) : []
	const rest = [...found.keys()].filter((k) => !explicit.includes(k))
	rest.sort((a, b) => {
		const oa = found.get(a).order
		const ob = found.get(b).order
		if (oa !== ob) {
			return oa - ob
		}
		return a.localeCompare(b, undefined, { numeric: true })
	})
	return [...explicit, ...rest]
}

/**
 * Lay out cell records as matrix rows and columns.
 *
 * Config: `rowField`, `columnField`, `valueField` (paths on a record);
 * optional `rowLabelField` / `columnLabelField` (a path holding the label),
 * `rowLabels` / `columnLabels` (key to label maps, these win), `rowOrder` /
 * `columnOrder` (keys in order) and `rowOrderField` / `columnOrderField` (a
 * numeric path to sort by). A record without a row or column is skipped; when
 * two records name the same cell, the first wins.
 *
 * @param {Array<object>} records The cell records.
 * @param {object} config The `cellSource` config.
 * @return {{series: Array<{key: string, name: string, data: Array<unknown>}>, categories: string[], columnKeys: string[]}} The matrix.
 * @spec openspec/changes/matrix-cell-records/specs/matrix-cell-records/spec.md#requirement-a-matrix-can-read-its-cells-from-records
 */
export function pivotCells(records, config) {
	const cfg = config && typeof config === 'object' ? config : {}
	const rows = new Map()
	const columns = new Map()
	const cells = new Map()
	const note = (map, key, label, order) => {
		const entry = map.get(key)
		const value = Number(order)
		const rank = Number.isFinite(value) ? value : Infinity
		if (!entry) {
			map.set(key, { label, order: rank })
		} else {
			entry.order = Math.min(entry.order, rank)
			entry.label = entry.label || label
		}
	}
	for (const record of Array.isArray(records) ? records : []) {
		if (!record || typeof record !== 'object') {
			continue
		}
		const row = keyOf(readPath(record, cfg.rowField))
		const column = keyOf(readPath(record, cfg.columnField))
		if (row === null || column === null) {
			continue
		}
		note(rows, row, cfg.rowLabelField ? keyOf(readPath(record, cfg.rowLabelField)) : null, cfg.rowOrderField ? readPath(record, cfg.rowOrderField) : undefined)
		note(columns, column, cfg.columnLabelField ? keyOf(readPath(record, cfg.columnLabelField)) : null, cfg.columnOrderField ? readPath(record, cfg.columnOrderField) : undefined)
		const cell = `${row}\u0000${column}`
		if (!cells.has(cell)) {
			const value = readPath(record, cfg.valueField)
			cells.set(cell, value === undefined ? null : value)
		}
	}
	const rowKeys = orderKeys(rows, cfg.rowOrder)
	const columnKeys = orderKeys(columns, cfg.columnOrder)
	const labelOf = (key, map, labels) => {
		if (labels && typeof labels === 'object' && typeof labels[key] === 'string') {
			return labels[key]
		}
		return map.get(key).label || key
	}
	return {
		series: rowKeys.map((row) => ({
			key: row,
			name: labelOf(row, rows, cfg.rowLabels),
			data: columnKeys.map((column) => {
				const value = cells.get(`${row}\u0000${column}`)
				return value === undefined ? null : value
			}),
		})),
		categories: columnKeys.map((column) => labelOf(column, columns, cfg.columnLabels)),
		columnKeys,
	}
}

/**
 * The cells of a matrix kept inside ONE record: the array at `cellsPath`,
 * narrowed by `cellFilter` (field to value, compared as text), with the axis
 * order read from `rowOrderPath` / `columnOrderPath` on the record when the
 * config gives no `rowOrder` / `columnOrder` list.
 *
 * @param {object|null} record The record that holds the matrix.
 * @param {object} config The `cellSource` config.
 * @param {object} [cellFilter] The `cellFilter`, tokens already resolved.
 * @return {{cells: Array<object>, config: object}} The cells, and the config to lay them out with.
 * @spec openspec/changes/matrix-cell-records/specs/matrix-cell-records/spec.md#requirement-a-matrix-can-read-its-cells-from-one-record
 */
export function cellsFromRecord(record, config, cellFilter = {}) {
	const cfg = config && typeof config === 'object' ? config : {}
	const list = record ? readPath(record, cfg.cellsPath) : null
	const wanted = Object.entries(cellFilter && typeof cellFilter === 'object' ? cellFilter : {})
	const cells = (Array.isArray(list) ? list : []).filter((cell) => cell && typeof cell === 'object'
		&& wanted.every(([field, value]) => keyOf(readPath(cell, field)) === keyOf(value)))
	const axis = (path) => {
		const value = record && path ? readPath(record, path) : null
		return Array.isArray(value) ? value : undefined
	}
	return {
		cells,
		config: {
			...cfg,
			rowOrder: Array.isArray(cfg.rowOrder) ? cfg.rowOrder : axis(cfg.rowOrderPath),
			columnOrder: Array.isArray(cfg.columnOrder) ? cfg.columnOrder : axis(cfg.columnOrderPath),
		},
	}
}
