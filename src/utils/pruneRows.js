/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tidy the rows of an array-of-objects field before it is saved
 * (`pruneWhen`): strings are trimmed, optional keys left empty are omitted,
 * and a row is dropped when a listed key is blank (`blank: ['title']`) or,
 * with `invalid: true`, when it misses a key the row schema requires.
 *
 * @module utils/pruneRows
 * @spec openspec/changes/sub-objects-editor/specs/form-dialog/spec.md#requirement-rows-are-tidied-before-they-are-saved
 */

const isBlank = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * The rows, tidied by `pruneWhen`. Without `pruneWhen` they are returned as
 * they are.
 *
 * @param {Array<object>} rows The rows.
 * @param {{required?: string[]}|null} items The row schema.
 * @param {{blank?: string[], invalid?: boolean}|null|undefined} pruneWhen The rule.
 * @return {Array<object>} The rows to save.
 */
export function pruneRows(rows, items, pruneWhen) {
	if (!Array.isArray(rows) || !pruneWhen || typeof pruneWhen !== 'object') {
		return rows
	}
	const required = items && Array.isArray(items.required) ? items.required : []
	const blank = Array.isArray(pruneWhen.blank) ? pruneWhen.blank : []
	return rows
		.filter((row) => row && typeof row === 'object')
		.map((row) => {
			const out = {}
			for (const [key, value] of Object.entries(row)) {
				const tidy = typeof value === 'string' ? value.trim() : value
				if (isBlank(tidy) && !required.includes(key)) {
					continue
				}
				out[key] = tidy
			}
			return out
		})
		.filter((row) => !blank.some((key) => isBlank(row[key])))
		.filter((row) => pruneWhen.invalid !== true || required.every((key) => !isBlank(row[key])))
}
