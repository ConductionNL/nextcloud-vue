/**
 * @file Built-in formatters merged into the `cnFormatters` registry
 * `CnAppRoot` provides to descendants.
 *
 * Resolution order (in `CnCellRenderer`):
 *   1. Consumer-registered `formatters[id]` (passed to CnAppRoot).
 *   2. Built-in `BUILT_IN_FORMATTERS[id]` from this file.
 *   3. Schema-type-aware rendering.
 *   4. Plain `formatValue()` fallback.
 *
 * Consumer formatters win (CnAppRoot spreads
 * `{ ...BUILT_IN_FORMATTERS, ...props.formatters }`).
 *
 * Every built-in MUST be safe against null / empty / non-parseable
 * inputs — the contract is "return the original value (or empty
 * string) rather than throw".
 */

/**
 * Parse a value that's meant to be a date — accepts a `Date` instance,
 * an ISO/parseable string, or a numeric timestamp.
 *
 * @param {Date|string|number|null|undefined} value
 * @return {Date|null} A `Date` instance, or `null` if the input is null/empty/unparseable.
 */
function toDate(value) {
	if (value == null || value === '') return null
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
	const d = new Date(value)
	return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Locale-formatted date (no time). Backed by `Intl.DateTimeFormat`
 * (`dateStyle: 'medium'`) using the user-agent locale.
 *
 * @param {*} value
 * @return {string} Formatted date, or `''` for null/empty, or `String(value)` for unparseable.
 */
export function formatDate(value) {
	if (value == null || value === '') return ''
	const d = toDate(value)
	if (!d) return String(value)
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
}

/**
 * Locale-formatted date + time. Backed by `Intl.DateTimeFormat`
 * (`dateStyle: 'medium'`, `timeStyle: 'short'`).
 *
 * @param {*} value
 * @return {string}
 */
export function formatDateTime(value) {
	if (value == null || value === '') return ''
	const d = toDate(value)
	if (!d) return String(value)
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

/**
 * Relative time ("3 days ago") via `Intl.RelativeTimeFormat`.
 * Picks the coarsest unit whose absolute delta exceeds one unit,
 * down to minutes (anything sub-minute clamps to "now"/seconds).
 *
 * @param {*} value
 * @return {string}
 */
export function formatRelativeTime(value) {
	if (value == null || value === '') return ''
	const d = toDate(value)
	if (!d) return String(value)
	const diffMs = d.getTime() - Date.now()
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
	const units = [
		['year', 31536000000],
		['month', 2592000000],
		['week', 604800000],
		['day', 86400000],
		['hour', 3600000],
		['minute', 60000],
	]
	for (const [unit, ms] of units) {
		if (Math.abs(diffMs) >= ms || unit === 'minute') {
			return rtf.format(Math.round(diffMs / ms), unit)
		}
	}
	return rtf.format(0, 'second')
}

/**
 * Built-in formatter registry merged under any consumer-registered
 * `formatters` in `CnAppRoot`'s `cnFormatters` provide.
 */
export const BUILT_IN_FORMATTERS = {
	date: formatDate,
	datetime: formatDateTime,
	'relative-time': formatRelativeTime,
}
