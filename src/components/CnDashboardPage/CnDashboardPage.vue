<!--
  CnDashboardPage — Top-level dashboard page with GridStack widget grid.

  The dashboard equivalent of CnIndexPage. Assembles a complete dashboard
  from a widget definition array and a layout array. Supports:
  - Custom widgets via scoped slots (#widget-{widgetId})
  - Nextcloud Dashboard API widgets (auto-rendered)
  - Tile widgets (quick-access links)
  - Drag-and-drop editing mode
  - Header with title, actions, and edit toggle
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
				<!-- Public slot. Documented in CLAUDE.md and used by every
				     existing consumer (decidesk, mydash, opencatalogi,
				     pipelinq, procest). -->
				<slot name="header-actions" />
				<!-- Back-compat alias: original slot name shipped before
				     CLAUDE.md was updated. Render alongside so any
				     stragglers still work; consumers should prefer
				     #header-actions. -->
				<slot name="actions" />
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
		<NcLoadingIcon v-if="loading" />

		<!-- Empty state -->
		<div v-else-if="!hasWidgets" class="cn-dashboard-page__empty">
			<slot name="empty">
				<NcEmptyContent :description="emptyLabel">
					<template #icon>
						<ViewDashboardOutline :size="48" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Dashboard grid -->
		<CnDashboardGrid
			v-else
			:layout="layout"
			:editable="isEditing"
			:columns="columns"
			:cell-height="cellHeight"
			:margin="gridMargin"
			@layout-change="onLayoutChange">
			<template #widget="{ item }">
				<!-- Tile widget -->
				<CnTileWidget
					v-if="isTile(item)"
					:tile="getTileConfig(item)" />

				<!-- Custom slot widget — apps provide their own rendering -->
				<template v-else-if="hasWidgetSlot(item.widgetId)">
					<CnWidgetWrapper
						:title="getWidgetTitle(item)"
						:icon-url="getWidgetIconUrl(item)"
						:icon-class="getWidgetIconClass(item)"
						:show-title="item.showTitle !== false"
						:borderless="item.showTitle === false"
						:flush="item.flush === true"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						:title-icon-position="getWidgetTitleIconPosition(item)"
						:title-icon-color="getWidgetTitleIconColor(item)">
						<!-- Per-widget title icon (e.g. #widget-my-work-title-icon) -->
						<template v-if="$slots['widget-' + item.widgetId + '-title-icon']" #title-icon>
							<slot :name="'widget-' + item.widgetId + '-title-icon'" :item="item" :widget="getWidgetDef(item.widgetId)" />
						</template>
						<!-- Per-widget header actions (e.g. #widget-my-work-actions) -->
						<template v-if="$slots['widget-' + item.widgetId + '-actions']" #actions>
							<slot :name="'widget-' + item.widgetId + '-actions'" :item="item" :widget="getWidgetDef(item.widgetId)" />
						</template>
						<slot :name="'widget-' + item.widgetId" :item="item" :widget="getWidgetDef(item.widgetId)" />
					</CnWidgetWrapper>
				</template>

				<!-- NC Dashboard API widget -->
				<template v-else-if="isNcWidget(item)">
					<CnWidgetWrapper
						:title="getWidgetTitle(item)"
						:icon-url="getWidgetIconUrl(item)"
						:icon-class="getWidgetIconClass(item)"
						:show-title="item.showTitle !== false"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}">
						<CnWidgetRenderer
							:widget="getWidgetDef(item.widgetId)"
							:unavailable-text="unavailableLabel" />
					</CnWidgetWrapper>
				</template>

				<!-- Unknown widget fallback -->
				<CnWidgetWrapper
					v-else
					:title="getWidgetTitle(item)"
					:show-title="item.showTitle !== false">
					<div class="cn-dashboard-page__unknown">
						{{ unavailableLabel }}
					</div>
				</CnWidgetWrapper>
			</template>
		</CnDashboardGrid>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'
import ViewDashboardOutline from 'vue-material-design-icons/ViewDashboardOutline.vue'
import CnDashboardGrid from '../CnDashboardGrid/CnDashboardGrid.vue'
import CnWidgetWrapper from '../CnWidgetWrapper/CnWidgetWrapper.vue'
import CnWidgetRenderer from '../CnWidgetRenderer/CnWidgetRenderer.vue'
import CnTileWidget from '../CnTileWidget/CnTileWidget.vue'

/**
 * CnDashboardPage — Top-level dashboard page component.
 *
 * The dashboard equivalent of CnIndexPage. Renders a configurable grid
 * of widgets from a `widgets` definition array and a `layout` array.
 *
 * Widget types:
 * 1. **Custom** — App provides rendering via `#widget-{widgetId}` slot
 * 2. **NC Dashboard API** — Widgets with `itemApiVersions` are auto-rendered
 * 3. **Tile** — Items with `type: 'tile'` render as quick-access tiles
 *
 * Basic usage with custom widgets
 * <CnDashboardPage
 *   title="Dashboard"
 *   :widgets="widgetDefs"
 *   :layout="savedLayout"
 *   @layout-change="saveLayout">
 *   <template #widget-cases-by-status="{ item }">
 *     <StatusChart :data="statusData" />
 *   </template>
 *   <template #widget-my-work="{ item }">
 *     <MyWorkList :items="workItems" />
 *   </template>
 * </CnDashboardPage>
 *
 * With NC Dashboard API widgets
 * <CnDashboardPage
 *   title="Dashboard"
 *   :widgets="[...appWidgets, ...ncWidgets]"
 *   :layout="layout"
 *   @layout-change="saveLayout" />
 */
export default {
	name: 'CnDashboardPage',

	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		Pencil,
		Check,
		ViewDashboardOutline,
		CnDashboardGrid,
		CnWidgetWrapper,
		CnWidgetRenderer,
		CnTileWidget,
	},

	props: {
		/** Page title */
		title: {
			type: String,
			default: '',
		},
		/** Page description (shown below title) */
		description: {
			type: String,
			default: '',
		},
		/**
		 * Widget definitions array. Each widget defines metadata for rendering.
		 *
		 * Custom widgets: `{ id: 'my-widget', title: 'My Widget', type: 'custom' }`
		 * NC API widgets: `{ id: 'calendar', title: 'Calendar', itemApiVersions: [1,2], ... }`
		 * Tile widgets: `{ id: 'tile-files', type: 'tile', title: 'Files', icon: 'M12...', iconType: 'svg', backgroundColor: '#0082c9', textColor: '#fff', linkType: 'app', linkValue: 'files' }`
		 *
		 * @type {Array<{ id: string, title: string, type?: string, iconUrl?: string, iconClass?: string, buttons?: Array, itemApiVersions?: number[], reloadInterval?: number, [key: string]: any }>}
		 */
		widgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * Layout array defining widget positions in the grid.
		 *
		 * Each item: `{ id: 'unique-id', widgetId: 'my-widget', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }`
		 *
		 * Additional properties (showTitle, styleConfig, tile config) are passed through.
		 *
		 * @type {Array<{ id: string|number, widgetId: string, gridX: number, gridY: number, gridWidth: number, gridHeight: number, showTitle?: boolean, styleConfig?: object, [key: string]: any }>}
		 */
		layout: {
			type: Array,
			default: () => [],
		},
		/** Whether the dashboard is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Whether to show the edit toggle button */
		allowEdit: {
			type: Boolean,
			default: false,
		},
		/** Number of grid columns */
		columns: {
			type: Number,
			default: 12,
		},
		/** Grid cell height in pixels */
		cellHeight: {
			type: Number,
			default: 80,
		},
		/** Grid margin in pixels */
		gridMargin: {
			type: Number,
			default: 12,
		},
		/** Label for the edit button */
		editLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Edit'),
		},
		/** Label for the done button (when editing) */
		doneLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Done'),
		},
		/** Label for the empty state */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No widgets configured'),
		},
		/** Label for unavailable widgets */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Widget not available'),
		},
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
	},

	methods: {
		toggleEdit() {
			this.isEditing = !this.isEditing
			this.$emit('edit-toggle', this.isEditing)
		},

		onLayoutChange(updated) {
			this.$emit('layout-change', updated)
		},

		getWidgetDef(widgetId) {
			return this.widgetMap[widgetId] || null
		},

		getWidgetTitle(item) {
			const def = this.getWidgetDef(item.widgetId)
			return item.customTitle || def?.title || item.widgetId
		},

		getWidgetIconUrl(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.iconUrl || null
		},

		getWidgetIconClass(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.iconClass || null
		},

		getWidgetButtons(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.buttons || []
		},

		getWidgetTitleIconPosition(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.titleIconPosition || 'right'
		},

		getWidgetTitleIconColor(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.titleIconColor || null
		},

		isTile(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'tile'
		},

		getTileConfig(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def) return null
			return {
				title: def.title,
				icon: def.icon,
				iconType: def.iconType,
				backgroundColor: def.backgroundColor,
				textColor: def.textColor,
				linkType: def.linkType,
				linkValue: def.linkValue,
			}
		},

		isNcWidget(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.itemApiVersions && def.itemApiVersions.length > 0
		},

		hasWidgetSlot(widgetId) {
			return !!this.$scopedSlots['widget-' + widgetId]
		},
	},
}
</script>

<style scoped>
.cn-dashboard-page {
	padding: 20px;
	max-width: 1400px;
}

.cn-dashboard-page__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 20px;
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

.cn-dashboard-page__empty {
	padding: 60px 20px;
}

.cn-dashboard-page__unknown {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	padding: 16px;
}
</style>
