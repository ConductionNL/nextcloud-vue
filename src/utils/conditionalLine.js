/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * conditionalLine — the one sentence out of several that fits a row.
 *
 * A manifest names its candidates in order, each with an optional local
 * `when` condition over the row (the `visibleWhen` grammar: `field`, `op`,
 * `value`, `all`, `any`) and a `text` template (`fillTemplate` tokens). The
 * first candidate whose condition holds and whose template fills is the line:
 *
 * ```json
 * [
 *   { "when": { "field": "computable", "op": "neq", "value": true }, "text": "Progress cannot be computed." },
 *   { "when": { "field": "mode", "op": "eq", "value": "manual" }, "text": "{progress} percent done, entered by hand." },
 *   { "text": "{progress} percent done." }
 * ]
 * ```
 *
 * A plain string is one candidate without a condition.
 *
 * @module utils/conditionalLine
 */

import { fillTemplate } from './fillTemplate.js'
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The first candidate line that applies to the row, filled.
 *
 * @param {Array<string|{when?: object, text: string}>|string} candidates The candidates, in order.
 * @param {object|null} row The row the conditions and the tokens read.
 * @param {(text: string) => string} [translate] Applied to each text before it is filled.
 * @param {{config?: object, formatters?: object}|null} [context] Passed on to `fillTemplate`.
 * @return {string} The line, or '' when none applies.
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-line-can-be-chosen-by-condition
 */
export function conditionalLine(candidates, row, translate = (text) => text, context = null) {
	const list = Array.isArray(candidates) ? candidates : [candidates]
	const data = row && typeof row === 'object' ? row : {}
	for (const candidate of list) {
		const entry = typeof candidate === 'string' ? { text: candidate } : candidate
		if (!entry || typeof entry !== 'object' || typeof entry.text !== 'string' || entry.text === '') {
			continue
		}
		if (entry.when && !evaluateVisibleWhenLocal(entry.when, data)) {
			continue
		}
		const text = fillTemplate(translate(entry.text), data, new Date(), context)
		if (text !== '') {
			return text
		}
	}
	return ''
}
