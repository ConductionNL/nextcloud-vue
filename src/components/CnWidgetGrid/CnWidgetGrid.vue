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
	<!-- Editable body slot: a GridStack drag/resize grid (ADR-041 edit mode). -->
	<div
		v-if="editableBody"
		ref="gridContainer"
		class="cn-widget-grid cn-widget-grid--editing"
		:data-slot="slotName">
		<div class="grid-stack">
			<div
				v-for="(widget, index) in resolvedWidgets"
				:key="gsId(widget, index)"
				class="grid-stack-item"
				:gs-id="gsId(widget, index)"
				:gs-x="widget.gridX"
				:gs-y="widget.gridY"
				:gs-w="widget.gridWidth"
				:gs-h="widget.gridHeight">
				<div class="grid-stack-item-content">
					<component
						:is="widget.component"
						v-bind="widget.props" />
				</div>
			</div>
		</div>
	</div>
	<!-- Default read-only CSS grid. -->
	<div
		v-else
		class="cn-widget-grid cn-grid"
		:class="{ 'cn-grid--responsive': isResponsive }"
		:style="gridVars"
		:data-slot="slotName">
		<template v-for="(widget, index) in resolvedWidgets" :key="`${widget.widgetKey}-${index}`">
			<div
				class="cn-grid__item"
				:class="{ 'cn-grid__item--row': hasGridRow(widget) }"
				:style="cnGridCellStyle(widget, gridColumns)">
				<component
					:is="widget.component"
					v-bind="widget.props" />
			</div>
		</template>
	</div>
</template>

<script>
import { BUILT_IN_WIDGETS } from './builtInWidgets.js'
import { getWidgetTypeEntry } from './dashboardWidgetRegistry.js'
import CnUnknownWidget from './CnUnknownWidget.vue'
import { cnGridCellStyle, hasGridRow } from '../../utils/grid.js'
import { resolveSlotColumns } from '../../utils/resolveSlotColumns.js'
import { initGridStack, readGridGeometry } from '../../utils/gridStack.js'

// Per-slot column counts and slot→columns resolution now live in
// src/utils/resolveSlotColumns.js (shared with validateManifest so the grid
// bound the validator enforces matches what this component renders).

export default {
	name: 'CnWidgetGrid',

	inject: {
		cnRegistry: { default: () => ({}) },
		/**
		 * Per-page slot→columns override map, published by `CnPageRenderer`
		 * from `page.config.slotColumns`. Merged UNDER the `columns` prop in
		 * column resolution. `null` when the page declares no override.
		 */
		cnSlotColumns: { default: null },
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
		/**
		 * Explicit column-count override for this slot. When `null` (default),
		 * columns resolve from the injected per-page `slotColumns` map and then
		 * the library default for the slot — preserving the fixed ADR-036
		 * Decision 2 behaviour (body=12, sidebar=1). Set a number to force a
		 * specific column count.
		 *
		 * @type {number|null}
		 */
		columns: {
			type: Number,
			default: null,
		},
		/**
		 * When `true`, the `body` slot renders a GridStack drag/resize grid
		 * (ADR-041 in-app edit mode) instead of the read-only CSS grid; geometry
		 * changes are written back to the widget entries and emitted via
		 * `@layout-change`. Other slots are unaffected. Default `false` keeps the
		 * existing read-only rendering for every consumer.
		 *
		 * @type {boolean}
		 */
		editable: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['layout-change'],

	data() {
		return {
			grid: null,
		}
	},

	computed: {
		/** Whether this grid should render the editable GridStack body. */
		editableBody() {
			return this.editable && this.slotName === 'body'
		},
		gridColumns() {
			// Three-layer resolution: `columns` prop → injected per-page
			// slotColumns → the library default for the slot (getGridColumns
			// is preserved as the default tier inside resolveSlotColumns).
			return resolveSlotColumns(this.slotName, this.cnSlotColumns, this.columns)
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
		/**
		 * CSS custom properties driving the shared `.cn-grid` engine — the
		 * desktop column count for this slot. Responsive collapse (12 → 6 →
		 * 1) lives in `grid.css`.
		 *
		 * @return {object}
		 */
		gridVars() {
			return { '--cn-grid-cols': this.gridColumns }
		},
		/**
		 * Whether this slot's grid collapses responsively. Multi-column
		 * slots (body/footer/tab/section) do; the single-column sidebar
		 * slot stays put.
		 *
		 * @return {boolean}
		 */
		isResponsive() {
			return this.gridColumns > 1
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
					// Dashboard widget catalog (cn-widget-library): the 21 migrated
					// widgets self-register here. Resolved after cnRegistry + built-ins
					// so a consumer override still wins.
					const entry = getWidgetTypeEntry(key)
					component = (entry && entry.renderer) ?? null
				}

				if (!component) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnWidgetGrid] Unknown widgetKey "${key}" in slot "${this.slotName}". `
						+ 'Register it in the built-in registry or pass it via the CnAppRoot registry prop.',
					)
					// Render a visible, designed placeholder instead of silently
					// skipping — a page whose widgets ALL fail to resolve must not
					// leave a blank pane (2026-07-06 audit: petstore dashboard).
					result.push({
						id: widget.id ?? `unknown-${key}-${result.length}`,
						widgetKey: key,
						component: CnUnknownWidget,
						props: { widgetKey: key },
						gridX: widget.gridX,
						gridY: widget.gridY,
						gridWidth: typeof widget.gridWidth === 'number' ? widget.gridWidth : columns,
						gridHeight: widget.gridHeight,
					})
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
					id: widget.id,
					widgetKey: key,
					component,
					// Detail-page object context first, then the top-level
					// `dataSource` (v2 unified widget shape), then the
					// entry-level `title` / `documentationUrl` so the widget
					// chrome (CnWidgetWrapper) can render them, then the
					// manifest's per-widget `props` last so explicit props win.
					props: {
						...this.detailContextProps,
						...dataSourceProp,
						...(widget.title ? { title: widget.title } : {}),
						...(widget.documentationUrl ? { documentationUrl: widget.documentationUrl } : {}),
						...(widget.props ?? {}),
					},
					gridX: typeof widget.gridX === 'number' ? widget.gridX : 0,
					gridY: typeof widget.gridY === 'number' ? widget.gridY : 0,
					gridWidth,
					gridHeight: typeof widget.gridHeight === 'number' ? widget.gridHeight : 1,
				})
			}

			return result
		},
	},

	watch: {
		editableBody(active) {
			if (active) {
				this.$nextTick(() => this.initGrid())
			} else {
				this.destroyGrid()
			}
		},
	},

	mounted() {
		if (this.editableBody) this.initGrid()
	},

	beforeDestroy() {
		this.destroyGrid()
	},

	methods: {
		// Expose the shared grid helpers to the template.
		cnGridCellStyle,
		hasGridRow,
		/**
		 * Stable GridStack id for a widget entry (its id, else its index).
		 * @param {object} widget The resolved widget entry.
		 * @param {number} index The entry's position in the slot.
		 */
		gsId(widget, index) {
			return widget.id != null ? widget.id : `idx-${index}`
		},
		/** Initialise the GridStack engine on the editable body container. */
		initGrid() {
			const container = this.$refs.gridContainer
			if (!container) return
			const el = container.querySelector('.grid-stack')
			if (!el) return
			this.grid = initGridStack(el, { columns: this.gridColumns, editable: true })
			this.grid.on('change', (_event, items) => this.handleGridChange(items))
		},
		/** Tear down the GridStack engine. */
		destroyGrid() {
			if (this.grid) {
				this.grid.destroy(false)
				this.grid = null
			}
		},
		/**
		 * Write GridStack geometry back into the widget entries (matched by id,
		 * index fallback), clamped within the resolved column bound, and emit the
		 * updated list. Mutating the entries keeps the working manifest in sync.
		 *
		 * @param {Array} items The changed items from GridStack.
		 */
		handleGridChange(items) {
			const geom = readGridGeometry(items)
			const cols = this.gridColumns
			this.resolvedWidgets.forEach((resolved, index) => {
				const key = String(this.gsId(resolved, index))
				const g = geom.get(key)
				const target = this.widgets[index]
				if (!g || !target) return
				const width = Math.min(g.gridWidth, cols)
				const x = Math.min(g.gridX, Math.max(0, cols - width))
				target.gridX = x
				target.gridY = g.gridY
				target.gridWidth = width
				target.gridHeight = g.gridHeight
			})
			/**
			 * @event layout-change Emitted after a drag/resize with the updated widget entries.
			 * @type {Array}
			 */
			this.$emit('layout-change', this.widgets)
		},
	},
}
</script>

<style>
.cn-widget-grid {
	width: 100%;
}

.cn-widget-grid--editing {
	min-height: 120px;
}

.cn-widget-grid--editing .grid-stack {
	background: transparent;
}

.cn-widget-grid--editing .grid-stack-item-content {
	overflow: hidden;
	background: var(--color-main-background);
}

.cn-widget-grid--editing .grid-stack-placeholder > .placeholder-content {
	background: var(--color-primary-element-light);
	border: 2px dashed var(--color-primary-element);
	border-radius: var(--border-radius-large);
}
</style>
