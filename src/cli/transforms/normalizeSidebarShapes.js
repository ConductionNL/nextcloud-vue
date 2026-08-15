/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

/**
 * normalizeSidebarShapes — sidebar dialect convergence.
 *
 * Three legacy sidebar shapes exist across the fleet:
 *   - `config.sidebarProps.tabs[]`
 *   - `config.sidebarTabs[]`
 *   - `config.sidebar` (object) with a `tabs[]` array
 *
 * The canonical shape is top-level `widgets[]` entries with `slot: "sidebar"`
 * and an optional `tabGroup` naming the tab the widget belongs to.
 *
 * A tab that declares `widgets[]` is lifted: each widget becomes a top-level
 * entry `{ widgetKey, slot:"sidebar", tabGroup:<tab.id>, gridX:0, gridY:<n>,
 * gridWidth:1, gridHeight:1, props?, dataSource? }` (the v2 schema pins sidebar
 * `gridWidth` to 1). The source array retains only the tabs that could NOT be
 * lifted.
 *
 * A tab that declares only a `component` (no `widgets`) CANNOT be expressed in
 * the canonical widget vocabulary — it is retained verbatim in its source array
 * and reported for manual review (never dropped).
 *
 * Idempotence: a page with none of the three legacy sidebar shapes is returned
 * by reference (byte-identical no-op). A page whose only sidebar tabs are
 * component-only is likewise returned by reference (nothing is liftable) plus a
 * list of flagged tab ids.
 *
 * @param {object} page A v2 page definition
 * @return {{ page: object, count: number, unconverted: string[] }}
 */
function normalizeSidebarShapes(page) {
	if (!page || typeof page !== 'object') {
		return { page, count: 0, unconverted: [] }
	}
	const cfg = (page.config && typeof page.config === 'object' && !Array.isArray(page.config))
		? page.config
		: null
	if (!cfg) return { page, count: 0, unconverted: [] }

	const hasSidebarProps = cfg.sidebarProps && typeof cfg.sidebarProps === 'object' && Array.isArray(cfg.sidebarProps.tabs)
	const hasSidebarTabs = Array.isArray(cfg.sidebarTabs)
	const hasSidebarObjTabs = cfg.sidebar && typeof cfg.sidebar === 'object' && !Array.isArray(cfg.sidebar) && Array.isArray(cfg.sidebar.tabs)

	if (!hasSidebarProps && !hasSidebarTabs && !hasSidebarObjTabs) {
		return { page, count: 0, unconverted: [] }
	}

	const lifted = []
	const unconverted = []
	let rowOffset = 0
	const nextCfg = { ...cfg }

	// Lift widget-bearing tabs from one source array; return the residual
	// (component-only) tabs.
	const processTabs = (tabs) => {
		const residual = []
		for (const tab of Array.isArray(tabs) ? tabs : []) {
			if (!tab || typeof tab !== 'object') continue
			const tabWidgets = Array.isArray(tab.widgets) ? tab.widgets : []
			const componentOnly = tabWidgets.length === 0
				&& typeof tab.component === 'string' && tab.component.length > 0
			if (componentOnly) {
				residual.push(tab)
				unconverted.push(tab.id || '(unknown)')
				continue
			}
			if (tabWidgets.length === 0) {
				// Neither widgets nor a component — retain unchanged.
				residual.push(tab)
				continue
			}
			for (let i = 0; i < tabWidgets.length; i++) {
				const w = tabWidgets[i]
				if (!w || typeof w !== 'object') continue
				const { type, widgetKey, dataSource, ...rest } = w
				const resolveEntries = Object.entries(rest).filter(([k]) => k.startsWith('@resolve:'))
				const propEntries = Object.entries(rest).filter(([k]) => !k.startsWith('@resolve:'))
				const entry = {
					widgetKey: widgetKey || type || 'unknown',
					slot: 'sidebar',
					tabGroup: tab.id,
					gridX: 0,
					gridY: rowOffset + i,
					gridWidth: 1,
					gridHeight: 1,
				}
				if (propEntries.length > 0) entry.props = Object.fromEntries(propEntries)
				if (dataSource !== undefined) entry.dataSource = dataSource
				for (const [k, v] of resolveEntries) entry[k] = v
				lifted.push(entry)
			}
			rowOffset += tabWidgets.length
		}
		return residual
	}

	if (hasSidebarProps) {
		const residual = processTabs(cfg.sidebarProps.tabs)
		if (residual.length > 0) {
			nextCfg.sidebarProps = { ...cfg.sidebarProps, tabs: residual }
		} else {
			const { tabs: _t, ...restProps } = cfg.sidebarProps
			if (Object.keys(restProps).length > 0) nextCfg.sidebarProps = restProps
			else delete nextCfg.sidebarProps
		}
	}
	if (hasSidebarTabs) {
		const residual = processTabs(cfg.sidebarTabs)
		if (residual.length > 0) nextCfg.sidebarTabs = residual
		else delete nextCfg.sidebarTabs
	}
	if (hasSidebarObjTabs) {
		const residual = processTabs(cfg.sidebar.tabs)
		if (residual.length > 0) {
			nextCfg.sidebar = { ...cfg.sidebar, tabs: residual }
		} else {
			const { tabs: _t, ...restSidebar } = cfg.sidebar
			nextCfg.sidebar = restSidebar
		}
	}

	// Nothing liftable → no structural change; return by reference.
	if (lifted.length === 0) {
		return { page, count: 0, unconverted }
	}

	const updatedPage = {
		...page,
		widgets: [...(Array.isArray(page.widgets) ? page.widgets : []), ...lifted],
		config: nextCfg,
	}
	return { page: updatedPage, count: lifted.length, unconverted }
}

module.exports = { normalizeSidebarShapes }
