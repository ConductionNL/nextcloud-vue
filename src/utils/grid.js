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
