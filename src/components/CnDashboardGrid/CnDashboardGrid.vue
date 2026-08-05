<!--
  CnDashboardGrid — GridStack-powered drag-and-drop dashboard grid.

  Renders widgets in a configurable grid layout. Supports drag, resize,
  and dynamic item addition/removal. Emits layout changes for persistence.
-->
<template>
	<div ref="gridContainer" class="cn-dashboard-grid">
		<div class="grid-stack">
			<div
				v-for="item in layout"
				:key="resolveItemKey(item)"
				class="grid-stack-item"
				:gs-id="item.id"
				:gs-x="item.gridX"
				:gs-y="item.gridY"
				:gs-w="item.gridWidth"
				:gs-h="item.gridHeight"
				:gs-min-w="minWidth"
				:gs-min-h="minHeight">
				<div class="grid-stack-item-content">
					<slot name="widget" :item="item">
						<!-- Default: render nothing; CnDashboardPage provides content -->
					</slot>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

/**
 * CnDashboardGrid — Low-level grid layout engine powered by GridStack.
 *
 * Manages the drag-and-drop grid, syncs positions, and emits layout
 * changes. Does NOT handle widget rendering — that's done by the parent
 * via the `#widget` scoped slot.
 *
 * ```vue
 * <CnDashboardGrid
 *   :layout="placements"
 *   :editable="isEditing"
 *   @layout-change="onLayoutChange">
 *   <template #widget="{ item }">
 *     <MyWidget :config="item" />
 *   </template>
 * </CnDashboardGrid>
 * ```
 */
export default {
	name: 'CnDashboardGrid',

	props: {
		/** Array of layout items: { id, gridX, gridY, gridWidth, gridHeight, ...extra } */
		layout: {
			type: Array,
			required: true,
		},
		/** Whether drag and resize are enabled */
		editable: {
			type: Boolean,
			default: false,
		},
		/** Number of grid columns */
		columns: {
			type: Number,
			default: 12,
		},
		/** Cell height in pixels */
		cellHeight: {
			type: Number,
			default: 80,
		},
		/** Grid margin in pixels */
		margin: {
			type: Number,
			default: 12,
		},
		/** Minimum widget width in grid units */
		minWidth: {
			type: Number,
			default: 2,
		},
		/** Minimum widget height in grid units */
		minHeight: {
			type: Number,
			default: 2,
		},
		/**
		 * GridStack v12 responsive `columnOpts` bag (breakpoints + reflow
		 * layout). When set, the grid reflows column count across screen sizes.
		 * Build it with `getDashboardColumnOpts()`. Default `null` = fixed
		 * `columns`, no responsive reflow (backwards-compatible).
		 *
		 * @type {object|null}
		 */
		columnOpts: {
			type: Object,
			default: null,
		},
		/**
		 * When set, `cellHeight` is mirrored into this CSS custom property on
		 * the document root at init (e.g. `'--app-cell-height'`), so app CSS can
		 * align to the grid geometry. Default `null` = no CSS var written.
		 *
		 * @type {string|null}
		 */
		cellHeightCssVar: {
			type: String,
			default: null,
		},
		/**
		 * Optional `(item) => string|number` to derive each item's render key.
		 * Use it to force a re-render when an item changes in a way its `id`
		 * doesn't capture (e.g. style edits — return `${item.id}:${item.updatedAt}`).
		 * Default `null` = key on `item.id`.
		 *
		 * @type {Function|null}
		 */
		itemKey: {
			type: Function,
			default: null,
		},
	},

	emits: ['layout-change'],

	data() {
		return {
			grid: null,
		}
	},

	watch: {
		editable(val) {
			if (!this.grid) return
			if (val) {
				this.grid.enable()
			} else {
				this.grid.disable()
			}
		},

		layout: {
			deep: true,
			handler(newLayout) {
				if (this.grid) {
					this.syncGridItems(newLayout)
				}
			},
		},
	},

	mounted() {
		this.initGrid()
	},

	beforeUnmount() {
		if (this.grid) {
			this.grid.destroy(false)
		}
	},

	methods: {
		/**
		 * Derive the v-for render key for a layout item, honouring the optional
		 * `itemKey` prop and falling back to `item.id`.
		 *
		 * @param {object} item the layout item.
		 * @return {string|number} the render key.
		 */
		resolveItemKey(item) {
			return this.itemKey ? this.itemKey(item) : item.id
		},

		initGrid() {
			if (this.cellHeightCssVar && typeof document !== 'undefined' && document.documentElement) {
				document.documentElement.style.setProperty(this.cellHeightCssVar, `${this.cellHeight}px`)
			}
			const el = this.$refs.gridContainer.querySelector('.grid-stack')
			this.grid = GridStack.init({
				column: this.columns,
				cellHeight: this.cellHeight,
				margin: this.margin,
				float: true,
				animate: true,
				disableDrag: !this.editable,
				disableResize: !this.editable,
				removable: false,
				...(this.columnOpts ? { columnOpts: this.columnOpts } : {}),
			}, el)

			this.grid.on('change', (_event, items) => {
				this.handleGridChange(items)
			})
		},

		handleGridChange(items) {
			if (!items || items.length === 0) return

			const updated = this.layout.map(item => {
				const gridItem = items.find(gi => String(gi.id) === String(item.id))
				if (gridItem) {
					return {
						...item,
						gridX: gridItem.x,
						gridY: gridItem.y,
						gridWidth: gridItem.w,
						gridHeight: gridItem.h,
					}
				}
				return item
			})

			this.$emit('layout-change', updated)
		},

		syncGridItems(newLayout) {
			// Add new items, and re-adopt items whose backing DOM element was
			// replaced. When a consumer's `itemKey` changes for an unchanged
			// `id` (e.g. a style edit — the documented use of `itemKey`), Vue
			// swaps the element. GridStack keeps tracking the old, now-detached
			// element, leaving the new one unmanaged (no positioning/sizing) —
			// so re-register it against the new element.
			for (const item of newLayout) {
				this.$nextTick(() => {
					const el = this.$refs.gridContainer.querySelector(`[gs-id="${item.id}"]`)
					if (!el) {
						return
					}
					const node = this.grid.engine.nodes.find(
						n => String(n.id) === String(item.id),
					)
					if (!node) {
						this.grid.makeWidget(el)
					} else if (node.el !== el) {
						// Drop the stale node without touching its detached DOM,
						// then adopt the new element so GridStack sizes/places it.
						this.grid.removeWidget(node.el, false, false)
						this.grid.makeWidget(el)
					}
				})
			}

			// Remove items no longer in layout
			const ids = newLayout.map(i => String(i.id))
			const toRemove = this.grid.engine.nodes.filter(
				n => !ids.includes(String(n.id)),
			)
			for (const node of toRemove) {
				const el = this.$refs.gridContainer.querySelector(`[gs-id="${node.id}"]`)
				if (el) {
					this.grid.removeWidget(el, false)
				}
			}
		},
	},
}
</script>

<style scoped>
.cn-dashboard-grid {
	width: 100%;
	min-height: 200px;
}

.grid-stack {
	background: transparent;
}

:deep(.grid-stack-item-content) {
	background: var(--color-main-background);
	/* Match CnWidgetWrapper's container radius: this backing surface sits
	   BEHIND the rounded widget card, and a square (radius 0) backing pokes
	   out at the card's corners whenever --color-main-background differs
	   from the page background (dark mode / tinted themes) — a dark grey
	   square under every rounded corner. */
	border-radius: var(--border-radius-container-large, 16px);
	border: none;
	box-shadow: none;
	overflow: hidden;
}

:deep(.grid-stack-item-content:has(.cn-widget-wrapper--borderless)) {
	background: transparent;
}

:deep(.grid-stack-placeholder > .placeholder-content) {
	background: var(--color-primary-element-light);
	border: 2px dashed var(--color-primary-element);
	border-radius: var(--border-radius-large);
}
</style>
