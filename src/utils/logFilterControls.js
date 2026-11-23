/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The filter controls a logs page declares (`config.filterControls`), kept in
 * the address so a filtered view is a link:
 *
 * - `select`: `{ key, label, type: "select", options: [{ label, filter }] }`;
 *   the chosen option's index is `_f_<key>` in the query, its `filter` map
 *   is merged into the fetch;
 * - `reference`: `{ key, label, type: "reference", optionsFrom: { register,
 *   schema, labelKey, valueKey } }`; the chosen value is `<key>=<value>`;
 * - `dateRange`: `{ key, label, type: "dateRange", range: { defaultDays } }`;
 *   `<key>[gte]` and `<key>[lte]` (ISO 8601).
 *
 * `<key>=` and `<key>[gte|lte]=` query entries reach the fetch as filters on
 * their own (resolveQueryFilters); only a select needs its option resolved.
 *
 * @module utils/logFilterControls
 * @spec openspec/changes/logs-page-filter-controls/specs/logs-page-filter-controls/spec.md
 */

const TYPES = ['select', 'reference', 'dateRange']

/**
 * The usable controls: a known type and a key.
 *
 * @param {unknown} controls The declared `filterControls`.
 * @return {Array<object>} The controls.
 */
export function normaliseFilterControls(controls) {
	return (Array.isArray(controls) ? controls : [])
		.filter((c) => c && typeof c.key === 'string' && c.key !== '' && TYPES.includes(c.type))
}

/**
 * The query key that holds a select's chosen option.
 *
 * @param {string} key The control key.
 * @return {string} The query key.
 */
export function selectQueryKey(key) {
	return `_f_${key}`
}

/**
 * The filters the chosen select options add to the fetch.
 *
 * @param {Array<object>} controls The controls.
 * @param {object} query The route query.
 * @return {object} The merged option filters.
 * @spec openspec/changes/logs-page-filter-controls/specs/logs-page-filter-controls/spec.md#requirement-a-logs-page-draws-the-filter-controls-it-declares
 */
export function selectFilters(controls, query) {
	const out = {}
	for (const control of normaliseFilterControls(controls)) {
		if (control.type !== 'select') {
			continue
		}
		const option = chosenOption(control, query)
		if (option && option.filter && typeof option.filter === 'object') {
			Object.assign(out, option.filter)
		}
	}
	return out
}

/**
 * The option a select's query entry names, or null.
 *
 * @param {object} control The select control.
 * @param {object} query The route query.
 * @return {object|null} The option.
 */
export function chosenOption(control, query) {
	const raw = query ? query[selectQueryKey(control.key)] : undefined
	const index = Number.parseInt(String(raw ?? ''), 10)
	const options = Array.isArray(control.options) ? control.options : []
	return Number.isInteger(index) && index >= 0 && index < options.length ? options[index] : null
}

/**
 * The query after one control changed: the control's own entries replaced,
 * every other entry kept.
 *
 * @param {object} query The current query.
 * @param {object} control The control.
 * @param {unknown} value A select's option index, a reference value, or a date range `{ from, to }`; null clears.
 * @return {object} The next query.
 * @spec openspec/changes/logs-page-filter-controls/specs/logs-page-filter-controls/spec.md#requirement-a-filtered-log-view-is-a-link
 */
export function queryWithControl(query, control, value) {
	const next = { ...(query || {}) }
	if (control.type === 'select') {
		delete next[selectQueryKey(control.key)]
		if (Number.isInteger(value) && value >= 0) {
			next[selectQueryKey(control.key)] = String(value)
		}
	} else if (control.type === 'reference') {
		delete next[control.key]
		if (value !== null && value !== undefined && value !== '') {
			next[control.key] = String(value)
		}
	} else {
		delete next[`${control.key}[gte]`]
		delete next[`${control.key}[lte]`]
		if (value && value.from) {
			next[`${control.key}[gte]`] = value.from
		}
		if (value && value.to) {
			next[`${control.key}[lte]`] = value.to
		}
	}
	return next
}

/**
 * The query a page opens with: every date range with `range.defaultDays`
 * and no range in the address gets the last N days.
 *
 * @param {object} query The route query.
 * @param {Array<object>} controls The controls.
 * @param {Date} [now] What counts as now.
 * @return {object|null} The query with defaults, or null when nothing was added.
 */
export function queryWithDefaults(query, controls, now = new Date()) {
	let next = null
	for (const control of normaliseFilterControls(controls)) {
		const days = Number(control.range && control.range.defaultDays)
		if (control.type !== 'dateRange' || !Number.isFinite(days) || days <= 0) {
			continue
		}
		if ((query && (query[`${control.key}[gte]`] || query[`${control.key}[lte]`]))) {
			continue
		}
		const from = new Date(now.getTime())
		from.setUTCDate(from.getUTCDate() - days)
		next = queryWithControl(next || query, control, { from: from.toISOString(), to: now.toISOString() })
	}
	return next
}
