import schema from '../schemas/app-manifest.schema.json'

/**
 * Validate a manifest object against the manifest JSON Schema.
 *
 * Hand-rolled minimal validator covering the rules required by
 * REQ-JMR-001 of the json-manifest-renderer spec:
 *  - Top-level `version`, `menu`, `pages` are required.
 *  - `version` matches the semver pattern.
 *  - `pages[].type` is in the closed enum.
 *  - `pages[].id` is unique across the array.
 *  - Required fields on menu items and pages are present.
 *  - `dependencies` (when present) is an array of strings.
 *  - `pages[].component` is required when `type` is "custom".
 *
 * The richer schema constraints (`additionalProperties: false`, `format`
 * URI, etc.) are enforced by the BE / hydra CI validators that consume
 * the same schema file with Ajv. The FE validator is intentionally
 * narrow so a FE-only failure produces tight, actionable messages.
 *
 * @param {object} manifest The manifest object to validate.
 * @return {{ valid: boolean, errors: string[] }}
 */
export function validateManifest(manifest) {
	const errors = []

	if (!isPlainObject(manifest)) {
		return { valid: false, errors: ['manifest must be an object'] }
	}

	const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

	if (typeof manifest.version !== 'string') {
		errors.push('/version must be a string')
	} else if (!versionPattern.test(manifest.version)) {
		errors.push(`/version "${manifest.version}" must match semver pattern`)
	}

	if (!Array.isArray(manifest.menu)) {
		errors.push('/menu must be an array')
	} else {
		manifest.menu.forEach((item, index) => {
			if (!isPlainObject(item)) {
				errors.push(`/menu/${index} must be an object`)
				return
			}
			if (typeof item.id !== 'string') errors.push(`/menu/${index}/id must be a string`)
			if (typeof item.label !== 'string') errors.push(`/menu/${index}/label must be a string`)
			if (item.children !== undefined && !Array.isArray(item.children)) {
				errors.push(`/menu/${index}/children must be an array`)
			}
		})
	}

	const allowedTypes = schema.$defs.page.properties.type.enum

	if (!Array.isArray(manifest.pages)) {
		errors.push('/pages must be an array')
	} else {
		const seenIds = new Set()
		manifest.pages.forEach((page, index) => {
			if (!isPlainObject(page)) {
				errors.push(`/pages/${index} must be an object`)
				return
			}
			if (typeof page.id !== 'string') {
				errors.push(`/pages/${index}/id must be a string`)
			} else if (seenIds.has(page.id)) {
				errors.push(`/pages/${index}/id "${page.id}" must be unique within pages[]`)
			} else {
				seenIds.add(page.id)
			}
			if (typeof page.route !== 'string') errors.push(`/pages/${index}/route must be a string`)
			if (typeof page.title !== 'string') errors.push(`/pages/${index}/title must be a string`)
			if (typeof page.type !== 'string' || !allowedTypes.includes(page.type)) {
				errors.push(`/pages/${index}/type must be one of: ${allowedTypes.join(', ')}`)
			}
			if (page.type === 'custom' && typeof page.component !== 'string') {
				errors.push(`/pages/${index}/component is required when type is "custom"`)
			}
		})
	}

	if (manifest.dependencies !== undefined) {
		if (!Array.isArray(manifest.dependencies)) {
			errors.push('/dependencies must be an array of strings')
		} else {
			manifest.dependencies.forEach((dep, index) => {
				if (typeof dep !== 'string') {
					errors.push(`/dependencies/${index} must be a string`)
				}
			})
		}
	}

	return { valid: errors.length === 0, errors }
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}
