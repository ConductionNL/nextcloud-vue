<!--
  CnDetailPage — Generic detail/overview page.

  The detail page equivalent of CnDashboardPage. Assembles a complete entity detail
  view from card-based sections, matching the dashboard visual style (rounded cards
  with headers). Uses a fixed declarative layout (no drag-and-drop).

  Features:
  - Header with back button, title, subtitle, and action buttons
  - Card-based content area (via default slot with CnDetailCard components)
  - Optional 12-column CSS grid layout mode (via layout + widgets props)
  - Optional right sidebar (CnObjectSidebar) for files, notes, tags, tasks, audit trail
  - Loading and error states
  - Edit mode toggle

  A simpler alternative to CnIndexPage for detail, stats, and overview pages.
  No multi-object table, no CRUD dialogs — just a clean layout with:
  - Header (title, description, icon, action buttons)
  - Loading / error / empty states
  - Statistics table section
  - Content sections via slots
-->
<template>
	<div class="cn-detail-page" :style="{ maxWidth: maxWidth }">
		<!-- Header -->
		<div class="cn-detail-page__header">
			<!-- Header (left block) — overridable via #header slot. Default
			     renders the icon + title + description. The right-hand
			     #actions slot remains separate so headerComponent and
			     actionsComponent can be replaced independently. -->
			<slot
				name="header"
				:title="title"
				:description="description"
				:icon="icon"
				:icon-size="iconSize">
				<div class="cn-detail-page__header-left">
					<slot name="icon">
						<CnIcon
							v-if="icon"
							:name="icon"
							:size="iconSize"
							class="cn-detail-page__icon" />
					</slot>
					<div class="cn-detail-page__header-text">
						<h2 v-if="title" class="cn-detail-page__title">
							{{ title }}
						</h2>
						<p v-if="description" class="cn-detail-page__description">
							{{ description }}
						</p>
					</div>
				</div>
			</slot>
			<div class="cn-detail-page__header-actions">
				<slot name="actions" />
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="cn-detail-page__loading">
			<NcLoadingIcon :size="32" />
			<span>{{ loadingLabel }}</span>
		</div>

		<!-- Error state -->
		<div v-else-if="error" class="cn-detail-page__error">
			<slot name="error">
				<NcEmptyContent :name="errorMessage">
					<template #icon>
						<AlertCircleOutline :size="48" />
					</template>
					<template #action>
						<NcButton v-if="onRetry" type="primary" @click="onRetry">
							<template #icon>
								<Refresh :size="20" />
							</template>
							{{ retryLabel }}
						</NcButton>
						<slot name="error-actions" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Empty state -->
		<div v-else-if="empty" class="cn-detail-page__empty">
			<slot name="empty">
				<NcEmptyContent :name="emptyLabel">
					<template #icon>
						<InformationOutline :size="48" />
					</template>
					<template #action>
						<slot name="empty-actions" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Main content -->
		<div v-else class="cn-detail-page__body">
			<!-- Grid layout mode -->
			<div v-if="hasGridLayout" class="cn-detail-page__content cn-detail-page__content--grid">
				<section
					v-for="item in sortedLayout"
					:key="item.id"
					:style="widgetGridStyle(item)"
					class="cn-detail-page__grid-item"
					:aria-labelledby="item.showTitle !== false && findWidget(item) ? `widget-title-${item.id}` : undefined">
					<h3
						v-if="item.showTitle !== false && findWidget(item)"
						:id="`widget-title-${item.id}`"
						class="cn-detail-page__widget-title">
						{{ findWidget(item).title }}
					</h3>
					<slot
						:name="`widget-${item.widgetId}`"
						:item="item"
						:widget="findWidget(item)" />
				</section>
			</div>

			<!-- Statistics table -->
			<div v-if="hasStats" class="cn-detail-page__stats">
				<slot name="stats-header">
					<h3 v-if="statsTitle" class="cn-detail-page__section-title">
						{{ statsTitle }}
					</h3>
				</slot>
				<table class="cn-detail-page__stats-table">
					<thead v-if="statsColumns.length > 0">
						<tr>
							<th v-for="col in statsColumns" :key="col.key" :class="col.align ? 'cn-detail-page__stats-cell--' + col.align : ''">
								{{ col.label }}
							</th>
						</tr>
					</thead>
					<tbody>
						<slot name="stats-rows">
							<tr v-for="(row, index) in statsRows" :key="index" :class="{ 'cn-detail-page__stats-row--sub': row.indent }">
								<td v-for="col in statsColumns" :key="col.key" :class="[row.indent ? 'cn-detail-page__stats-cell--indented' : '', col.align ? 'cn-detail-page__stats-cell--' + col.align : '']">
									{{ row[col.key] !== undefined ? row[col.key] : '-' }}
								</td>
							</tr>
						</slot>
					</tbody>
				</table>
			</div>

			<!-- Default vertical stacking mode -->
			<div v-else class="cn-detail-page__content">
				<!-- Default content -->
				<div class="cn-detail-page__content">
					<slot />
				</div>

				<!-- Sections slot — additional content below stats -->
				<div v-if="$slots.sections" class="cn-detail-page__sections">
					<slot name="sections" />
				</div>
			</div>

			<!-- Footer -->
			<div v-if="$slots.footer" class="cn-detail-page__footer">
				<slot name="footer" />
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import { gridLayout } from '../../mixins/gridLayout.js'
import Refresh from 'vue-material-design-icons/Refresh.vue'

/**
 * CnDetailPage — Generic detail/overview page.
 *
 * Supports two layout modes:
 * 1. **Default (vertical stacking):** Content provided via default slot, cards stack vertically.
 * 2. **Grid layout:** When `layout` and `widgets` props are provided, content renders in a
 *    12-column CSS grid with `#widget-{widgetId}` scoped slots. Same API as CnDashboardPage.
 *
 * @example Basic usage (vertical stacking)
 *
 * A simpler alternative to CnIndexPage for pages that display detail info,
 * statistics, charts, or card grids — without multi-object tables or CRUD
 * dialogs. Provides a consistent layout with header, loading/error/empty
 * states, a statistics table, and flexible content slots.
 *
 * @example Basic usage with stats table and content
 * <CnDetailPage
 *   title="Register Overview"
 *   description="Statistics and schema details"
 *   icon="DatabaseOutline"
 *   :stats-title="'Register Statistics'"
 *   :stats-columns="[
 *     { key: 'type', label: 'Type' },
 *     { key: 'total', label: 'Total' },
 *     { key: 'size', label: 'Size' },
 *   ]"
 *   :stats-rows="[
 *     { type: 'Objects', total: 150, size: '2.4 MB' },
 *     { type: 'Files', total: 42, size: '1.1 MB' },
 *   ]"
 *   :loading="isLoading">
 *   <ChartGrid :data="chartData" />
 *   <SchemaCards :schemas="schemas" />
 * </CnDetailPage>
 *
 * @example Grid layout mode
 * <CnDetailPage
 *   title="Character Detail"
 *   :layout="[
 *     { id: 1, widgetId: 'info', gridX: 0, gridY: 0, gridWidth: 8 },
 *     { id: 2, widgetId: 'stats', gridX: 8, gridY: 0, gridWidth: 4 },
 *   ]"
 *   :widgets="[
 *     { id: 'info', title: 'Character Info' },
 *     { id: 'stats', title: 'Statistics' },
 *   ]">
 *   <template #widget-info="{ item, widget }">
 *     <CharacterInfoCard :character="character" />
 *   </template>
 *   <template #widget-stats="{ item, widget }">
 *     <StatsCard :stats="character.stats" />
 *   </template>
 *
 * @example With header actions and error handling
 * <CnDetailPage
 *   title="Schema Details"
 *   :error="hasError"
 *   error-message="Failed to load schema"
 *   :on-retry="loadSchema">
 *   <template #actions>
 *     <NcButton @click="editSchema">Edit</NcButton>
 *   </template>
 *   <DetailContent :schema="schema" />
 * </CnDetailPage>
 */
export default {
	name: 'CnDetailPage',

	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		CnIcon,
		AlertCircleOutline,
		InformationOutline,
		Refresh,
	},

	mixins: [gridLayout],

	inject: {
		objectSidebarState: { default: null },
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
		/** Optional MDI icon name (rendered via CnIcon) */
		icon: {
			type: String,
			default: '',
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 28,
		},
		/** Whether the page is in a loading state */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Message shown during loading */
		loadingLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
		/** Whether to activate the external sidebar (via objectSidebarState inject) */
		sidebar: {
			type: Boolean,
			default: false,
		},
		/** Whether the sidebar is open (expanded) */
		sidebarOpen: {
			type: Boolean,
			default: true,
		},
		/** The registered object type slug for the sidebar */
		objectType: {
			type: String,
			default: '',
		},
		/** The object ID to display in the sidebar */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/** Subtitle shown in the sidebar header */
		subtitle: {
			type: String,
			default: '',
		},
		/** Additional sidebar configuration (register, schema, hiddenTabs, title, subtitle) */
		sidebarProps: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the page is in an error state */
		error: {
			type: Boolean,
			default: false,
		},
		/** Error message shown in error state */
		errorMessage: {
			type: String,
			default: () => t('nextcloud-vue', 'An error occurred'),
		},
		/** Callback for retry button in error state. If null, no retry button is shown. */
		onRetry: {
			type: Function,
			default: null,
		},
		/** Label for the retry button */
		retryLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Retry'),
		},
		/** Whether the page has no data to show */
		empty: {
			type: Boolean,
			default: false,
		},
		/** Message shown when page is empty */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No data available'),
		},
		/** Title shown above the statistics table */
		statsTitle: {
			type: String,
			default: '',
		},
		/**
		 * Column definitions for the statistics table.
		 * Each column: `{ key: string, label: string, align?: 'left'|'center'|'right' }`
		 *
		 * @type {Array<{ key: string, label: string, align?: string }>}
		 */
		statsColumns: {
			type: Array,
			default: () => [],
		},
		/**
		 * Row data for the statistics table. Each row is an object keyed by
		 * column keys. Set `indent: true` on a row for sub-row styling.
		 *
		 * @type {Array<object>}
		 */
		statsRows: {
			type: Array,
			default: () => [],
		},
		/** Maximum width of the page content */
		maxWidth: {
			type: String,
			default: '1200px',
		},
	},

	computed: {
		/**
		 * Whether the sidebar is rendered externally (via objectSidebarState inject)
		 * rather than inline. When external, CnDetailPage only manages state —
		 * the parent App renders the actual NcAppSidebar.
		 */
		hasExternalSidebar() {
			return !!this.objectSidebarState
		},
		hasStats() {
			return this.statsColumns.length > 0 && (this.statsRows.length > 0 || !!this.$slots['stats-rows'])
		},
	},

	watch: {
		sidebar: {
			immediate: true,
			handler() { this.syncSidebarState() },
		},
		title() { this.syncSidebarState() },
		subtitle() { this.syncSidebarState() },
		objectType() { this.syncSidebarState() },
		objectId() { this.syncSidebarState() },
		sidebarProps: {
			deep: true,
			handler() { this.syncSidebarState() },
		},
	},

	beforeDestroy() {
		if (this.hasExternalSidebar) {
			this.objectSidebarState.active = false
		}
	},

	methods: {
		syncSidebarState() {
			if (!this.hasExternalSidebar) return
			if (this.sidebar && this.objectType && this.objectId) {
				this.objectSidebarState.active = true
				this.objectSidebarState.open = this.sidebarOpen
				this.objectSidebarState.objectType = this.objectType
				this.objectSidebarState.objectId = this.objectId
				this.objectSidebarState.title = this.sidebarProps.title || this.title || ''
				this.objectSidebarState.subtitle = this.sidebarProps.subtitle || this.subtitle || ''
				this.objectSidebarState.register = this.sidebarProps.register || ''
				this.objectSidebarState.schema = this.sidebarProps.schema || ''
				this.objectSidebarState.hiddenTabs = this.sidebarProps.hiddenTabs || []
			} else {
				this.objectSidebarState.active = false
			}
		},
	},
}
</script>

<!-- Styles in css/detail-page.css -->
