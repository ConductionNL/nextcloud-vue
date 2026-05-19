/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Verify that verbatim-carry-forward fields are preserved throughout the
 * transformation pipeline. This is a no-op assertion transform — it does
 * not modify the manifest but returns a report of the carry-forward fields
 * it found, so the report can list them.
 *
 * Fields asserted to carry forward:
 *   - `dataSource` on pages and widgets (any level)
 *   - `@resolve:*` prefixed keys at any level
 *   - `dynamicSource` on menu items and pages
 *   - `sidebarComponent` on pages (named-view sidebar carry-forward)
 *
 * @param {object} manifest Full manifest object
 * @return {{ manifest: object, carriedFields: Array<{ path: string, key: string }> }}
 */
function carryForwardVerbatimFields(manifest) {
	const carriedFields = []

	function checkObject(obj, path) {
		if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return
		for (const [key, value] of Object.entries(obj)) {
			const fieldPath = `${path}/${key}`
			if (key.startsWith('@resolve:') || key === 'dataSource' || key === 'dynamicSource' || key === 'sidebarComponent') {
				carriedFields.push({ path: fieldPath, key, value })
			}
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				checkObject(value, fieldPath)
			} else if (Array.isArray(value)) {
				value.forEach((item, i) => checkObject(item, `${fieldPath}/${i}`))
			}
		}
	}

	// Check menu items
	if (Array.isArray(manifest.menu)) {
		manifest.menu.forEach((item, i) => checkObject(item, `/menu/${i}`))
	}

	// Check pages and their config/widgets
	if (Array.isArray(manifest.pages)) {
		manifest.pages.forEach((page, i) => checkObject(page, `/pages/${i}`))
	}

	// Return the manifest unchanged (pure assertion)
	return { manifest, carriedFields }
}

module.exports = { carryForwardVerbatimFields }
