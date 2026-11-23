/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dueRule: decides whether a dated card is overdue, due soon or fine.
 *
 * A board's rule is `{ field, soonDays?, variantWhen? }`. `field` is a
 * dot-path to the date on the row. `soonDays` (default 3) is how many days
 * ahead still counts as "soon"; a date before today is overdue.
 *
 * The deciding is done by `utils/dateVariant.js`, the same rules a table's
 * date cell uses, so a list and its board agree on what late means.
 * `{ soonDays: 3 }` is shorthand for
 * `variantWhen: [{ op: 'lt', value: 0, variant: 'error' }, { op: 'lte', value: 3, variant: 'warning' }]`,
 * and a rule that carries its own `variantWhen` is used as written:
 * `error` reads as overdue, `warning` as due soon.
 *
 * @module utils/dueRule
 */

import { daysUntil, parseDateValue, resolveDateVariant } from './dateVariant.js'
import { readPath } from './readPath.js'

export { daysUntil }

/** How many days ahead counts as "soon" when the rule does not say. */
export const DEFAULT_SOON_DAYS = 3

/**
 * Local midnight of a date value. A bare `YYYY-MM-DD` is a LOCAL day.
 *
 * @param {unknown} value A Date, a timestamp or a date string.
 * @return {Date|null} Local midnight of that day, or null when unreadable.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function toLocalDay(value) {
	const date = parseDateValue(value)
	return date === null ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * The `variantWhen` rules a due rule stands for.
 *
 * @param {{soonDays?: number, variantWhen?: Array<object>}|null} [rule] The due rule.
 * @return {Array<{op: string, value: number, variant: string}>} The rules `resolveDateVariant` takes.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function dueRuleToVariantWhen(rule = {}) {
	if (Array.isArray(rule?.variantWhen) && rule.variantWhen.length > 0) {
		return rule.variantWhen
	}
	const given = rule?.soonDays
	const soonDays = given !== null && given !== undefined && Number.isFinite(Number(given)) ? Number(given) : DEFAULT_SOON_DAYS
	return [
		{ op: 'lt', value: 0, variant: 'error' },
		{ op: 'lte', value: soonDays, variant: 'warning' },
	]
}

/**
 * The due state of one date under a rule.
 *
 * @param {unknown} value The date.
 * @param {{soonDays?: number, variantWhen?: Array<object>}|null} [rule] The rule.
 * @param {Date} [now] The moment to measure from.
 * @return {'overdue'|'soon'|'ok'|null} The state, or null when there is no readable date.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function dueStateOf(value, rule = {}, now = new Date()) {
	if (daysUntil(value, now) === null) {
		return null
	}
	const variant = resolveDateVariant(value, dueRuleToVariantWhen(rule), now)
	if (variant === 'error') {
		return 'overdue'
	}
	return variant === 'warning' ? 'soon' : 'ok'
}

/**
 * The due state of a row under a `{ field, soonDays }` rule.
 *
 * @param {object} row The row or card.
 * @param {{field?: string, soonDays?: number, variantWhen?: Array<object>}|null} rule The rule. Null or field-less means no marking.
 * @param {Date} [now] The moment to measure from.
 * @return {'overdue'|'soon'|'ok'|null} The state, or null when the rule does not apply.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function dueStateForRow(row, rule, now = new Date()) {
	if (!rule || typeof rule.field !== 'string' || rule.field === '' || !row) {
		return null
	}
	return dueStateOf(readPath(row, rule.field), rule, now)
}
