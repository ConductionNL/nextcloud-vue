/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * boardDate: the two short time readings the drawn boards put in a table cell.
 *
 * - A date ("5 okt", "30 okt", "14 feb 2024"): day and short month in the
 *   user's language, the year only when it is not the current year.
 * - An age ("4 uur", "1 dag", "3 dagen"): how long something has been
 *   waiting, in hours under a day and in whole calendar days after that.
 *
 * Both read the Nextcloud user LANGUAGE for the month and unit names. A
 * Nextcloud account keeps its locale (date order) apart from its language,
 * and a Dutch reader whose locale was left at the en_US default saw
 * "Feb 14, 2024": the language decides the words, so it decides here, and the
 * locale is only used when it is a region of that same language.
 *
 * @module utils/boardDate
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md
 */

import { getCanonicalLocale, getLanguage, translatePlural as n } from '@nextcloud/l10n'
import { parseDateValue } from './dateVariant.js'
import { compareVisibleWhen } from './visibleWhen.js'

const MS_PER_HOUR = 3600000
const MS_PER_DAY = 86400000

/** Variants an age rule may name. `danger` is accepted as an alias of `error`. */
export const AGE_VARIANTS = Object.freeze(['default', 'success', 'warning', 'error'])

/**
 * Read a language or locale tag from an @nextcloud/l10n getter, which throws
 * when Nextcloud has not set one (outside a Nextcloud page, in a test).
 *
 * @param {() => string} getter `getLanguage` or `getCanonicalLocale`.
 * @return {string} The tag with `-` separators, or ''.
 */
function readTag(getter) {
	try {
		return String(getter() || '').replace(/_/g, '-')
	} catch {
		return ''
	}
}

/**
 * The BCP 47 tag the board dates are written in: the user's locale when it is
 * a region of the user's language (`nl-BE` for language `nl`), else the
 * language itself.
 *
 * @return {string|undefined} The tag, or undefined to let Intl choose.
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-board-date-cell-reads-day-and-short-month-in-the-user-language
 */
export function boardDateLocale() {
	const language = readTag(getLanguage)
	const locale = readTag(getCanonicalLocale)
	const base = (tag) => tag.split('-')[0].toLowerCase()
	if (language && locale && base(language) === base(locale)) {
		return locale
	}
	return language || locale || undefined
}

/**
 * A date in the board's short form: "5 okt", or "14 feb 2024" outside the
 * current year.
 *
 * @param {unknown} value A Date, a timestamp or an ISO string.
 * @param {Date} [now] The reference moment (defaults to the current time).
 * @param {string} [locale] BCP 47 tag (defaults to `boardDateLocale()`).
 * @return {string} The short date, or '' when the value is not a date.
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-board-date-cell-reads-day-and-short-month-in-the-user-language
 */
export function formatBoardDate(value, now = new Date(), locale = boardDateLocale()) {
	const date = parseDateValue(value)
	if (date === null) {
		return ''
	}
	const options = { day: 'numeric', month: 'short' }
	if (date.getFullYear() !== now.getFullYear()) {
		options.year = 'numeric'
	}
	try {
		return new Intl.DateTimeFormat(locale, options).format(date)
	} catch {
		return new Intl.DateTimeFormat(undefined, options).format(date)
	}
}

/**
 * Whole calendar days from the date until `now` (0 today, 1 yesterday), or
 * null when the value is not a date. A future date gives a negative number.
 *
 * @param {unknown} value The date.
 * @param {Date} [now] The reference moment.
 * @return {number|null} The day count.
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-says-how-long-something-has-waited
 */
export function ageInDays(value, now = new Date()) {
	const date = parseDateValue(value)
	if (date === null) {
		return null
	}
	// UTC midnights of the two LOCAL days, so a daylight-saving hour never
	// turns one day into zero or two.
	const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
	return Math.round((today - start) / MS_PER_DAY)
}

/**
 * How long something has waited: "4 uur" under 24 hours (at least 1), else
 * "1 dag" / "3 dagen" in whole calendar days. Plural forms come from the
 * library's own catalogue (`nextcloud-vue`). A date in the future reads as
 * waiting no time: "0 hours".
 *
 * @param {unknown} value The moment the wait started.
 * @param {Date} [now] The reference moment.
 * @return {string} The age, or '' when the value is not a date.
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-says-how-long-something-has-waited
 */
export function formatAge(value, now = new Date()) {
	const date = parseDateValue(value)
	if (date === null) {
		return ''
	}
	const elapsed = now.getTime() - date.getTime()
	if (elapsed < MS_PER_DAY) {
		const hours = elapsed <= 0 ? 0 : Math.max(1, Math.floor(elapsed / MS_PER_HOUR))
		return n('nextcloud-vue', '%n hour', '%n hours', hours)
	}
	const days = shownAgeDays(date, now)
	return n('nextcloud-vue', '%n day', '%n days', days)
}

/**
 * The number of days an age cell shows: 0 under 24 hours (the cell then reads
 * hours), else the whole calendar days, at least 1. The threshold rules
 * compare against this number, so the colour always agrees with the text.
 *
 * @param {unknown} value The moment the wait started.
 * @param {Date} [now] The reference moment.
 * @return {number|null} The day count, or null when the value is not a date.
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-turns-red-past-its-threshold
 */
export function shownAgeDays(value, now = new Date()) {
	const date = parseDateValue(value)
	if (date === null) {
		return null
	}
	if (now.getTime() - date.getTime() < MS_PER_DAY) {
		return 0
	}
	return Math.max(1, ageInDays(date, now))
}

/**
 * The variant of the first `variantWhen` rule the age in days matches, or ''
 * when none does. Same rule shape as the `date` widget (`{ op, value,
 * variant }`, first match wins), compared against the number of days the cell
 * shows (`shownAgeDays`): `[{ op: "gte", value: 3, variant: "error" }]` turns a wait of three
 * days or more red.
 *
 * @param {unknown} value The moment the wait started.
 * @param {Array<{op: string, value: number, variant: string}>} rules The rules.
 * @param {Date} [now] The reference moment.
 * @return {string} `success | warning | error | default`, or ''.
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-turns-red-past-its-threshold
 */
export function resolveAgeVariant(value, rules, now = new Date()) {
	if (!Array.isArray(rules) || rules.length === 0) {
		return ''
	}
	const days = shownAgeDays(value, now)
	if (days === null) {
		return ''
	}
	for (const rule of rules) {
		if (!rule || typeof rule !== 'object') {
			continue
		}
		if (compareVisibleWhen(days, rule.op || 'eq', rule.value) === true) {
			const variant = rule.variant === 'danger' ? 'error' : rule.variant
			return AGE_VARIANTS.includes(variant) ? variant : ''
		}
	}
	return ''
}
