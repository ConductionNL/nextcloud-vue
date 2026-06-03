/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Lift sidebar tab widgets from `config.sidebarTabs[].widgets[]` to the
 * page's top-level `widgets[]` with `slot: "sidebar"` and
 * `tabGroup: "<tab-id>"`. The `sidebarTabs` key is removed from config.
 *
 * Tab entries that declare only a `component` (no `widgets`) are carried
 * forward as-is by retaining them in config.sidebarTabs — they cannot be
 * automatically converted to widget entries.
 *
 * v1 shape:
 *   config.sidebarTabs[]: { id, label, icon?, order?, widgets[]?, component? }
 *   tab.widgets[]:         { type, props?, dataSource?, ... }
 *
 * v2 shape for lifted entries (widgetEntry):
 *   { widgetKey, slot: "sidebar", tabGroup: "<tab.id>", gridX: 0, gridY: <n>,
 *     gridWidth: 1, gridHeight: 1, props?, dataSource? }
 *
 * Note: sidebar widgetEntry requires gridWidth: 1 per the v2 schema allOf
 * constraint.
 *
 * @param {object} page A v1 page definition (any type)
 * @return {{ page: object, count: number, unconvertedTabs: string[] }}
 *   Transformed page, count of lifted widget entries, and list of tab ids
 *   whose component-only entries could not be auto-converted.
 */
function liftSidebarTabWidgets(page) {
	const cfg = page.config || {}
	const sidebarTabs = Array.isArray(cfg.sidebarTabs) ? cfg.sidebarTabs : []

	if (sidebarTabs.length === 0) {
		return { page, count: 0, unconvertedTabs: [] }
	}

	const lifted = []
	const residualTabs = [] // tabs with only a component (no widgets to lift)
	const unconvertedTabs = []
	let rowOffset = 0

	for (const tab of sidebarTabs) {
		if (!tab) continue

		const tabWidgets = Array.isArray(tab.widgets) ? tab.widgets : []
		const hasComponent = typeof tab.component === 'string' && tab.component.length > 0

		if (tabWidgets.length === 0 && hasComponent) {
			// Component-only tab — cannot auto-convert; retain in residualTabs
			residualTabs.push(tab)
			unconvertedTabs.push(tab.id || '(unknown)')
			continue
		}

		// Lift each widget from this tab into the page's widgets[] with slot:"sidebar"
		for (let i = 0; i < tabWidgets.length; i++) {
			const w = tabWidgets[i]
			if (!w) continue

			const { type, dataSource, ...rest } = w
			const resolveEntries = Object.entries(rest).filter(([k]) => k.startsWith('@resolve:'))
			const propsEntries = Object.entries(rest).filter(([k]) => !k.startsWith('@resolve:'))

			const entry = {
				widgetKey: type || 'unknown',
				slot: 'sidebar',
				tabGroup: tab.id,
				gridX: 0,
				gridY: rowOffset + i,
				gridWidth: 1,
				gridHeight: 1,
			}

			if (propsEntries.length > 0) {
				entry.props = Object.fromEntries(propsEntries)
			}

			if (dataSource) {
				entry.dataSource = dataSource
			}

			for (const [k, v] of resolveEntries) {
				entry[k] = v
			}

			lifted.push(entry)
		}

		rowOffset += tabWidgets.length
	}

	// Build updated config
	const { sidebarTabs: _removed, ...restConfig } = cfg

	// If there are residual (component-only) tabs, preserve them
	const updatedConfig = residualTabs.length > 0
		? { ...restConfig, sidebarTabs: residualTabs }
		: restConfig

	const updatedPage = {
		...page,
		widgets: [...(page.widgets || []), ...lifted],
		config: updatedConfig,
	}

	return { page: updatedPage, count: lifted.length, unconvertedTabs }
}

module.exports = { liftSidebarTabWidgets }
