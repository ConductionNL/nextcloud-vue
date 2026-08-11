import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { safeCurrencyCode } from './formatMetric.js'

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
 * A formatter is invoked as `fn(value, row, property, options)` — `options`
 * is the column's declarative `formatterOptions` map (undefined when the
 * column declares none), so config-driven formatters (`currency`,
 * `conditionalPhrase`) work without one registry function per configuration.
 * The fourth argument is additive: pre-existing three-argument formatters
 * are unaffected.
 *
 * Every built-in MUST be safe against null / empty / non-parseable
 * inputs — the contract is "return the original value (or empty
 * string) rather than throw".
 */

/**
 * Parse a value that's meant to be a date — accepts a `Date` instance,
 * an ISO/parseable string, or a numeric timestamp.
 *
 * @param {Date|string|number|null|undefined} value The candidate date value.
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
 * @param {*} value A `Date`, parseable date string, or timestamp.
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
 * @param {*} value A `Date`, parseable date string, or timestamp.
 * @return {string} Formatted date + time, or `''` for null/empty, or `String(value)` for unparseable.
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
 * @param {*} value A `Date`, parseable date string, or timestamp.
 * @return {string} Relative phrasing, or `''` for null/empty, or `String(value)` for unparseable.
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
 * Whole-day difference between a date value and today, comparing
 * date-only (both clamped to local midnight) so a due date later today
 * still counts as "today", not "in 0.4 days".
 *
 * @param {Date} d The parsed date.
 * @return {number} Signed day count: positive = future, negative = past, 0 = today.
 */
function dayDiffFromToday(d) {
	const target = new Date(d)
	target.setHours(0, 0, 0, 0)
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/**
 * Future-oriented deadline formatter (`daysUntil` registry key), i18n'd
 * through the library's own translation slug (`nextcloud-vue`):
 * a future date renders "N days remaining", today renders "Due today",
 * and a past date renders "N days overdue". Day counts are plural-aware
 * via `translatePlural`.
 *
 * Null-safe per the built-in-formatter contract: `''` for null/empty,
 * `String(value)` for unparseable input — never throws.
 *
 * @param {*} value A `Date`, parseable date string, or timestamp.
 * @return {string} The relative-day phrasing (or ''/original on bad input).
 */
export function formatDaysUntil(value) {
	if (value == null || value === '') return ''
	const d = toDate(value)
	if (!d) return String(value)
	const days = dayDiffFromToday(d)
	if (days === 0) return t('nextcloud-vue', 'Due today')
	if (days > 0) {
		return n('nextcloud-vue', '{count} day remaining', '{count} days remaining', days, { count: days })
	}
	const overdue = Math.abs(days)
	return n('nextcloud-vue', '{count} day overdue', '{count} days overdue', overdue, { count: overdue })
}

/**
 * Elapsed-time formatter (`daysSince` registry key), i18n'd through the
 * library's own translation slug (`nextcloud-vue`): a past date renders
 * "N days ago", today renders "Today", and a (nonsensical but harmless)
 * future date renders "In N days". Day counts are plural-aware via
 * `translatePlural`.
 *
 * Null-safe per the built-in-formatter contract: `''` for null/empty,
 * `String(value)` for unparseable input — never throws.
 *
 * @param {*} value A `Date`, parseable date string, or timestamp.
 * @return {string} The relative-day phrasing (or ''/original on bad input).
 */
export function formatDaysSince(value) {
	if (value == null || value === '') return ''
	const d = toDate(value)
	if (!d) return String(value)
	const days = dayDiffFromToday(d)
	if (days === 0) return t('nextcloud-vue', 'Today')
	if (days < 0) {
		const ago = Math.abs(days)
		return n('nextcloud-vue', '{count} day ago', '{count} days ago', ago, { count: ago })
	}
	return n('nextcloud-vue', 'In {count} day', 'In {count} days', days, { count: days })
}

/**
 * Currency formatter (`currency` registry key) via `Intl.NumberFormat`.
 * Defaults to EUR; the column's `formatterOptions` may set `currency`
 * (ISO-4217 code, guarded by `safeCurrencyCode` so an invalid code can
 * never throw a `RangeError`) and `decimals` (default 2).
 *
 * Null-safe per the built-in-formatter contract: `''` for null/empty,
 * `String(value)` for non-numeric input — never throws.
 *
 * @param {*} value A numeric value (or numeric string).
 * @param {object} [_row] The full row (unused).
 * @param {object} [_property] The schema property (unused).
 * @param {{currency?: string, decimals?: number}} [options] The column's `formatterOptions`.
 * @return {string} The locale currency string (or ''/original on bad input).
 */
export function formatCurrency(value, _row, _property, options) {
	if (value == null || value === '') return ''
	const num = Number(value)
	if (!Number.isFinite(num)) return String(value)
	const opts = options || {}
	const decimals = Number.isFinite(opts.decimals) ? opts.decimals : 2
	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: safeCurrencyCode(opts.currency),
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(num)
}

/**
 * Sign/zero-based phrase selector (`conditionalPhrase` registry key) —
 * generalizes `daysUntil` to ANY numeric field: the column's
 * `formatterOptions` supply pre-translated `{ negative, zero, positive }`
 * phrases and the matching one renders with `{n}` replaced by the ABSOLUTE
 * value (so "{n} days overdue" reads naturally for -3). Phrases are
 * consumer-provided strings — apps translate them before declaring the
 * column, keeping i18n in the app layer.
 *
 * Null-safe per the built-in-formatter contract: `''` for null/empty,
 * `String(value)` for non-numeric input or when the selected phrase is
 * missing — never throws.
 *
 * @param {*} value A numeric value (or numeric string).
 * @param {object} [_row] The full row (unused).
 * @param {object} [_property] The schema property (unused).
 * @param {{negative?: string, zero?: string, positive?: string}} [options] The column's `formatterOptions`.
 * @return {string} The selected phrase with `{n}` substituted (or ''/original on bad input).
 */
export function formatConditionalPhrase(value, _row, _property, options) {
	if (value == null || value === '') return ''
	const num = Number(value)
	if (!Number.isFinite(num)) return String(value)
	const opts = options || {}
	const phrase = num < 0 ? opts.negative : (num > 0 ? opts.positive : opts.zero)
	if (typeof phrase !== 'string' || phrase === '') return String(value)
	return phrase.replace(/\{n\}/g, String(Math.abs(num)))
}

/**
 * Entry-count summariser (`count` registry key) — renders a collection-valued
 * cell as "5 frames" instead of the truncated JSON blob `formatValue` would
 * produce. Counts array entries or object keys; a scalar counts as 1. The
 * column's `formatterOptions` supply pre-translated `{ singular, plural, zero }`
 * phrases with `{n}` substituted, following the `conditionalPhrase` convention
 * of keeping i18n in the app layer. Without phrases it renders the bare count.
 *
 * Null-safe per the built-in-formatter contract: `zero` (or `''`) for
 * null/empty — never throws.
 *
 * @param {*} value An array, object, or scalar.
 * @param {object} [_row] The full row (unused).
 * @param {object} [_property] The schema property (unused).
 * @param {{singular?: string, plural?: string, zero?: string}} [options] The column's `formatterOptions`.
 * @return {string} The selected phrase with `{n}` substituted, or the bare count.
 */
export function formatCount(value, _row, _property, options) {
	const opts = options || {}
	const zero = typeof opts.zero === 'string' ? opts.zero : ''
	if (value == null || value === '') return zero
	let n
	if (Array.isArray(value)) n = value.length
	else if (typeof value === 'object') n = Object.keys(value).length
	else n = 1
	if (n === 0) return zero
	const phrase = n === 1 ? (opts.singular ?? opts.plural) : (opts.plural ?? opts.singular)
	if (typeof phrase !== 'string' || phrase === '') return String(n)
	return phrase.replace(/\{n\}/g, String(n))
}

/**
 * Built-in formatter registry merged under any consumer-registered
 * `formatters` in `CnAppRoot`'s `cnFormatters` provide.
 */
export const BUILT_IN_FORMATTERS = {
	date: formatDate,
	datetime: formatDateTime,
	'relative-time': formatRelativeTime,
	daysSince: formatDaysSince,
	daysUntil: formatDaysUntil,
	currency: formatCurrency,
	conditionalPhrase: formatConditionalPhrase,
	count: formatCount,
}
