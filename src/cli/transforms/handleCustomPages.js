/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Handle `type: "custom"` pages:
 *
 *  - TRIVIAL: The page has `component` pointing to an entry in the manifest's
 *    top-level `customComponents` map. The codemod cannot auto-convert the
 *    page to a standard type; instead it emits a registry suggestion in the
 *    report and adds `_note: "TODO: add to registry"` on the page.
 *
 *  - NON-TRIVIAL: The page has `type: "custom"` but either has no `component`
 *    field, or the `component` does NOT appear in `customComponents`. The
 *    codemod adds
 *    `_note: "TODO: manual migration required — custom page not auto-converted"`
 *    and emits a TODO item in the report.
 *
 * In both cases the page retains `type: "custom"` in the output; the v2
 * schema requires a `_note` on all `type: "custom"` pages.
 *
 * Note: The `customComponents` map is at the manifest level, not the page
 * level. This function operates per-page but receives the map as a parameter.
 *
 * @param {object} page A v1 page definition
 * @param {object} customComponents The manifest's top-level `customComponents`
 *   map (may be empty or undefined)
 * @return {{ page: object, reportEntry: object|null }}
 *   - `page`: Updated page with `_note` added
 *   - `reportEntry`: A report item describing what was done (null if page is
 *     not `type: "custom"`)
 */
function handleCustomPage(page, customComponents) {
	if (page.type !== 'custom') {
		return { page, reportEntry: null }
	}

	// If _note is already set (e.g. already processed), leave it alone
	if (typeof page._note === 'string' && page._note.length > 0) {
		return { page, reportEntry: null }
	}

	const cm = customComponents && typeof customComponents === 'object' ? customComponents : {}
	const componentName = page.component

	const isTrivial = typeof componentName === 'string'
		&& componentName.length > 0
		&& Object.prototype.hasOwnProperty.call(cm, componentName)

	let updatedPage
	let reportEntry

	if (isTrivial) {
		updatedPage = { ...page, _note: 'TODO: add to registry' }
		reportEntry = {
			kind: 'registry-suggestion',
			pageId: page.id,
			componentName,
			registryEntry: {
				[componentName]: { ...cm[componentName], kind: 'component' },
			},
		}
	} else {
		updatedPage = {
			...page,
			_note: 'TODO: manual migration required — custom page not auto-converted',
		}
		reportEntry = {
			kind: 'todo',
			pageId: page.id,
			componentName: componentName || null,
			reason: componentName
				? `Component "${componentName}" not found in customComponents map`
				: 'No component field on custom page',
		}
	}

	return { page: updatedPage, reportEntry }
}

/**
 * Process all `type: "custom"` pages in a manifest.
 *
 * @param {object} manifest Full manifest object (with top-level customComponents)
 * @return {{ manifest: object, reportEntries: Array<object> }}
 */
function handleCustomPages(manifest) {
	const customComponents = manifest.customComponents || {}
	const reportEntries = []

	if (!Array.isArray(manifest.pages)) {
		return { manifest, reportEntries }
	}

	const updatedPages = manifest.pages.map((page) => {
		const { page: updatedPage, reportEntry } = handleCustomPage(page, customComponents)
		if (reportEntry) {
			reportEntries.push(reportEntry)
		}
		return updatedPage
	})

	return {
		manifest: { ...manifest, pages: updatedPages },
		reportEntries,
	}
}

module.exports = { handleCustomPages, handleCustomPage }
