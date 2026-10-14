/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * detailWidgetVisibility: whether a widget on a detail page shows for the
 * loaded record, through the shared `visibleWhen` grammar.
 *
 * A detail page can name records it reads beside the loaded one
 * (`visibilityContext`, e.g. a case's case type). A condition reads such a
 * record as `@context.<name>.<path>`, so a widget can be shown for some case types
 * only while the configuration stays in the app manifest.
 *
 * @module utils/detailWidgetVisibility
 */

import { cnFetchJson } from './cnFetch.js'
import { evaluateVisibleWhenLocal, isLocallyDecidableVisibleWhen, isWorkspaceCondition } from './visibleWhen.js'

/**
 * Read a reference value as an id: a plain string or number, or an object
 * carrying `id`, `uuid` or `@self.id` (an extended reference).
 *
 * @param {unknown} value The value of the reference field.
 * @return {string} The id, or '' when there is none.
 */
function referenceId(value) {
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value)
	}
	if (value && typeof value === 'object') {
		const id = value.id ?? value.uuid ?? (value['@self'] && value['@self'].id)
		return id === undefined || id === null ? '' : String(id)
	}
	return ''
}

/**
 * The records a `visibilityContext` names for one loaded record.
 *
 * @param {object} context `{ <name>: { field, register, schema } }`.
 * @param {object|null} record The loaded record.
 * @return {Array<{key: string, register: string, schema: string, id: string}>} One entry per usable name; `id` is '' when the record holds no reference.
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-page-can-load-records-a-condition-names
 */
export function visibilityContextRefs(context, record) {
	if (!context || typeof context !== 'object' || !record || typeof record !== 'object') {
		return []
	}
	return Object.entries(context)
		.filter(([name, ref]) => name !== '' && ref && typeof ref === 'object'
			&& typeof ref.field === 'string' && ref.field !== ''
			&& typeof ref.register === 'string' && ref.register !== ''
			&& typeof ref.schema === 'string' && ref.schema !== '')
		.map(([name, ref]) => ({
			key: name,
			register: ref.register,
			schema: ref.schema,
			id: referenceId(ref.field.split('.').reduce((obj, part) => (obj === null || obj === undefined ? obj : obj[part]), record)),
		}))
}

/**
 * Read the records `refs` names. A reference without an id, and a read that
 * fails, resolve `null`: the record is absent, and a condition on it fails
 * safe rather than throwing out of the page.
 *
 * @param {Array<{key: string, register: string, schema: string, id: string}>} refs From {@link visibilityContextRefs}.
 * @param {Map<string, object|null>} [cache] Rows already read, by `register/schema/id`.
 * @return {Promise<object>} `{ <name>: row | null }`.
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-page-can-load-records-a-condition-names
 */
export async function fetchVisibilityRows(refs, cache) {
	const rows = {}
	await Promise.all((refs || []).map(async (ref) => {
		if (!ref.id) {
			rows[ref.key] = null
			return
		}
		const cacheKey = `${ref.register}/${ref.schema}/${ref.id}`
		if (cache && cache.has(cacheKey)) {
			rows[ref.key] = cache.get(cacheKey)
			return
		}
		let row
		try {
			const body = await cnFetchJson(`/apps/openregister/api/objects/${encodeURIComponent(ref.register)}/${encodeURIComponent(ref.schema)}/${encodeURIComponent(ref.id)}`)
			row = body && typeof body === 'object' ? body : null
		} catch {
			row = null
		}
		if (cache) {
			cache.set(cacheKey, row)
		}
		rows[ref.key] = row
	}))
	return rows
}

/**
 * The data a widget condition reads: the record, with the named records
 * beside it under `@context.<name>`. Null while the record has not loaded.
 *
 * @param {object|null} record The loaded record.
 * @param {object} [rows] `{ <name>: row | null }`.
 * @return {object|null} The condition data.
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-grid-widget-shows-only-while-its-visiblewhen-holds-for-the-record
 */
export function widgetConditionData(record, rows) {
	if (!record || typeof record !== 'object') {
		return null
	}
	return { ...record, '@context': { ...(rows || {}) } }
}

/**
 * Whether a widget's own `visibleWhen` lets it show on a detail page.
 *
 * No condition: shown, as before. A workspace condition: shown, a detail page
 * has no workspace. While the data is not there (`data` null, or `pending`):
 * hidden, so the widget never shows and then vanishes. A local condition is
 * decided here; an endpoint or source condition takes its answer from
 * `answers` (by widget id) and is hidden until it has one.
 *
 * @param {object|null} widget The widget definition.
 * @param {object|null} data From {@link widgetConditionData}.
 * @param {{pending?: boolean, answers?: object}} [state] Whether named records are still on their way, and the remote answers.
 * @return {boolean} Whether the widget shows.
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md#requirement-a-detail-grid-widget-shows-only-while-its-visiblewhen-holds-for-the-record
 */
export function detailWidgetVisible(widget, data, state = {}) {
	const cond = widget && typeof widget === 'object' ? widget.visibleWhen : null
	if (cond === null || cond === undefined) {
		return true
	}
	if (typeof cond === 'object' && !Array.isArray(cond) && isWorkspaceCondition(cond)) {
		return true
	}
	if (!data || state.pending === true) {
		return false
	}
	if (isLocallyDecidableVisibleWhen(cond)) {
		return evaluateVisibleWhenLocal(cond, data)
	}
	return Boolean(state.answers && state.answers[widget.id] === true)
}
