/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Flatten settings `config.tabs[]` (each with nested `sections[].widgets[]`)
 * into the page's top-level `widgets[]` with `slot: "tab:<tab-id>"`.
 * The `tabs` key is removed from config.
 *
 * Only processes pages of `type: "settings"` that declare `config.tabs`.
 * Sections within a tab that use `fields[]` or `component` bodies are
 * carried forward in residual tabs.
 *
 * v1 shape:
 *   config.tabs[]: { id, label, sections[]: { title, id?, widgets[]? } }
 *
 * v2 shape for flattened entries:
 *   { widgetKey, slot: "tab:<tabId>", tabGroup: "<sectionId>",
 *     gridX: 0, gridY: <n>, gridWidth: 12, gridHeight: 1, props? }
 *
 * @param {object} page A v1 page definition (any type)
 * @return {{ page: object, count: number }}
 */
function flattenSettingsTabs(page) {
	if (page.type !== 'settings') {
		return { page, count: 0 }
	}

	const cfg = page.config || {}
	const tabs = Array.isArray(cfg.tabs) ? cfg.tabs : []

	if (tabs.length === 0) {
		return { page, count: 0 }
	}

	const flattened = []
	const residualTabs = []
	let rowOffset = 0

	for (const tab of tabs) {
		if (!tab) continue

		const tabSections = Array.isArray(tab.sections) ? tab.sections : []

		if (tabSections.length === 0) {
			// Tab with no sections — carry forward
			residualTabs.push(tab)
			continue
		}

		let hasWidgetSections = false

		for (const section of tabSections) {
			if (!section) continue

			const sectionWidgets = Array.isArray(section.widgets) ? section.widgets : []
			const hasFields = Array.isArray(section.fields)
			const hasComponent = typeof section.component === 'string' && section.component.length > 0

			if ((hasFields || hasComponent) && sectionWidgets.length === 0) {
				// Non-widget section body — keep in residual
				continue
			}

			const sectionId = section.id || slugify(typeof section.title === 'string' ? section.title : 'section')

			for (let i = 0; i < sectionWidgets.length; i++) {
				const w = sectionWidgets[i]
				if (!w) continue

				const { type, dataSource, ...rest } = w
				const resolveEntries = Object.entries(rest).filter(([k]) => k.startsWith('@resolve:'))
				const propsEntries = Object.entries(rest).filter(([k]) => !k.startsWith('@resolve:'))

				const entry = {
					widgetKey: type || 'unknown',
					slot: `tab:${tab.id}`,
					tabGroup: sectionId,
					gridX: 0,
					gridY: rowOffset + i,
					gridWidth: 12,
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

				flattened.push(entry)
				hasWidgetSections = true
			}

			rowOffset += sectionWidgets.length
		}

		if (!hasWidgetSections) {
			// No widgets were lifted from this tab — retain it
			residualTabs.push(tab)
		}
	}

	const { tabs: _removed, ...restConfig } = cfg
	const updatedConfig = residualTabs.length > 0
		? { ...restConfig, tabs: residualTabs }
		: restConfig

	const updatedPage = {
		...page,
		widgets: [...(page.widgets || []), ...flattened],
		config: updatedConfig,
	}

	return { page: updatedPage, count: flattened.length }
}

/**
 * Create a slug from a human-readable string.
 *
 * @param {string} str Input string
 * @return {string} Slug
 */
function slugify(str) {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		|| 'section'
}

module.exports = { flattenSettingsTabs }
