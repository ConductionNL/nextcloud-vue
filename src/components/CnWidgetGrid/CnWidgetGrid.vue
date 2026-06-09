<!--
  CnWidgetGrid — per-slot CSS grid renderer for v2 manifest pages.

  Receives a flat array of widget entries for a single slot and renders
  them in a CSS grid. The number of columns is determined by `slotName`
  per the ADR-036 Decision 2 convention:

    body, footer, header-actions, modal, tab:*, section:* → 12 columns
    sidebar                                               → 1 column

  Widget key resolution: built-in registry first, then cnRegistry inject.
  Unknown widget keys are skipped with a console.warn.
  gridWidth values exceeding gridColumns are clamped with a console.warn.

  Spec: REQ-MVR-004 (manifest-v2-renderer) — per-slot grid renderer

  @prop {Array} widgets   Array of widget entry objects from the v2 manifest page.
  @prop {string} slotName The slot key (e.g. "body", "sidebar", "tab:general").
  @prop {object} registry The consumer registry from CnAppRoot (passed as prop
                          for standalone use; normally injected via cnRegistry).
-->
<template>
	<div
		class="cn-widget-grid"
		:style="containerStyle"
		:data-slot="slotName">
		<template v-for="(widget, index) in resolvedWidgets">
			<component
				:is="widget.component"
				:key="`${widget.widgetKey}-${index}`"
				v-bind="widget.props"
				:style="gridCellStyle(widget)" />
		</template>
	</div>
</template>

<script>
import { BUILT_IN_WIDGETS } from './builtInWidgets.js'

/**
 * Per-slot column counts per ADR-036 Decision 2.
 */
const SLOT_COLUMNS = {
	body: 12,
	sidebar: 1,
	'header-actions': 12,
	footer: 12,
	modal: 12,
}

/**
 * Determine the number of grid columns for a given slot name.
 *
 * @param {string} slotName
 * @return {number}
 */
function getGridColumns(slotName) {
	if (!slotName) return 12
	if (Object.prototype.hasOwnProperty.call(SLOT_COLUMNS, slotName)) {
		return SLOT_COLUMNS[slotName]
	}
	// Dynamic slot patterns: tab:<id> and section:<id>
	if (/^tab:/.test(slotName) || /^section:/.test(slotName)) {
		return 12
	}
	return 12
}

export default {
	name: 'CnWidgetGrid',

	inject: {
		cnRegistry: { default: () => ({}) },
		/**
		 * Object context for a `type:"detail"` page, published by
		 * `CnPageRenderer` (reactive holder `{ value: { objectData, schema,
		 * objectType, objectId, register, store } | null }`). Merged UNDER
		 * each widget's own `props` so detail widgets (`data`, `metadata`,
		 * `file-manager`, …) receive the loaded object without the manifest
		 * having to author per-widget props. `null` outside a detail page.
		 */
		cnDetailObjectContext: { default: null },
	},

	props: {
		/**
		 * Widget entries for this slot from the v2 manifest page.
		 * Each entry: `{ widgetKey, slot, gridX, gridY, gridWidth, gridHeight, props? }`.
		 *
		 * @type {Array<object>}
		 */
		widgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * The slot name this grid is rendering for (e.g. "body", "sidebar", "tab:general").
		 *
		 * @type {string}
		 */
		slotName: {
			type: String,
			required: true,
		},
		/**
		 * Consumer registry override. When provided, overrides the injected
		 * cnRegistry. Used for standalone testing.
		 *
		 * @type {object|null}
		 */
		registry: {
			type: Object,
			default: null,
		},
	},

	computed: {
		gridColumns() {
			return getGridColumns(this.slotName)
		},
		effectiveRegistry() {
			return this.registry ?? this.cnRegistry ?? {}
		},
		/**
		 * Resolved detail-page object context (or `{}`). Read from the
		 * reactive holder published by `CnPageRenderer`; the `.value`
		 * indirection lets the grid re-render once the async object load
		 * resolves. Only the well-known object keys are forwarded to
		 * widgets — see `resolvedWidgets`.
		 *
		 * @return {object}
		 */
		detailContextProps() {
			const ctx = this.cnDetailObjectContext?.value
			if (!ctx || typeof ctx !== 'object') {
				return {}
			}
			const out = {}
			for (const key of ['objectData', 'schema', 'objectType', 'objectId', 'register', 'store']) {
				if (ctx[key] !== undefined) {
					out[key] = ctx[key]
				}
			}
			return out
		},
		containerStyle() {
			return {
				display: 'grid',
				gridTemplateColumns: `repeat(${this.gridColumns}, 1fr)`,
				gap: 'var(--default-grid-baseline, 4px)',
			}
		},
		resolvedWidgets() {
			const columns = this.gridColumns
			const result = []

			for (const widget of this.widgets) {
				const key = widget.widgetKey

				// Resolve component: consumer registry first (overrides built-ins),
				// then fall back to built-in registry.
				// Per spec REQ-MVR-005: "Custom widget overrides built-in"
				let component = null

				if (this.effectiveRegistry[key]) {
					const entry = this.effectiveRegistry[key]
					component = entry.component ?? entry
				}

				if (!component) {
					component = BUILT_IN_WIDGETS[key] ?? null
				}

				if (!component) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnWidgetGrid] Unknown widgetKey "${key}" in slot "${this.slotName}". `
						+ 'Register it in the built-in registry or pass it via the CnAppRoot registry prop.',
					)
					continue
				}

				// Clamp gridWidth
				let gridWidth = typeof widget.gridWidth === 'number' ? widget.gridWidth : 1
				if (gridWidth > columns) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnWidgetGrid] Widget "${key}" in slot "${this.slotName}" has gridWidth ${gridWidth} `
						+ `which exceeds the slot's gridColumns (${columns}). Clamping to ${columns}.`,
					)
					gridWidth = columns
				}

				// Forward the widget's top-level `dataSource` (v2 unified
				// widget shape — sibling of `props`/`slot`/`gridX`) as a
				// `dataSource` prop so data-bound widgets (CnStatsBlockWidget,
				// CnChartWidget, …) receive it without the manifest having to
				// nest it inside `props`. A `props.dataSource` (the app-side
				// workaround) still wins on collision, because per-widget
				// `props` are spread LAST.
				const dataSourceProp = (widget.dataSource !== undefined && widget.dataSource !== null)
					? { dataSource: widget.dataSource }
					: {}

				result.push({
					widgetKey: key,
					component,
					// Detail-page object context first, then the top-level
					// `dataSource`, then the manifest's per-widget `props`
					// last so explicit props always win.
					props: { ...this.detailContextProps, ...dataSourceProp, ...(widget.props ?? {}) },
					gridX: typeof widget.gridX === 'number' ? widget.gridX : 0,
					gridY: typeof widget.gridY === 'number' ? widget.gridY : 0,
					gridWidth,
					gridHeight: typeof widget.gridHeight === 'number' ? widget.gridHeight : 1,
				})
			}

			return result
		},
	},

	methods: {
		/**
		 * Generate the CSS grid placement style for a widget entry.
		 *
		 * @param {object} widget Resolved widget entry with grid coordinates.
		 * @return {object} Vue style object.
		 */
		gridCellStyle(widget) {
			return {
				gridColumn: `${widget.gridX + 1} / span ${widget.gridWidth}`,
				gridRow: `${widget.gridY + 1} / span ${widget.gridHeight}`,
			}
		},
	},
}
</script>

<style>
.cn-widget-grid {
	width: 100%;
}
</style>
