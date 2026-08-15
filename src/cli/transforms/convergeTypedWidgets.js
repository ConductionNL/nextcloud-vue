/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

/**
 * convergeTypedWidgets — dialect-B → canonical widget convergence.
 *
 * Dialect-B expresses a page's widgets as typed defs `{ id, type, ... }`
 * plus a SEPARATE placement array `config.layout[]` (`{ widgetId, gridX, gridY,
 * gridWidth, gridHeight }`). It appears in two carriers:
 *
 *   - `config.widgets[]` + `config.layout[]`  (detail-page carrier — the shape
 *     zaakafhandelapp / petstore detail pages use today), and
 *   - top-level `widgets:[{ id, type }]` + `config.layout[]` (the shape used in
 *     the convergence spec scenario).
 *
 * The canonical dialect is a single top-level `widgets[]` array of
 * `{ widgetKey, slot, gridX, gridY, gridWidth, gridHeight, props?, dataSource? }`
 * entries with placement inline on the entry and NO parallel `config.layout[]`.
 * (`gridWidth`/`gridHeight` are the actual v2 schema key names; the convergence
 * change's shorthand `gridW`/`gridH` maps onto them.)
 *
 * This transform:
 *   - maps each typed def's `type` → `widgetKey`,
 *   - folds the matching `config.layout[]` entry's grid coordinates onto it,
 *   - defaults `slot` to `"body"` (preserving any explicit slot),
 *   - collects the remaining fields into `props` (keeping `dataSource` and any
 *     `@resolve:` fields at entry level),
 *   - removes the now-empty `config.layout` (and `config.widgets`).
 *
 * Entries that are ALREADY canonical (carry `widgetKey`) are preserved verbatim
 * and their order relative to converted entries is kept (canonical entries that
 * were already top-level come first, then converted defs).
 *
 * Idempotence: a page with no `config.widgets`, no `config.layout`, and no
 * dialect-B top-level entries is returned unchanged (same object reference), so
 * re-running on canonical input is a byte-identical no-op.
 *
 * @param {object} page A v2 page definition (any type)
 * @return {{ page: object, count: number }} Transformed page + count converted
 */
function convergeTypedWidgets(page) {
	if (!page || typeof page !== 'object') {
		return { page, count: 0 }
	}

	const cfg = (page.config && typeof page.config === 'object' && !Array.isArray(page.config))
		? page.config
		: null

	const configWidgets = cfg && Array.isArray(cfg.widgets) ? cfg.widgets : []
	const configLayout = cfg && Array.isArray(cfg.layout) ? cfg.layout : []
	const topWidgets = Array.isArray(page.widgets) ? page.widgets : []

	// A top-level entry is dialect-B when it has a `type` but no `widgetKey`.
	const isDialectB = (w) => w && typeof w === 'object'
		&& typeof w.type === 'string'
		&& (w.widgetKey === undefined || w.widgetKey === null)
	const dialectBTop = topWidgets.filter(isDialectB)

	// Nothing to converge → byte-identical no-op (idempotence guarantee).
	if (configWidgets.length === 0 && configLayout.length === 0 && dialectBTop.length === 0) {
		return { page, count: 0 }
	}

	// Build widgetId → layout entry map. Layout entries reference their widget
	// via `widgetId` (real apps), `i` (grid-layout convention) or `id`.
	const layoutById = {}
	for (const item of configLayout) {
		if (!item || typeof item !== 'object') continue
		const key = item.widgetId ?? item.i ?? item.id
		if (key !== undefined && key !== null) layoutById[key] = item
	}

	const canonicalTop = topWidgets.filter((w) => !isDialectB(w))
	const typedDefs = [...configWidgets, ...dialectBTop]

	let autoRow = 0
	const converted = typedDefs.map((def) => convertDef(def, layoutById, () => {
		const row = autoRow
		return row
	}, (h) => { autoRow += h }))

	const mergedWidgets = [...canonicalTop, ...converted]

	// Strip config.widgets and config.layout from config.
	let updatedConfig = cfg
	if (cfg) {
		const { widgets: _w, layout: _l, ...restConfig } = cfg
		updatedConfig = restConfig
	}

	const updatedPage = { ...page, widgets: mergedWidgets }
	if (cfg) {
		updatedPage.config = updatedConfig
	}

	return { page: updatedPage, count: converted.length }
}

/**
 * Convert a single dialect-B typed def to a canonical widget entry.
 *
 * @param {object} def Typed widget def `{ id, type, ... }`
 * @param {object} layoutById widgetId → layout entry map
 * @param {Function} nextRow Returns the current auto-placement row
 * @param {Function} advanceRow Advances the auto-placement row by a height
 * @return {object} Canonical widget entry
 */
function convertDef(def, layoutById, nextRow, advanceRow) {
	const layout = (def && def.id !== undefined && layoutById[def.id]) || {}

	const grid = readGrid(layout)
	const gridX = grid.gridX ?? 0
	const gridY = grid.gridY ?? nextRow()
	const gridWidth = grid.gridWidth ?? 2
	const gridHeight = grid.gridHeight ?? 2

	const {
		id: _id, type, widgetKey, slot, title, dataSource,
		gridX: _gx, gridY: _gy, gridWidth: _gw, gridHeight: _gh,
		...rest
	} = def

	const resolveEntries = Object.entries(rest).filter(([k]) => k.startsWith('@resolve:'))
	const propEntries = Object.entries(rest).filter(([k]) => !k.startsWith('@resolve:'))

	const entry = {
		widgetKey: widgetKey || type || _id,
		slot: slot || 'body',
		gridX,
		gridY,
		gridWidth,
		gridHeight,
	}

	const props = {}
	if (title) props.title = title
	for (const [k, v] of propEntries) props[k] = v
	// showTitle from the layout entry is a per-widget presentation flag.
	if (typeof layout.showTitle === 'boolean') props.showTitle = layout.showTitle
	if (Object.keys(props).length > 0) entry.props = props

	if (dataSource !== undefined) entry.dataSource = dataSource
	for (const [k, v] of resolveEntries) entry[k] = v

	// Advance the auto-placement cursor only when the layout gave no explicit y.
	if (grid.gridY === undefined) advanceRow(gridHeight)

	return entry
}

/**
 * Read grid coordinates from a layout entry, accepting both the canonical
 * `gridX/gridY/gridWidth/gridHeight` keys and the terse `x/y/w/h` variant.
 *
 * @param {object} layout Layout entry
 * @return {{gridX?:number, gridY?:number, gridWidth?:number, gridHeight?:number}}
 */
function readGrid(layout) {
	const num = (v) => (typeof v === 'number' ? v : undefined)
	return {
		gridX: num(layout.gridX) ?? num(layout.x),
		gridY: num(layout.gridY) ?? num(layout.y),
		gridWidth: num(layout.gridWidth) ?? num(layout.w),
		gridHeight: num(layout.gridHeight) ?? num(layout.h),
	}
}

module.exports = { convergeTypedWidgets }
