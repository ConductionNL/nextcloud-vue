/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dueRule: decides whether a dated item is overdue, due soon or fine.
 *
 * One rule shape for every surface that marks lateness, `{ field, soonDays }`:
 * `field` is a dot-path to the date on the row, `soonDays` is how many days
 * ahead still counts as "soon" (default 3). A date before today is overdue.
 * Days are whole calendar days in the reader's own timezone, so a deadline of
 * today is never overdue at 09:00 and never "tomorrow" at 23:00.
 *
 * @module utils/dueRule
 */

import { readPath } from './readPath.js'

/** How many days ahead counts as "soon" when the rule does not say. */
export const DEFAULT_SOON_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Parse a date value to local midnight.
 *
 * A bare `YYYY-MM-DD` is read as a LOCAL date. `new Date('2026-11-01')` reads
 * it as UTC, which west of Greenwich is the evening before.
 *
 * @param {unknown} value A Date, a timestamp or a date string.
 * @return {Date|null} Local midnight of that day, or null when unreadable.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function toLocalDay(value) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	let date
	const bare = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim()) : null
	if (bare) {
		date = new Date(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]))
	} else {
		date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
	}
	if (Number.isNaN(date.getTime())) {
		return null
	}
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Whole calendar days from today until a date. Negative when it has passed.
 *
 * @param {unknown} value The date.
 * @param {Date} [now] The moment to measure from.
 * @return {number|null} The day count, or null when the date is unreadable.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function daysUntil(value, now = new Date()) {
	const day = toLocalDay(value)
	const today = toLocalDay(now)
	if (!day || !today) {
		return null
	}
	return Math.round((day.getTime() - today.getTime()) / DAY_MS)
}

/**
 * The due state of one date under a rule.
 *
 * @param {unknown} value The date.
 * @param {{soonDays?: number}|null} [rule] The rule.
 * @param {Date} [now] The moment to measure from.
 * @return {'overdue'|'soon'|'ok'|null} The state, or null when there is no readable date.
 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-late-marking-on-board-cards
 */
export function dueStateOf(value, rule = {}, now = new Date()) {
	const days = daysUntil(value, now)
	if (days === null) {
		return null
	}
	if (days < 0) {
		return 'overdue'
	}
	const soonDays = Number.isFinite(Number(rule?.soonDays)) && rule?.soonDays !== null && rule?.soonDays !== undefined
		? Number(rule.soonDays)
		: DEFAULT_SOON_DAYS
	return days <= soonDays ? 'soon' : 'ok'
}

/**
 * The due state of a row under a `{ field, soonDays }` rule.
 *
 * @param {object} row The row or card.
 * @param {{field?: string, soonDays?: number}|null} rule The rule. Null or field-less means no marking.
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
