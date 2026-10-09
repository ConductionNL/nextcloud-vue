/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * ISO 8601 duration helpers for the `duration` form widget.
 *
 * @spec openspec/changes/form-widgets-duration-and-subobject-table/tasks.md#task-1
 */

const PATTERN = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/

/** Units the widget edits, in select order. `date` units sit before the `T`. */
export const DURATION_UNITS = ['minutes', 'hours', 'days', 'weeks', 'months', 'years']

const DESIGNATOR = { minutes: 'TM', hours: 'TH', days: 'D', weeks: 'W', months: 'M', years: 'Y' }
const SECONDS = { seconds: 1, minutes: 60, hours: 3600, days: 86400, weeks: 604800, months: 2592000, years: 31536000 }

/**
 * Whether a string is a well-formed ISO 8601 duration.
 *
 * @param {string} value The text to test.
 * @return {boolean}
 */
export function isIsoDuration(value) {
	return typeof value === 'string' && value !== 'P' && !value.endsWith('T') && PATTERN.test(value)
}

/**
 * Split a duration into its non-zero parts, or null when it is not ISO.
 *
 * @param {string} value ISO 8601 duration.
 * @return {Object<string, number>|null} Parts keyed by unit name, e.g. `{ days: 1, hours: 2 }`.
 */
function parts(value) {
	if (!isIsoDuration(value)) {
		return null
	}
	const m = value.match(PATTERN)
	const names = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']
	const out = {}
	names.forEach((name, i) => {
		const n = Number(m[i + 1])
		if (m[i + 1] !== undefined && n !== 0) {
			out[name] = n
		}
	})
	return out
}

/**
 * Reduce a duration to one number and unit. Anything that is not exactly one
 * unit (`P1DT2H`, seconds) returns null so the widget never rounds.
 *
 * @param {string} value ISO 8601 duration, e.g. `P56D`.
 * @return {{amount: number, unit: string}|null} The single unit, or null.
 */
export function parseDuration(value) {
	const p = parts(value)
	if (!p) {
		return null
	}
	const keys = Object.keys(p)
	if (keys.length !== 1 || !DURATION_UNITS.includes(keys[0])) {
		return null
	}
	return { amount: p[keys[0]], unit: keys[0] }
}

/**
 * Write the canonical ISO string for a number of one unit.
 *
 * @param {number} amount The count.
 * @param {string} unit   One of DURATION_UNITS.
 * @return {string|null} `P56D`, `PT4H`, ...; null for an empty or invalid amount.
 */
export function formatDuration(amount, unit) {
	const n = Number(amount)
	if (amount === '' || amount === null || amount === undefined || !Number.isFinite(n) || n < 0 || !DESIGNATOR[unit]) {
		return null
	}
	const d = DESIGNATOR[unit]
	return d.startsWith('T') ? `PT${Math.trunc(n)}${d.slice(1)}` : `P${Math.trunc(n)}${d}`
}

/**
 * Length of a duration in seconds (months as 30 days, years as 365) for min/max checks.
 *
 * @param {string} value ISO 8601 duration.
 * @return {number|null} Seconds, or null when not ISO.
 */
export function durationSeconds(value) {
	const p = parts(value)
	if (!p) {
		return null
	}
	return Object.keys(p).reduce((sum, k) => sum + p[k] * SECONDS[k], 0)
}
