/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { compareVisibleWhen, readVisibleWhenPath } from './visibleWhen.js'

/**
 * Compile a row-class declaration into the `(row) => string` CnDataTable
 * takes. A function passes straight through. An array of rules
 * `[{ when: { field, op?, value }, class }]` adds each rule's `class` to a row
 * whose `field` (a dot-path) compares to `value` with `op` (`eq` by default;
 * the shared `visibleWhen` operators, `@today` and the other tokens included),
 * every matching class space-joined: an overdue row can be marked from the
 * manifest (`{ when: { field: "dueAt", op: "lt", value: "@today" }, class:
 * "cn-row--overdue" }`). Anything else, or an empty list, is null.
 *
 * @param {Function|Array<{when: {field: string, op?: string, value: unknown}, class: string}>|null} rowClass The declaration.
 * @return {?(row: object) => string} The row-class function, or null.
 */
export function compileRowClass(rowClass) {
	if (typeof rowClass === 'function') {
		return rowClass
	}
	if (!Array.isArray(rowClass) || rowClass.length === 0) {
		return null
	}
	const rules = rowClass.filter((rule) => rule && typeof rule.class === 'string' && rule.class !== '')
	return (row) => {
		const classes = []
		for (const rule of rules) {
			const when = rule.when || {}
			const actual = readVisibleWhenPath(row, when.field)
			if (compareVisibleWhen(actual, when.op || 'eq', when.value)) {
				classes.push(rule.class)
			}
		}
		return classes.join(' ')
	}
}
