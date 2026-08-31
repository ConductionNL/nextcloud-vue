// The standalone validator is pre-compiled at build time by
// scripts/build-validators.js. It does NOT use new Function() at
// runtime, which is required because Nextcloud's CSP blocks unsafe-eval
// (EvalError on every v2 app boot without this). See ADR-036.
//
// The file is regenerated on every `npm run build` and `npm test`
// via the `build:validators` script, and is gitignored.
// eslint-disable-next-line import/no-unresolved
import _compiledValidateV2 from './validateManifestV2.compiled.js'
// Shared slot→columns resolution so the validator's grid bound matches the
// renderer (CnWidgetGrid) exactly. A mismatch would let a manifest pass
// validation yet clip at render time.
import { resolveSlotColumns } from './resolveSlotColumns.js'

// CJS/ESM interop: compiled file exports default via module.exports.default
// in some bundlers. Unwrap when present.
const _validateV2Schema = _compiledValidateV2.default || _compiledValidateV2

/** Module-level flag so the unknown-$schema console.warn fires only once. */
let _unknownSchemaWarned = false

/**
 * The v2 schema URL suffix used for dispatch detection.
 */
const V2_SCHEMA_SUFFIX = '/app-manifest-v2.schema.json'

/**
 * Convert an Ajv ErrorObject's instancePath + message to a bracket-path
 * string matching the v1 validator's format (e.g. "pages[0]/...").
 *
 * Ajv uses JSON Pointer paths like "/pages/0/widgets/1/gridWidth".
 * We convert the leading "/pages/0" segment to "pages[0]" and keep
 * the rest as slash-separated for consistency with v1.
 *
 * @param {import('ajv').ErrorObject} err - Ajv error object
 * @return {string} Formatted error message
 */
function ajvErrorToString(err) {
	// instancePath is like "/pages/0/widgets/1/gridWidth" or ""
	// keyword-based errors with no instancePath use the schemaPath
	const path = err.instancePath || err.schemaPath || ''

	// Convert /pages/0/... → pages[0]/...
	const bracketPath = path.replace(/^\//, '').replace(/\/(\d+)(\/|$)/g, '[$1]$2')

	const message = err.message || 'validation error'

	if (bracketPath) {
		return `${bracketPath}: ${message}`
	}
	return message
}

/**
 * Library built-in v2 widget keys. A `widgetKey` resolving to one of
 * these is rendered by a library `Cn*` SFC and does NOT count as a
 * custom registry component for the single-12×12-widget dashboard
 * rule (see `LIBRARY_BUILT_IN_WIDGET_KEYS` consumer below).
 *
 * Canonical list per ADR-036 Decision 1 + the manifest-v2 spec
 * (`object-table`, `card-grid`, `form-renderer`, `map-viewer`,
 * `chart`, `stats-block`). The runtime `BUILT_IN_WIDGETS` registry in
 * `src/components/CnWidgetGrid/` currently ships the first four;
 * `chart` and `stats-block` are
 * reserved here so manifests authored against the spec do not trip
 * the rule when those widgets ship. New built-ins added to the
 * library MUST be appended to this list in the same PR.
 *
 * @type {Set<string>}
 */
const LIBRARY_BUILT_IN_WIDGET_KEYS = new Set([
	'object-table',
	'card-grid',
	'form-renderer',
	'map-viewer',
	'chart',
	'stats-block',
	// Wave 1 (nextcloud-vue#91): banner + audit-trail built-ins, and the
	// dashboard-catalog presentation widgets ported to the v2 grid.
	'banner',
	'audit-trail',
	'header',
	'text',
	'divider',
])

/**
 * Closed enum of valid chart `valueAxisBaseline` values — mirrors
 * `CnChartWidget`'s own prop validator. Checked post-schema because the key
 * sits inside the free-form widget `props` / `content` bag.
 *
 * @type {string[]}
 */
const CHART_VALUE_AXIS_BASELINES = ['auto', 'zero', 'fit']

/**
 * Validate a v2 manifest using the Ajv-compiled `app-manifest-v2.schema.json`.
 *
 * In addition to JSON Schema validation, applies the following post-schema
 * checks that cannot be expressed in pure JSON Schema:
 *  - `pages[].id` uniqueness across the array
 *  - `gridX + gridWidth <= 12` for every widget in every page (only on
 *    slots where gridColumns is 12 — i.e. all non-sidebar slots)
 *  - Single-12×12-custom-widget dashboard rule (ADR-036 Decision 1): a
 *    `pages[].type === "dashboard"` with exactly one `widgets[]` entry
 *    where `slot === "body"`, `gridX/gridY === 0`, `gridWidth/gridHeight
 *    === 12`, and `widgetKey` does NOT resolve to a library built-in.
 *  - `@resolve:` sentinel REJECTION on registry-key paths (mirrors v1 rules):
 *    `pages[].id`, `pages[].route`, `pages[].component`,
 *    `pages[].headerComponent`, `pages[].actionsComponent`,
 *    `pages[].slots.*`, `menu[].id`, `menu[].route`,
 *    `dependencies[]`, `version`
 *
 * @spec openspec/changes/manifest-v2-schema/specs/manifest-v2-schema/spec.md
 * @param {object} manifest The v2 manifest object to validate.
 * @return {{ valid: boolean, errors: string[] }}
 */
export function validateManifestV2(manifest) {
	// Clone so Ajv useDefaults mutations don't affect the caller's copy.
	const clone = JSON.parse(JSON.stringify(manifest))

	const ajvValid = _validateV2Schema(clone)
	const errors = []

	if (!ajvValid && _validateV2Schema.errors) {
		for (const err of _validateV2Schema.errors) {
			errors.push(ajvErrorToString(err))
		}
	}

	// --- Post-schema checks ---

	// 1. pages[].id uniqueness
	if (Array.isArray(clone.pages)) {
		const seenIds = new Set()
		clone.pages.forEach((page, index) => {
			if (page && typeof page.id === 'string') {
				if (seenIds.has(page.id)) {
					errors.push(`pages[${index}]/id: "${page.id}" must be unique within pages[]`)
				} else {
					seenIds.add(page.id)
				}
			}
		})
	}

	// 1b. Entity-scaffold templating (manifest-entity-scaffold-templating):
	//     pageTemplates[].id uniqueness + pageInstances[].templateRef resolves.
	//     Cheap early feedback so a dangling ref is caught at validation time,
	//     not only when the expander runs. No-op for a manifest without
	//     templating (the fleet corpus), so it can't break the regression.
	if (Array.isArray(clone.pageTemplates) || Array.isArray(clone.pageInstances)) {
		const templateIds = new Set()
		if (Array.isArray(clone.pageTemplates)) {
			clone.pageTemplates.forEach((tpl, index) => {
				if (!tpl || typeof tpl.id !== 'string') return
				if (templateIds.has(tpl.id)) {
					errors.push(`pageTemplates[${index}]/id: "${tpl.id}" must be unique within pageTemplates[]`)
				} else {
					templateIds.add(tpl.id)
				}
			})
		}
		if (Array.isArray(clone.pageInstances)) {
			clone.pageInstances.forEach((inst, index) => {
				if (!inst || typeof inst.templateRef !== 'string') return
				if (!templateIds.has(inst.templateRef)) {
					errors.push(`pageInstances[${index}]/templateRef: "${inst.templateRef}" references no pageTemplates[] entry`)
				}
			})
		}
	}

	// 2. gridX + gridWidth <= 12 for widget entries (sidebar already
	//    constrained to gridWidth:1 by schema, so the sum is always ≤12 for
	//    sidebar; we still run the arithmetic check for clarity).
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || !Array.isArray(page.widgets)) return
			page.widgets.forEach((widget, wIndex) => {
				if (!widget) return
				const gx = widget.gridX
				const gw = widget.gridWidth
				if (typeof gx === 'number' && typeof gw === 'number') {
					const resolved = resolveSlotColumns(widget.slot, isPlainObject(page.config) ? page.config.slotColumns : null); if (gx + gw > resolved) {
						errors.push(
							`pages[${pIndex}]/widgets[${wIndex}]: Widget '${widget.widgetKey}' in slot '${widget.slot}': gridX (${gx}) + gridWidth (${gw}) exceeds ${resolved}`,
						)
					}
				}
			})
		})
	}

	// 3. Single-12×12-custom-widget dashboard rule (ADR-036 Decision 1 /
	//    manifest-v2 spec). A `type: "dashboard"` page with exactly one
	//    widget that fills the body grid AND references a custom registry
	//    component is always a custom page in disguise — the wrapping
	//    `CnDashboardPage` adds visible nesting on top of the custom view.
	//    Counts widgets across ALL slots (a sidebar widget makes it
	//    multi-widget). Built-in widget keys (chart, stats-block, etc.)
	//    are exempt — those are legitimate full-page library widgets.
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || page.type !== 'dashboard') return
			if (!Array.isArray(page.widgets) || page.widgets.length !== 1) return
			const widget = page.widgets[0]
			if (!widget) return
			// Normalise omitted grid coords against the body-slot defaults
			// (gridX/Y → 0, gridWidth/Height → 12) so authors cannot
			// circumvent the rule by omitting fields. Required-field
			// validation upstream means this is mostly defensive, but
			// keeps the rule correct under future schema relaxations.
			const slot = widget.slot
			const gx = typeof widget.gridX === 'number' ? widget.gridX : 0
			const gy = typeof widget.gridY === 'number' ? widget.gridY : 0
			const gw = typeof widget.gridWidth === 'number' ? widget.gridWidth : 12
			const gh = typeof widget.gridHeight === 'number' ? widget.gridHeight : 12
			if (slot !== 'body' || gx !== 0 || gy !== 0 || gw !== 12 || gh !== 12) return
			const widgetKey = typeof widget.widgetKey === 'string' ? widget.widgetKey : ''
			if (!widgetKey || LIBRARY_BUILT_IN_WIDGET_KEYS.has(widgetKey)) return
			const pageId = typeof page.id === 'string' ? page.id : `[${pIndex}]`
			errors.push(
				`pages[${pageId}]/widgets[0]: pages[${pageId}] is type:"dashboard" with a single 12×12 custom widget — this is always a custom page in disguise.\n`
				+ 'Valid alternatives:\n'
				+ `  (a) declare as type:"custom" with component:"${widgetKey}" and register the component with kind:"page"\n`
				+ '  (b) split into N>1 widgets if this is genuinely a multi-widget dashboard\n'
				+ 'See ADR-036 Decision 1 (single-widget dashboard anti-pattern).',
			)
		})
	}

	// 3a. Optional widget-id uniqueness within a page. The id is the delta
	//     merge key, so duplicates would make a patch ambiguous.
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || !Array.isArray(page.widgets)) return
			const seen = new Set()
			page.widgets.forEach((widget, wIndex) => {
				if (!widget || typeof widget.id !== 'string') return
				if (seen.has(widget.id)) {
					errors.push(`pages[${pIndex}]/widgets[${wIndex}]/id: "${widget.id}" must be unique within the page's widgets[]`)
				} else {
					seen.add(widget.id)
				}
			})
		})
	}

	// 3b. Delta-only artefacts must not appear in a full (non-delta) manifest.
	//     $op / __order are markers consumed by mergeManifestDelta; their
	//     presence means a delta was loaded as a manifest. (props subtrees
	//     are free-form user data and are not scanned.)
	;(function walkReserved(node, path) {
		if (Array.isArray(node)) {
			node.forEach((v, i) => walkReserved(v, `${path}[${i}]`))
			return
		}
		if (!isPlainObject(node)) return
		for (const k of Object.keys(node)) {
			if (k === '$op' || k === '__order') {
				errors.push(`${path || ''}/${k}: reserved delta marker "${k}" is not allowed in a manifest (only inside a delta payload consumed by mergeManifestDelta)`)
			}
			if (k === 'props') continue
			walkReserved(node[k], `${path}/${k}`)
		}
	})(clone, '')

	// 3c. Optional per-page config.slotColumns override shape (slot →
	//     positive integer). A wrong shape silently falls back to defaults
	//     at render time, so flag it here.
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			const sc = isPlainObject(page && page.config) ? page.config.slotColumns : undefined
			if (sc === undefined) return
			if (!isPlainObject(sc)) {
				errors.push(`pages[${pIndex}]/config/slotColumns: must be an object mapping slot name to a positive integer`)
				return
			}
			for (const [slotName, value] of Object.entries(sc)) {
				if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
					errors.push(`pages[${pIndex}]/config/slotColumns/${slotName}: must be a positive integer`)
				}
			}
		})
	}

	// 3d. stats-block dataSource | entries mutual exclusion. A multi-entry
	//     stats-block (`props.entries[]`) declares one source PER entry, so a
	//     widget-level `dataSource` (entry-level or `props.dataSource`) at the
	//     same time is ambiguous — exactly one of the two forms is allowed.
	//     Cross-field rule → post-schema check (clear message), matching the
	//     gridX+gridWidth precedent. A stats-block with NEITHER is left to the
	//     component (CnStatsBlockWidget flags it at mount time) because the
	//     in-app widget editor legitimately creates not-yet-configured widgets.
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || !Array.isArray(page.widgets)) return
			page.widgets.forEach((widget, wIndex) => {
				if (!widget || widget.widgetKey !== 'stats-block') return
				const props = isPlainObject(widget.props) ? widget.props : {}
				const hasEntries = Array.isArray(props.entries) && props.entries.length > 0
				const hasDataSource = (widget.dataSource !== undefined && widget.dataSource !== null)
					|| (props.dataSource !== undefined && props.dataSource !== null)
				if (hasEntries && hasDataSource) {
					errors.push(
						`pages[${pIndex}]/widgets[${wIndex}]: stats-block widget declares BOTH a dataSource and props.entries[] — exactly one of the two source forms is allowed (single-KPI dataSource OR multi-entry entries[])`,
					)
				}
			})
		})
	}

	// 3e. endpointSource mutual exclusion (Wave 2, nextcloud-vue#91). Every
	//     endpoint-capable widget binds to exactly ONE data source: the stat /
	//     delta KPI tiles to `content.source` OR `content.endpointSource`, the
	//     chart to `dataSource` OR `props.endpointSource`, the object-table to
	//     `props.source` OR `props.endpointSource`. Cross-field rule →
	//     post-schema check (clear message), matching the stats-block 3d
	//     precedent. An OpenRegister source only counts when it is MEANINGFULLY
	//     configured (register+schema, an endpoint kind, or a url) — the
	//     in-app widget editor seeds stat/delta content with an EMPTY
	//     `source: { register: '', schema: '', … }` blob, which must not trip
	//     the rule when an endpointSource is added. Covers BOTH placements:
	//     the v2 pages[].widgets[] grid (content under props.content) and the
	//     legacy pages[].config.widgets[] dashboard catalog (content under
	//     widget.content, chart inputs under widget.props).
	const _hasConfiguredOrSource = (source) => isPlainObject(source) && (
		(typeof source.register === 'string' && source.register !== ''
			&& typeof source.schema === 'string' && source.schema !== '')
		|| source.kind === 'endpoint'
		|| typeof source.url === 'string'
	)
	const _hasEndpointSource = (es) => isPlainObject(es)
	// Shared with the v1 path — see `validateChartBaseline`.
	const _checkChartBaseline = (bag, path) => validateChartBaseline(bag, path, errors)
	const _checkKpiContent = (content, path) => {
		if (!isPlainObject(content)) return
		if (_hasConfiguredOrSource(content.source) && _hasEndpointSource(content.endpointSource)) {
			errors.push(
				`${path}: widget content declares BOTH a source and an endpointSource — exactly one of the two data bindings is allowed (OpenRegister source OR endpointSource)`,
			)
		}
	}
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page) return
			// v2 grid placement: pages[].widgets[]
			if (Array.isArray(page.widgets)) {
				page.widgets.forEach((widget, wIndex) => {
					if (!widget) return
					const props = isPlainObject(widget.props) ? widget.props : {}
					if (widget.widgetKey === 'stat' || widget.widgetKey === 'delta') {
						_checkKpiContent(props.content, `pages[${pIndex}]/widgets[${wIndex}]`)
					}
					if (widget.widgetKey === 'chart') {
						const hasDataSource = (widget.dataSource !== undefined && widget.dataSource !== null)
							|| (props.dataSource !== undefined && props.dataSource !== null)
						if (hasDataSource && _hasEndpointSource(props.endpointSource)) {
							errors.push(
								`pages[${pIndex}]/widgets[${wIndex}]: chart widget declares BOTH a dataSource and props.endpointSource — exactly one of the two data bindings is allowed`,
							)
						}
						// Both bags, in the same precedence CnDashboardPage's
						// getChartProps reads them: `content` (in-app editor) then `props`.
						_checkChartBaseline(props.content, `pages[${pIndex}]/widgets[${wIndex}]/props/content`)
						_checkChartBaseline(props, `pages[${pIndex}]/widgets[${wIndex}]/props`)
					}
					if (widget.widgetKey === 'object-table') {
						if (_hasConfiguredOrSource(props.source) && _hasEndpointSource(props.endpointSource)) {
							errors.push(
								`pages[${pIndex}]/widgets[${wIndex}]: object-table widget declares BOTH a props.source and a props.endpointSource — exactly one of the two data bindings is allowed`,
							)
						}
					}
				})
			}
			// Legacy dashboard catalog placement: pages[].config.widgets[]
			const legacy = page.config && Array.isArray(page.config.widgets) ? page.config.widgets : null
			if (legacy) {
				legacy.forEach((def, wIndex) => {
					if (!def) return
					if (def.type === 'stat' || def.type === 'delta') {
						_checkKpiContent(def.content, `pages[${pIndex}]/config/widgets[${wIndex}]`)
					}
					if (def.type === 'chart') {
						const props = isPlainObject(def.props) ? def.props : {}
						const hasDataSource = (def.dataSource !== undefined && def.dataSource !== null)
							|| (props.dataSource !== undefined && props.dataSource !== null)
						if (hasDataSource && _hasEndpointSource(props.endpointSource)) {
							errors.push(
								`pages[${pIndex}]/config/widgets[${wIndex}]: chart widget declares BOTH a dataSource and props.endpointSource — exactly one of the two data bindings is allowed`,
							)
						}
						_checkChartBaseline(def.content, `pages[${pIndex}]/config/widgets[${wIndex}]/content`)
						_checkChartBaseline(props, `pages[${pIndex}]/config/widgets[${wIndex}]/props`)
					}
				})
			}
		})
	}

	// 4. @resolve: sentinel rejection on registry-key paths
	const _v2Sentinel = /^@resolve:[a-z][a-z0-9_-]*$/
	if (typeof clone.version === 'string' && _v2Sentinel.test(clone.version)) {
		errors.push('/version must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)')
	}
	if (Array.isArray(clone.dependencies)) {
		clone.dependencies.forEach((dep, index) => {
			// String (HARD) or { id, required?, name? } (required:false = SOFT).
			const id = typeof dep === 'string' ? dep : (dep && typeof dep === 'object' ? dep.id : null)
			if (typeof id === 'string' && _v2Sentinel.test(id)) {
				errors.push(`/dependencies/${index} must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
		})
	}
	if (Array.isArray(clone.menu)) {
		clone.menu.forEach((item, index) => {
			if (!item) return
			if (typeof item.id === 'string' && _v2Sentinel.test(item.id)) {
				errors.push(`/menu/${index}/id must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (typeof item.route === 'string' && _v2Sentinel.test(item.route)) {
				errors.push(`/menu/${index}/route must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
		})
	}
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, index) => {
			if (!page) return
			const _isS = (v) => typeof v === 'string' && _v2Sentinel.test(v)
			if (_isS(page.id)) {
				errors.push(`/pages/${index}/id must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (_isS(page.route)) {
				errors.push(`/pages/${index}/route must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (_isS(page.component)) {
				errors.push(`/pages/${index}/component must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (_isS(page.headerComponent)) {
				errors.push(`/pages/${index}/headerComponent must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (_isS(page.actionsComponent)) {
				errors.push(`/pages/${index}/actionsComponent must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (page.slots && typeof page.slots === 'object') {
				for (const [slotName, slotValue] of Object.entries(page.slots)) {
					if (_isS(slotValue)) {
						errors.push(`/pages/${index}/slots/${slotName} must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
					}
				}
			}
		})
	}

	// 5. Detail `config.sidebarTabs[]` SHAPE validation (id/label
	//    presence + id uniqueness) the JSON schema can't fully express.
	//    Only fires when `sidebarTabs` is present — in v2 it usually
	//    is NOT: the `liftSidebarTabWidgets` migration strips it,
	//    lifting each tab's widgets to `slot:"sidebar"` + a
	//    self-declaring `tabGroup`. So the v1 `tabGroup → sidebarTabs[].id`
	//    cross-reference is deliberately NOT run for v2 — an
	//    undeclared `tabGroup` is the designed post-lift state, not an
	//    orphan. (Wiki register/schema is likewise not enforced — wiki
	//    content comes from the xwiki leaf integration; see
	//    ConductionNL/nextcloud-vue#445.)
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, index) => {
			if (!page || page.type !== 'detail') return
			const cfg = isPlainObject(page.config) ? page.config : null
			const pathSlash = `/pages/${index}/config`
			const pathBracket = `pages[${index}].config`
			validateDetailSidebarTabs(cfg, pathSlash, pathBracket, errors)
		})
	}

	// 6. Dashboard custom-widget slot wiring (CnDashboardPage /
	//    CnPageRenderer). A `type:"dashboard"` page wires each
	//    `type:"custom"` widget in `config.widgets[]` to a registry
	//    component through the PAGE-TOP-LEVEL `slots` map
	//    (`{ "widget-<id>": "<ComponentName>" }`), which CnPageRenderer
	//    reads as `page.slots` and turns into the `#widget-<id>` scoped
	//    slots CnDashboardPage consumes. Two ways to get this wrong — both
	//    pass JSON-schema validation (config is additionalProperties:true)
	//    yet render every affected widget as the `unavailableLabel`
	//    ("Widget not available") at runtime:
	//      (a) the slots map nested under `config` (config.slots) — never
	//          read by the renderer; must be a sibling of `config`.
	//      (b) a custom widget with no slots entry at all.
	//    Built-in widget types (stats-block, chart, tile, integration, …)
	//    render via their own paths and need no slots entry, so only
	//    `type:"custom"` is checked. Observed 2026-06-13 on
	//    decidesk-dashboard-v2-layout: the slots map shipped under config,
	//    so 9 of 11 widgets rendered the unavailable placeholder while
	//    gate-22 (schema-only) reported the manifest clean.
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || page.type !== 'dashboard') return
			const config = isPlainObject(page.config) ? page.config : null
			if (!config || !Array.isArray(config.widgets)) return
			const pageId = typeof page.id === 'string' ? page.id : `[${pIndex}]`
			const topSlots = isPlainObject(page.slots) ? page.slots : {}
			const configSlots = isPlainObject(config.slots) ? config.slots : null

			// (a) slots map misplaced under config
			if (configSlots) {
				errors.push(
					`pages[${pageId}]/config/slots: the dashboard widget slots map must be at the page top level (pages[${pIndex}]/slots, a sibling of "config"), not under "config". `
					+ 'CnPageRenderer reads page.slots; a slots map under config is never wired, so every custom widget renders the unavailable placeholder. '
					+ 'Move "slots" up one level to sit beside "config".',
				)
			}

			// (b) each custom widget needs a top-level slots entry
			config.widgets.forEach((widget, wIndex) => {
				if (!widget || widget.type !== 'custom') return
				const id = typeof widget.id === 'string' ? widget.id : null
				if (!id) return
				const slotKey = `widget-${id}`
				const wiredTop = typeof topSlots[slotKey] === 'string' && topSlots[slotKey].length > 0
				// If it is (only) under config.slots, (a) already named the
				// real fix — don't double-report the same widget.
				const underConfig = configSlots && typeof configSlots[slotKey] === 'string'
				if (!wiredTop && !underConfig) {
					errors.push(
						`pages[${pageId}]/config/widgets[${wIndex}]: custom widget "${id}" has no slot-component mapping at pages[${pIndex}]/slots["${slotKey}"]. `
						+ `It will render the unavailable placeholder. Add "${slotKey}": "<ComponentName>" to the page-top-level slots map, or use a built-in widget type.`,
					)
				}
			})
		})
	}

	// 7. Form logic (manifest-form-logic): cross-shape rules over
	//    `type: "form"` pages' `config.steps[]` / `config.fields[].visibleWhen`
	//    / `config.fields[].validation` that JSON Schema cannot express —
	//    step id uniqueness, step→field key reference integrity, complete
	//    step/field partition, min<=max, pattern compilability,
	//    type-inapplicable rules, and LOCAL visibleWhen field-ref resolution.
	//    The v2 path does not call validateTypeConfig(); the v1 `form`
	//    branch is untouched.
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || page.type !== 'form') return
			const config = isPlainObject(page.config) ? page.config : null
			if (!config) return
			const pathBase = `/pages/${pIndex}/config`

			const fieldList = Array.isArray(config.fields) ? config.fields : []
			const declaredKeys = new Set(
				fieldList
					.filter((f) => f && typeof f.key === 'string')
					.map((f) => f.key),
			)
			// steps[] cross-shape rules
			if (Array.isArray(config.steps)) {
				const seenStepIds = new Set()
				const assignmentCount = new Map()
				config.steps.forEach((step, sIndex) => {
					if (!step) return
					if (typeof step.id === 'string') {
						if (seenStepIds.has(step.id)) {
							errors.push(`${pathBase}/steps[${sIndex}]/id: duplicate step id "${step.id}" — step ids must be unique within the page`)
						}
						seenStepIds.add(step.id)
					}
					if (Array.isArray(step.fields)) {
						step.fields.forEach((key, fIndex) => {
							if (typeof key !== 'string' || !declaredKeys.has(key)) {
								errors.push(`${pathBase}/steps[${sIndex}]/fields[${fIndex}]: "${key}" does not match any declared config.fields[].key`)
								return
							}
							assignmentCount.set(key, (assignmentCount.get(key) || 0) + 1)
						})
					}
				})

				// Complete partition: every declared field key MUST appear in
				// exactly one step.
				const unassigned = []
				const duplicated = []
				declaredKeys.forEach((key) => {
					const count = assignmentCount.get(key) || 0
					if (count === 0) unassigned.push(key)
					else if (count > 1) duplicated.push(key)
				})
				if (unassigned.length > 0) {
					errors.push(`${pathBase}/steps: field key(s) ${unassigned.map((k) => `"${k}"`).join(', ')} are not assigned to any step — every declared field must appear in exactly one step when steps is present`)
				}
				if (duplicated.length > 0) {
					errors.push(`${pathBase}/steps: field key(s) ${duplicated.map((k) => `"${k}"`).join(', ')} are assigned to more than one step — every declared field must appear in exactly one step`)
				}
			}

			// fields[].validation / fields[].visibleWhen cross-shape rules
			fieldList.forEach((field, fIndex) => {
				if (!field || typeof field !== 'object') return
				const fieldPath = `${pathBase}/fields[${fIndex}]`
				const fieldType = field.type

				const validation = isPlainObject(field.validation) ? field.validation : null
				if (validation) {
					if (typeof validation.min === 'number' && typeof validation.max === 'number' && validation.min > validation.max) {
						errors.push(`${fieldPath}/validation: min (${validation.min}) must be <= max (${validation.max})`)
					}
					if (typeof validation.pattern === 'string') {
						try {
							// eslint-disable-next-line no-new
							new RegExp(validation.pattern)
						} catch (e) {
							errors.push(`${fieldPath}/validation/pattern: "${validation.pattern}" does not compile as a regular expression (${e.message})`)
						}
						if (fieldType !== 'string' && fieldType !== 'password') {
							errors.push(`${fieldPath}/validation/pattern: pattern only applies to string/password fields, not "${fieldType}"`)
						}
					}
					const boundsApplicable = fieldType === 'string' || fieldType === 'password' || fieldType === 'number'
					if (!boundsApplicable) {
						if (typeof validation.min === 'number') {
							errors.push(`${fieldPath}/validation/min: min only applies to string/password/number fields, not "${fieldType}"`)
						}
						if (typeof validation.max === 'number') {
							errors.push(`${fieldPath}/validation/max: max only applies to string/password/number fields, not "${fieldType}"`)
						}
					}
				}

				const visibleWhen = isPlainObject(field.visibleWhen) ? field.visibleWhen : null
				if (visibleWhen && !visibleWhen.endpoint && !visibleWhen.source && typeof visibleWhen.field === 'string') {
					const firstSegment = visibleWhen.field.split('.')[0]
					if (!declaredKeys.has(firstSegment)) {
						errors.push(`${fieldPath}/visibleWhen/field: "${firstSegment}" does not match any declared config.fields[].key`)
					}
				}
			})
		})
	}

	return { valid: errors.length === 0, errors }
}

/**
 * Pattern matching the `manifest-resolve-sentinel` capability's
 * sentinel — `@resolve:<key>` where `<key>` is lowercase alphanumeric
 * with `_` / `-` separators. The full string IS the sentinel; partial
 * substitution like `prefix-@resolve:foo` is NOT supported and is left
 * as a plain string for downstream renderers.
 *
 * Build-time validation accepts this pattern as a valid `string` for
 * any `string`-typed field UNDER `pages[].config`, regardless of any
 * narrower per-field constraint. Other paths reject it explicitly.
 */
const SENTINEL_PATTERN = /^@resolve:[a-z][a-z0-9_-]*$/

/**
 * Test whether a string is a manifest `@resolve:` sentinel.
 *
 * @param {*} value Candidate value.
 * @return {boolean} True when the value is a fully-matched sentinel.
 */
function isSentinel(value) {
	return typeof value === 'string' && SENTINEL_PATTERN.test(value)
}

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
 *  - The `manifest-resolve-sentinel` sentinel `@resolve:<key>` is
 *    permissively accepted under `pages[].config.*` and explicitly
 *    REJECTED in `version`, `dependencies[]`, `menu[].route`,
 *    `menu[].id`, `pages[].id`, `pages[].route`, `pages[].component`,
 *    `pages[].headerComponent`, `pages[].actionsComponent`,
 *    `pages[].slots.*` — those are router invariants or registry
 *    keys.
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
	// Dispatch to v2 validator when the manifest declares a v2 $schema.
	if (manifest && typeof manifest === 'object' && typeof manifest.$schema === 'string') {
		if (manifest.$schema.endsWith(V2_SCHEMA_SUFFIX)) {
			return validateManifestV2(manifest)
		}
		// $schema present but doesn't match any known schema URL —
		// warn once and fall through to v1 validator.
		const knownV1Suffix = '/app-manifest.schema.json'
		if (!manifest.$schema.endsWith(knownV1Suffix)) {
			if (!_unknownSchemaWarned) {
				// eslint-disable-next-line no-console
				console.warn(
					`[validateManifest] Unknown $schema URL "${manifest.$schema}". `
					+ 'Expected one of: app-manifest.schema.json (v1) or app-manifest-v2.schema.json (v2). '
					+ 'Falling back to v1 validator.',
				)
				_unknownSchemaWarned = true
			}
		}
	}

	const errors = []

	if (!isPlainObject(manifest)) {
		return { valid: false, errors: ['manifest must be an object'] }
	}

	const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

	if (typeof manifest.version !== 'string') {
		errors.push('/version must be a string')
	} else if (isSentinel(manifest.version)) {
		// `manifest-resolve-sentinel` REQ-MRS-004: sentinel is a router /
		// registry invariant violation when used here.
		errors.push(`/version "${manifest.version}" must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
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
			if (typeof item.id !== 'string') {
				errors.push(`/menu/${index}/id must be a string`)
			} else if (isSentinel(item.id)) {
				errors.push(`/menu/${index}/id must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (typeof item.label !== 'string') errors.push(`/menu/${index}/label must be a string`)
			if (item.route !== undefined && isSentinel(item.route)) {
				errors.push(`/menu/${index}/route must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (item.children !== undefined && !Array.isArray(item.children)) {
				errors.push(`/menu/${index}/children must be an array`)
			}
			validateMenuAction(item, `/menu/${index}`, errors)
			// `visibleIf` validation — when set, must be a plain object;
			// the only known sub-key is `appInstalled` (non-empty string).
			validateMenuItemVisibleIf(item.visibleIf, `/menu/${index}/visibleIf`, errors)
			// Also validate visibleIf and action on children when present.
			if (Array.isArray(item.children)) {
				item.children.forEach((child, cIndex) => {
					if (isPlainObject(child)) {
						validateMenuAction(child, `/menu/${index}/children/${cIndex}`, errors)
						validateMenuItemVisibleIf(
							child.visibleIf,
							`/menu/${index}/children/${cIndex}/visibleIf`,
							errors,
						)
					}
				})
			}
		})
	}

	// `runtime` is optional; when present it MUST be a plain object.
	// The validator does not constrain its shape beyond that — the
	// contract lives in the schema description and the OR backend.
	if (manifest.runtime !== undefined && !isPlainObject(manifest.runtime)) {
		errors.push('/runtime must be an object when set')
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
			} else if (isSentinel(page.id)) {
				errors.push(`/pages/${index}/id must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			} else if (seenIds.has(page.id)) {
				errors.push(`/pages/${index}/id "${page.id}" must be unique within pages[]`)
			} else {
				seenIds.add(page.id)
			}
			if (typeof page.route !== 'string') {
				errors.push(`/pages/${index}/route must be a string`)
			} else if (isSentinel(page.route)) {
				errors.push(`/pages/${index}/route must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (typeof page.title !== 'string') errors.push(`/pages/${index}/title must be a string`)
			if (typeof page.type !== 'string' || page.type.length === 0) {
				errors.push(`/pages/${index}/type must be a non-empty string`)
			} else if (allowedTypes && !allowedTypes.includes(page.type)) {
				errors.push(`/pages/${index}/type "${page.type}" must be one of: ${allowedTypes.join(', ')}`)
			}
			if (page.type === 'custom' && typeof page.component !== 'string') {
				errors.push(`/pages/${index}/component is required when type is "custom"`)
			}
			// `manifest-resolve-sentinel` REQ-MRS-004: registry-key
			// fields cannot be dynamic — they resolve at module-load
			// time against `customComponents`, before the loader runs.
			if (page.component !== undefined && isSentinel(page.component)) {
				errors.push(`/pages/${index}/component must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (page.headerComponent !== undefined && isSentinel(page.headerComponent)) {
				errors.push(`/pages/${index}/headerComponent must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (page.actionsComponent !== undefined && isSentinel(page.actionsComponent)) {
				errors.push(`/pages/${index}/actionsComponent must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
			}
			if (isPlainObject(page.slots)) {
				for (const [slotName, slotValue] of Object.entries(page.slots)) {
					if (isSentinel(slotValue)) {
						errors.push(`/pages/${index}/slots/${slotName} must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
					}
				}
			}

			// `sidebarComponent` (per-page named-view sidebar swap) MUST
			// be a non-empty string when set. Free-form otherwise — the
			// registry-membership check is a runtime concern handled by
			// CnPageRenderer (console.warn + fall-through). See
			// manifest-named-view-sidebar spec REQ-MNVS-1.
			if (page.sidebarComponent !== undefined) {
				if (typeof page.sidebarComponent !== 'string' || page.sidebarComponent.length === 0) {
					errors.push(`/pages/${index}/sidebarComponent must be a non-empty string`)
				}
			}

			// Per-type config-shape validation for built-in extended types.
			// (`manifest-page-type-extensions` spec — covers logs/settings/chat/files;
			//  `manifest-map-widget` spec adds `map`.)
			validateTypeConfig(page, index, errors)

			// Manifest-driven sidebar config — additive validation
			// (`manifest-abstract-sidebar` spec — covers index sidebar + detail sidebar tabs).
			validateSidebarConfig(page, index, errors)

			// Per-page top-level sidebar visibility flag — additive validation
			// (`manifest-detail-sidebar-config` spec — sibling of config,
			// applies to every page type).
			validatePageSidebar(page, index, errors)

			// Per-page soft-dependency gate. Validated rather than ignored
			// because a typo here fails OPEN: an unrecognised key is simply
			// not read, the gate never fires, and the page renders an empty
			// list that looks like "no data" instead of "install the app".
			validatePageRequiresApp(page, index, errors)
		})
	}

	if (manifest.dependencies !== undefined) {
		if (!Array.isArray(manifest.dependencies)) {
			errors.push('/dependencies must be an array of strings or { id, required?, name? } objects')
		} else {
			manifest.dependencies.forEach((dep, index) => {
				// HARD/SOFT dependency model: an entry is either a string
				// (HARD) or an object { id, required?, name? } (required:false
				// = SOFT). See REQ-DIA-4.
				if (typeof dep === 'string') {
					if (isSentinel(dep)) {
						errors.push(`/dependencies/${index} must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
					}
				} else if (dep && typeof dep === 'object' && !Array.isArray(dep)) {
					if (typeof dep.id !== 'string' || dep.id === '') {
						errors.push(`/dependencies/${index}/id must be a non-empty string`)
					} else if (isSentinel(dep.id)) {
						errors.push(`/dependencies/${index}/id must not be a @resolve: sentinel (sentinels are only valid under pages[].config.*)`)
					}
					if (dep.required !== undefined && typeof dep.required !== 'boolean') {
						errors.push(`/dependencies/${index}/required must be a boolean`)
					}
					if (dep.name !== undefined && typeof dep.name !== 'string') {
						errors.push(`/dependencies/${index}/name must be a string`)
					}
				} else {
					errors.push(`/dependencies/${index} must be a string or a { id, required?, name? } object`)
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
 * built-in extended types: `logs`, `settings`, `chat`, `files`, `map`.
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
		// `manifest-index-action-toggles` — typed config.actions block.
		// Schema-validated, but cross-check structure here for sharp
		// error paths (consumer typo in actions.<key> surfaces with
		// the path rather than a JSON Schema enum mismatch).
		validateIndexActionToggles(cfg, pathSlash, pathBracket, errors)
		break
	}
	case 'detail': {
		// `manifest-detail-sidebartabs` — typed validation for the
		// human-authored sidebar-tab declaration. Tab entries lift to
		// `widgets[]` with `slot:"sidebar"` + `tabGroup` via the CLI
		// transform; this validator catches authoring mistakes (missing
		// id/label, duplicate ids, non-array shape) before that.
		validateDetailSidebarTabs(cfg, pathSlash, pathBracket, errors)
		validateSidebarTabGroupRefs(page, index, errors)
		// `manifest-public-mode` — type='detail' supports the same
		// mode enum (`edit | create | public`) as type='form'. The
		// 'public' value marks unauthenticated token-scoped detail
		// pages — pair with @route.<param> token binding.
		validateConfigMode(cfg, pathSlash, pathBracket, errors)
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
		// `manifest-widget-ref-page-content-type` — validate the
		// declarative content[] array. Each item MUST be a `widget-ref`
		// object with a valid `ref` URI. OPTIONAL — only validated when
		// the `content` key is present.
		validateContentArray(cfg, pathSlash, pathBracket, errors)
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
	case 'form': {
		// `manifest-form-page-type` REQ-MFPT-* — runtime form pages
		// MUST declare a non-empty fields[] array and exactly one of
		// submitHandler | submitEndpoint as the dispatch destination.
		// Optional submitMethod and mode are constrained to closed
		// enums so manifest typos surface at validate time.
		const hasFields = cfg && Array.isArray(cfg.fields) && cfg.fields.length > 0
		if (!hasFields) {
			errors.push(`${pathSlash}/fields: ${pathBracket}: form pages must declare a non-empty fields[] array`)
		} else {
			validateFieldsArray(cfg.fields, `${pathSlash}/fields`, errors)
		}

		const hasHandler = cfg && typeof cfg.submitHandler === 'string' && cfg.submitHandler.length > 0
		const hasEndpoint = cfg && typeof cfg.submitEndpoint === 'string' && cfg.submitEndpoint.length > 0
		const dispatchCount = (hasHandler ? 1 : 0) + (hasEndpoint ? 1 : 0)
		if (dispatchCount !== 1) {
			errors.push(`${pathSlash}: ${pathBracket}: form pages must declare exactly one of submitHandler | submitEndpoint`)
		}

		if (cfg && cfg.submitMethod !== undefined) {
			const allowed = ['POST', 'PUT', 'PATCH']
			const upper = typeof cfg.submitMethod === 'string' ? cfg.submitMethod.toUpperCase() : null
			if (!upper || !allowed.includes(upper)) {
				errors.push(`${pathSlash}/submitMethod: ${pathBracket}.submitMethod: must be one of POST | PUT | PATCH`)
			}
		}

		validateConfigMode(cfg, pathSlash, pathBracket, errors)
		break
	}
	case 'map': {
		// `manifest-map-widget` REQ-MMW-* — Leaflet map pages MUST
		// declare a length-2 finite-number `center`; `layers[]`
		// entries MUST have a closed-enum `type` and (except inline
		// geojson) a non-empty `url`; `markers.dataSource` MUST
		// declare exactly one of `url` OR `register + schema`.
		const allowedLayerTypes = ['tile', 'wms', 'wfs', 'geojson']
		const center = cfg && cfg.center
		const validCenter = Array.isArray(center)
			&& center.length === 2
			&& center.every((n) => typeof n === 'number' && Number.isFinite(n))
		if (!validCenter) {
			errors.push(`${pathSlash}/center: ${pathBracket}.center: must be a length-2 array of finite numbers`)
		}
		if (cfg && cfg.zoom !== undefined && (typeof cfg.zoom !== 'number' || !Number.isFinite(cfg.zoom))) {
			errors.push(`${pathSlash}/zoom: ${pathBracket}.zoom: must be a finite number`)
		}
		if (cfg && cfg.layers !== undefined) {
			if (!Array.isArray(cfg.layers)) {
				errors.push(`${pathSlash}/layers: ${pathBracket}.layers: must be an array`)
			} else {
				cfg.layers.forEach((layer, lIdx) => {
					const lPath = `${pathSlash}/layers[${lIdx}]`
					if (!layer || typeof layer !== 'object') {
						errors.push(`${lPath}: must be an object`)
						return
					}
					if (!allowedLayerTypes.includes(layer.type)) {
						errors.push(`${lPath}/type: must be one of tile | wms | wfs | geojson`)
					}
					const hasUrl = typeof layer.url === 'string' && layer.url.length > 0
					const hasInlineGeojson = layer.type === 'geojson'
						&& layer.data
						&& typeof layer.data === 'object'
					if (!hasUrl && !hasInlineGeojson) {
						errors.push(`${lPath}/url: must be a non-empty string`)
					}
				})
			}
		}
		if (cfg && cfg.markers && typeof cfg.markers === 'object' && cfg.markers.dataSource) {
			const ds = cfg.markers.dataSource
			const hasUrl = typeof ds.url === 'string' && ds.url.length > 0
			const hasReg = typeof ds.register === 'string' && ds.register.length > 0
				&& typeof ds.schema === 'string' && ds.schema.length > 0
			const count = (hasUrl ? 1 : 0) + (hasReg ? 1 : 0)
			if (count !== 1) {
				errors.push(`${pathSlash}/markers/dataSource: ${pathBracket}.markers.dataSource: must declare exactly one of url | (register + schema)`)
			}
		}
		break
	}
	case 'wiki': {
		// `manifest-wiki-page-type` REQ — a wiki page renders one
		// manifest-declared markdown article (CnWikiPage). It MUST
		// declare both `register` and `schema` as non-empty strings so
		// the manifest stays the source of truth for which OpenRegister
		// register/schema the article body is read from.
		const hasRegister = cfg && typeof cfg.register === 'string' && cfg.register.length > 0
		const hasSchema = cfg && typeof cfg.schema === 'string' && cfg.schema.length > 0
		if (!hasRegister || !hasSchema) {
			errors.push(`${pathBracket}: wiki pages must declare register and schema`)
		}
		// `manifest-wiki-stabilise` REQ — the remaining typed config
		// fields the CnWikiPage component accepts MUST be strings when
		// present. Omitted fields are tolerated (runtime defaults take
		// over); unknown keys pass for forward-compat.
		validateWikiConfigFields(cfg, pathSlash, errors)
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
 * Validate the optional typed config fields of a `type:'wiki'` page
 * (`manifest-wiki-stabilise`). Each known field MUST be a string when
 * present; omitted fields are tolerated and unknown keys pass for
 * forward-compatibility. `register` / `schema` are validated by the
 * caller (they are required, not merely typed) so they are excluded
 * here.
 *
 * @param {object|null} cfg The page `config` object.
 * @param {string} pathSlash JSON-pointer prefix for the config object.
 * @param {string[]} errors Accumulator for error messages.
 */
function validateWikiConfigFields(cfg, pathSlash, errors) {
	if (!isPlainObject(cfg)) return
	const stringFields = [
		'contentField',
		'titleField',
		'idParam',
		'treeField',
		'sidebarTitleField',
		'sidebarRegister',
		'sidebarSchema',
		'emptyText',
		'emptyDescription',
		'emptyBodyText',
		'emptyBodyDescription',
	]
	stringFields.forEach((field) => {
		if (cfg[field] !== undefined && typeof cfg[field] !== 'string') {
			errors.push(`${pathSlash}/${field}: must be a string when set`)
		}
	})
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
/**
 * Validate a page's `requiresApp` soft-dependency gate.
 *
 * Accepts a non-empty app id, or `{ id, name? }` when the page wants a
 * human-readable name on the missing-dependency screen.
 *
 * This gates a WHOLE page and is for the deep link: a menu entry is hidden by
 * `visibleIf.appInstalled`, so the page is still reachable by bookmark, shared
 * URL, redirect or e2e spec. Gate a single widget with `visibleIf` instead —
 * a detail page may carry many widgets where only one needs the app.
 *
 * @param {object} page      The page definition.
 * @param {number} pageIndex Index of the page, for the error path.
 * @param {Array<string>} errors Collected error messages, appended in place.
 *
 * @return {void}
 */
function validatePageRequiresApp(page, pageIndex, errors) {
	if (page.requiresApp === undefined) return

	const path = `/pages/${pageIndex}/requiresApp`

	if (typeof page.requiresApp === 'string') {
		if (page.requiresApp.length === 0) {
			errors.push(`${path} must be a non-empty string`)
		}
		return
	}

	if (!isPlainObject(page.requiresApp)) {
		errors.push(`${path} must be a non-empty string or an { id, name? } object`)
		return
	}

	if (typeof page.requiresApp.id !== 'string' || page.requiresApp.id.length === 0) {
		errors.push(`${path}/id must be a non-empty string`)
	}

	if (
		page.requiresApp.name !== undefined
		&& (typeof page.requiresApp.name !== 'string' || page.requiresApp.name.length === 0)
	) {
		errors.push(`${path}/name must be a non-empty string when present`)
	}
}

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
 * Closed enum of valid `config.mode` values for type='form' and
 * type='detail' pages (`manifest-public-mode`).
 *
 * @type {string[]}
 */
const ALLOWED_CONFIG_MODES = ['edit', 'create', 'public']

/**
 * Validate `config.mode` against the closed enum
 * (`manifest-public-mode`). Shared between type='form' and
 * type='detail' branches of `validateTypeConfig`. Omitted mode is
 * tolerated (consumers fall back to the component's default).
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateConfigMode(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.mode === undefined) return
	if (typeof cfg.mode !== 'string' || !ALLOWED_CONFIG_MODES.includes(cfg.mode)) {
		errors.push(`${pathSlash}/mode: ${pathBracket}.mode: must be one of ${ALLOWED_CONFIG_MODES.join(' | ')}`)
	}
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
		// REQ-MAD-1 / REQ-MAD-2 — `handler` (string, registry name OR
		// reserved keyword `navigate`/`emit`/`none`) and the matching
		// `navigate` requirement on `route`. Schema 1.3.0+.
		if (action.handler !== undefined) {
			if (typeof action.handler !== 'string') {
				errors.push(`${actionPath}/handler: must be a string when set`)
			} else if (!HANDLER_PATTERN.test(action.handler)) {
				errors.push(
					`${actionPath}/handler: "${action.handler}" must match `
					+ '"navigate" | "emit" | "none" | [A-Za-z][A-Za-z0-9_]*',
				)
			}
			if (action.handler === 'navigate'
				&& (typeof action.route !== 'string' || action.route.length === 0)) {
				errors.push(`${actionPath}/route: required when handler is "navigate"`)
			}
		}
	})
}

/**
 * REQ-MAD-1 — Allowed shapes for `actions[].handler`. Either a
 * reserved keyword (`navigate` | `emit` | `none`) or a JS-identifier
 * registry name (alphanumeric + underscore, leading letter). Mirrors
 * the schema's `pattern` on the `handler` property.
 */
const HANDLER_PATTERN = /^(navigate|emit|none|[A-Za-z][A-Za-z0-9_]*)$/

/**
 * Validate `config.actionToggles` for index page type
 * (`manifest-index-action-toggles`). The block is OPTIONAL; when
 * present it MUST be a plain object whose values are booleans.
 * Unknown keys pass for forward-compat with future CnIndexPage props.
 *
 * Known keys (each maps to a CnIndexPage prop):
 *   showAdd, showFormDialog, showEditAction, showCopyAction,
 *   showDeleteAction, showMassImport, showMassExport, showMassCopy,
 *   showMassDelete, showViewToggle, selectable.
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateIndexActionToggles(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.actionToggles === undefined) return
	if (!isPlainObject(cfg.actionToggles)) {
		errors.push(`${pathSlash}/actionToggles: ${pathBracket}.actionToggles: must be an object`)
		return
	}
	for (const [key, value] of Object.entries(cfg.actionToggles)) {
		if (typeof value !== 'boolean') {
			errors.push(`${pathSlash}/actionToggles/${key}: ${pathBracket}.actionToggles.${key}: must be a boolean (got ${typeof value})`)
		}
	}
}

/**
 * Validate `config.sidebarTabs[]` for detail page type
 * (`manifest-detail-sidebartabs`). The block is OPTIONAL; when
 * present it MUST be an array of objects each carrying non-empty
 * `id` and `label` strings. Duplicate `id`s reject; unknown keys
 * pass for forward-compat (icon, order, component, _note, …).
 *
 * @param {object} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateDetailSidebarTabs(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.sidebarTabs === undefined) return
	if (!Array.isArray(cfg.sidebarTabs)) {
		errors.push(`${pathSlash}/sidebarTabs: ${pathBracket}.sidebarTabs: must be an array`)
		return
	}
	const seenIds = Object.create(null)
	cfg.sidebarTabs.forEach((tab, tIndex) => {
		const tabPath = `${pathSlash}/sidebarTabs/${tIndex}`
		const tabBracket = `${pathBracket}.sidebarTabs[${tIndex}]`
		if (!isPlainObject(tab)) {
			errors.push(`${tabPath}: must be an object`)
			return
		}
		if (typeof tab.id !== 'string' || tab.id.length === 0) {
			errors.push(`${tabPath}/id: ${tabBracket}.id: required, must be a non-empty string`)
		}
		if (typeof tab.label !== 'string' || tab.label.length === 0) {
			errors.push(`${tabPath}/label: ${tabBracket}.label: required, must be a non-empty string`)
		}
		if (typeof tab.id === 'string' && tab.id.length > 0) {
			if (seenIds[tab.id]) {
				errors.push(`${tabPath}/id: ${tabBracket}.id: duplicate "${tab.id}" — tab IDs must be unique within a page`)
			} else {
				seenIds[tab.id] = true
			}
		}
		if (tab.icon !== undefined && typeof tab.icon !== 'string') {
			errors.push(`${tabPath}/icon: must be a string when set`)
		}
		if (tab.order !== undefined && typeof tab.order !== 'number') {
			errors.push(`${tabPath}/order: must be a number when set`)
		}
		if (tab.component !== undefined && (typeof tab.component !== 'string' || tab.component.length === 0)) {
			errors.push(`${tabPath}/component: must be a non-empty string when set`)
		}
	})
}

/**
 * Cross-reference check: every `widgets[]` entry with
 * `slot === 'sidebar'` and a `tabGroup` value MUST match a declared
 * `config.sidebarTabs[].id`. Catches silent typos where a tab-bound
 * widget references a non-existent tab.
 *
 * Only runs when `widgets` is an array. Tolerates a missing
 * `sidebarTabs` declaration (the widgets[] can still validate
 * shape-wise; the cross-ref check is a documentation aid).
 *
 * @param {object} page The page object
 * @param {number} index The page index (for path)
 * @param {string[]} errors Accumulator
 */
function validateSidebarTabGroupRefs(page, index, errors) {
	if (!page || !Array.isArray(page.widgets) || page.widgets.length === 0) return
	const cfg = isPlainObject(page.config) ? page.config : null
	const declaredIds = new Set()
	if (cfg && Array.isArray(cfg.sidebarTabs)) {
		for (const tab of cfg.sidebarTabs) {
			if (tab && typeof tab.id === 'string' && tab.id.length > 0) {
				declaredIds.add(tab.id)
			}
		}
	}
	page.widgets.forEach((widget, wIndex) => {
		if (!isPlainObject(widget)) return
		if (widget.slot !== 'sidebar') return
		if (typeof widget.tabGroup !== 'string' || widget.tabGroup.length === 0) return
		if (declaredIds.size === 0) {
			errors.push(`pages[${index}]/widgets/${wIndex}/tabGroup: "${widget.tabGroup}" referenced but config.sidebarTabs[] is empty or missing — declare the tab to silence this error`)
			return
		}
		if (!declaredIds.has(widget.tabGroup)) {
			errors.push(`pages[${index}]/widgets/${wIndex}/tabGroup: "${widget.tabGroup}" must match a declared config.sidebarTabs[].id`)
		}
	})
}

/**
 * Validate `config.widgets[]` for dashboard page type
 * (`manifest-config-refs` REQ-MCR).
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
		if (widget.type === 'chart') {
			validateChartBaseline(widget.content, `${widgetPath}/content`, errors)
			validateChartBaseline(widget.props, `${widgetPath}/props`, errors)
		}
	})
}

/**
 * Validate a chart widget's `valueAxisBaseline` against its closed enum.
 *
 * The key lives inside the deliberately free-form widget `props` / `content`
 * bag, which no JSON Schema in this repo constrains — so a misspelt value
 * validated clean and then fell back to `auto` at render time, which is the
 * exact framing the author was overriding, with nothing in the manifest to
 * explain it. Omitted is fine (the component's default applies).
 *
 * @param {object|null} bag The widget's `props` or `content` block.
 * @param {string} path JSON-pointer-style path prefix for the message.
 * @param {string[]} errors Accumulator.
 * @return {void}
 */
function validateChartBaseline(bag, path, errors) {
	if (!isPlainObject(bag)) return
	const value = bag.valueAxisBaseline
	if (value === undefined || value === null) return
	if (typeof value !== 'string' || !CHART_VALUE_AXIS_BASELINES.includes(value)) {
		errors.push(`${path}/valueAxisBaseline: must be one of ${CHART_VALUE_AXIS_BASELINES.join(' | ')}`)
	}
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

const MENU_ACTIONS = ['user-settings']

/**
 * Validate the optional `action` field on a menu item. The schema
 * declares a closed enum ("user-settings" only); this helper enforces
 * that constraint at validate time so manifest typos surface
 * immediately rather than silently no-op'ing in CnAppNav (where
 * unknown action values fall through the click handler).
 *
 * Added in schema 1.5.0 alongside the user-settings action.
 *
 * @param {object} item Menu item (top-level or leaf child).
 * @param {string} path JSON path of this item (e.g. `/menu/0`).
 * @param {string[]} errors Error array to push to (mutated).
 */
function validateMenuAction(item, path, errors) {
	if (item.action === undefined) return
	if (typeof item.action !== 'string' || !MENU_ACTIONS.includes(item.action)) {
		errors.push(`${path}/action must be one of: ${MENU_ACTIONS.join(', ')}`)
	}
}

/**
 * Validate a `visibleIf` block on a menu item or nested child.
 *
 * `visibleIf` is optional; when present it MUST be a plain object.
 * Supported sub-keys:
 *
 *   - `appInstalled` (reserved) — a non-empty string naming the Nextcloud
 *     app whose installation gates the entry.
 *   - Any other key is treated as a dot-separated context path into
 *     `manifest.runtime` (e.g. `"user.primaryRole"`). Its value is a
 *     predicate expression: a scalar (shorthand eq) or an operator object
 *     (`{ eq }`, `{ in }`, `{ notIn }`, `{ gt }`, `{ gte }`, `{ lt }`,
 *     `{ lte }`, `{ truthy }`).
 *
 * @param {object|undefined} visibleIf The candidate value (may be undefined)
 * @param {string} path JSON-pointer-style path prefix for error messages
 * @param {string[]} errors Accumulator
 */
function validateMenuItemVisibleIf(visibleIf, path, errors) {
	if (visibleIf === undefined) return
	if (!isPlainObject(visibleIf)) {
		errors.push(`${path} must be an object when set`)
		return
	}
	// Validate the reserved `appInstalled` key.
	if (visibleIf.appInstalled !== undefined) {
		if (typeof visibleIf.appInstalled !== 'string' || visibleIf.appInstalled.length === 0) {
			errors.push(`${path}/appInstalled must be a non-empty string`)
		}
	}
	// Validate context-path predicate keys (any non-reserved key).
	const RESERVED = new Set(['appInstalled'])
	for (const key of Object.keys(visibleIf)) {
		if (RESERVED.has(key)) continue
		// Context path key must be dot-separated with non-empty segments.
		const segments = key.split('.')
		if (segments.some((s) => s.length === 0) || key.length === 0) {
			errors.push(`${path}/${key}: context path must be a non-empty dot-separated string with non-empty segments`)
			continue
		}
		// Predicate value validation.
		const predicate = visibleIf[key]
		if (predicate !== null && typeof predicate === 'object') {
			if (
				Object.prototype.hasOwnProperty.call(predicate, 'in')
				&& !Array.isArray(predicate.in)
			) {
				errors.push(`${path}/${key}/in: "in" operator value must be an array`)
			}
			if (
				Object.prototype.hasOwnProperty.call(predicate, 'notIn')
				&& !Array.isArray(predicate.notIn)
			) {
				errors.push(`${path}/${key}/notIn: "notIn" operator value must be an array`)
			}
			// Unknown operator keys are tolerated (forward-compat) — no error.
		}
		// Scalar predicates (string, number, boolean, null) are always valid.
	}
}

/**
 * Pattern matching the `openregister://widget/<schemaSlug>/<widgetSlug>` URI.
 * schemaSlug: lowercase alphanumeric + hyphens.
 * widgetSlug: starts with a letter (upper or lower), then alphanumeric + hyphens.
 *   camelCase is supported (e.g. `coverageGrid`).
 */
const WIDGET_REF_URI_PATTERN = /^openregister:\/\/widget\/[a-z0-9-]+\/[a-zA-Z][a-zA-Z0-9-]+$/

/**
 * Validate `config.content[]` for dashboard page type
 * (`manifest-widget-ref-page-content-type`). Each item MUST be an
 * object with:
 *   - `type` === "widget-ref" (the only supported discriminator)
 *   - `ref` matching `openregister://widget/<schemaSlug>/<widgetSlug>`
 *
 * Skipped silently when `cfg` or `cfg.content` is missing.
 *
 * @param {object|null} cfg The page's `config` block (or null)
 * @param {string} pathSlash JSON-pointer-style path prefix
 * @param {string} pathBracket Bracket-style path prefix
 * @param {string[]} errors Accumulator
 */
function validateContentArray(cfg, pathSlash, pathBracket, errors) {
	if (!cfg || cfg.content === undefined) return
	if (!Array.isArray(cfg.content)) {
		errors.push(`${pathSlash}/content: ${pathBracket}.content: must be an array when set`)
		return
	}
	cfg.content.forEach((item, cIndex) => {
		const itemPath = `${pathSlash}/content/${cIndex}`
		if (!isPlainObject(item)) {
			errors.push(`${itemPath}: must be an object`)
			return
		}
		if (item.type !== 'widget-ref') {
			errors.push(`${itemPath}/type: must be "widget-ref" (got "${item.type}")`)
		}
		if (typeof item.ref !== 'string' || item.ref.length === 0) {
			errors.push(`${itemPath}/ref: must be a non-empty string`)
		} else if (!WIDGET_REF_URI_PATTERN.test(item.ref)) {
			errors.push(
				`${itemPath}/ref: "${item.ref}" must match openregister://widget/<schemaSlug>/<widgetSlug> `
				+ '(slugs: lowercase letters, digits, hyphens; widgetSlug must start with a letter)',
			)
		}
	})
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
