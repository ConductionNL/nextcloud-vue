/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Synthesises a minimal valid prop set for any component, by INTROSPECTING
 * `Component.props` at runtime.
 *
 * WHY RUNTIME INTROSPECTION RATHER THAN A FIXTURE FILE. The obvious design is
 * a hand-written `{ CnFoo: { ...props } }` map. That was tried and rejected:
 * with 250 components and 58 of them declaring required props, a static map is
 * (a) wrong the moment anyone adds a required prop, and (b) silently wrong —
 * the sweep would report the component as broken when in fact the FIXTURE is
 * stale, which trains people to ignore the lane. Reading `Component.props`
 * cannot go stale, because it is the same declaration Vue itself validates
 * against.
 *
 * So the default for every required prop is derived from its declared `type`,
 * and the OVERRIDES map below carries only the components where a
 * type-shaped-but-empty value is not enough. Each override says why.
 */

/**
 * A value satisfying a declared prop type.
 *
 * `Boolean` is `false` and not `true` deliberately: `true` tends to switch a
 * component into a secondary mode (loading, editing, open), so the sweep would
 * be measuring the less-common branch of every component that has one.
 *
 * @param {Function|Array<Function>} type The prop's declared `type`.
 * @return {*} A minimal value of that type.
 */
/**
 * Boolean props that GATE the component's existence rather than switch a mode.
 *
 * The general rule below is `Boolean -> false`, because `true` usually selects a
 * secondary branch. These names are the documented exception: on a dialog, an
 * `open`-style prop is not a mode, it is whether the component renders AT ALL.
 * Left at `false`, every dialog and modal in the library mounts to an empty tree
 * and passes the sweep without a single line of its own template executing —
 * measured at 50 of 233 components before this list existed, i.e. more than a
 * fifth of the lane was a trivial pass.
 */
const GATE_PROP_NAMES = new Set(['open', 'show', 'visible', 'opened', 'shown', 'isOpen', 'active'])

/**
 * A value satisfying a declared prop type.
 *
 * @param {Function|Array<Function>} type The prop's declared `type`.
 * @return {*} A minimal value of that type.
 */
function valueForType(type) {
	// A union (`type: [String, Number]`) is satisfied by its first member.
	const t = Array.isArray(type) ? type[0] : type
	switch (t) {
	case String: return 'smoke'
	case Number: return 1
	case Boolean: return false
	case Array: return []
	case Object: return {}
	case Function: return () => {}
	case Date: return new Date(0)
	default: return null
	}
}

/**
 * Components whose required props need semantically valid content, not merely
 * a value of the right type.
 *
 * These are all the same shape of problem: the component indexes into the prop
 * during its first render (`steps[0].id`, `item.title`), so `[]` or `{}` throws
 * before anything renders. A type-derived default cannot know that, and a
 * component that legitimately needs real data is not a defect.
 *
 * Keep entries MINIMAL — just enough to render. A rich fixture here starts
 * duplicating the component's own specs, which is not this lane's job: it
 * checks that a component mounts and renders clean, not that it renders
 * correctly.
 */
const OVERRIDES = {
	// Indexes `steps[0]` to pick the opening step.
	CnWizardDialog: { steps: [{ id: 'a', title: 'A' }] },
	// Reads `item.title` in its confirmation copy.
	CnDeleteDialog: { item: { id: '1', title: 'Item' } },
	CnCopyDialog: { item: { id: '1', title: 'Item' } },
	CnObjectCard: { object: { id: '1', title: 'Item' } },
	CnObjectRow: { object: { id: '1', title: 'Item' } },
	CnRoadmapItem: { item: { id: '1', title: 'Item', state: 'open' } },
	CnMenuItemEditor: { item: { id: '1', label: 'Item' }, path: [] },
	// Spread with `[...items]` / `.length` in their summary line.
	CnMassDeleteDialog: { items: [{ id: '1', title: 'Item' }] },
	CnMassCopyDialog: { items: [{ id: '1', title: 'Item' }] },
	// `manifest.setup`/`menu` are read during the shell phase decision, and
	// `appId` is lowercased for a localStorage key.
	CnAppRoot: { manifest: { version: '1.0.0', menu: [], pages: [] }, appId: 'smoke' },
	// Iterates `pickers` to build the swatch row.
	CnThemePreview: { pickers: [] },
	// Reads `stages.length` for its progress geometry.
	CnTimelineStages: { stages: [] },
	// Maps over `nodes` to lay out the graph.
	CnGraphCanvas: { nodes: [] },
	// Reads `widget.id` to pick an API version.
	CnWidgetRenderer: { widget: { id: 'smoke', title: 'Smoke' } },
	CnTileWidget: { tile: { id: 'smoke', title: 'Smoke' } },
	// `provider` is destructured for its mount target.
	CnLeafMountHost: { provider: { id: 'smoke', label: 'Smoke' } },

	// --- Not required props, but the component correctly REFUSES to render
	// --- without them and says so. Configuring it properly is more honest than
	// --- adding its complaint to IGNORE_PATTERNS: the complaint is right.
	//
	// Passes `steps` through to CnWizardDialog, which resolves
	// `steps[currentIndex] || steps[0]` and then reads `.id` off it — undefined
	// for an empty list.
	CnSetupWizard: { appId: 'smoke', steps: [{ id: 'a', type: 'info', title: 'A' }] },
	// Warns "Neither register+schema nor source configured" and renders an
	// empty state otherwise.
	CnLogsPage: { register: 'smoke', schema: 'smoke' },
	// Warns "Exactly one of `dataSource` / `entries` must be provided" — and an
	// EMPTY `entries` array does not satisfy it, so this takes the
	// single-dataSource path instead.
	CnStatsBlockWidget: { dataSource: { register: 'smoke', schema: 'smoke', metric: 'count' } },
	// Warns that the bare store-action list path is deprecated and wants an
	// object carrying `@self`.
	CnRelatedObjectsWidget: { object: { '@self': { id: '1', register: 'smoke', schema: 'smoke' } } },
	// Reads `streamState.messages.length` and `.isStreaming` during render, so
	// the bare `{}` a type-derived Object default gives it is not enough.
	CnAiChatPanel: { streamState: { isStreaming: false, messages: [], currentText: '' } },
}

/**
 * Build the mount props for a component: a value for every REQUIRED prop,
 * with any override applied on top.
 *
 * Optional props are left unset on purpose — their declared defaults are part
 * of what this lane checks.
 *
 * @param {string} name The component's registered name.
 * @param {object} Component The component definition.
 * @return {object} Props suitable for `mount()`.
 */
function synthProps(name, Component) {
	const declared = Component && Component.props
	const props = {}

	if (declared && !Array.isArray(declared)) {
		for (const [key, def] of Object.entries(declared)) {
			const isObj = def && typeof def === 'object'
			const type = isObj ? (def.type ?? String) : def
			const isBool = type === Boolean || (Array.isArray(type) && type[0] === Boolean)

			// A gate prop is set even when OPTIONAL — that is the whole point,
			// since `open` almost always defaults to false. See GATE_PROP_NAMES.
			if (isBool && GATE_PROP_NAMES.has(key)) {
				props[key] = true
				continue
			}

			// `props: { foo: String }` shorthand declares no `required`.
			if (!isObj || def.required !== true) continue
			props[key] = valueForType(type)
		}
	}

	return { ...props, ...(OVERRIDES[name] || {}) }
}

module.exports = { synthProps, valueForType, OVERRIDES }
