/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Arithmetic for the rows of `CnChildRecordsField`: computed columns per row,
 * totals over all rows, and the values a picked source record gives a new row.
 * Formulas go through `evalFormula`, so no `eval` runs.
 *
 * @module utils/childRecordTotals
 */

import { evalFormula } from './evalFormula.js'

/**
 * The identifiers a formula names.
 *
 * @param {string} formula The formula.
 * @return {string[]} The identifiers.
 */
function identifiersOf(formula) {
	return String(formula || '').match(/[A-Za-z_][A-Za-z0-9_]*/g) || []
}

/**
 * The variables for a formula: every identifier it names, as a number, 0 when
 * the value is empty or no number, so a half-filled row still computes.
 *
 * @param {string} formula The formula.
 * @param {object} values The named values.
 * @return {Object<string, number>} The variables.
 */
function varsFor(formula, values) {
	const vars = {}
	for (const id of identifiersOf(formula)) {
		const n = Number(values?.[id])
		vars[id] = Number.isFinite(n) ? n : 0
	}
	return vars
}

/**
 * Evaluate a formula over named values.
 *
 * @param {string} formula The formula (`quantity * price`).
 * @param {object} values The named values.
 * @return {number|null} The result, or null on an invalid formula or a division by zero.
 * @spec openspec/changes/child-records-totals/tasks.md#task-1
 */
export function evalOver(formula, values) {
	if (typeof formula !== 'string' || formula.trim() === '') {
		return null
	}
	return evalFormula(formula, varsFor(formula, values))
}

/**
 * The computed values of one row, in order, so a later computed column can
 * name an earlier one.
 *
 * @param {object} row The row.
 * @param {Array<{key: string, formula: string}>} computed The computed columns.
 * @return {Object<string, number|null>} Computed value per key.
 * @spec openspec/changes/child-records-totals/tasks.md#task-1
 */
export function computeRow(row, computed) {
	const out = {}
	const scope = { ...(row || {}) }
	for (const col of Array.isArray(computed) ? computed : []) {
		if (!col || !col.key) {
			continue
		}
		const value = evalOver(col.formula, scope)
		out[col.key] = value
		scope[col.key] = value
	}
	return out
}

/**
 * The row with every computed column marked `store` written into it.
 *
 * @param {object} row The row.
 * @param {Array<{key: string, formula: string, store?: boolean}>} computed The computed columns.
 * @return {object} The row, a new object when something was written.
 * @spec openspec/changes/child-records-totals/tasks.md#task-1
 */
export function storeComputed(row, computed) {
	const stored = (Array.isArray(computed) ? computed : []).filter((c) => c && c.key && c.store)
	if (stored.length === 0) {
		return row
	}
	const values = computeRow(row, computed)
	const next = { ...row }
	for (const col of stored) {
		next[col.key] = values[col.key]
	}
	return next
}

/**
 * The totals over all rows. A total with `sum` adds that formula over every
 * row (a column key is a formula too); a total with `formula` computes over
 * the totals before it (`subtotal + tax`).
 *
 * @param {object[]} rows The rows.
 * @param {Array<{key: string, sum?: string, formula?: string}>} totals The totals.
 * @param {Array<{key: string, formula: string}>} [computed] The computed columns, which `sum` may name.
 * @return {Object<string, number|null>} Total per key.
 * @spec openspec/changes/child-records-totals/tasks.md#task-2
 */
export function computeTotals(rows, totals, computed = []) {
	const list = Array.isArray(rows) ? rows : []
	const scoped = list.map((row) => ({ ...(row || {}), ...computeRow(row, computed) }))
	const out = {}
	for (const total of Array.isArray(totals) ? totals : []) {
		if (!total || !total.key) {
			continue
		}
		if (typeof total.sum === 'string' && total.sum !== '') {
			let sum = 0
			let valid = true
			for (const row of scoped) {
				const value = evalOver(total.sum, row)
				if (value === null) {
					valid = false
					break
				}
				sum += value
			}
			out[total.key] = valid ? sum : null
		} else {
			out[total.key] = evalOver(total.formula, out)
		}
	}
	return out
}

/**
 * The values a picked source record gives a new row. `map` names, per row
 * key, the source key to copy; `@id` copies the source's id (or uuid).
 *
 * @param {object} source The picked record.
 * @param {Object<string, string>} map Row key to source key.
 * @return {object} The new row.
 * @spec openspec/changes/child-records-totals/tasks.md#task-3
 */
export function rowFromSource(source, map) {
	const row = {}
	for (const [rowKey, sourceKey] of Object.entries(map || {})) {
		row[rowKey] = sourceKey === '@id' ? (source?.id ?? source?.uuid ?? null) : (source?.[sourceKey] ?? null)
	}
	return row
}
