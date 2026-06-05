/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Flatten settings `config.sections[].widgets[]` into the page's top-level
 * `widgets[]` with `slot: "section:<section-id>"`. The `sections` key is
 * removed from config.
 *
 * Only processes pages of `type: "settings"` that declare `config.sections`.
 * Sections that use `fields[]` or `component` bodies (not `widgets[]`) are
 * carried forward in the config unchanged (they represent non-widget bodies
 * that the renderer handles separately).
 *
 * v1 shape:
 *   config.sections[]: { title, id?, widgets[]?, fields[]?, component? }
 *   section.widgets[]: { type, props?, ...}
 *
 * v2 shape for flattened entries:
 *   { widgetKey, slot: "section:<id>", gridX: 0, gridY: <n>, gridWidth: 12, gridHeight: 1, props? }
 *
 * Section `id` is derived from the section title if not explicitly set
 * (slugified: lowercase, spaces→hyphens).
 *
 * @param {object} page A v1 page definition (any type)
 * @return {{ page: object, count: number }}
 */
function flattenSettingsSectionWidgets(page) {
	if (page.type !== 'settings') {
		return { page, count: 0 }
	}

	const cfg = page.config || {}
	const sections = Array.isArray(cfg.sections) ? cfg.sections : []

	if (sections.length === 0) {
		return { page, count: 0 }
	}

	const flattened = []
	const residualSections = [] // sections with fields or component body
	let rowOffset = 0

	for (const section of sections) {
		if (!section) continue

		const sectionWidgets = Array.isArray(section.widgets) ? section.widgets : []
		const hasFields = Array.isArray(section.fields)
		const hasComponent = typeof section.component === 'string' && section.component.length > 0

		// If the section uses fields or component instead of widgets, keep it
		if ((hasFields || hasComponent) && sectionWidgets.length === 0) {
			residualSections.push(section)
			continue
		}

		// Derive section id for the slot name
		const sectionId = section.id
			|| slugify(typeof section.title === 'string' ? section.title : `section-${residualSections.length + flattened.length}`)

		for (let i = 0; i < sectionWidgets.length; i++) {
			const w = sectionWidgets[i]
			if (!w) continue

			const { type, dataSource, ...rest } = w
			const resolveEntries = Object.entries(rest).filter(([k]) => k.startsWith('@resolve:'))
			const propsEntries = Object.entries(rest).filter(([k]) => !k.startsWith('@resolve:'))

			const entry = {
				widgetKey: type || 'unknown',
				slot: `section:${sectionId}`,
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
		}

		rowOffset += sectionWidgets.length
	}

	// Remove sections from config; keep residual sections if any
	const { sections: _removed, ...restConfig } = cfg
	const updatedConfig = residualSections.length > 0
		? { ...restConfig, sections: residualSections }
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
 * @return {string} Slug (lowercase, spaces and special chars → hyphens, collapsed)
 */
function slugify(str) {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		|| 'section'
}

module.exports = { flattenSettingsSectionWidgets }
