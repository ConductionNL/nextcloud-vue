/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The split view's decisions, as functions with no DOM and no component.
 *
 * Three things have to be decided every time the route or the viewport
 * changes: which of the three layouts to render, what the pane's width is,
 * and what the list rows look like after a record was saved in the pane.
 * Each is a pure function here so it can be tested without mounting a 4000
 * line page, and so a regression names the decision rather than the render.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module components/CnIndexPage/splitView
 */

/** Viewport width below which a split address renders the full detail page. */
export const DEFAULT_SPLIT_BREAKPOINT = 1024

/** Width of the detail pane when the page declares none. */
export const DEFAULT_SPLIT_PANE_WIDTH = '42%'

/**
 * Which of the three layouts the page is in.
 *
 * `'list'` is the page as it has always been. `'split'` is the list with the
 * pane beside it. `'detail'` is the same address on a narrow screen: the
 * record fills the page and the list steps aside, so a link sent from a
 * laptop opens on a phone rather than rendering a 40 pixel column.
 *
 * The narrow case is deliberately NOT "hide the pane and show the list".
 * That would answer a link to a record with a list, which is the one thing
 * the person who sent the link did not mean.
 *
 * @param {object} options Options.
 * @param {boolean} options.enabled Whether the page declares a split view.
 * @param {string|null} options.splitId The record the address names, if any.
 * @param {number} options.viewportWidth Current viewport width in pixels.
 * @param {number} [options.breakpoint] The declared breakpoint.
 * @return {'list'|'split'|'detail'} The layout to render.
 */
export function splitLayoutFor({ enabled, splitId, viewportWidth, breakpoint } = {}) {
	if (!enabled || !splitId) {
		return 'list'
	}
	const limit = normaliseBreakpoint(breakpoint)
	// An unknown viewport (server render, jsdom before layout) counts as wide.
	// Guessing narrow would collapse every split link into a full page on a
	// machine that simply had not measured yet.
	const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : limit
	return width < limit ? 'detail' : 'split'
}

/**
 * The declared breakpoint, or the default when it is absent or nonsense.
 *
 * @param {number|string|undefined} breakpoint The declared value.
 * @return {number} A usable pixel width.
 */
export function normaliseBreakpoint(breakpoint) {
	const n = Number(breakpoint)
	return Number.isFinite(n) && n >= 320 && n <= 2560 ? n : DEFAULT_SPLIT_BREAKPOINT
}

/**
 * The pane's CSS width.
 *
 * Only a string that looks like a CSS length is accepted. A value that is
 * not one lands in an inline style where the browser drops it in silence,
 * and the pane then takes its fallback width with nothing saying why.
 *
 * @param {string|undefined} paneWidth The declared value.
 * @return {string} A CSS width.
 */
export function normalisePaneWidth(paneWidth) {
	if (typeof paneWidth !== 'string') {
		return DEFAULT_SPLIT_PANE_WIDTH
	}
	return /^\d+(\.\d+)?(px|%|rem|em|vw|ch)$/.test(paneWidth.trim())
		? paneWidth.trim()
		: DEFAULT_SPLIT_PANE_WIDTH
}

/**
 * The key a row is identified by, reading `@self` the way the rest of the
 * library does.
 *
 * @param {object} row A row.
 * @param {string} [rowKey] The configured key field.
 * @return {string|null} The row's id as a string, or null.
 */
export function rowIdOf(row, rowKey = 'id') {
	if (!row || typeof row !== 'object') {
		return null
	}
	const self = row['@self'] || {}
	const id = row[rowKey] ?? row.id ?? self.id ?? self.uuid ?? row.uuid
	return id === undefined || id === null || id === '' ? null : String(id)
}

/**
 * Apply saved records over the rows the list already has.
 *
 * This is what keeps "an edit updates the row" from becoming "an edit
 * refetches the page". A refetch would be correct and would also throw away
 * the scroll position and the loaded page, which is the whole thing the
 * split view was built to keep.
 *
 * A patch for a record the list does not hold is ignored rather than
 * appended: the record may simply belong to another page of the list, and
 * appending it would put a row in a position the sort does not agree with.
 *
 * @param {Array<object>} rows The rows as loaded.
 * @param {object} patches Map of row id to the saved record.
 * @param {string} [rowKey] The configured key field.
 * @return {Array<object>} The rows, with matches replaced in place. The same array when nothing matched.
 */
export function applyRowPatches(rows, patches, rowKey = 'id') {
	const list = Array.isArray(rows) ? rows : []
	const ids = patches ? Object.keys(patches) : []
	if (list.length === 0 || ids.length === 0) {
		return list
	}
	let touched = false
	const next = list.map((row) => {
		const id = rowIdOf(row, rowKey)
		if (id === null || !Object.hasOwn(patches, id)) {
			return row
		}
		touched = true
		return { ...row, ...patches[id] }
	})
	// Returning the SAME array when nothing matched keeps every computed
	// downstream of this from re-evaluating on an unrelated save.
	return touched ? next : list
}
