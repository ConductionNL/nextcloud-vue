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
 * "cn-row--overdue" }`). A `when` list holds when every condition in it
 * holds, so an open lead past its date can be told from a closed one; an
 * empty list never holds. Anything else, or an empty list of rules, is null.
 *
 * @param {((row: object) => string)|Array<{when: (object|Array<object>), class: string}>|null} rowClass The declaration.
 * @return {?(row: object) => string} The row-class function, or null.
 * @spec openspec/changes/pl4-cell-rules/specs/pl4-cell-rules/spec.md#requirement-a-row-class-rule-can-require-several-conditions
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
			if (ruleHolds(rule.when, row)) {
				classes.push(rule.class)
			}
		}
		return classes.join(' ')
	}
}

/**
 * Whether a rule's condition, or every condition of a list, holds on a row.
 *
 * @param {object|Array<object>} when The condition or conditions.
 * @param {object} row The row.
 * @return {boolean} True when it holds.
 */
function ruleHolds(when, row) {
	const conditions = Array.isArray(when) ? when : [when || {}]
	return conditions.length > 0 && conditions.every((condition) => {
		const actual = readVisibleWhenPath(row, condition && condition.field)
		return compareVisibleWhen(actual, (condition && condition.op) || 'eq', condition && condition.value)
	})
}
