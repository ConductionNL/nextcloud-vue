// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { fillTemplate, joinTemplateParts } from './fillTemplate.js'
import { readPath } from './readPath.js'

/**
 * The text of one plain `{path}` token: an enum field reads as its label
 * (`x-enum-labels` / `enumLabels` on the schema property, through the
 * translate function), anything else as the stored value.
 *
 * @param {object} object The record.
 * @param {string} path The dotted path.
 * @param {object|null} schema The record's schema.
 * @param {(text: string) => string} translate The translate function.
 * @return {string} The text, or '' when the field is empty.
 */
function plainTokenText(object, path, schema, translate) {
	const value = readPath(object, path)
	if (value === null || value === undefined || value === '' || typeof value === 'object') {
		return ''
	}
	const property = schema && schema.properties && !path.includes('.') ? schema.properties[path] : null
	const labels = property && (property.enumLabels || property['x-enum-labels'])
	if (labels && typeof labels === 'object' && typeof labels[String(value)] === 'string') {
		return translate(labels[String(value)])
	}
	return String(value)
}

/**
 * Fill a header meta template such as `"via {channel}"` or
 * `"{amount|currency:EUR} · {cashier|user} · {at|longdate} {at|time}"` from
 * a record.
 *
 * Every `{path}` token (a dotted path into the record) is replaced by its
 * value, an enum field by its label. `{path|format}` tokens format as a
 * record-list row does (the shared `fillTemplate`: date, datetime, weekday,
 * longdate, time, user, currency, relative, relativetime, days). A token
 * without a value drops itself and the separator before it, so a missing
 * cashier leaves "€ 96,41 · 7 oktober"; a line whose every token is empty
 * is '' ("via " is worse than nothing). A template without tokens is
 * returned as written.
 *
 * @param {string} template The template, already translated.
 * @param {object|null} object The record.
 * @param {Date|{now?: Date, schema?: object, translate?: Function, config?: object}} [options] The reference moment, or options: `schema` for enum labels, `translate` for those labels, `config` for the reporting currency.
 * @return {string} The line, or '' when nothing can be filled.
 * @spec openspec/changes/screens-header-meta-tokens/specs/detail-page-board-look/spec.md#requirement-the-header-meta-line-formats-users-long-dates-and-enum-labels
 */
export function resolveHeaderMeta(template, object, options = {}) {
	const settings = options instanceof Date ? { now: options } : (options || {})
	const now = settings.now || new Date()
	const translate = typeof settings.translate === 'function' ? settings.translate : (text) => text
	if (typeof template !== 'string' || template.trim() === '') {
		return ''
	}
	if (!/\{[^}]+\}/.test(template)) {
		return template.trim()
	}
	if (!object || typeof object !== 'object') {
		return ''
	}
	let filled = 0
	const line = joinTemplateParts(template, (token) => {
		const text = token.includes('|')
			? fillTemplate(`{${token}}`, object, now, settings.config ? { config: settings.config } : null)
			: plainTokenText(object, token, settings.schema || null, translate)
		if (text !== '') {
			filled += 1
		}
		return text
	})
	return filled === 0 ? '' : line.trim()
}

/**
 * Whether a widget definition is the record's activity (the History tab or
 * card): an audit-trail or timeline widget, or the `activity` integration.
 *
 * @param {object|null} widget The widget definition.
 * @return {boolean} True for an activity widget.
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-history-is-the-last-tab
 */
export function isActivityWidget(widget) {
	if (!widget || typeof widget !== 'object') {
		return false
	}
	if (widget.type === 'audit-trail' || widget.type === 'timeline') {
		return true
	}
	return widget.type === 'integration' && widget.integrationId === 'activity'
}
