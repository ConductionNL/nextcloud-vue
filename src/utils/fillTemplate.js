// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { boardDateLocale, formatBoardDate } from './boardDate.js'
import { parseDateValue } from './dateVariant.js'
import { readPath } from './readPath.js'

const TOKEN = /\{([^{}\s|]+)(?:\|([a-z]+))?\}/g

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
 * @param {string} format `date`, `datetime` or '' (as is).
 * @param {Date} now The reference moment.
 * @return {string} The text, '' when nothing can be shown.
 */
function formatValue(value, format, now) {
	if (value === null || value === undefined || value === '' || typeof value === 'object') {
		return ''
	}
	if (format === 'date') {
		return formatBoardDate(value, now)
	}
	if (format === 'datetime') {
		return formatBoardDateTime(value, now)
	}
	return String(value)
}

/**
 * Fill a row template such as `"{identifier} · {caseTypeName}"` or
 * `"Termijn {deadline|date}"` from an object.
 *
 * Every `{path}` token is a dot path into the object; `{path|date}` and
 * `{path|datetime}` format it as the boards write dates. A token without a
 * value empties the WHOLE template, because "Termijn " is worse than nothing.
 * A template without tokens is returned as written (a constant label).
 *
 * @param {string} template The template, already translated.
 * @param {object|null} object The object to read.
 * @param {Date} [now] The reference moment for dates.
 * @return {string} The filled text, or ''.
 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record
 */
export function fillTemplate(template, object, now = new Date()) {
	if (typeof template !== 'string' || template.trim() === '') {
		return ''
	}
	let missing = false
	const text = template.replace(TOKEN, (_match, path, format) => {
		const value = object && typeof object === 'object' ? readPath(object, path) : undefined
		const shown = formatValue(value, format || '', now)
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
 * @return {string} The first filled text, or ''.
 * @spec openspec/changes/screens-relation-pages/specs/relation-pages/spec.md#requirement-a-record-list-shows-the-objects-that-point-at-this-record
 */
export function firstFilled(templates, object, translate = (key) => key, now = new Date()) {
	const list = Array.isArray(templates) ? templates : [templates]
	for (const template of list) {
		if (typeof template !== 'string') {
			continue
		}
		const text = fillTemplate(translate(template), object, now)
		if (text !== '') {
			return text
		}
	}
	return ''
}
