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
				:key="item.id"
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
 * @example
 * <CnDashboardGrid
 *   :layout="placements"
 *   :editable="isEditing"
 *   @layout-change="onLayoutChange">
 *   <template #widget="{ item }">
 *     <MyWidget :config="item" />
 *   </template>
 * </CnDashboardGrid>
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

	beforeDestroy() {
		if (this.grid) {
			this.grid.destroy(false)
		}
	},

	methods: {
		initGrid() {
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
			// Add items that don't exist in grid yet
			for (const item of newLayout) {
				const exists = this.grid.engine.nodes.find(
					n => String(n.id) === String(item.id),
				)
				if (!exists) {
					this.$nextTick(() => {
						const el = this.$refs.gridContainer.querySelector(`[gs-id="${item.id}"]`)
						if (el) {
							this.grid.makeWidget(el)
						}
					})
				}
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
	border-radius: 0;
	border: none;
	box-shadow: none;
	overflow: hidden;
}

:deep(.grid-stack-placeholder > .placeholder-content) {
	background: var(--color-primary-element-light);
	border: 2px dashed var(--color-primary-element);
	border-radius: var(--border-radius-large);
}
</style>
