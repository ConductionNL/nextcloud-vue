// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { reactive } from 'vue'
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The key under which a detail page provides its row selection: the rows a
 * list widget shows and the one the reader selected, per widget id.
 */
export const WIDGET_SELECTION = 'cnWidgetSelection'

/**
 * The key under which CnDetailWidgetHost provides the id of the widget it
 * hosts, so a list widget can publish its rows under that id.
 */
export const HOST_WIDGET_ID = 'cnHostWidgetId'

/**
 * A page's row selection.
 *
 * @return {{entry: function(string): {rows: object[], selected: (object|null)}, publishRows: function(string, object[]): void, select: function(string, (object|null)): void}}
 *   The store.
 * @spec openspec/changes/side-card-follows-row/specs/side-card-follows-row/spec.md#requirement-a-list-publishes-its-rows-and-its-selected-row
 */
export function createWidgetSelection() {
	const state = reactive({})
	const idOf = (row) => (row && typeof row === 'object' ? String(row.id ?? row['@self']?.id ?? '') : '')

	return {
		entry(widgetId) {
			return state[widgetId] || { rows: [], selected: null }
		},
		publishRows(widgetId, rows) {
			const list = Array.isArray(rows) ? rows : []
			const previous = state[widgetId]?.selected || null
			const kept = previous && list.find((row) => idOf(row) !== '' && idOf(row) === idOf(previous))
			state[widgetId] = { rows: list, selected: kept || null }
		},
		select(widgetId, row) {
			const current = state[widgetId] || { rows: [], selected: null }
			state[widgetId] = { rows: current.rows, selected: row || null }
		},
	}
}

/**
 * The row a following card shows: the selected row when it matches `when`,
 * else, while nothing is selected, the first row that matches. A selected row
 * that does not match shows nothing, so the card never describes a row the
 * reader did not pick.
 *
 * @param {{rows: object[], selected: (object|null)}|null} entry The followed widget's selection.
 * @param {{when?: object}} follows The card's `follows` declaration.
 * @return {object|null} The row, or null.
 * @spec openspec/changes/side-card-follows-row/specs/side-card-follows-row/spec.md#requirement-a-card-follows-the-selected-row
 */
export function followedRow(entry, follows) {
	if (!entry || !Array.isArray(entry.rows)) {
		return null
	}
	const when = follows && follows.when
	const matches = (row) => !when || evaluateVisibleWhenLocal(when, row)
	if (entry.selected) {
		return matches(entry.selected) ? entry.selected : null
	}
	return entry.rows.find(matches) || null
}
