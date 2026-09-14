/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A date the way this person chose to read it, without hiding the date.
 *
 * Tuleap lets a person pick absolute or relative dates at
 * `/account/dates-display`, and the municipal reason for offering it is also
 * the reason it is dangerous: "3 dagen geleden" against a statutory term is a
 * reading hazard. A handler who has to work out whether a Woo request is on
 * day 25 or day 29 of a 28 day term cannot do that from "3 days ago".
 *
 * So the rule is not "relative or absolute". It is: a relative date ALWAYS
 * carries its absolute date in the accessible name and the tooltip. The exact
 * date is one hover, one focus or one screen reader away, always. That costs
 * nothing and removes the hazard.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module utils/dateDisplay
 */

/** Seconds in each unit, largest first, so the first match is the one to use. */
const UNITS = [
	['year', 31536000],
	['month', 2592000],
	['week', 604800],
	['day', 86400],
	['hour', 3600],
	['minute', 60],
]

/**
 * Render a date the way this person reads dates.
 *
 * Always returns all three: what to show, what the tooltip says, and what a
 * screen reader hears. In absolute mode all three are the same date, which is
 * the point: a caller renders the same three fields either way and cannot
 * accidentally drop the absolute date in relative mode.
 *
 * @param {string|number|Date} value The date.
 * @param {object} [options] Options.
 * @param {'absolute'|'relative'} [options.mode] How this person reads dates.
 * @param {string} [options.locale] BCP 47 locale. Defaults to the browser's.
 * @param {Date|number} [options.now] What counts as now, for tests.
 * @param {object} [options.dateOptions] `Intl.DateTimeFormat` options for the absolute form.
 * @return {{ text: string, title: string, accessibleName: string, iso: string }|null} The three renderings, or null when the value is not a date.
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */
export function formatDateForDisplay(value, options = {}) {
	const date = toDate(value)
	if (!date) {
		return null
	}

	const { mode = 'absolute', locale, now, dateOptions } = options
	const absolute = formatAbsolute(date, locale, dateOptions)

	if (mode !== 'relative') {
		return { text: absolute, title: absolute, accessibleName: absolute, iso: date.toISOString() }
	}

	const relative = formatRelative(date, locale, now)
	return {
		text: relative,
		// The absolute date rides along in BOTH, not one of them. A tooltip
		// alone excludes a screen reader; an accessible name alone excludes a
		// sighted reader who is checking a term against a deadline.
		title: absolute,
		accessibleName: `${relative}, ${absolute}`,
		iso: date.toISOString(),
	}
}

/**
 * The date as a date, or null.
 *
 * @param {string|number|Date} value The value.
 * @return {Date|null} The date.
 */
function toDate(value) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	const date = value instanceof Date ? value : new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

/**
 * The date, spelled out.
 *
 * @param {Date} date The date.
 * @param {string} [locale] BCP 47 locale.
 * @param {object} [dateOptions] `Intl.DateTimeFormat` options.
 * @return {string} The formatted date.
 */
function formatAbsolute(date, locale, dateOptions) {
	try {
		return new Intl.DateTimeFormat(locale, dateOptions || { dateStyle: 'medium', timeStyle: 'short' }).format(date)
	} catch {
		// An unknown locale or an environment without full ICU. An ISO date is
		// unambiguous and readable, which is what matters against a term.
		return date.toISOString().slice(0, 16).replace('T', ' ')
	}
}

/**
 * The date, relative to now.
 *
 * @param {Date} date The date.
 * @param {string} [locale] BCP 47 locale.
 * @param {Date|number} [now] What counts as now.
 * @return {string} The relative form.
 */
function formatRelative(date, locale, now) {
	const reference = now === undefined ? Date.now() : (now instanceof Date ? now.getTime() : now)
	const seconds = Math.round((date.getTime() - reference) / 1000)
	const magnitude = Math.abs(seconds)

	for (const [unit, size] of UNITS) {
		if (magnitude >= size) {
			return relativeFormat(Math.round(seconds / size), unit, locale)
		}
	}
	return relativeFormat(0, 'second', locale)
}

/**
 * `Intl.RelativeTimeFormat`, with a plain fallback.
 *
 * @param {number} amount How many units away.
 * @param {string} unit The unit.
 * @param {string} [locale] BCP 47 locale.
 * @return {string} The relative form.
 */
function relativeFormat(amount, unit, locale) {
	try {
		return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, unit)
	} catch {
		if (amount === 0) {
			return 'now'
		}
		const plural = Math.abs(amount) === 1 ? unit : `${unit}s`
		return amount < 0 ? `${Math.abs(amount)} ${plural} ago` : `in ${amount} ${plural}`
	}
}
