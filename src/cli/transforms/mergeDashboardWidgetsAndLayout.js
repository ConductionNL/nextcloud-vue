/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * For dashboard pages that carry both `config.widgets[]` and
 * `config.layout[]`, merge them into a uniform top-level `widgets[]` array
 * where each entry is a v2 widgetEntry shape.
 *
 * v1 shape (per page of type "dashboard"):
 *   config.widgets[]  → { id, type, title, ...props }
 *   config.layout[]   → { id, widgetId, gridX, gridY, gridWidth, gridHeight, ... }
 *
 * v2 shape (widgetEntry):
 *   { widgetKey, slot, gridX, gridY, gridWidth, gridHeight, props?, dataSource? }
 *
 * Matching is done by widgetId → id. Unmatched layout entries generate
 * a placeholder widget. Unmatched widget entries (no layout row) receive
 * default grid coordinates (gridX:0, gridY:auto, gridWidth:2, gridHeight:2).
 *
 * The function does NOT mutate the input; it returns a deep-cloned page.
 *
 * @param {object} page A v1 page definition (any type)
 * @return {{ page: object, count: number }} Transformed page and count of merged entries
 */
function mergeDashboardWidgetsAndLayout(page) {
	if (page.type !== 'dashboard') {
		return { page, count: 0 }
	}

	const cfg = page.config || {}
	const legacyWidgets = Array.isArray(cfg.widgets) ? cfg.widgets : []
	const legacyLayout = Array.isArray(cfg.layout) ? cfg.layout : []

	if (legacyWidgets.length === 0 && legacyLayout.length === 0) {
		return { page, count: 0 }
	}

	// Build a map from widgetId → layout entry for O(1) lookup
	const layoutById = {}
	for (const layoutItem of legacyLayout) {
		if (layoutItem && (layoutItem.widgetId || layoutItem.id)) {
			const key = layoutItem.widgetId || layoutItem.id
			layoutById[key] = layoutItem
		}
	}

	const mergedWidgets = []
	let autoRow = 0

	for (const widgetDef of legacyWidgets) {
		if (!widgetDef) continue

		const layoutItem = layoutById[widgetDef.id] || {}

		// Extract grid coordinates from layout entry, fall back to defaults
		const gridX = typeof layoutItem.gridX === 'number' ? layoutItem.gridX : 0
		const gridY = typeof layoutItem.gridY === 'number' ? layoutItem.gridY : autoRow
		const gridWidth = typeof layoutItem.gridWidth === 'number' ? layoutItem.gridWidth : 2
		const gridHeight = typeof layoutItem.gridHeight === 'number' ? layoutItem.gridHeight : 2

		// Collect remaining widgetDef fields as props (excluding id, type, title, dataSource)
		const { id, type, title, dataSource, ...rest } = widgetDef
		const propsEntries = Object.entries(rest).filter(([k]) => !k.startsWith('@resolve:'))
		const resolveEntries = Object.entries(rest).filter(([k]) => k.startsWith('@resolve:'))

		const entry = {
			widgetKey: type || id,
			slot: 'body',
			gridX,
			gridY,
			gridWidth,
			gridHeight,
		}

		if (propsEntries.length > 0 || title) {
			entry.props = { ...(title ? { title } : {}), ...Object.fromEntries(propsEntries) }
		}

		if (dataSource) {
			entry.dataSource = dataSource
		}

		// Carry forward any @resolve: fields on the widget entry itself
		for (const [k, v] of resolveEntries) {
			entry[k] = v
		}

		// Carry forward showTitle from layout item as a prop
		if (typeof layoutItem.showTitle === 'boolean') {
			entry.props = { ...(entry.props || {}), showTitle: layoutItem.showTitle }
		}

		mergedWidgets.push(entry)
		if (typeof layoutItem.gridY !== 'number') {
			autoRow += gridHeight
		}
	}

	// Build the updated config without config.widgets and config.layout
	const { widgets: _w, layout: _l, ...restConfig } = cfg

	const updatedPage = {
		...page,
		widgets: [...(page.widgets || []), ...mergedWidgets],
		config: restConfig,
	}

	return { page: updatedPage, count: mergedWidgets.length }
}

module.exports = { mergeDashboardWidgetsAndLayout }
