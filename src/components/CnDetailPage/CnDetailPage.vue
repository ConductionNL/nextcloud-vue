<!--
  CnDetailPage — Top-level detail page with card-based layout and optional sidebar.

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
-->
<template>
	<div class="cn-detail-page">
		<!-- Header -->
		<div class="cn-detail-page__header">
			<div class="cn-detail-page__header-left">
				<NcButton
					v-if="backRoute"
					type="tertiary"
					:aria-label="backLabel"
					@click="$router.push(backRoute)">
					<template #icon>
						<ArrowLeft :size="20" />
					</template>
					{{ backLabel }}
				</NcButton>
				<div class="cn-detail-page__title-group">
					<h2 class="cn-detail-page__title">
						{{ title }}
					</h2>
					<span v-if="subtitle" class="cn-detail-page__subtitle">
						{{ subtitle }}
					</span>
				</div>
			</div>
			<div class="cn-detail-page__header-actions">
				<slot name="header-actions" />
			</div>
		</div>

		<!-- Loading state -->
		<NcLoadingIcon v-if="loading" class="cn-detail-page__loading" />

		<!-- Error state -->
		<NcEmptyContent v-else-if="error" :description="error">
			<template #icon>
				<AlertCircle :size="48" />
			</template>
			<template #action>
				<NcButton @click="$emit('retry')">
					{{ retryLabel }}
				</NcButton>
			</template>
		</NcEmptyContent>

		<!-- Content + Sidebar layout -->
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

			<!-- Default vertical stacking mode -->
			<div v-else class="cn-detail-page__content">
				<slot />
			</div>

			<!-- Right sidebar -->
			<div v-if="sidebar && sidebarOpen" class="cn-detail-page__sidebar">
				<slot name="sidebar">
					<CnObjectSidebar
						v-if="objectType && objectId"
						v-bind="sidebarProps"
						:object-type="objectType"
						:object-id="objectId"
						:open="sidebarOpen"
						@update:open="sidebarOpen = $event" />
				</slot>
			</div>
		</div>

		<!-- Sidebar toggle button (when sidebar is closed) -->
		<NcButton
			v-if="sidebar && !sidebarOpen && !loading && !error"
			class="cn-detail-page__sidebar-toggle"
			type="tertiary"
			:aria-label="'Open sidebar'"
			@click="sidebarOpen = true">
			<template #icon>
				<InformationOutline :size="20" />
			</template>
		</NcButton>
	</div>
</template>

<script>
import { NcButton, NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import ArrowLeft from 'vue-material-design-icons/ArrowLeft.vue'
import AlertCircle from 'vue-material-design-icons/AlertCircle.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import CnObjectSidebar from '../CnObjectSidebar/CnObjectSidebar.vue'
import { gridLayout } from '../../mixins/gridLayout.js'

/**
 * CnDetailPage — Top-level detail page with card-based layout and optional sidebar.
 *
 * Supports two layout modes:
 * 1. **Default (vertical stacking):** Content provided via default slot, cards stack vertically.
 * 2. **Grid layout:** When `layout` and `widgets` props are provided, content renders in a
 *    12-column CSS grid with `#widget-{widgetId}` scoped slots. Same API as CnDashboardPage.
 *
 * @example Basic usage (vertical stacking)
 * <CnDetailPage
 *   title="Digital Citizen Portal"
 *   subtitle="Lead"
 *   :back-route="{ name: 'Leads' }"
 *   :sidebar="true"
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :sidebar-props="{ register: '...', schema: '...' }">
 *   <template #header-actions>
 *     <NcButton type="primary" @click="editing = true">Edit</NcButton>
 *     <NcButton type="error" @click="showDelete = true">Delete</NcButton>
 *   </template>
 *
 *   <CnDetailCard title="Core Info">
 *     <div class="info-grid">...</div>
 *   </CnDetailCard>
 *
 *   <CnDetailCard title="Pipeline Progress">
 *     <PipelineProgress :stages="stages" />
 *   </CnDetailCard>
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
 * </CnDetailPage>
 */
export default {
	name: 'CnDetailPage',

	components: {
		NcButton,
		NcLoadingIcon,
		NcEmptyContent,
		ArrowLeft,
		AlertCircle,
		InformationOutline,
		CnObjectSidebar,
	},

	mixins: [gridLayout],

	props: {
		/** Page title (entity name or identifier) */
		title: {
			type: String,
			default: '',
		},
		/** Optional subtitle (entity type label, status, etc.) */
		subtitle: {
			type: String,
			default: '',
		},
		/** Vue Router route object for the back button. If null, no back button shown. */
		backRoute: {
			type: Object,
			default: null,
		},
		/** Pre-translated back button label */
		backLabel: {
			type: String,
			default: 'Back to list',
		},
		/** Show loading state */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Error message to display. If set, shows error state. */
		error: {
			type: String,
			default: '',
		},
		/** Pre-translated retry button label */
		retryLabel: {
			type: String,
			default: 'Retry',
		},
		/** Show the CnObjectSidebar */
		sidebar: {
			type: Boolean,
			default: true,
		},
		/** Props to pass through to CnObjectSidebar */
		sidebarProps: {
			type: Object,
			default: () => ({}),
		},
		/** Object type for the sidebar (e.g., "pipelinq_lead") */
		objectType: {
			type: String,
			default: '',
		},
		/** Object UUID for the sidebar */
		objectId: {
			type: String,
			default: '',
		},
	},

	emits: ['retry'],

	data() {
		return {
			sidebarOpen: true,
		}
	},
}
</script>

<style scoped>
.cn-detail-page {
	padding: 20px;
	max-width: 1400px;
	position: relative;
}

.cn-detail-page__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20px;
	gap: 16px;
}

.cn-detail-page__header-left {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.cn-detail-page__title-group {
	display: flex;
	align-items: baseline;
	gap: 12px;
	min-width: 0;
}

.cn-detail-page__title {
	margin: 0;
	font-size: 22px;
	font-weight: 700;
	line-height: 1.3;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-detail-page__subtitle {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

.cn-detail-page__header-actions {
	display: flex;
	gap: 8px;
	flex-shrink: 0;
}

.cn-detail-page__loading {
	padding: 60px 0;
}

.cn-detail-page__body {
	display: flex;
	gap: 20px;
	align-items: flex-start;
}

.cn-detail-page__content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

/* Grid layout mode */
.cn-detail-page__content--grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 16px;
}

.cn-detail-page__grid-item {
	min-width: 0;
}

.cn-detail-page__widget-title {
	margin: 0 0 8px 0;
	font-size: 16px;
	font-weight: 600;
	line-height: 1.4;
}

.cn-detail-page__sidebar {
	width: 340px;
	flex-shrink: 0;
	position: sticky;
	top: 20px;
}

.cn-detail-page__sidebar-toggle {
	position: fixed;
	right: 20px;
	top: 80px;
	z-index: 10;
}

/* Responsive: collapse sidebar below 900px */
@media (max-width: 900px) {
	.cn-detail-page__body {
		flex-direction: column;
	}

	.cn-detail-page__sidebar {
		width: 100%;
		position: static;
	}
}

/* Responsive: single column grid below 600px */
@media (max-width: 600px) {
	.cn-detail-page__content--grid {
		grid-template-columns: 1fr;
	}

	.cn-detail-page__content--grid .cn-detail-page__grid-item {
		grid-column: 1 / -1 !important;
		grid-row: auto !important;
	}
}
</style>
