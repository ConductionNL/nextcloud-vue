/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The text of one range filter on the Active line ("1 tot en met 31 oktober")
 * and of several values of one filter ("actief en verlopend").
 *
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-is-one-chip
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:$|T)/

/**
 * The two ends of a range value, or null when the value is not a range.
 *
 * @param {unknown} value A filter value: `{from, to}`, `{gte, lte}` or `{gt, lt}`.
 * @return {{from: unknown, to: unknown}|null} The ends, an open end as null.
 */
export function rangeEnds(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}
	const pick = (...keys) => {
		for (const key of keys) {
			if (value[key] !== undefined && value[key] !== null && value[key] !== '') {
				return value[key]
			}
		}
		return null
	}
	const from = pick('from', 'gte', 'gt')
	const to = pick('to', 'lte', 'lt')
	return from === null && to === null ? null : { from, to }
}

/**
 * A date-only string as a local date, or null when the value is not one.
 *
 * @param {unknown} value The value.
 * @return {Date|null} The date.
 */
function asDate(value) {
	if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
		return null
	}
	const [y, m, d] = value.slice(0, 10).split('-').map(Number)
	const date = new Date(y, m - 1, d)
	return Number.isNaN(date.getTime()) ? null : date
}

/**
 * One end written in the locale.
 *
 * @param {Date} date The date.
 * @param {string|undefined} locale BCP 47 locale.
 * @param {object} options `Intl.DateTimeFormat` options.
 * @return {string} The text.
 */
function formatEnd(date, locale, options) {
	try {
		return new Intl.DateTimeFormat(locale, options).format(date)
	} catch {
		return date.toISOString().slice(0, 10)
	}
}

/**
 * The chip text for a range: "{from} through {to}", "from {from}" or "up to {to}".
 * Date ends get day and month in the locale; the month is written once when
 * both ends share month and year, the year only when an end is not in the
 * current one. Other values are written as they are.
 *
 * @param {unknown} from The lower end, or null.
 * @param {unknown} to The upper end, or null.
 * @param {object} options Options.
 * @param {(text: string, vars: object) => string} options.translate Translate with placeholders.
 * @param {string} [options.locale] BCP 47 locale; the environment's when omitted.
 * @param {Date} [options.now] What counts as now, for the current year.
 * @return {string} The text.
 */
export function rangeChipText(from, to, { translate, locale, now = new Date() }) {
	const fromDate = asDate(from)
	const toDate = asDate(to)
	const year = now.getFullYear()
	const withYear = (fromDate && fromDate.getFullYear() !== year) || (toDate && toDate.getFullYear() !== year)
	const full = withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }
	const sameMonth = fromDate && toDate
		&& fromDate.getFullYear() === toDate.getFullYear()
		&& fromDate.getMonth() === toDate.getMonth()

	const fromText = fromDate
		? formatEnd(fromDate, locale, sameMonth ? { day: 'numeric' } : full)
		: (from === null || from === undefined ? null : String(from))
	const toText = toDate
		? formatEnd(toDate, locale, full)
		: (to === null || to === undefined ? null : String(to))

	if (fromText !== null && toText !== null) {
		return translate('{from} through {to}', { from: fromText, to: toText })
	}
	if (fromText !== null) {
		return translate('from {from}', { from: fromText })
	}
	return translate('up to {to}', { to: toText })
}

/**
 * Several value names as one list in the locale: "actief en verlopend",
 * "a, b en c". Joined with ", " where `Intl.ListFormat` is missing.
 *
 * @param {string[]} names The value names.
 * @param {string} [locale] BCP 47 locale; the environment's when omitted.
 * @return {string} The text.
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-several-values-read-as-a-list
 */
export function listText(names, locale) {
	if (names.length < 2 || typeof Intl.ListFormat !== 'function') {
		return names.join(', ')
	}
	try {
		return new Intl.ListFormat(locale, { type: 'conjunction' }).format(names)
	} catch {
		return names.join(', ')
	}
}

const TODAY_TOKEN = /^@today(?:([+-])(\d+)d)?$/

/**
 * A range end as a local date at midnight: a date string or an `@today`
 * token, read against `now`. Null for anything else.
 *
 * @param {unknown} value The end.
 * @param {Date} now What counts as now.
 * @return {Date|null} The date.
 */
function endDay(value, now) {
	if (typeof value === 'string') {
		const token = TODAY_TOKEN.exec(value)
		if (token) {
			const shift = token[1] ? Number(token[2]) * (token[1] === '-' ? -1 : 1) : 0
			return new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift)
		}
	}
	return asDate(value)
}

/**
 * Whole days from one local date to another.
 *
 * @param {Date} a The first date.
 * @param {Date} b The second date.
 * @return {number} The days from `a` to `b`.
 */
function daysBetween(a, b) {
	return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000)
}

/**
 * A range from today named in words: "today", "within {n} days" or "this
 * week" (Monday to Sunday, or to next Monday). Null for any other range, so
 * the caller writes it as dates.
 *
 * @param {unknown} from The lower end: a date or an `@today` token.
 * @param {unknown} to The upper end: a date or an `@today` token.
 * @param {object} options Options.
 * @param {(text: string) => string} options.translate Translate.
 * @param {(one: string, many: string, count: number) => string} options.translatePlural Translate with a count.
 * @param {Date} [options.now] What counts as now.
 * @return {string|null} The words, or null.
 * @spec openspec/changes/index-filter-labels/specs/active-filter-line-board-look/spec.md#requirement-a-range-from-today-is-named-in-words
 */
export function relativeRangeText(from, to, { translate, translatePlural, now = new Date() }) {
	const start = endDay(from, now)
	const end = endDay(to, now)
	if (!start || !end) {
		return null
	}
	const fromToday = daysBetween(now, start)
	const span = daysBetween(start, end)
	if (fromToday === 0 && (span === 0 || span === 1)) {
		return translate('today')
	}
	if (fromToday === 0 && span > 1) {
		return translatePlural('within %n day', 'within %n days', span)
	}
	const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
	if (daysBetween(monday, start) === 0 && (span === 6 || span === 7)) {
		return translate('this week')
	}
	return null
}
