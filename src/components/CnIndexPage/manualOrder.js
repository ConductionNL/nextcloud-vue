/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row order a person chose, held against the person and the list.
 *
 * The order is a list of row ids, and that is the whole design. Writing a
 * position onto the records themselves would look simpler for about a day:
 * two people ordering one shared list would then fight over every record,
 * and every export of those records would carry a field that means nothing
 * outside this one screen. So the order lives beside the records, never on
 * them, and this module never touches a record at all.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module components/CnIndexPage/manualOrder
 */

import { rowIdOf } from './splitView.js'

/**
 * The preference key a list's manual order is held under.
 *
 * The list id is part of the key rather than the value, so one list's order
 * can never be read as another's, and a list that is retired takes its
 * order with it instead of leaving a row in a shared blob.
 *
 * @param {string} listId Stable id of the list. The manifest page id.
 * @return {string} The preference key.
 */
export function manualOrderKey(listId) {
	return `cn_manual_order_${String(listId || 'default').replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/**
 * Put the rows in the person's order.
 *
 * Rows the order does not name keep their loaded order and follow the ones
 * it does. That is what makes the order survive a new record arriving: the
 * newcomer appears at the end rather than the list refusing to show it.
 *
 * @param {Array<object>} rows The rows as loaded.
 * @param {Array<string>} order The row ids, in the person's order.
 * @param {string} [rowKey] The configured key field.
 * @return {Array<object>} The rows, reordered. The same array when the order names none of them.
 */
export function applyManualOrder(rows, order, rowKey = 'id') {
	const list = Array.isArray(rows) ? rows : []
	const ids = Array.isArray(order) ? order : []
	if (list.length === 0 || ids.length === 0) {
		return list
	}

	const rank = new Map()
	ids.forEach((id, index) => {
		if (!rank.has(String(id))) {
			rank.set(String(id), index)
		}
	})

	const known = []
	const rest = []
	for (const row of list) {
		const id = rowIdOf(row, rowKey)
		if (id !== null && rank.has(id)) {
			known.push(row)
		} else {
			rest.push(row)
		}
	}
	if (known.length === 0) {
		return list
	}

	known.sort((a, b) => rank.get(rowIdOf(a, rowKey)) - rank.get(rowIdOf(b, rowKey)))
	return [...known, ...rest]
}

/**
 * Move one row up or down in the order.
 *
 * Works on the ids the list currently shows, not on the stored order, so a
 * move means what the person saw: "put this row one above the row that is
 * one above it". Moving past either end is a no-op rather than a wrap,
 * because a row that jumps from the top to the bottom reads as a bug.
 *
 * This is the keyboard half of the drag. Both halves call it, so they can
 * never disagree about what a move means.
 *
 * @param {Array<string>} visibleIds The row ids in the order now on screen.
 * @param {string} id The row being moved.
 * @param {number} delta -1 for up, 1 for down.
 * @return {Array<string>} The new order. The same array when nothing moved.
 */
export function moveInOrder(visibleIds, id, delta) {
	const ids = Array.isArray(visibleIds) ? visibleIds.map(String) : []
	const from = ids.indexOf(String(id))
	const step = Number(delta)
	if (from === -1 || !Number.isFinite(step) || step === 0) {
		return ids
	}
	const to = from + (step > 0 ? 1 : -1)
	if (to < 0 || to >= ids.length) {
		return ids
	}
	const next = [...ids]
	next.splice(to, 0, next.splice(from, 1)[0])
	return next
}

/**
 * The order after a row was dropped on another row's position.
 *
 * @param {Array<string>} visibleIds The row ids in the order now on screen.
 * @param {string} id The row being dragged.
 * @param {number} toIndex The index it was dropped at.
 * @return {Array<string>} The new order. The same array when nothing moved.
 */
export function dropInOrder(visibleIds, id, toIndex) {
	const ids = Array.isArray(visibleIds) ? visibleIds.map(String) : []
	const from = ids.indexOf(String(id))
	const to = Number(toIndex)
	if (from === -1 || !Number.isInteger(to) || to < 0 || to >= ids.length || to === from) {
		return ids
	}
	const next = [...ids]
	next.splice(to, 0, next.splice(from, 1)[0])
	return next
}

/**
 * The ids of the rows on screen, in the order they are on screen.
 *
 * @param {Array<object>} rows The rows.
 * @param {string} [rowKey] The configured key field.
 * @return {Array<string>} The ids, with unidentifiable rows dropped.
 */
export function visibleIdsOf(rows, rowKey = 'id') {
	return (Array.isArray(rows) ? rows : [])
		.map((row) => rowIdOf(row, rowKey))
		.filter((id) => id !== null)
}
