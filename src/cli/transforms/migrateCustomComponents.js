/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Move `customComponents` entries to a `registry` map with `kind: "component"`
 * added to each entry. The top-level `customComponents` key is removed.
 *
 * v1 shape:
 *   { customComponents: { MyWidget: { component: "..." }, ... } }
 *
 * v2 shape:
 *   { registry: { MyWidget: { component: "...", kind: "component" }, ... } }
 *
 * If the manifest already has a `registry` map, the converted entries are
 * merged in (existing registry entries take precedence over converted ones
 * for any key collision).
 *
 * @param {object} manifest Full manifest object
 * @return {{ manifest: object, count: number, registrySuggestions: string[] }}
 */
function migrateCustomComponents(manifest) {
	const customComponents = manifest.customComponents

	if (!customComponents || typeof customComponents !== 'object' || Array.isArray(customComponents)) {
		return { manifest, count: 0, registrySuggestions: [] }
	}

	const keys = Object.keys(customComponents)
	if (keys.length === 0) {
		const { customComponents: _removed, ...rest } = manifest
		return { manifest: rest, count: 0, registrySuggestions: [] }
	}

	const converted = {}
	for (const [name, entry] of Object.entries(customComponents)) {
		converted[name] = {
			...(entry && typeof entry === 'object' ? entry : {}),
			kind: 'component',
		}
	}

	// Merge with any existing registry (existing entries win on key collision)
	const existingRegistry = manifest.registry && typeof manifest.registry === 'object'
		? manifest.registry
		: {}

	const updatedRegistry = { ...converted, ...existingRegistry }

	const { customComponents: _removed, ...restManifest } = manifest

	return {
		manifest: { ...restManifest, registry: updatedRegistry },
		count: keys.length,
		registrySuggestions: keys,
	}
}

module.exports = { migrateCustomComponents }
