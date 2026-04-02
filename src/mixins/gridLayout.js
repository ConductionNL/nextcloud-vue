/**
 * Grid layout mixin for static 12-column CSS grid layouts.
 *
 * Provides a shared grid engine for components that render widget-based layouts
 * using CSS Grid (as opposed to GridStack's absolute positioning). Used by
 * CnDetailPage for static grid layout mode.
 *
 * @mixin gridLayout
 *
 * @example
 * import { gridLayout } from '@conduction/nextcloud-vue/src/mixins/gridLayout.js'
 *
 * export default {
 *   mixins: [gridLayout],
 *   // Use this.sortedLayout and this.widgetGridStyle(item) in template
 * }
 */
export const gridLayout = {
	props: {
		/**
		 * Grid layout definition. Array of placement objects defining where each widget
		 * appears in the 12-column grid.
		 *
		 * @type {{ id: number, widgetId: string, gridX: number, gridY: number, gridWidth: number, gridHeight?: number, showTitle?: boolean }[]}
		 */
		layout: {
			type: Array,
			default: () => [],
		},
		/**
		 * Widget definitions. Array of widget objects with id and title.
		 *
		 * @type {{ id: string, title: string, type?: string }[]}
		 */
		widgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * Number of grid columns.
		 *
		 * @type {number}
		 */
		columns: {
			type: Number,
			default: 12,
		},
	},

	computed: {
		/**
		 * Layout items sorted by gridY (row) then gridX (column) for proper
		 * rendering order. Ensures DOM order matches visual order for
		 * accessibility (WCAG 2.4.3 Focus Order).
		 *
		 * @return {Array} Sorted copy of the layout array.
		 */
		sortedLayout() {
			if (!this.layout) return []
			return [...this.layout].sort((a, b) => {
				if (a.gridY !== b.gridY) {
					return a.gridY - b.gridY
				}
				return a.gridX - b.gridX
			})
		},

		/**
		 * Whether grid layout mode is active (layout array is provided and non-empty).
		 *
		 * @return {boolean}
		 */
		hasGridLayout() {
			return Array.isArray(this.layout) && this.layout.length > 0
		},
	},

	methods: {
		/**
		 * Compute CSS grid placement styles for a layout item.
		 *
		 * Maps the layout item's gridX and gridWidth to CSS grid-column values,
		 * and gridY + gridHeight to grid-row values.
		 *
		 * @param {{ gridX: number, gridWidth: number, gridY?: number, gridHeight?: number }} item - Layout item.
		 * @return {object} CSS style object for grid-column and grid-row placement.
		 */
		widgetGridStyle(item) {
			const colStart = (item.gridX || 0) + 1
			const colEnd = colStart + (item.gridWidth || this.columns)

			const style = {
				gridColumn: `${colStart} / ${colEnd}`,
			}

			// Only set grid-row if explicit height is provided
			if (item.gridY !== undefined && item.gridHeight) {
				const rowStart = item.gridY + 1
				const rowEnd = rowStart + item.gridHeight
				style.gridRow = `${rowStart} / ${rowEnd}`
			}

			return style
		},

		/**
		 * Find the widget definition for a layout item.
		 *
		 * @param {{ widgetId: string }} item - Layout item with widgetId reference.
		 * @return {object|undefined} The matching widget definition.
		 */
		findWidget(item) {
			return this.widgets.find(w => w.id === item.widgetId)
		},
	},
}

export default gridLayout
