// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { boardDateLocale, formatBoardDate, formatRelativeDate } from './boardDate.js'
import { parseDateValue } from './dateVariant.js'
import { formatMoney } from './formatMetric.js'
import { readPath } from './readPath.js'

const TOKEN = /\{([^{}\s|]+)(?:\|([a-z]+)(?::([^{}\s]+))?)?\}/g

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
 * Format one token value.
 *
 * @param {unknown} value The raw value.
 * @param {string} format `date`, `datetime`, `relative`, `relativetime`, `days` or '' (as is).
 * @param {Date} now The reference moment.
 * @param {string} [arg] The format's argument (`currency:EUR`, or a row path holding the code).
 * @param {object|null} [object] The row, for a currency read from a field.
 * @param {object|null} [config] The app config map, for the reporting currency.
 * @return {string} The text, '' when nothing can be shown.
 */
function formatValue(value, format, now, arg = '', object = null, config = null) {
	if (value === null || value === undefined || value === '' || typeof value === 'object') {
		return ''
	}
	if (format === 'date') {
		return formatBoardDate(value, now)
	}
	if (format === 'datetime') {
		return formatBoardDateTime(value, now)
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
 * `{path|datetime}` format it as the boards write dates, `{path|currency}`,
 * `{path|currency:EUR}` and `{path|currency:field}` write an amount in a
 * currency (a code, or the row field that holds it; without either, or when
 * the row field is empty, the app's reporting currency), `{path|relative}` and
 * `{path|relativetime}` say "today", "yesterday" and then the short date
 * ("vandaag, 09.42"), and `{path|days}` is the
 * whole days since that date ("has waited {createdAt|days} days"). A token without a
 * value empties the WHOLE template, because "Termijn " is worse than nothing.
 * A template without tokens is returned as written (a constant label).
 *
 * @param {string} template The template, already translated.
 * @param {object|null} object The object to read.
 * @param {Date} [now] The reference moment for dates.
 * @param {{config?: object}|null} [context] The app config map, for the reporting currency of a money token.
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
		const shown = formatValue(value, format || '', now, arg || '', object, context && context.config ? context.config : null)
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
