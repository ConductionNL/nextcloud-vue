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

			// Per-page top-level sidebar visibility flag — additive validation
			// (`manifest-detail-sidebar-config` spec — sibling of config,
			// applies to every page type).
			validatePageSidebar(page, index, errors)
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
	case 'index': {
		// `manifest-config-refs` REQ-MCR — surface column / action shape
		// errors with sharp messages so consumers can locate the offending
		// field. Both arrays are OPTIONAL; only validated when present.
		validateColumnsArray(cfg, pathSlash, pathBracket, errors)
		validateActionsArray(cfg, pathSlash, pathBracket, errors)
		break
	}
	case 'logs': {
		const hasRegisterSchema = cfg && typeof cfg.register === 'string' && typeof cfg.schema === 'string'
		const hasSource = cfg && typeof cfg.source === 'string'
		if (!hasRegisterSchema && !hasSource) {
			errors.push(`${pathSlash}: ${pathBracket}: must declare register+schema or source`)
		}
		// Same column shorthand support as index.
		validateColumnsArray(cfg, pathSlash, pathBracket, errors)
		break
	}
	case 'dashboard': {
		// `manifest-config-refs` REQ-MCR — surface widgetDef / layoutItem
		// shape errors. Both arrays are OPTIONAL; only validated when
		// present.
		validateWidgetsArray(cfg, pathSlash, pathBracket, errors)
		validateLayoutArray(cfg, pathSlash, pathBracket, errors)
		break
	}
	case 'settings': {
		// `manifest-settings-orchestration` REQ-MSO-1: a settings page
		// MUST declare EXACTLY ONE of `sections` | `tabs`. When both
		// are set, emit the orchestration mutex error. When neither is
		// set, fall through to the legacy `sections required` error
		// (back-compat — REQ-MSO-7 / REQ-MSO-1 last scenario).
		const hasSections = cfg && Array.isArray(cfg.sections)
		const hasTabs = cfg && Array.isArray(cfg.tabs)

		if (hasSections && hasTabs) {
			errors.push(`${pathSlash}: ${pathBracket}: must declare exactly one of sections | tabs`)
			break
		}

		if (hasTabs) {
			// `manifest-settings-orchestration` REQ-MSO-2..4: validate
			// the `tabs[]` orchestration shape.
			if (cfg.tabs.length === 0) {
				errors.push(`${pathSlash}/tabs: ${pathBracket}.tabs: must contain at least 1 tab`)
				break
			}
			const seenTabIds = Object.create(null)
			cfg.tabs.forEach((tab, tIndex) => {
				if (!isPlainObject(tab)) {
					errors.push(`${pathSlash}/tabs/${tIndex}: must be an object`)
					return
				}
				if (typeof tab.id !== 'string' || tab.id.length === 0) {
					errors.push(`${pathSlash}/tabs/${tIndex}/id: required, must be a non-empty string`)
				}
				if (typeof tab.label !== 'string' || tab.label.length === 0) {
					errors.push(`${pathSlash}/tabs/${tIndex}/label: required, must be a non-empty string`)
				}
				// REQ-MSO-3: tab IDs must be unique within a page.
				if (typeof tab.id === 'string' && tab.id.length > 0) {
					if (seenTabIds[tab.id]) {
						errors.push(`${pathSlash}/tabs/${tIndex}/id: ${pathBracket}.tabs[${tIndex}].id: duplicate id "${tab.id}" — tab IDs must be unique within a page`)
					}
					seenTabIds[tab.id] = true
				}
				// `tab.sections` MUST be a non-empty array.
				if (!Array.isArray(tab.sections)) {
					errors.push(`${pathSlash}/tabs/${tIndex}/sections: ${pathBracket}.tabs[${tIndex}].sections: required, must be an array`)
					return
				}
				if (tab.sections.length === 0) {
					errors.push(`${pathSlash}/tabs/${tIndex}/sections: ${pathBracket}.tabs[${tIndex}].sections: must contain at least 1 section`)
					return
				}
				// REQ-MSO-4: each tab's sections follow the same rules
				// as the flat case — share the per-section validator.
				tab.sections.forEach((section, sIndex) => {
					validateSettingsSection(
						section,
						`${pathSlash}/tabs/${tIndex}/sections/${sIndex}`,
						`${pathBracket}.tabs[${tIndex}].sections[${sIndex}]`,
						errors,
					)
				})
			})
			break
		}

		// Flat `sections[]` (existing path — REQ-MSRS-* + back-compat).
		if (!hasSections) {
			errors.push(`${pathSlash}/sections: ${pathBracket}.sections: required, must be an array`)
			break
		}
		if (cfg.sections.length === 0) {
			errors.push(`${pathSlash}/sections: ${pathBracket}.sections: must contain at least 1 section`)
			break
		}
		cfg.sections.forEach((section, sIndex) => {
			validateSettingsSection(
				section,
				`${pathSlash}/sections/${sIndex}`,
				`${pathBracket}.sections[${sIndex}]`,
				errors,
			)
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
 * `manifest-abstract-sidebar` change and extended by
 * `manifest-detail-sidebar-config`.
 *
 * - For `type: "index"` pages with `config.sidebar`:
 *   `sidebar` MUST be a plain object. When `enabled` / `show` is set
 *   it MUST be a boolean. When `columnGroups` is set it MUST be an
 *   array. When `facets` is set it MUST be an object. Unknown
 *   sub-fields are tolerated for forward-compat with future
 *   CnIndexSidebar props.
 *
 * - For `type: "detail"` pages with `config.sidebar`:
 *   `sidebar` MUST be either a Boolean (legacy) OR a plain object.
 *   When an object: `show` / `enabled` MUST be boolean when set;
 *   `register` / `schema` / `title` / `subtitle` MUST be string when
 *   set; `hiddenTabs` MUST be an array of strings when set; `tabs`
 *   follows the existing tabs-array rules.
 *
 * - For `type: "detail"` pages with `config.sidebarProps.tabs`
 *   (legacy path): same tab rules as above.
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
			// Visibility gate added by manifest-detail-sidebar-config.
			if (config.sidebar.show !== undefined && typeof config.sidebar.show !== 'boolean') {
				errors.push(`${path}/show must be a boolean`)
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

	// --- Detail sidebar (Object form) ---
	// `manifest-detail-sidebar-config` promotes config.sidebar from a
	// pure boolean to a Boolean-OR-Object. Boolean form passes through
	// unchanged for v1.x back-compat. Object form mirrors index +
	// adds detail-specific fields.
	if (page.type === 'detail' && config.sidebar !== undefined) {
		const path = `/pages/${pageIndex}/config/sidebar`
		const sb = config.sidebar
		const isBool = typeof sb === 'boolean'
		const isObj = isPlainObject(sb)
		if (!isBool && !isObj) {
			errors.push(`${path} must be a boolean (legacy) or object`)
		} else if (isObj) {
			if (sb.show !== undefined && typeof sb.show !== 'boolean') {
				errors.push(`${path}/show must be a boolean`)
			}
			if (sb.enabled !== undefined && typeof sb.enabled !== 'boolean') {
				errors.push(`${path}/enabled must be a boolean`)
			}
			if (sb.register !== undefined && typeof sb.register !== 'string') {
				errors.push(`${path}/register must be a string`)
			}
			if (sb.schema !== undefined && typeof sb.schema !== 'string') {
				errors.push(`${path}/schema must be a string`)
			}
			if (sb.title !== undefined && typeof sb.title !== 'string') {
				errors.push(`${path}/title must be a string`)
			}
			if (sb.subtitle !== undefined && typeof sb.subtitle !== 'string') {
				errors.push(`${path}/subtitle must be a string`)
			}
			if (sb.hiddenTabs !== undefined) {
				if (!Array.isArray(sb.hiddenTabs)) {
					errors.push(`${path}/hiddenTabs must be an array of strings`)
				} else {
					sb.hiddenTabs.forEach((t, i) => {
						if (typeof t !== 'string') {
							errors.push(`${path}/hiddenTabs/${i} must be a string`)
						}
					})
				}
			}
			if (sb.tabs !== undefined) {
				validateDetailTabsArray(sb.tabs, `${path}/tabs`, errors)
			}
		}
	}

	// --- Detail sidebar tabs (legacy sidebarProps.tabs path) ---
	if (page.type === 'detail' && isPlainObject(config.sidebarProps) && config.sidebarProps.tabs !== undefined) {
		const tabsPath = `/pages/${pageIndex}/config/sidebarProps/tabs`
		validateDetailTabsArray(config.sidebarProps.tabs, tabsPath, errors)
	}
}

/**
 * Validate the manifest-abstract-sidebar tabs array. Hoisted so both
 * the legacy `config.sidebarProps.tabs` path and the new
 * `config.sidebar.tabs` path (manifest-detail-sidebar-config) reuse
 * the same rules.
 *
 * @param {*} tabs The candidate tabs value (expected: array of tab defs)
 * @param {string} tabsPath JSON-pointer-shaped path prefix for errors
 * @param {string[]} errors Accumulator
 */
function validateDetailTabsArray(tabs, tabsPath, errors) {
	if (!Array.isArray(tabs)) {
		errors.push(`${tabsPath} must be an array`)
		return
	}
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

/**
 * Validate the per-page top-level `sidebar` field (sibling of `config`)
 * introduced by `manifest-detail-sidebar-config`.
 *
 * Applies to EVERY page type (including type='custom'). Currently the
 * only declared sub-field is `show: boolean` (visibility gate consumed
 * by CnAppRoot via the `cnPageSidebarVisible` inject). Unknown
 * sub-fields are tolerated for forward-compat with future fields
 * (e.g. position, width).
 *
 * @param {object} page Page entry
 * @param {number} pageIndex Index in `manifest.pages`
 * @param {string[]} errors Accumulator
 */
function validatePageSidebar(page, pageIndex, errors) {
	if (page.sidebar === undefined) return
	const path = `/pages/${pageIndex}/sidebar`
	if (!isPlainObject(page.sidebar)) {
		errors.push(`${path} must be an object`)
		return
	}
	if (page.sidebar.show !== undefined && typeof page.sidebar.show !== 'boolean') {
		errors.push(`${path}/show must be a boolean`)
	}
}

/**
 * Validate `config.columns[]` for index / logs page types
 * (`manifest-config-refs` REQ-MCR).
 *
 * Each item is EITHER a string (legacy shorthand: just the property
 * key) OR an object matching the `column` $def — i.e. with at least
 * `key` and `label` non-empty strings. The schema admits the same
 * `oneOf` shape; this validator produces sharper messages when the
 * Object form is malformed.
 *
 * Skipped silently when `cfg` or `cfg.columns` is missing.
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateColumnsArray(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.columns === undefined) return
	if (!Array.isArray(cfg.columns)) {
		errors.push(`${pathSlash}/columns: ${pathBracket}.columns: must be an array when set`)
		return
	}
	cfg.columns.forEach((col, cIndex) => {
		const colPath = `${pathSlash}/columns/${cIndex}`
		if (typeof col === 'string') {
			// Legacy shorthand — accepted as-is.
			return
		}
		if (!isPlainObject(col)) {
			errors.push(`${colPath}: must be a string (legacy shorthand) or object`)
			return
		}
		if (typeof col.key !== 'string' || col.key.length === 0) {
			errors.push(`${colPath}/key: must be a non-empty string`)
		}
		if (typeof col.label !== 'string' || col.label.length === 0) {
			errors.push(`${colPath}/label: must be a non-empty string`)
		}
	})
}

/**
 * Validate `config.actions[]` for index page type
 * (`manifest-config-refs` REQ-MCR). Each entry MUST be an object with
 * non-empty `id` and `label` strings — matches the `action` $def's
 * `required: ["id","label"]`.
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateActionsArray(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.actions === undefined) return
	if (!Array.isArray(cfg.actions)) {
		errors.push(`${pathSlash}/actions: ${pathBracket}.actions: must be an array when set`)
		return
	}
	cfg.actions.forEach((action, aIndex) => {
		const actionPath = `${pathSlash}/actions/${aIndex}`
		if (!isPlainObject(action)) {
			errors.push(`${actionPath}: must be an object`)
			return
		}
		if (typeof action.id !== 'string' || action.id.length === 0) {
			errors.push(`${actionPath}/id: must be a non-empty string`)
		}
		if (typeof action.label !== 'string' || action.label.length === 0) {
			errors.push(`${actionPath}/label: must be a non-empty string`)
		}
	})
}

/**
 * Validate `config.widgets[]` for dashboard page type
 * (`manifest-config-refs` REQ-MCR). Each entry MUST be an object with
 * non-empty `id`, `title`, `type` strings — matches the `widgetDef`
 * $def's `required: ["id","title","type"]`.
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateWidgetsArray(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.widgets === undefined) return
	if (!Array.isArray(cfg.widgets)) {
		errors.push(`${pathSlash}/widgets: ${pathBracket}.widgets: must be an array when set`)
		return
	}
	cfg.widgets.forEach((widget, wIndex) => {
		const widgetPath = `${pathSlash}/widgets/${wIndex}`
		if (!isPlainObject(widget)) {
			errors.push(`${widgetPath}: must be an object`)
			return
		}
		if (typeof widget.id !== 'string' || widget.id.length === 0) {
			errors.push(`${widgetPath}/id: must be a non-empty string`)
		}
		if (typeof widget.title !== 'string' || widget.title.length === 0) {
			errors.push(`${widgetPath}/title: must be a non-empty string`)
		}
		if (typeof widget.type !== 'string' || widget.type.length === 0) {
			errors.push(`${widgetPath}/type: must be a non-empty string`)
		}
	})
}

/**
 * Validate `config.layout[]` for dashboard page type
 * (`manifest-config-refs` REQ-MCR). Each entry MUST be an object with
 * non-empty `id`, `widgetId` strings, and integer `gridX`/`gridY` >= 0,
 * `gridWidth`/`gridHeight` >= 1 — matches the `layoutItem` $def.
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateLayoutArray(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.layout === undefined) return
	if (!Array.isArray(cfg.layout)) {
		errors.push(`${pathSlash}/layout: ${pathBracket}.layout: must be an array when set`)
		return
	}
	cfg.layout.forEach((item, lIndex) => {
		const layoutPath = `${pathSlash}/layout/${lIndex}`
		if (!isPlainObject(item)) {
			errors.push(`${layoutPath}: must be an object`)
			return
		}
		if (typeof item.id !== 'string' || item.id.length === 0) {
			errors.push(`${layoutPath}/id: must be a non-empty string`)
		}
		if (typeof item.widgetId !== 'string' || item.widgetId.length === 0) {
			errors.push(`${layoutPath}/widgetId: must be a non-empty string`)
		}
		const checkInt = (key, min) => {
			if (typeof item[key] !== 'number' || !Number.isInteger(item[key])) {
				errors.push(`${layoutPath}/${key}: must be an integer`)
			} else if (item[key] < min) {
				errors.push(`${layoutPath}/${key}: must be >= ${min}`)
			}
		}
		checkInt('gridX', 0)
		checkInt('gridY', 0)
		checkInt('gridWidth', 1)
		checkInt('gridHeight', 1)
	})
}

/**
 * Validate a single `sections[]` entry for `type:"settings"` pages.
 * Shared between the flat `pages[].config.sections[]` path AND the
 * tab-nested `pages[].config.tabs[].sections[]` path
 * (`manifest-settings-orchestration` REQ-MSO-4).
 *
 * Enforces the rich-sections REQ-MSRS-1 mutex (`fields | component |
 * widgets` exactly-one-of) plus per-widget shape rules. The new
 * `widget.type === "component"` discriminator (REQ-MSO-6) requires
 * `componentName: <non-empty string>`.
 *
 * @param {*} section The section under validation
 * @param {string} pathSlash JSON-pointer-style path prefix for errors
 * @param {string} pathBracket Human-readable bracket-path for errors
 * @param {string[]} errors Accumulator
 */
function validateSettingsSection(section, pathSlash, pathBracket, errors) {
	if (!isPlainObject(section)) {
		errors.push(`${pathSlash}: must be an object`)
		return
	}
	if (typeof section.title !== 'string') {
		errors.push(`${pathSlash}/title: required, must be a string`)
	}

	// `manifest-settings-rich-sections` REQ-MSRS-1: exactly one of
	// fields | component | widgets.
	const hasFields = Array.isArray(section.fields)
	const hasComponent = typeof section.component === 'string' && section.component.length > 0
	const hasWidgets = Array.isArray(section.widgets) && section.widgets.length > 0
	const bodyCount = (hasFields ? 1 : 0) + (hasComponent ? 1 : 0) + (hasWidgets ? 1 : 0)

	if (bodyCount !== 1) {
		errors.push(`${pathSlash}: ${pathBracket}: must declare exactly one of fields | component | widgets`)
	}

	// `widgets` set but not an array (string / object / etc.)
	if (section.widgets !== undefined && !Array.isArray(section.widgets)) {
		errors.push(`${pathSlash}/widgets: must be an array when set`)
	}

	// `component` set but not a string.
	if (section.component !== undefined && typeof section.component !== 'string') {
		errors.push(`${pathSlash}/component: must be a string when set`)
	}

	// Per-widget shape rules.
	if (hasWidgets) {
		section.widgets.forEach((widget, wIndex) => {
			if (!isPlainObject(widget)) {
				errors.push(`${pathSlash}/widgets/${wIndex}: must be an object`)
				return
			}
			if (typeof widget.type !== 'string' || widget.type.length === 0) {
				errors.push(`${pathSlash}/widgets/${wIndex}/type: must be a non-empty string`)
				return
			}
			// `manifest-settings-orchestration` REQ-MSO-6: when the
			// discriminator is "component", `componentName` MUST be a
			// non-empty string. Other widget types ignore
			// `componentName`.
			if (widget.type === 'component') {
				if (typeof widget.componentName !== 'string' || widget.componentName.length === 0) {
					errors.push(`${pathSlash}/widgets/${wIndex}/componentName: required when type is "component", must be a non-empty string`)
				}
			}
		})
	}

	// `manifest-config-refs` REQ-MCR — when fields[] body is used,
	// each entry must match the formField $def shape.
	if (hasFields) {
		validateFieldsArray(section.fields, `${pathSlash}/fields`, errors)
	}
}

/**
 * Validate `config.sections[].fields[]` for settings page type
 * (`manifest-config-refs` REQ-MCR). Each field MUST be an object with
 * non-empty `key`, `label` strings and `type` ∈ the closed enum
 * `boolean | number | string | enum | password | json` — matches the
 * `formField` $def.
 *
 * @param {*} fields The candidate fields value
 * @param {string} fieldsPath JSON-pointer-style path prefix for errors
 * @param {string[]} errors Accumulator
 */
const FORM_FIELD_TYPES = ['boolean', 'number', 'string', 'enum', 'password', 'json']
function validateFieldsArray(fields, fieldsPath, errors) {
	if (!Array.isArray(fields)) return
	fields.forEach((field, fIndex) => {
		const fieldPath = `${fieldsPath}/${fIndex}`
		if (!isPlainObject(field)) {
			errors.push(`${fieldPath}: must be an object`)
			return
		}
		if (typeof field.key !== 'string' || field.key.length === 0) {
			errors.push(`${fieldPath}/key: must be a non-empty string`)
		}
		if (typeof field.label !== 'string' || field.label.length === 0) {
			errors.push(`${fieldPath}/label: must be a non-empty string`)
		}
		if (typeof field.type !== 'string' || field.type.length === 0) {
			errors.push(`${fieldPath}/type: must be a non-empty string`)
		} else if (!FORM_FIELD_TYPES.includes(field.type)) {
			errors.push(`${fieldPath}/type: must be one of ${FORM_FIELD_TYPES.join(', ')}`)
		}
	})
}
