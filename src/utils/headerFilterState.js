/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Column-head filter state for a table widget that fetches its own rows
 * (CnWidgetObjectTable, CnObjectListWidget): the map CnDataTable's
 * `column-filter` event updates, and the request params it becomes.
 *
 * @module utils/headerFilterState
 */

import { facetFilterParams } from './facets.js'

/**
 * The active-filter map after one `column-filter` event: every key the event
 * names takes its values, and a key with no values is dropped.
 *
 * @param {object} active The current map (`{ paramKey: values[] }`).
 * @param {{params?: object}} payload CnDataTable's `column-filter` payload.
 * @return {object} A new map.
 * @spec openspec/changes/table-widget-header-controls/specs/table-widget-header-controls/spec.md
 */
export function nextHeaderFilters(active, payload) {
	const next = { ...(active || {}) }
	const params = (payload && payload.params && typeof payload.params === 'object') ? payload.params : {}
	for (const [key, values] of Object.entries(params)) {
		if (Array.isArray(values) && values.length > 0) {
			next[key] = values
		} else {
			delete next[key]
		}
	}
	return next
}

/**
 * The request params an active-filter map becomes, as the index page sends
 * them: one value as a scalar, several as a list.
 *
 * @param {object} active The active-filter map.
 * @return {object} The params.
 * @spec openspec/changes/table-widget-header-controls/specs/table-widget-header-controls/spec.md
 */
export function headerFilterParams(active) {
	const params = {}
	for (const [key, values] of Object.entries(active || {})) {
		Object.assign(params, facetFilterParams(key, values))
	}
	return params
}

/**
 * The columns with `sortable` filled in from a widget-wide option: `true`
 * makes every column sortable, an array the listed keys. A column that says
 * `sortable` itself keeps it.
 *
 * @param {Array} columns The columns.
 * @param {boolean|Array<string>} sortable The option.
 * @return {Array} The columns.
 */
export function withSortableColumns(columns, sortable) {
	if (sortable !== true && !Array.isArray(sortable)) {
		return columns
	}
	return (columns || []).map((col) => {
		if (!col || typeof col !== 'object' || col.sortable !== undefined) {
			return col
		}
		return { ...col, sortable: sortable === true || sortable.includes(col.key) }
	})
}
