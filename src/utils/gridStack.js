/**
 * Thin GridStack bootstrap shared by the drag/resize grids (CnDashboardGrid and
 * CnWidgetGrid's editable body slot). Keeps the GridStack option shape in one
 * place so the two engines stay consistent.
 *
 * @module utils/gridStack
 */

import { GridStack } from 'gridstack'
// `gridstack` is a peerDependency, not bundled — see the matching comment in
// CnDashboardGrid.vue. The consumer must install `gridstack` themselves and
// import its stylesheet (`gridstack/dist/gridstack.min.css`) from that same
// copy; nc-vue ships no GridStack CSS of its own so the JS driving the grid
// and the CSS sizing it can never come from two different versions.

/**
 * Initialise a GridStack instance on a `.grid-stack` element.
 *
 * @param {HTMLElement} el The `.grid-stack` container element.
 * @param {object} opts Options.
 * @param {number} opts.columns Column count.
 * @param {boolean} opts.editable Whether drag + resize are enabled.
 * @param {number} [opts.cellHeight] Cell height in px (default 80).
 * @param {number} [opts.margin] Grid margin in px (default 12).
 * @return {import('gridstack').GridStack} The GridStack instance.
 */
export function initGridStack(el, opts) {
	const { columns, editable, cellHeight = 80, margin = 12 } = opts
	return GridStack.init({
		column: columns,
		cellHeight,
		margin,
		float: true,
		animate: true,
		disableDrag: !editable,
		disableResize: !editable,
		removable: false,
	}, el)
}

/**
 * Read the geometry GridStack reports for a changed set of items into a plain
 * map keyed by node id.
 *
 * @param {Array<{id: (string|number), x: number, y: number, w: number, h: number}>} items
 *   The items GridStack passes to its `change` handler.
 * @return {Map<string, {gridX: number, gridY: number, gridWidth: number, gridHeight: number}>}
 */
export function readGridGeometry(items) {
	const map = new Map()
	for (const it of items || []) {
		map.set(String(it.id), { gridX: it.x, gridY: it.y, gridWidth: it.w, gridHeight: it.h })
	}
	return map
}
