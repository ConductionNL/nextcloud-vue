/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Dashboard grid placement + responsive helpers for CnDashboardGrid.
 *
 * Pure, framework-agnostic logic shared by every app that renders an editable
 * dashboard: where does a newly-added widget go (collision scan + push-down
 * fallback), and how does the grid reflow across screen sizes. Layout items use
 * the same `gridX`/`gridY`/`gridWidth`/`gridHeight` field names as
 * `CnDashboardGrid`'s `layout` prop.
 */

/**
 * Default new-widget width in grid columns when the caller omits `spec.w`.
 *
 * @type {number}
 */
export const DEFAULT_WIDGET_W = 4

/**
 * Default new-widget height in grid rows when the caller omits `spec.h`.
 *
 * @type {number}
 */
export const DEFAULT_WIDGET_H = 4

/**
 * Default column count assumed when `options.columns` is not supplied.
 *
 * @type {number}
 */
export const DEFAULT_GRID_COLUMNS = 12

/**
 * Fallback "visible rows on first paint" used when the caller does not pass a
 * measured value. A new widget placed below this row is treated as off-screen
 * and triggers the push-down fallback so it lands in view.
 *
 * @type {number}
 */
export const DEFAULT_VIEWPORT_ROWS = 8

/**
 * Default responsive breakpoint table for {@link getDashboardColumnOpts} —
 * monotonically descending window widths mapped to column counts
 * (1400→12, 1100→8, 768→4, 480→1). Consumers may pass their own.
 *
 * @type {ReadonlyArray<{ w: number, c: number }>}
 */
export const DEFAULT_GRID_BREAKPOINTS = Object.freeze([
	{ w: 1400, c: 12 },
	{ w: 1100, c: 8 },
	{ w: 768, c: 4 },
	{ w: 480, c: 1 },
])

/**
 * Build the GridStack v12 `columnOpts` bag for responsive reflow. Pass the
 * result to `CnDashboardGrid`'s `columnOpts` prop (or spread into
 * `GridStack.init`). Returns a fresh shallow copy so callers may mutate it
 * without affecting {@link DEFAULT_GRID_BREAKPOINTS}.
 *
 * @param {Array<{ w: number, c: number }>} [breakpoints] override breakpoint
 *   table; defaults to {@link DEFAULT_GRID_BREAKPOINTS}.
 * @param {string} [layout] GridStack reflow algorithm; defaults to `'moveScale'`.
 * @return {{ breakpoints: Array<{ w: number, c: number }>, layout: string, breakpointForWindow: boolean }}
 *   the `columnOpts` object.
 */
export function getDashboardColumnOpts(breakpoints = DEFAULT_GRID_BREAKPOINTS, layout = 'moveScale') {
	return {
		breakpoints: breakpoints.map(b => ({ ...b })),
		layout,
		breakpointForWindow: true,
	}
}

/**
 * Pure rectangle-overlap test on integer grid coordinates.
 *
 * @param {{x: number, y: number, w: number, h: number}} a first rectangle.
 * @param {{x: number, y: number, w: number, h: number}} b second rectangle.
 * @return {boolean} true when the two rectangles intersect.
 */
function rectsOverlap(a, b) {
	return (
		a.x < b.x + b.w
		&& b.x < a.x + a.w
		&& a.y < b.y + b.h
		&& b.y < a.y + a.h
	)
}

/**
 * Engine-free emulation of GridStack's `findEmptyPosition` scan: top-left to
 * bottom-right, first non-colliding slot wins.
 *
 * @param {{w: number, h: number}} sz target widget size in cells.
 * @param {Array<{x: number, y: number, w: number, h: number}>} nodes existing widgets.
 * @param {number} columns total grid columns.
 * @param {number} maxScanRows scan ceiling (rows).
 * @return {{x: number, y: number} | null} the slot, or null if none within the ceiling.
 */
function scanForEmptySlot(sz, nodes, columns, maxScanRows) {
	if (sz.w > columns) {
		return null
	}
	for (let y = 0; y < maxScanRows; y++) {
		for (let x = 0; x <= columns - sz.w; x++) {
			const candidate = { x, y, w: sz.w, h: sz.h }
			const collides = nodes.some(n => rectsOverlap(candidate, n))
			if (!collides) {
				return { x, y }
			}
		}
	}
	return null
}

/**
 * Compute the placement coordinates (and any required push-down side effects)
 * for a new widget added to a dashboard.
 *
 * Algorithm:
 *   1. **Primary** — find the first empty slot via the live GridStack engine
 *      (`options.grid`) when supplied, else an engine-free top-left scan.
 *   2. **Fallback** — when no slot is found OR the slot is below
 *      `viewportRows` (off-screen on first paint), place the widget at `(0, 0)`
 *      and shift every overlapping existing widget down to `gridY = h`.
 *
 * @param {object} spec target widget spec; `w`/`h` default to
 *   {@link DEFAULT_WIDGET_W}/{@link DEFAULT_WIDGET_H}.
 * @param {Array<object>} layout current layout items in `gridX`/`gridY`/
 *   `gridWidth`/`gridHeight`/`id` form (CnDashboardGrid's `layout` shape).
 * @param {object} [options] optional knobs.
 * @param {number} [options.columns] column count, defaults to {@link DEFAULT_GRID_COLUMNS}.
 * @param {number} [options.viewportRows] visible rows on first paint, defaults to {@link DEFAULT_VIEWPORT_ROWS}.
 * @param {object} [options.grid] live GridStack instance — when supplied its engine is used directly.
 * @return {{ x: number, y: number, w: number, h: number, pushed: Array<{id: any, gridY: number}> }}
 *   the chosen position + the list of existing items that must shift down.
 */
export function placeNewWidget(spec, layout, options = {}) {
	const w = (spec && Number.isFinite(spec.w) && spec.w > 0) ? spec.w : DEFAULT_WIDGET_W
	const h = (spec && Number.isFinite(spec.h) && spec.h > 0) ? spec.h : DEFAULT_WIDGET_H
	const columns = options.columns || DEFAULT_GRID_COLUMNS
	const viewportRows = options.viewportRows || DEFAULT_VIEWPORT_ROWS

	const safeLayout = Array.isArray(layout) ? layout : []
	const nodes = safeLayout.map(p => ({
		id: p.id,
		x: Number.isFinite(p.gridX) ? p.gridX : 0,
		y: Number.isFinite(p.gridY) ? p.gridY : 0,
		w: Number.isFinite(p.gridWidth) ? p.gridWidth : 1,
		h: Number.isFinite(p.gridHeight) ? p.gridHeight : 1,
	}))

	let primaryHit = null
	if (options.grid && options.grid.engine) {
		const probe = { w, h, _id: '__cn_placement_probe__' }
		const liveNodes = options.grid.engine.nodes.filter(n => n._id !== probe._id)
		const found = options.grid.engine.findEmptyPosition(probe, liveNodes, columns)
		if (found) {
			primaryHit = { x: probe.x, y: probe.y }
		}
	} else {
		primaryHit = scanForEmptySlot({ w, h }, nodes, columns, viewportRows * 4)
	}

	const primaryAcceptable = primaryHit !== null && primaryHit.y < viewportRows
	if (primaryAcceptable) {
		return { x: primaryHit.x, y: primaryHit.y, w, h, pushed: [] }
	}

	const newRect = { x: 0, y: 0, w, h }
	const pushed = []
	for (const node of nodes) {
		if (rectsOverlap(newRect, node)) {
			pushed.push({ id: node.id, gridY: h })
		}
	}

	return { x: 0, y: 0, w, h, pushed }
}
