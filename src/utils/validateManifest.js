/**
 * Validate a manifest object against the manifest JSON Schema.
 *
 * Hand-rolled minimal validator covering the rules required by
 * REQ-JMR-001 of the json-manifest-renderer spec:
 *  - Top-level `version`, `menu`, `pages` are required.
 *  - `version` matches the semver pattern.
 *  - `pages[].type` is a non-empty string. Whether the type resolves
 *    to a real component is checked by CnPageRenderer at render time
 *    against the consumer-resolved `pageTypes` map; the validator
 *    cannot enforce that without knowing the runtime registry.
 *  - `pages[].id` is unique across the array.
 *  - Required fields on menu items and pages are present.
 *  - `dependencies` (when present) is an array of strings.
 *  - `pages[].component` is required when `type` is "custom".
 *  - Per-type `config` shape rules for the built-in types `logs`,
 *    `settings`, `chat`, `files` (REQ from manifest-page-type-extensions).
 *
 * The richer schema constraints (`additionalProperties: false`, `format`
 * URI, etc.) are enforced by the BE / hydra CI validators that consume
 * the same schema file with Ajv. The FE validator is intentionally
 * narrow so a FE-only failure produces tight, actionable messages.
 *
 * @param {object} manifest The manifest object to validate.
 * @param {object} [options] Optional validation options.
 * @param {Array<string>} [options.allowedTypes] When provided, restrict
 *   the allowed `pages[].type` values to this list (plus `"custom"`).
 *   Useful in CI / build-time checks where the consumer's full
 *   `pageTypes` registry is known up-front. When omitted, any
 *   non-empty string is accepted; the runtime renderer logs a warning
 *   for unknown types.
 * @return {{ valid: boolean, errors: string[] }}
 */
export function validateManifest(manifest, options = {}) {
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

	const allowedTypes = Array.isArray(options.allowedTypes)
		? Array.from(new Set([...options.allowedTypes, 'custom']))
		: null

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
			if (typeof page.type !== 'string' || page.type.length === 0) {
				errors.push(`/pages/${index}/type must be a non-empty string`)
			} else if (allowedTypes && !allowedTypes.includes(page.type)) {
				errors.push(`/pages/${index}/type "${page.type}" must be one of: ${allowedTypes.join(', ')}`)
			}
			if (page.type === 'custom' && typeof page.component !== 'string') {
				errors.push(`/pages/${index}/component is required when type is "custom"`)
			}

			// Per-type config-shape validation for built-in extended types.
			// (`manifest-page-type-extensions` spec — covers logs/settings/chat/files.)
			validateTypeConfig(page, index, errors)

			// Manifest-driven sidebar config — additive validation
			// (`manifest-abstract-sidebar` spec — covers index sidebar + detail sidebar tabs).
			validateSidebarConfig(page, index, errors)
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

/**
 * Validate a page's `config` object against per-type rules for the
 * built-in extended types: `logs`, `settings`, `chat`, `files`.
 *
 * Skips silently for any other type (including the original
 * `index | detail | dashboard | custom`) — those have free-form
 * `config` and are validated by their target component at runtime.
 *
 * Errors include both the JSON-path style (`/pages/N/config/...`) and
 * the bracket-style hint (`pages[N].config: ...`) from the
 * manifest-page-type-extensions spec scenarios so consumers searching
 * for either form find the message.
 *
 * @param {object} page The page entry being validated.
 * @param {number} index The page's index in `pages[]`.
 * @param {string[]} errors The error array to push to (mutated).
 */
function validateTypeConfig(page, index, errors) {
	if (!page || typeof page.type !== 'string') return
	const cfg = isPlainObject(page.config) ? page.config : null
	const pathBracket = `pages[${index}].config`
	const pathSlash = `/pages/${index}/config`

	switch (page.type) {
	case 'logs': {
		const hasRegisterSchema = cfg && typeof cfg.register === 'string' && typeof cfg.schema === 'string'
		const hasSource = cfg && typeof cfg.source === 'string'
		if (!hasRegisterSchema && !hasSource) {
			errors.push(`${pathSlash}: ${pathBracket}: must declare register+schema or source`)
		}
		break
	}
	case 'settings': {
		if (!cfg || !Array.isArray(cfg.sections)) {
			errors.push(`${pathSlash}/sections: ${pathBracket}.sections: required, must be an array`)
			break
		}
		if (cfg.sections.length === 0) {
			errors.push(`${pathSlash}/sections: ${pathBracket}.sections: must contain at least 1 section`)
			break
		}
		cfg.sections.forEach((section, sIndex) => {
			if (!isPlainObject(section)) {
				errors.push(`${pathSlash}/sections/${sIndex}: must be an object`)
				return
			}
			if (typeof section.title !== 'string') {
				errors.push(`${pathSlash}/sections/${sIndex}/title: required, must be a string`)
			}
			if (!Array.isArray(section.fields)) {
				errors.push(`${pathSlash}/sections/${sIndex}/fields: required, must be an array`)
			}
		})
		break
	}
	case 'chat': {
		const hasConversationSource = cfg && typeof cfg.conversationSource === 'string'
		const hasPostUrl = cfg && typeof cfg.postUrl === 'string'
		if (!hasConversationSource && !hasPostUrl) {
			errors.push(`${pathSlash}: ${pathBracket}: must declare conversationSource or postUrl`)
		}
		break
	}
	case 'files': {
		if (!cfg || typeof cfg.folder !== 'string' || cfg.folder.length === 0) {
			errors.push(`${pathSlash}/folder: ${pathBracket}.folder: required`)
		}
		break
	}
	default:
		// No per-type rules for index/detail/dashboard/custom or
		// consumer-defined types; their `config` shape is enforced
		// by the target component at runtime (or by a future spec).
		break
	}
}

/**
 * Validate the type-specific sidebar config introduced by the
 * manifest-abstract-sidebar change.
 *
 * - For `type: "index"` pages with `config.sidebar`:
 *   `sidebar` MUST be a plain object. When `enabled` is set it MUST be
 *   a boolean. When `columnGroups` is set it MUST be an array. When
 *   `facets` is set it MUST be an object. Unknown sub-fields are
 *   tolerated for forward-compat with future CnIndexSidebar props.
 *
 * - For `type: "detail"` pages with `config.sidebarProps.tabs`:
 *   `tabs` MUST be an array. Each entry MUST have a string `id` and a
 *   string `label`. Each entry MUST have either `widgets` (array) OR
 *   `component` (string), not both. Tab `id`s MUST be unique within
 *   the array.
 *
 * Errors push JSON-pointer-shaped paths so the consumer can locate the
 * offending field without consulting the schema source.
 *
 * @param {object} page Page definition under validation
 * @param {number} pageIndex Index of the page in `manifest.pages`
 * @param {string[]} errors Accumulator for error messages
 */
function validateSidebarConfig(page, pageIndex, errors) {
	const config = page.config
	if (!isPlainObject(config)) return

	// --- Index sidebar ---
	if (page.type === 'index' && config.sidebar !== undefined) {
		const path = `/pages/${pageIndex}/config/sidebar`
		if (!isPlainObject(config.sidebar)) {
			errors.push(`${path} must be an object`)
		} else {
			if (config.sidebar.enabled !== undefined && typeof config.sidebar.enabled !== 'boolean') {
				errors.push(`${path}/enabled must be a boolean`)
			}
			if (config.sidebar.columnGroups !== undefined && !Array.isArray(config.sidebar.columnGroups)) {
				errors.push(`${path}/columnGroups must be an array`)
			}
			if (config.sidebar.facets !== undefined && !isPlainObject(config.sidebar.facets)) {
				errors.push(`${path}/facets must be an object`)
			}
			if (config.sidebar.showMetadata !== undefined && typeof config.sidebar.showMetadata !== 'boolean') {
				errors.push(`${path}/showMetadata must be a boolean`)
			}
			if (config.sidebar.search !== undefined && !isPlainObject(config.sidebar.search)) {
				errors.push(`${path}/search must be an object`)
			}
		}
	}

	// --- Detail sidebar tabs ---
	if (page.type === 'detail' && isPlainObject(config.sidebarProps) && config.sidebarProps.tabs !== undefined) {
		const tabsPath = `/pages/${pageIndex}/config/sidebarProps/tabs`
		const tabs = config.sidebarProps.tabs
		if (!Array.isArray(tabs)) {
			errors.push(`${tabsPath} must be an array`)
		} else {
			const seenIds = new Set()
			tabs.forEach((tab, tabIndex) => {
				const tabPath = `${tabsPath}/${tabIndex}`
				if (!isPlainObject(tab)) {
					errors.push(`${tabPath} must be an object`)
					return
				}
				if (typeof tab.id !== 'string' || tab.id.length === 0) {
					errors.push(`${tabPath}/id must be a non-empty string`)
				} else if (seenIds.has(tab.id)) {
					errors.push(`${tabPath}/id "${tab.id}" must be unique within tabs[]`)
				} else {
					seenIds.add(tab.id)
				}
				if (typeof tab.label !== 'string' || tab.label.length === 0) {
					errors.push(`${tabPath}/label must be a non-empty string`)
				}
				const hasWidgets = Array.isArray(tab.widgets) && tab.widgets.length > 0
				const hasComponent = typeof tab.component === 'string' && tab.component.length > 0
				if (hasWidgets && hasComponent) {
					errors.push(`${tabPath} must declare widgets OR component, not both`)
				}
				if (tab.widgets !== undefined && !Array.isArray(tab.widgets)) {
					errors.push(`${tabPath}/widgets must be an array when set`)
				}
				if (tab.component !== undefined && typeof tab.component !== 'string') {
					errors.push(`${tabPath}/component must be a string when set`)
				}
				if (tab.icon !== undefined && typeof tab.icon !== 'string') {
					errors.push(`${tabPath}/icon must be a string when set`)
				}
				if (tab.order !== undefined && typeof tab.order !== 'number') {
					errors.push(`${tabPath}/order must be a number when set`)
				}
			})
		}
	}
}
