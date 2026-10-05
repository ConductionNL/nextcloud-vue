/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dateVariant: turn "how far away is this date" into a colour variant.
 *
 * A deadline reads differently depending on how close it is. The rules are the
 * `variantWhen` shape the stat tile already uses (`[{ op, value, variant }]`,
 * first match wins), compared against the number of CALENDAR days from today
 * until the date: `0` is today, a negative number is overdue.
 *
 * ```js
 * resolveDateVariant('2026-10-01', [
 *   { op: 'lt', value: 0, variant: 'error' },     // overdue
 *   { op: 'lte', value: 5, variant: 'warning' },  // within five days
 * ])
 * ```
 *
 * Shared by the `date` cell widget (CnCellRenderer) and the week strip, and
 * meant for board cards too, so a deadline is coloured by one rule everywhere.
 *
 * @module utils/dateVariant
 */

import { compareVisibleWhen } from './visibleWhen.js'

/** Variants a date rule may name. `danger` is accepted as an alias of `error`. */
export const DATE_VARIANTS = Object.freeze(['default', 'success', 'warning', 'error'])

const MS_PER_DAY = 86400000

/**
 * Parse a value into a Date. A date-only string (`2026-10-05`) is read as a
 * LOCAL day, so it does not slide to the day before in a timezone west of UTC.
 *
 * @param {unknown} value A Date, a timestamp, or an ISO string.
 * @return {Date|null} The date, or null when the value is not one.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
 */
export function parseDateValue(value) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value
	}
	if (typeof value === 'string') {
		const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
		if (dateOnly) {
			return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
		}
	}
	if (typeof value !== 'string' && typeof value !== 'number') {
		return null
	}
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * The local calendar day of a date as `YYYY-MM-DD`.
 *
 * @param {Date} date The date.
 * @return {string} The day key.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
 */
export function dayKey(date) {
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Whole calendar days from `now` until `value`: 0 today, negative when past.
 *
 * @param {unknown} value The date.
 * @param {Date} [now] The reference moment (defaults to the current time).
 * @return {number|null} The day count, or null when `value` is not a date.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
 */
export function daysUntil(value, now = new Date()) {
	const date = parseDateValue(value)
	if (date === null) {
		return null
	}
	// UTC midnights of the two LOCAL days, so a daylight-saving hour never
	// turns one day into zero or two.
	const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
	return Math.round((target - today) / MS_PER_DAY)
}

/**
 * The variant of the first rule the date matches, or '' when none does.
 *
 * @param {unknown} value The date.
 * @param {Array<{op: string, value: number, variant: string}>} rules The `variantWhen` rules.
 * @param {Date} [now] The reference moment (defaults to the current time).
 * @return {string} `success | warning | error | default`, or '' for no match.
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-avatar-and-date-cells
 */
export function resolveDateVariant(value, rules, now = new Date()) {
	if (!Array.isArray(rules) || rules.length === 0) {
		return ''
	}
	const days = daysUntil(value, now)
	if (days === null) {
		return ''
	}
	for (const rule of rules) {
		if (!rule || typeof rule !== 'object') {
			continue
		}
		if (compareVisibleWhen(days, rule.op || 'eq', rule.value) === true) {
			const variant = rule.variant === 'danger' ? 'error' : rule.variant
			return DATE_VARIANTS.includes(variant) ? variant : ''
		}
	}
	return ''
}
