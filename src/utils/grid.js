/**
 * Shared responsive grid engine.
 *
 * Single source of truth for the library's 12-column CSS-grid layout,
 * used by both `CnWidgetGrid` (v2 manifest slots) and `CnDetailPage`
 * (explicit grid mode + the schema-driven auto-body). Pair the style
 * object returned by {@link cnGridCellStyle} with the `.cn-grid` /
 * `.cn-grid__item` classes in `src/css/grid.css`, which collapse the grid
 * responsively (12 → 6 → 1) by reading the CSS custom properties this
 * helper emits.
 *
 * @module utils/grid
 */

/** Default number of columns in the full (desktop) grid. */
export const GRID_COLUMNS = 12

/** Column count the grid collapses to at the medium breakpoint. */
export const GRID_COLUMNS_MD = 6

/**
 * Build the inline style for one grid item.
 *
 * Emits CSS custom properties (rather than a fixed `grid-column` /
 * `grid-row`) so the responsive rules in `grid.css` can re-place the item
 * at each breakpoint without per-item media queries: at ≤900px the item
 * spans `min(span, 6)` and auto-flows; at ≤600px it spans the single
 * column. The explicit `grid-row` is only emitted (via `--cn-grid-rs`)
 * when the item declares a height, and is reset to `auto` below 900px.
 *
 * @param {object} item                Layout/widget entry.
 * @param {number} [item.gridX]        Zero-based column index (start).
 * @param {number} [item.gridWidth]    Column span (defaults to full width).
 * @param {number} [item.gridY]        Zero-based row index (start).
 * @param {number} [item.gridHeight]   Row span. Only applied with `gridY`.
 * @param {number} [columns]           Full-grid column count (default 12).
 * @return {object} Vue inline-style object of CSS custom properties.
 */
export function cnGridCellStyle(item = {}, columns = GRID_COLUMNS) {
	const span = item.gridWidth || columns
	const style = {
		'--cn-grid-cs': (item.gridX || 0) + 1,
		'--cn-grid-cspan': span,
		'--cn-grid-cspan-md': Math.min(span, GRID_COLUMNS_MD),
	}

	if (item.gridY !== undefined && item.gridHeight) {
		style['--cn-grid-rs'] = item.gridY + 1
		style['--cn-grid-rspan'] = item.gridHeight
	}

	return style
}

/**
 * Whether an item carries an explicit row placement — used by templates
 * to add the `cn-grid__item--row` modifier so the row vars take effect.
 *
 * @param {object} item Layout/widget entry.
 * @return {boolean}
 */
export function hasGridRow(item = {}) {
	return item.gridY !== undefined && Boolean(item.gridHeight)
}

/**
 * Collapse fully-empty grid rows by shifting every widget up past the empty
 * bands above it. A "row" is a horizontal cell band (`gridY`); a row is empty
 * only when NO widget covers any of its columns. This preserves each widget's
 * column (`gridX`) and any intentional horizontal gaps within a row — it only
 * removes whole empty rows (the dead vertical space left when a widget is
 * removed or moved out of a row). Leading empty rows at the top are removed
 * too, so the grid always starts at row 0.
 *
 * @param {Array<{gridY?: number, gridHeight?: number}>} layout The layout placements.
 * @return {{layout: Array, changed: boolean}} The compacted layout and whether anything moved.
 */
export function compactEmptyRows(layout) {
	if (!Array.isArray(layout) || layout.length === 0) {
		return { layout, changed: false }
	}
	const maxRow = layout.reduce((m, i) => Math.max(m, (i.gridY || 0) + (i.gridHeight || 1)), 0)
	// Mark every row that any widget occupies.
	const occupied = new Array(maxRow).fill(false)
	for (const i of layout) {
		const y = i.gridY || 0
		const h = i.gridHeight || 1
		for (let r = y; r < y + h && r < maxRow; r++) occupied[r] = true
	}
	// emptyAbove[r] = number of empty rows strictly above row r.
	const emptyAbove = new Array(maxRow + 1).fill(0)
	let count = 0
	for (let r = 0; r <= maxRow; r++) {
		emptyAbove[r] = count
		if (r < maxRow && !occupied[r]) count++
	}
	let changed = false
	const out = layout.map((i) => {
		const y = i.gridY || 0
		const ny = y - emptyAbove[y]
		if (ny !== y) changed = true
		return ny === y ? i : { ...i, gridY: ny }
	})
	return { layout: out, changed }
}
