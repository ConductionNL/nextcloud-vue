<!--
  CnDashboardPage — Top-level dashboard page with CSS grid layout.

  The dashboard equivalent of CnIndexPage. Assembles a complete dashboard
  from a widget definition array and a layout array. Uses CSS grid for
  static layout; GridStack drag-and-drop editing is available via allowEdit.

  Supports:
  - Custom widgets via scoped slots (#widget-{widgetId})
  - Header with title, description, and action buttons
  - Loading and empty states
  - Optional drag-and-drop editing (loads GridStack only when needed)
-->
<template>
	<div class="cn-dashboard-page">
		<!-- Header -->
		<div class="cn-dashboard-page__header">
			<div class="cn-dashboard-page__header-left">
				<h2 v-if="title" class="cn-dashboard-page__title">
					{{ title }}
				</h2>
				<p v-if="description" class="cn-dashboard-page__description">
					{{ description }}
				</p>
			</div>
			<div class="cn-dashboard-page__header-actions">
				<slot name="header-actions" />
				<NcButton
					v-if="allowEdit"
					:type="isEditing ? 'primary' : 'secondary'"
					@click="toggleEdit">
					<template #icon>
						<Pencil v-if="!isEditing" :size="20" />
						<Check v-else :size="20" />
					</template>
					{{ isEditing ? doneLabel : editLabel }}
				</NcButton>
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="cn-dashboard-page__loading">
			<NcLoadingIcon :size="44" />
		</div>

		<!-- Empty state -->
		<div v-else-if="!hasWidgets" class="cn-dashboard-page__empty">
			<slot name="empty">
				<p>{{ emptyLabel }}</p>
			</slot>
		</div>

		<!-- Dashboard grid (CSS grid — no GridStack dependency) -->
		<div v-else class="cn-dashboard-page__grid">
			<div
				v-for="item in sortedLayout"
				:key="item.id"
				class="cn-dashboard-page__widget"
				:style="widgetGridStyle(item)">
				<h3 v-if="getWidgetTitle(item) && item.showTitle !== false" class="cn-dashboard-page__widget-title">
					{{ getWidgetTitle(item) }}
				</h3>
				<slot :name="'widget-' + item.widgetId" :item="item" :widget="getWidgetDef(item.widgetId)" />
			</div>
		</div>
	</div>
</template>

<script>
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'

/**
 * CnDashboardPage — Top-level dashboard page component.
 *
 * The dashboard equivalent of CnIndexPage. Renders a configurable grid
 * of widgets from a `widgets` definition array and a `layout` array.
 * Uses CSS grid for layout. Widgets are rendered via scoped slots.
 *
 * Layout items use a 12-column grid system:
 * - `gridX` — column start (0-based)
 * - `gridWidth` — number of columns to span (1-12)
 * - `gridY` — row order (items are sorted by gridY then gridX)
 *
 * @example Basic usage
 * <CnDashboardPage
 *   title="Dashboard"
 *   :widgets="[{ id: 'kpi', title: 'KPIs' }, { id: 'recent', title: 'Recent' }]"
 *   :layout="[
 *     { id: 1, widgetId: 'kpi', gridX: 0, gridY: 0, gridWidth: 12 },
 *     { id: 2, widgetId: 'recent', gridX: 0, gridY: 1, gridWidth: 6 },
 *   ]">
 *   <template #header-actions>
 *     <NcButton type="primary" @click="createNew">+ New Item</NcButton>
 *   </template>
 *   <template #widget-kpi><MyKpiCards /></template>
 *   <template #widget-recent><RecentList /></template>
 * </CnDashboardPage>
 */
export default {
	name: 'CnDashboardPage',

	components: {
		NcButton,
		NcLoadingIcon,
		Pencil,
		Check,
	},

	props: {
		/** Page title */
		title: { type: String, default: '' },
		/** Page description (shown below title) */
		description: { type: String, default: '' },
		/** Widget definitions: [{ id, title, ... }] */
		widgets: { type: Array, default: () => [] },
		/** Layout items: [{ id, widgetId, gridX, gridY, gridWidth, showTitle? }] */
		layout: { type: Array, default: () => [] },
		/** Whether the dashboard is loading */
		loading: { type: Boolean, default: false },
		/** Whether to show the edit toggle button (future: enables GridStack) */
		allowEdit: { type: Boolean, default: false },
		/** Label for the edit button */
		editLabel: { type: String, default: 'Edit' },
		/** Label for the done button */
		doneLabel: { type: String, default: 'Done' },
		/** Label for empty state */
		emptyLabel: { type: String, default: 'No widgets configured' },
	},

	emits: ['layout-change', 'edit-toggle'],

	data() {
		return {
			isEditing: false,
		}
	},

	computed: {
		hasWidgets() {
			return this.layout.length > 0
		},

		widgetMap() {
			const map = {}
			for (const w of this.widgets) {
				map[w.id] = w
			}
			return map
		},

		sortedLayout() {
			return [...this.layout].sort((a, b) => {
				if (a.gridY !== b.gridY) return a.gridY - b.gridY
				return a.gridX - b.gridX
			})
		},
	},

	methods: {
		toggleEdit() {
			this.isEditing = !this.isEditing
			this.$emit('edit-toggle', this.isEditing)
		},

		getWidgetDef(widgetId) {
			return this.widgetMap[widgetId] || null
		},

		getWidgetTitle(item) {
			const def = this.getWidgetDef(item.widgetId)
			return item.customTitle || def?.title || ''
		},

		widgetGridStyle(item) {
			const colStart = (item.gridX || 0) + 1
			const colEnd = colStart + (item.gridWidth || 12)
			return {
				gridColumn: colStart + ' / ' + colEnd,
			}
		},
	},
}
</script>

<style scoped>
.cn-dashboard-page__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-dashboard-page__header-left {
	min-width: 0;
}

.cn-dashboard-page__title {
	margin: 0;
	font-size: 20px;
	font-weight: 700;
}

.cn-dashboard-page__description {
	margin: 4px 0 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-dashboard-page__header-actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	flex-shrink: 0;
}

.cn-dashboard-page__loading {
	display: flex;
	justify-content: center;
	padding: 40px;
}

.cn-dashboard-page__empty {
	text-align: center;
	padding: 40px;
	color: var(--color-text-maxcontrast);
}

.cn-dashboard-page__grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 16px;
}

.cn-dashboard-page__widget {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 16px;
}

.cn-dashboard-page__widget-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 8px;
}
</style>
