// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { translate as t } from '@nextcloud/l10n'
import { boardDateLocale, formatAgo, formatBoardDate, formatBoardWeekday, formatRelativeDate, formatTimeOfDay, isoWeek } from './boardDate.js'
import { parseDateValue } from './dateVariant.js'
import { formatMoney } from './formatMetric.js'
import { readPath } from './readPath.js'
import { userDisplayName } from './userDisplayName.js'

const TOKEN = /\{([^{}\s|]+)(?:\|([A-Za-z]+)(?::([^{}\s]+))?)?\}/g

/**
 * A moment in the board's short form with the time: "4 okt, 10:52", or
 * "14 feb 2024, 09:00" outside the current year.
 *
 * @param {unknown} value A Date, a timestamp or an ISO string.
 * @param {Date} [now] The reference moment.
 * @return {string} The text, or '' when the value is not a date.
 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record
 */
export function formatBoardDateTime(value, now = new Date()) {
	const day = formatBoardDate(value, now)
	const date = parseDateValue(value)
	if (day === '' || date === null) {
		return ''
	}
	let time
	try {
		time = new Intl.DateTimeFormat(boardDateLocale(), { hour: '2-digit', minute: '2-digit' }).format(date)
	} catch {
		time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
	}
	return `${day}, ${time}`
}

/**
 * A date with the month written out: "7 oktober", or "6 oktober 2026"
 * outside the current year or when `withYear` asks for it.
 *
 * @param {unknown} value A Date, a timestamp or an ISO string.
 * @param {Date} now The reference moment.
 * @param {boolean} [withYear] Always write the year.
 * @return {string} The text, or '' when the value is not a date.
 * @spec openspec/changes/screens-header-meta-tokens/specs/detail-page-board-look/spec.md#requirement-the-header-meta-line-formats-users-long-dates-and-enum-labels
 */
export function formatLongDate(value, now = new Date(), withYear = false) {
	const date = parseDateValue(value)
	if (date === null) {
		return ''
	}
	const options = { day: 'numeric', month: 'long' }
	if (withYear || date.getFullYear() !== now.getFullYear()) {
		options.year = 'numeric'
	}
	try {
		return new Intl.DateTimeFormat(boardDateLocale(), options).format(date)
	} catch {
		return new Intl.DateTimeFormat(undefined, options).format(date)
	}
}

/**
 * Format one token value.
 *
 * @param {unknown} value The raw value.
 * @param {string} format `date`, `datetime`, `weekday`, `longdate`, `time`, `user`, `currency`, `relative`, `relativetime`, `ago`, `week`, `days`, `lower`, `mailbox` or '' (as is).
 * @param {Date} now The reference moment.
 * @param {string} [arg] The format's argument (`currency:EUR`, or a row path holding the code).
 * @param {object|null} [object] The row, for a currency read from a field.
 * @param {object|null} [config] The app config map, for the reporting currency.
 * @param {object|null} [formatters] The app's named formatters (`cnFormatters`), for any other format name.
 * @return {string} The text, '' when nothing can be shown.
 * @spec openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-a-map-list-reads-display-names-through-the-apps-formatters
 */
function formatValue(value, format, now, arg = '', object = null, config = null, formatters = null) {
	// `{list|count}`: how many entries a list holds, nothing for an empty one.
	if (format === 'count') {
		const count = Array.isArray(value) ? value.length : Number(value)
		return Number.isFinite(count) && count > 0 ? String(count) : ''
	}
	if (value === null || value === undefined || value === '' || typeof value === 'object') {
		return ''
	}
	if (format !== '' && formatters && typeof formatters[format] === 'function') {
		const shown = formatters[format](value, object)
		return shown === null || shown === undefined ? '' : String(shown)
	}
	if (format === 'date') {
		return formatBoardDate(value, now)
	}
	if (format === 'datetime') {
		return formatBoardDateTime(value, now)
	}
	if (format === 'weekday') {
		return formatBoardWeekday(value, now, { today: arg === 'today' })
	}
	if (format === 'week') {
		const date = parseDateValue(value)
		return date === null ? '' : t('nextcloud-vue', 'Week {week}', { week: isoWeek(date) })
	}
	if (format === 'longdate') {
		return formatLongDate(value, now, arg === 'year')
	}
	if (format === 'user') {
		return userDisplayName(value)
	}
	if (format === 'time') {
		const date = parseDateValue(value)
		return date === null ? '' : formatTimeOfDay(date)
	}
	if (format === 'currency') {
		// `{amount|currency:EUR}` names the code, `{amount|currency:price.code}`
		// reads it from the row, `{amount|currency}` is the app's reporting
		// currency (EUR without one).
		const isCode = /^[A-Za-z]{3}$/.test(arg)
		return formatMoney(value, { currency: isCode ? arg : undefined, currencyField: !isCode && arg ? arg : undefined }, object, config)
	}
	if (format === 'relative') {
		return formatRelativeDate(value, { now })
	}
	if (format === 'relativetime') {
		return formatRelativeDate(value, { now, withTime: true })
	}
	if (format === 'ago') {
		return formatAgo(value, now)
	}
	if (format === 'mailbox') {
		// An address up to and with its @ ("gemeente@" from gemeente@zuiddrecht.nl).
		const text = String(value)
		const at = text.indexOf('@')
		return at > 0 ? text.slice(0, at + 1) : text
	}
	if (format === 'lower') {
		return String(value).toLocaleLowerCase()
	}
	if (format === 'days') {
		// Whole days from the date to now (0 for today; negative for a future date).
		const date = parseDateValue(value)
		return date === null ? '' : String(Math.floor((now.getTime() - date.getTime()) / 86400000))
	}
	return String(value)
}

/**
 * Fill a row template such as `"{identifier} · {caseTypeName}"` or
 * `"Termijn {deadline|date}"` from an object.
 *
 * Every `{path}` token is a dot path into the object; `{path|date}` and
 * `{path|datetime}` format it as the boards write dates, `{path|weekday}` adds
 * the short weekday ("wo 7 okt"; `{path|weekday:today}` reads "Vandaag, wo 7 okt"
 * for today), `{path|longdate}` writes the month out ("7 oktober";
 * `{path|longdate:year}` always adds the year), `{path|time}` is the time
 * of day ("08:45"), `{path|user}` is a user id's display name (looked up
 * once, '' until it arrives), `{path|currency}`,
 * `{path|currency:EUR}` and `{path|currency:field}` write an amount in a
 * currency (a code, or the row field that holds it; without either, or when
 * the row field is empty, the app's reporting currency), `{path|relative}` and
 * `{path|relativetime}` say "today", "yesterday" and then the short date
 * ("vandaag, 09.42"), `{path|ago}` says how long ago it was ("10 min
 * geleden", "vanochtend", "vrijdag"), and `{path|days}` is the
 * whole days since that date ("has waited {createdAt|days} days"),
 * `{path|count}` is how many entries a list holds (nothing for an empty one),
 * `{path|lower}` writes the value in lower case ("Step 2: {statusLabel|lower}"
 * reads "Step 2: in progress" mid-sentence), and any other name is one of
 * the app's formatters, passed as `context.formatters` (`{id|caseAddress}`).
 * A token without a
 * value empties the WHOLE template, because "Termijn " is worse than nothing.
 * A template without tokens is returned as written (a constant label).
 *
 * @param {string} template The template, already translated.
 * @param {object|null} object The object to read.
 * @param {Date} [now] The reference moment for dates.
 * @param {{config?: object, formatters?: object}|null} [context] The app config map, for the reporting currency of a money token, and the app's named formatters.
 * @return {string} The filled text, or ''.
 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record
 */
export function fillTemplate(template, object, now = new Date(), context = null) {
	if (typeof template !== 'string' || template.trim() === '') {
		return ''
	}
	let missing = false
	const text = template.replace(TOKEN, (_match, path, format, arg) => {
		const value = object && typeof object === 'object' ? readPath(object, path) : undefined
		const shown = formatValue(value, format || '', now, arg || '', object, context && context.config ? context.config : null, context && context.formatters ? context.formatters : null)
		if (shown === '') {
			missing = true
		}
		return shown
	})
	return missing ? '' : text.trim()
}

/**
 * The first of several templates that fills: `["Klaar {closedAt|date}",
 * "Termijn {deadline|date}"]` reads "Klaar ..." once the case is closed and
 * "Termijn ..." while it is open. A single string is one candidate.
 *
 * @param {string|string[]} templates The candidates, in order.
 * @param {object|null} object The object to read.
 * @param {(key: string) => string} [translate] Applied to each template before filling.
 * @param {Date} [now] The reference moment for dates.
 * @param {{config?: object}|null} [context] Passed on to `fillTemplate`.
 * @return {string} The first filled text, or ''.
 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record
 */
export function firstFilled(templates, object, translate = (key) => key, now = new Date(), context = null) {
	const list = Array.isArray(templates) ? templates : [templates]
	for (const template of list) {
		if (typeof template !== 'string') {
			continue
		}
		const text = fillTemplate(translate(template), object, now, context)
		if (text !== '') {
			return text
		}
	}
	return ''
}

/**
 * Fill a template such as `"{identifier} · {requester}"` field by field
 * (a table column's `secondary` line, a detail page's meta line).
 *
 * A field without a value takes its separator with it: the text between two
 * fields belongs to the field after it, so an empty requester leaves
 * "2026-0002", not "2026-0002 ·", and an empty first field does not leave a
 * leading separator either. Text before the first field and after the last
 * one is kept as written. A template whose fields all have values fills
 * exactly as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-empty-field-takes-its-separator-with-it
 * @param {string} template The template, with `{field}` placeholders.
 * @param {(key: string) => string} valueOf The text of a field ('' when empty).
 * @return {string} The filled template.
 */
export function joinTemplateParts(template, valueOf) {
	// split() with a capture group alternates literal, field, literal, …
	const parts = template.split(/\{([^}]+)\}/)
	const lead = parts[0]
	const tail = parts[parts.length - 1]
	let body = ''
	for (let i = 1; i < parts.length; i += 2) {
		const value = valueOf(parts[i].trim())
		if (value === '') {
			continue
		}
		// The literal before this field: the separator, unless nothing has
		// been written yet (then there is nothing to separate from).
		const separator = i === 1 ? '' : parts[i - 1]
		body += (body === '' ? '' : separator) + value
	}
	return lead + body + tail
}
