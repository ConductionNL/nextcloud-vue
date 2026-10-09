// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { readPath } from './readPath.js'

const TOKEN = /\{([^{}\s]+)\}/g

/**
 * Fill a header meta template such as `"via {channel}"` from a record.
 *
 * Every `{path}` token (a dotted path into the record) is replaced by its
 * value. A token with no value drops the WHOLE line, because "via " is worse
 * than nothing. A template without tokens is returned as written.
 *
 * @param {string} template The template, already translated.
 * @param {object|null} object The record.
 * @return {string} The line, or '' when it cannot be filled.
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-detail-header-is-two-rows-on-the-ground
 */
export function resolveHeaderMeta(template, object) {
	if (typeof template !== 'string' || template.trim() === '') {
		return ''
	}
	let missing = false
	const line = template.replace(TOKEN, (_match, path) => {
		const value = object && typeof object === 'object' ? readPath(object, path) : undefined
		if (value === null || value === undefined || value === '' || typeof value === 'object') {
			missing = true
			return ''
		}
		return String(value)
	})
	return missing ? '' : line.trim()
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
