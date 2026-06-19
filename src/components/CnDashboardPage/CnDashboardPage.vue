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
	<div class="cn-dashboard-page" data-testid="cn-dashboard-page">
		<!-- Header -->
		<div class="cn-dashboard-page__header" data-testid="cn-dashboard-page-header">
			<div class="cn-dashboard-page__header-left">
				<h2 v-if="title" class="cn-dashboard-page__title">
					{{ title }}
				</h2>
				<p v-if="description" class="cn-dashboard-page__description">
					{{ description }}
				</p>
			</div>
			<div class="cn-dashboard-page__header-actions">
				<!-- @slot header-actions Inline buttons rendered in the dashboard header next to the edit toggle. Used by every existing consumer (decidesk, mydash, opencatalogi, pipelinq, procest). -->
				<slot name="header-actions" />
				<!-- @slot actions Back-compat alias for `#header-actions`. Prefer `#header-actions` in new code. -->
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
				<!-- In-app edit button (ADR-041). Renders only when OpenBuild is
				     reachable; self-wires from the cnManifestEditor / cnOpenBuildAvailable
				     provided by CnAppRoot. Sits inline with the page's action buttons. -->
				<CnOpenBuildEditButton />
				<!-- Page-level overflow Actions menu (Refresh / Documentation /
				     Request a feature). Separate from the per-widget menus.
				     On by default; opt out per item, supply documentation-url
				     to surface a docs link. -->
				<CnActionsMenu
					:show-refresh="showRefresh"
					:show-request-feature="showRequestFeature"
					:documentation-url="documentationUrl"
					:documentation-label="documentationLabel"
					:refresh-label="refreshLabel"
					:request-feature-label="requestFeatureLabel"
					:actions-menu-label="actionsMenuLabel"
					:refreshing="refreshing"
					:widget-id="resolvedPageId"
					:title="title"
					:surface="`dashboard:${resolvedPageId}`"
					:spec-ref="specRef"
					refresh-channel="cn:page:refresh"
					testid-base="cn-dashboard-page"
					@refresh="onActionsRefresh"
					@request-feature="onActionsRequestFeature">
					<!-- @slot action-items Additional NcActionButton-family
					     items appended inside the page-level overflow menu,
					     after Refresh / Documentation / Request a feature. -->
					<template v-if="hasActionItemsSlot" #action-items>
						<slot name="action-items" />
					</template>
				</CnActionsMenu>
			</div>
		</div>

		<!-- Date-range header (optional).
		     Rendered only when `dateRange.enabled === true` AND
		     `dateRange.showHeaderPicker !== false`. The range STATE
		     (currentRange / cnDashboardDateRange) is always initialised
		     when the feature is enabled, so per-chart-widget date chips
		     keep working even when this header picker is hidden — set
		     `showHeaderPicker: false` to rely solely on the per-widget
		     chips. The picker is wired to `currentRange` (data) which
		     mirrors the provided `cnDashboardDateRange` ref; all change
		     handling, persistence, and event emission lives in
		     `onDateRangeChange`. -->
		<div
			v-if="showHeaderDateRange"
			class="cn-dashboard-page__date-range"
			data-testid="cn-dashboard-page-date-range">
			<CnDateRangePicker
				:value="currentRange"
				:presets="effectivePresets"
				@input="onDateRangeChange" />
		</div>

		<!-- Loading state -->
		<NcLoadingIcon v-if="loading" />

		<!-- Empty state -->
		<div v-else-if="!hasWidgets" class="cn-dashboard-page__empty">
			<!-- @slot empty Replaces the default empty state shown when the dashboard has no widgets. Defaults to an `NcEmptyContent` block. -->
			<slot name="empty">
				<NcEmptyContent :description="emptyLabel">
					<template #icon>
						<ViewDashboardOutline :size="48" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Widget-ref content items (manifest-widget-ref-page-content-type).
		     Rendered above the classic GridStack grid when present. Each item
		     is a `{ type: 'widget-ref', ref: 'openregister://widget/…' }` entry
		     from the manifest's `pages[].config.content[]` array. -->
		<div
			v-else-if="widgetRefItems.length > 0"
			class="cn-dashboard-page__content">
			<CnWidgetRefItem
				v-for="(item, idx) in widgetRefItems"
				:key="item.ref + '-' + idx"
				:ref-uri="item.ref"
				class="cn-dashboard-page__content-item" />
		</div>

		<!-- Dashboard grid (classic widgets+layout mode).
		     Uses v-else so the `v-else-if="!hasWidgets"` empty state and the
		     `v-else-if="widgetRefItems.length > 0"` content-items section
		     are mutually exclusive with the grid. -->
		<CnDashboardGrid
			v-else
			:layout="layout"
			:editable="gridEditable"
			:columns="columns"
			:cell-height="cellHeight"
			:margin="gridMargin"
			@layout-change="onLayoutChange">
			<template #widget="{ item }">
				<!-- In-app edit overlay (ADR-041): a single launchpad-style
				     configure cog opens the per-widget style/config editor,
				     which itself carries the delete affordance — so no separate
				     remove button here. Shown only while the page is in edit
				     mode. -->
				<div v-if="gridEditable" class="cn-dashboard-page__widget-edit">
					<NcButton type="tertiary" :aria-label="t('nextcloud-vue', 'Configure widget')" @click="configureWidget(item)">
						<template #icon><Cog :size="18" /></template>
					</NcButton>
				</div>
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
						:title-icon-color="getWidgetTitleIconColor(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<!-- @slot widget-{widgetId}-title-icon Per-widget custom title icon (e.g. `#widget-my-work-title-icon`). Scope: `{ item, widget }`. -->
						<template v-if="$slots['widget-' + item.widgetId + '-title-icon']" #title-icon>
							<slot :name="'widget-' + item.widgetId + '-title-icon'" :item="item" :widget="getWidgetDef(item.widgetId)" />
						</template>
						<!-- @slot widget-{widgetId}-actions Per-widget custom header actions (e.g. `#widget-my-work-actions`). Scope: `{ item, widget }`. -->
						<template v-if="$slots['widget-' + item.widgetId + '-actions']" #actions>
							<slot :name="'widget-' + item.widgetId + '-actions'" :item="item" :widget="getWidgetDef(item.widgetId)" />
						</template>
						<!-- Opt-in per-widget date chip (`layout[].dateChip: true`).
						     Mirrors the chart-widget chip below — same popover,
						     same handlers, same SHARED dashboard range — so
						     custom widgets that consume `cnDashboardDateRange`
						     can surface the range in their own header instead
						     of (or alongside) the page-level picker. Keep the
						     two blocks in sync when editing either. -->
						<template v-if="dateRangeEnabled && item.dateChip === true && formatDashboardDateRange()" #title-meta>
							<NcActions
								:force-menu="true"
								:open.sync="openChipPicker[item.widgetId]"
								container="body"
								:data-testid="`cn-dashboard-page-date-chip-${item.widgetId}`"
								class="cn-dashboard-page__date-chip-trigger">
								<template #icon>
									<span class="cn-dashboard-page__date-chip" :title="dateChipTitle">
										{{ formatDashboardDateRange() }}
									</span>
								</template>
								<NcActionButton
									v-for="preset in effectivePresets"
									:key="preset.id"
									:close-after-click="true"
									@click="onChipPresetPick(preset, item)">
									<template #icon>
										<CalendarRange v-if="currentRange.preset === preset.id" :size="16" />
										<span v-else class="cn-dashboard-page__date-chip-preset-spacer" />
									</template>
									{{ preset.label }}
								</NcActionButton>
								<NcActionSeparator />
								<NcActionInput
									type="datetime-local"
									:value="toLocalDateTimeInput(currentRange.from)"
									:label="t('nextcloud-vue', 'From')"
									@input="onChipDateInput('from', $event)" />
								<NcActionInput
									type="datetime-local"
									:value="toLocalDateTimeInput(currentRange.to)"
									:label="t('nextcloud-vue', 'To')"
									@input="onChipDateInput('to', $event)" />
							</NcActions>
						</template>
						<!-- @slot widget-{widgetId} Per-widget body content (e.g. `#widget-my-work`). Apps inject custom widget rendering here. Scope: `{ item, widget }`. -->
						<slot :name="'widget-' + item.widgetId" :item="item" :widget="getWidgetDef(item.widgetId)" />
					</CnWidgetWrapper>
				</template>

				<!-- Chart widget — manifest-driven apexcharts mount -->
				<template v-else-if="isChart(item)">
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
						:title-icon-color="getWidgetTitleIconColor(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<template v-if="dateRangeEnabled && formatChartDateRange(item)" #title-meta>
							<NcActions
								:force-menu="true"
								:open.sync="openChipPicker[item.widgetId]"
								container="body"
								:data-testid="`cn-dashboard-page-date-chip-${item.widgetId}`"
								class="cn-dashboard-page__date-chip-trigger">
								<template #icon>
									<span class="cn-dashboard-page__date-chip" :title="dateChipTitle">
										{{ formatChartDateRange(item) }}
									</span>
								</template>
								<NcActionButton
									v-for="preset in effectivePresets"
									:key="preset.id"
									:close-after-click="true"
									@click="onChipPresetPick(preset, item)">
									<template #icon>
										<CalendarRange v-if="currentRange.preset === preset.id" :size="16" />
										<span v-else class="cn-dashboard-page__date-chip-preset-spacer" />
									</template>
									{{ preset.label }}
								</NcActionButton>
								<NcActionSeparator />
								<NcActionInput
									type="datetime-local"
									:value="toLocalDateTimeInput(currentRange.from)"
									:label="t('nextcloud-vue', 'From')"
									@input="onChipDateInput('from', $event)" />
								<NcActionInput
									type="datetime-local"
									:value="toLocalDateTimeInput(currentRange.to)"
									:label="t('nextcloud-vue', 'To')"
									@input="onChipDateInput('to', $event)" />
							</NcActions>
						</template>
						<CnChartWidget
							v-bind="getChartProps(item)"
							:widget-id="item.widgetId"
							:data-source="getWidgetDataSource(item)" />
					</CnWidgetWrapper>
				</template>

				<!-- Stats-block widget — manifest-driven CnStatsBlock with a
				     GraphQL-resolved count via `dataSource`. Rendered WITHOUT
				     CnWidgetWrapper: CnStatsBlock already supplies title +
				     bordered card chrome + count layout, so wrapping it
				     produced a double-card visual (outer + inner titles, two
				     bordered boxes). The action menu lives on the page-level
				     dashboard chrome instead. -->
				<template v-else-if="isStatsBlock(item)">
					<CnStatsBlockWidget
						v-bind="getStatsBlockProps(item)"
						:title="getWidgetTitle(item)"
						:data-source="getWidgetDataSource(item)" />
				</template>

				<!-- Integration widget — resolved from the pluggable
				     integration registry (AD-19 surface fallback). -->
				<template v-else-if="isIntegration(item)">
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
						:title-icon-color="getWidgetTitleIconColor(item)"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<component
							:is="resolveIntegrationWidget(item)"
							v-if="resolveIntegrationWidget(item)"
							v-bind="getIntegrationProps(item)" />
						<div v-else class="cn-dashboard-page__unknown">
							{{ unavailableLabel }}
						</div>
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
						:style-config="item.styleConfig || {}"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<CnWidgetRenderer
							:widget="getWidgetDef(item.widgetId)"
							:unavailable-text="unavailableLabel" />
					</CnWidgetWrapper>
				</template>

				<!-- Dashboard widget library (cn-widget-library): a widget whose
				     `type` is registered in dashboardWidgetRegistry renders here —
				     this is how catalog widgets added via "Add widget…" appear. -->
				<template v-else-if="registryRenderer(item)">
					<CnWidgetWrapper
						:title="getWidgetTitle(item)"
						:show-title="item.showTitle !== false"
						:buttons="getWidgetButtons(item)"
						:style-config="item.styleConfig || {}"
						@refresh="onWidgetRefresh(item)"
						@request-feature="onWidgetRequestFeature(item)">
						<component
							:is="registryRenderer(item)"
							:content="getWidgetContent(item)"
							v-bind="getWidgetContent(item)" />
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

		<!-- Per-widget style/config editor (ADR-041). Opened by the
		     per-widget configure cog while editing; the modal's own Delete
		     button removes the widget. -->
		<CnWidgetStyleEditorModal
			v-if="showWidgetConfig"
			:show="showWidgetConfig"
			:widget="configWidget"
			:deletable="true"
			@save="onWidgetConfigSave"
			@delete="onWidgetConfigDelete"
			@close="showWidgetConfig = false" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import {
	NcActions,
	NcActionButton,
	NcActionInput,
	NcActionSeparator,
	NcButton,
	NcEmptyContent,
	NcLoadingIcon,
} from '@nextcloud/vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import CalendarRange from 'vue-material-design-icons/CalendarRange.vue'
import ViewDashboardOutline from 'vue-material-design-icons/ViewDashboardOutline.vue'
import CnDashboardGrid from '../CnDashboardGrid/CnDashboardGrid.vue'
import { getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'
import CnWidgetWrapper from '../CnWidgetWrapper/CnWidgetWrapper.vue'
import CnWidgetRenderer from '../CnWidgetRenderer/CnWidgetRenderer.vue'
import CnTileWidget from '../CnTileWidget/CnTileWidget.vue'
import CnChartWidget from '../CnChartWidget/CnChartWidget.vue'
import CnStatsBlockWidget from '../CnStatsBlockWidget/CnStatsBlockWidget.vue'
import CnWidgetRefItem from '../CnWidgetRefItem/CnWidgetRefItem.vue'
import CnDateRangePicker, { DEFAULT_DATE_RANGE_PRESETS, resolvePresetWindow } from '../CnDateRangePicker/CnDateRangePicker.vue'
import { CnActionsMenu } from '../CnActionsMenu/index.js'
import CnOpenBuildEditButton from '../CnOpenBuildEditButton/CnOpenBuildEditButton.vue'
import CnWidgetStyleEditorModal from '../../modals/CnWidgetStyleEditorModal.vue'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'

/** Surfaces understood by the pluggable integration registry (AD-19). */
const INTEGRATION_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * Subset of `widgetDef.props` keys that the chart widget dispatcher
 * forwards to CnChartWidget. Unknown keys on `props` are ignored so
 * the manifest stays forward-compatible (e.g. `dataSource` is
 * round-tripped through manifest validators but not yet read here).
 *
 * `chartKind` is renamed to `type` because apexcharts' own component
 * prop is also called `type`, and `widgetDef.type` already means
 * "dispatcher selector" in this file.
 */
const CHART_PROP_KEYS = [
	'series',
	'categories',
	'labels',
	'options',
	'colors',
	'toolbar',
	'legend',
	'height',
	'width',
	'unavailableLabel',
]

/**
 * CnDashboardPage — Top-level dashboard page component.
 *
 * The dashboard equivalent of CnIndexPage. Renders a configurable grid
 * of widgets from a `widgets` definition array and a `layout` array.
 *
 * Widget types (priority order, first match wins):
 * 1. **Tile** — Items with `type: 'tile'` render as quick-access tiles
 * 2. **Custom slot** — App provides rendering via `#widget-{widgetId}`
 *    (escape hatch — beats every built-in branch when a slot exists)
 * 3. **Chart** — Items with `type: 'chart'` mount CnChartWidget; chart
 *    inputs (chartKind, series, options, …) ride `widgetDef.props`,
 *    plus an optional `dataSource` block resolves `series` /
 *    `categories` from a GraphQL query.
 * 4. **Stats-block** — Items with `type: 'stats-block'` mount
 *    CnStatsBlockWidget; the count comes from `widgetDef.dataSource`
 *    (shorthand `{ register, schema, filter?, aggregate: 'count' }`
 *    or raw GraphQL `{ graphql: { query, variables?, selectors } }`).
 * 5. **NC Dashboard API** — Widgets with `itemApiVersions` auto-rendered
 * 6. **Unknown fallback** — `unavailableLabel` text inside a wrapper
 *
 * Basic usage with custom widgets
 * ```vue
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
 * ```
 *
 * With NC Dashboard API widgets
 * ```vue
 * <CnDashboardPage
 *   title="Dashboard"
 *   :widgets="[...appWidgets, ...ncWidgets]"
 *   :layout="layout"
 *   @layout-change="saveLayout" />
 * ```
 *
 * With manifest-driven chart widgets (no consumer code required)
 * ```js
 * const widgets = [{
 *   id: 'sla-trend',
 *   title: 'SLA trend',
 *   type: 'chart',
 *   props: {
 *     chartKind: 'line',                 // line|bar|donut|area|pie|radialBar
 *     series: [{ name: 'SLA %', data: [82, 85, 88, 91] }],
 *     categories: ['Q1', 'Q2', 'Q3', 'Q4'],
 *     options: { stroke: { width: 3 } }, // deep-merged with defaults
 *     // dataSource is reserved for a future cycle — round-tripped
 *     // through manifest validators but not yet read at render time:
 *     // dataSource: { url: '/index.php/apps/myapp/api/charts/sla' }
 *     // dataSource: { register: 'cases', schema: 'case',
 *     //               groupBy: 'caseType', aggregate: 'count' }
 *   },
 * }]
 * ```
 */
export default {
	name: 'CnDashboardPage',

	components: {
		NcActions,
		NcActionButton,
		NcActionInput,
		NcActionSeparator,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		Pencil,
		Check,
		Cog,
		CalendarRange,
		ViewDashboardOutline,
		CnDashboardGrid,
		CnWidgetWrapper,
		CnWidgetRenderer,
		CnTileWidget,
		CnChartWidget,
		CnStatsBlockWidget,
		CnWidgetRefItem,
		CnDateRangePicker,
		CnActionsMenu,
		CnOpenBuildEditButton,
		CnWidgetStyleEditorModal,
	},

	inject: {
		/** OpenBuild in-app edit state (ADR-041), provided by CnAppRoot as a ref.
		 * When true the dashboard grid becomes drag/resize/remove-able even
		 * without the consumer's own `allowEdit` toggle. */
		cnEditingBody: { default: false },
		/**
		 * Reactive AI context holder provided by CnAppRoot. Overwritten
		 * on created() and watched for prop changes. Reset on beforeDestroy().
		 */
		cnAiContext: { default: null },
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
		 * Chart widgets: `{ id: 'sla', type: 'chart', title: 'SLA trend',
		 *   props: { chartKind: 'line', series: [{ name: 'SLA %', data: [82, 88, 91] }],
		 *            categories: ['Q1', 'Q2', 'Q3'], options: { stroke: { width: 3 } } } }`
		 * @type {Array<{ id: string, title: string, type: string, iconUrl: string, iconClass: string, buttons: Array, itemApiVersions: number[], reloadInterval: number, props: object }>}
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
		 * @type {Array<{ id: string|number, widgetId: string, gridX: number, gridY: number, gridWidth: number, gridHeight: number, showTitle: boolean, styleConfig: object }>}
		 */
		layout: {
			type: Array,
			default: () => [],
		},
		/**
		 * Declarative content items. Each item is a `widget-ref` entry from the
		 * manifest's `pages[].config.content[]` array:
		 *
		 *   `{ type: 'widget-ref', ref: 'openregister://widget/<schemaSlug>/<widgetSlug>' }`
		 *
		 * CnDashboardPage renders each widget-ref item as a `CnWidgetRefItem`
		 * which resolves the widget from OR's registry at runtime and renders
		 * the resolved component. Only `widget-ref` entries are processed; unknown
		 * `type` values are skipped with a `console.warn`.
		 *
		 * When both `content` (widget-ref items) and `widgets`+`layout` (classic
		 * GridStack layout) are present, `content` items are rendered above the
		 * grid in a stacked list.
		 *
		 * @type {Array<{ type: string, ref: string }>}
		 */
		content: {
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
		/**
		 * Rendering surface forwarded to integration widgets (widgets
		 * whose `type === 'integration'`). Drives the AD-19 surface
		 * fallback on `resolveWidget(integrationId, surface)`.
		 *
		 * @type {'user-dashboard'|'app-dashboard'|'detail-page'|'single-entity'}
		 */
		surface: {
			type: String,
			default: 'app-dashboard',
			validator: (value) => INTEGRATION_SURFACES.includes(value),
		},
		/**
		 * Object context forwarded to integration widgets:
		 * `{ register, schema, objectId }`. Optional — most dashboards
		 * aren't object-scoped, but CnDetailPage passes one through so
		 * `CnFilesCard` / `CnTagsCard` / `CnAuditTrailCard` know which
		 * object's sub-resources to fetch.
		 *
		 * @type {object|null}
		 */
		integrationContext: {
			type: Object,
			default: null,
		},
		/**
		 * Optional date-range header descriptor. When `enabled: true`
		 * the dashboard renders a `CnDateRangePicker` between the
		 * header and the widget grid, persists the chosen range to
		 * `localStorage` (when `persistKey` is set), emits
		 * `@date-range-change` on every change, AND provides a
		 * reactive `cnDashboardDateRange` ref to every descendant
		 * widget.
		 *
		 * When the prop is `null` (default), `false`, or
		 * `{ enabled: false }`, the header row is NOT rendered and the
		 * existing dashboard layout stays unchanged. The provide is
		 * still installed (always) but its value stays `null` so
		 * descendant chart widgets fall back to their
		 * `dataSource.bucket.staticRange` (or skip the query
		 * entirely).
		 *
		 * Shape:
		 * ```ts
		 * {
		 *   enabled: boolean,
		 *   default?: { from: string, to: string, preset?: string },
		 *   persistKey?: string,
		 *   presets?: Array<{ id: string, label: string, days: number|null }>,
		 * }
		 * ```
		 *
		 * Default preset when no explicit `default` and no persisted
		 * state is found: `last-7` (`now − 7d → now`).
		 *
		 * Per-widget surfacing: chart widgets with a `dataSource.bucket`
		 * get an in-header date chip automatically; CUSTOM widgets opt in
		 * via `layout[].dateChip: true` (same chip, same popover, writes
		 * the same shared range). Set `showHeaderPicker: false` to rely
		 * solely on the per-widget chips.
		 *
		 * @type {object|null}
		 */
		dateRange: {
			type: Object,
			default: null,
		},
		/**
		 * Show the built-in Refresh item in the page-level overflow Actions
		 * menu (distinct from the per-widget menus). On by default. The
		 * default handler emits `@refresh` and, unless suppressed, fires
		 * the `cn:page:refresh` event-bus channel.
		 *
		 * @type {boolean}
		 */
		showRefresh: {
			type: Boolean,
			default: true,
		},
		/**
		 * Show the built-in Request-a-feature item in the page-level
		 * overflow Actions menu. On by default; opens the
		 * CnSuggestFeatureModal when mounted under CnAppRoot.
		 *
		 * @type {boolean}
		 */
		showRequestFeature: {
			type: Boolean,
			default: true,
		},
		/**
		 * Documentation link for this dashboard. When a non-empty URL is
		 * set, the page-level overflow menu renders a "Documentation" item
		 * that opens the link in a new tab. Empty (the default) hides it.
		 *
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/** Pre-translated label for the Documentation action. Defaults to "Documentation". */
		documentationLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Documentation'),
		},
		/**
		 * Stable id for this dashboard, used in the `@refresh` /
		 * `@request-feature` payloads and the `surface: "dashboard:<id>"`
		 * field on the feature-request modal. Falls back to a slugified
		 * `title` when unset.
		 *
		 * @type {string}
		 */
		pageId: {
			type: String,
			default: '',
		},
		/** Optional `specRef` forwarded to the feature-request modal. */
		specRef: {
			type: String,
			default: '',
		},
		/** Whether a page-level refresh is in flight (disables the Refresh item and shows its spinner). */
		refreshing: {
			type: Boolean,
			default: false,
		},
		/** Pre-translated label for the Refresh action. */
		refreshLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Refresh'),
		},
		/** Pre-translated label for the Request-a-feature action. */
		requestFeatureLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Request a feature'),
		},
		/** Pre-translated aria-label / tooltip for the overflow menu trigger. */
		actionsMenuLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Actions'),
		},
	},

	emits: ['layout-change', 'edit-toggle', 'date-range-change', 'refresh', 'request-feature'],

	setup() {
		// Wire the pluggable integration registry so widgets of type
		// `integration` resolve their component reactively. No-op cost
		// when no integration widgets are configured.
		const { integrations: registryIntegrations, resolveWidget } = useIntegrationRegistry()

		// Provide a reactive date-range ref to every descendant widget,
		// ALWAYS — even when the feature is off. Descendants can then
		// `inject('cnDashboardDateRange', ref(null))` without a fallback
		// dance, and the value stays `null` (= no range) until the user
		// picks one. CnChartWidget reads this via inject() to drive its
		// bucket-shorthand variables.
		const dashboardDateRange = ref(null)
		provide('cnDashboardDateRange', dashboardDateRange)

		return {
			registryIntegrations,
			resolveRegistryWidget: resolveWidget,
			dashboardDateRange,
		}
	},

	data() {
		return {
			isEditing: false,
			/** Whether the per-widget style/config editor modal is open. */
			showWidgetConfig: false,
			/** widgetId of the widget currently being configured (drives `configWidget`). */
			configWidgetId: null,
			/**
			 * Local mirror of the picker's current value. Initialised
			 * in `created()` from `dateRange.default` → persisted
			 * state → `last-7` fallback, and kept in sync with the
			 * provided `dashboardDateRange` ref via a watcher.
			 *
			 * @type {{ from: string, to: string, preset: string }|null}
			 */
			currentRange: null,
			/**
			 * Per-widget open/close state for the in-chart date-range
			 * popover. Keyed by widgetId so each chart widget's chip
			 * tracks its own NcActions open state independently. Vue 2
			 * reactivity caveat — entries are created lazily via
			 * Vue.set when needed.
			 *
			 * @type {Record<string, boolean>}
			 */
			openChipPicker: {},
			/**
			 * Pre-translated tooltip for the chart-widget date-range
			 * chip — kept as a data field rather than a computed so the
			 * lib's `translate` is evaluated once at component creation
			 * and not on every render.
			 */
			dateChipTitle: t('nextcloud-vue', 'Change date range'),
		}
	},

	computed: {
		/**
		 * Whether the widget grid should be drag/resize/remove-able — the
		 * consumer's own edit toggle OR the OpenBuild in-app editor (ADR-041).
		 * Unwraps the injected `cnEditingBody` ref.
		 *
		 * @return {boolean}
		 */
		gridEditable() {
			const e = this.cnEditingBody
			const openBuildEditing = Boolean(e && typeof e === 'object' && 'value' in e ? e.value : e)
			return this.isEditing || openBuildEditing
		},
		/**
		 * Stable id for the page-level Actions menu. Prefers the explicit
		 * `pageId` prop; falls back to a slugified `title`, then
		 * `'dashboard'`.
		 *
		 * @return {string}
		 */
		resolvedPageId() {
			if (this.pageId) return this.pageId
			const slug = (this.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
			return slug || 'dashboard'
		},
		/**
		 * Whether the caller supplied an `action-items` slot — forwarded
		 * conditionally so the shared CnActionsMenu doesn't treat an
		 * always-present pass-through template as content.
		 *
		 * @return {boolean}
		 */
		hasActionItemsSlot() {
			return Boolean(this.$slots['action-items']) || Boolean(this.$scopedSlots && this.$scopedSlots['action-items'])
		},

		/**
		 * True when the date-range header should render. `false`,
		 * `null`, and `{ enabled: false }` all collapse to `false`.
		 */
		dateRangeEnabled() {
			return !!(this.dateRange && this.dateRange.enabled === true)
		},

		/**
		 * True when the header date-range picker should render. The
		 * range feature must be enabled AND `showHeaderPicker` must not
		 * be explicitly false. Defaults to showing the header (backwards
		 * compatible) — consumers that drive the range entirely through
		 * per-widget chart chips set `dateRange.showHeaderPicker: false`
		 * to drop the redundant header control.
		 *
		 * @return {boolean}
		 */
		showHeaderDateRange() {
			return this.dateRangeEnabled && this.dateRange.showHeaderPicker !== false
		},

		/**
		 * The preset list passed to the picker. Falls back to the
		 * `DEFAULT_DATE_RANGE_PRESETS` constant when the consumer
		 * doesn't supply one.
		 */
		effectivePresets() {
			return Array.isArray(this.dateRange?.presets) && this.dateRange.presets.length > 0
				? this.dateRange.presets
				: DEFAULT_DATE_RANGE_PRESETS.map((p) => ({ ...p }))
		},

		/**
		 * True when the dashboard has either classic grid widgets (via
		 * `layout`) or declarative `content[]` widget-ref items to render.
		 */
		hasWidgets() {
			return this.layout.length > 0 || this.widgetRefItems.length > 0
		},

		/**
		 * The widget settings object handed to CnWidgetStyleEditorModal,
		 * built from the widget definition currently being configured
		 * (`configWidgetId`). Carries the chrome fields the editor reads /
		 * mutates (`title`, `styleConfig`, `showTitle`, `customTitle`,
		 * `customIcon`, `content`) plus the widget `id`. Returns an empty
		 * shell when nothing is selected so the modal's `required` widget
		 * prop never sees null.
		 *
		 * @return {object}
		 */
		configWidget() {
			const def = this.getWidgetDef(this.configWidgetId) || {}
			// Bridge legacy data-driven widgets (chart / stats-block / table that
			// carry top-level `props` + `dataSource` instead of `content`) into a
			// `content` shape so their config form pre-fills. Once saved, the
			// content-aware getters take over.
			let content = def.content || {}
			if ((!content || Object.keys(content).length === 0) && (def.props || def.dataSource)) {
				content = {}
				if (def.title) content.title = def.title
				if (def.props) {
					content.props = def.props
					if (def.props.chartKind) content.chartKind = def.props.chartKind
				}
				if (def.dataSource) content.dataSource = def.dataSource
			}
			return {
				id: def.id || this.configWidgetId,
				type: def.type || '',
				title: def.title || '',
				styleConfig: def.styleConfig || {},
				showTitle: def.showTitle !== false,
				customTitle: def.customTitle || '',
				customIcon: def.customIcon || '',
				content,
			}
		},

		widgetMap() {
			const map = {}
			for (const w of this.widgets) {
				map[w.id] = w
			}
			return map
		},

		/**
		 * Filtered list of `widget-ref` items from `content[]`.
		 * Unknown `type` values are logged and excluded so future
		 * content item types can be added without breaking existing
		 * dashboards.
		 *
		 * @return {Array<{ type: 'widget-ref', ref: string }>}
		 */
		widgetRefItems() {
			const out = []
			for (const item of this.content) {
				if (!item || typeof item !== 'object') continue
				if (item.type === 'widget-ref') {
					out.push(item)
				} else {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnDashboardPage] Unknown content item type "${item.type}" — only "widget-ref" is supported. Item will be skipped.`,
					)
				}
			}
			return out
		},
	},

	created() {
		this.pushAiContext()
		this.initDateRange()
	},

	beforeDestroy() {
		if (this.cnAiContext) {
			this.cnAiContext.pageKind = 'custom'
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
		}
	},

	methods: {
		/**
		 * Re-emit the page-level CnActionsMenu `@refresh` to the host,
		 * passing the synthetic event through so a host listener can
		 * `preventDefault()` the built-in default (event-bus emit on
		 * `cn:page:refresh`). Distinct from `@widget-refresh`, which the
		 * per-widget menus emit.
		 *
		 * @param {{ widgetId: string, title: string }} payload Action payload.
		 * @param {{ defaultPrevented: boolean, preventDefault: Function }} ev Synthetic event.
		 * @return {void}
		 */
		onActionsRefresh(payload, ev) {
			/**
			 * @event refresh User clicked Refresh in the page-level overflow
			 * Actions menu. Payload: `{ widgetId, title }`. Handlers may
			 * call the second arg's `preventDefault()` to suppress the
			 * built-in default (event-bus emit on `cn:page:refresh`).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('refresh', payload, ev)
		},

		/**
		 * Re-emit the page-level CnActionsMenu `@request-feature` to the
		 * host. Distinct from `@widget-request-feature`.
		 *
		 * @param {{ widgetId: string, title: string }} payload Action payload.
		 * @param {{ defaultPrevented: boolean, preventDefault: Function }} ev Synthetic event.
		 * @return {void}
		 */
		onActionsRequestFeature(payload, ev) {
			/**
			 * @event request-feature User clicked Request a feature in the
			 * page-level overflow Actions menu. Payload: `{ widgetId,
			 * title }`. Handlers may call the second arg's
			 * `preventDefault()` to suppress the built-in default
			 * (auto-opening CnSuggestFeatureModal).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('request-feature', payload, ev)
		},

		/**
		 * Forward a widget's `@refresh` from CnWidgetWrapper to the
		 * dashboard host. The host wires this to its data-fetching layer
		 * (e.g. re-fetching the GraphQL aggregate for a chart). Payload
		 * is the layout item so consumers can route by widget id.
		 *
		 * @param {object} item Layout item descriptor.
		 * @return {void}
		 */
		onWidgetRefresh(item) {
			/**
			 * @event widget-refresh User clicked Refresh in a widget's
			 * overflow action menu. Payload: the layout item descriptor.
			 */
			this.$emit('widget-refresh', item)
		},

		/**
		 * Forward a widget's `@request-feature` from CnWidgetWrapper to
		 * the dashboard host. The host decides where to send the user
		 * (typically an issue tracker).
		 *
		 * @param {object} item Layout item descriptor.
		 * @return {void}
		 */
		onWidgetRequestFeature(item) {
			/**
			 * @event widget-request-feature User clicked Request a
			 * feature in a widget's overflow action menu. Payload: the
			 * layout item descriptor.
			 */
			this.$emit('widget-request-feature', item)
		},

		/**
		 * Format a chart widget's bucket date range as a short readable
		 * chip, rendered inside CnWidgetWrapper's `#title-meta` slot.
		 * Returns null when the bucket has neither a `staticRange` nor
		 * resolved `from`/`to` via the reactive dashboard `dateRange`
		 * provide (in which case the chip simply doesn't render).
		 *
		 * @param {object} item Layout item descriptor with chart shorthand.
		 * @return {string|null} `"2026-05-18 → 2026-05-25"` or null.
		 */
		formatChartDateRange(item) {
			const ds = this.getWidgetDataSource(item) || {}
			const bucket = ds.bucket || {}
			// 1. Bucket-level staticRange wins (explicit per-widget freeze).
			const sr = bucket.staticRange || {}
			let from = sr.from || null
			let to = sr.to || null
			// 2. Fall back to the dashboard-level reactive dateRange when
			//    the bucket uses fromVar/toVar shorthand. Vue 2.7's setup
			//    auto-unwraps refs when accessed via `this`, so
			//    `this.dashboardDateRange` IS the current value (not the
			//    ref). Assignments in setRange() / initial-range
			//    methods write through to the ref's `.value` automatically.
			if ((!from || !to) && this.dashboardDateRange) {
				const rng = this.dashboardDateRange
				if (bucket.fromVar && rng[bucket.fromVar]) from = from || rng[bucket.fromVar]
				if (bucket.toVar && rng[bucket.toVar]) to = to || rng[bucket.toVar]
			}
			return this.formatRangeLabel(from, to)
		},

		/**
		 * Format the SHARED dashboard date range as a compact chip label.
		 * Used by the opt-in custom-widget date chip (`layout[].dateChip`),
		 * which has no per-widget dataSource to derive a window from —
		 * the chip always surfaces the dashboard-level range.
		 *
		 * @return {string|null} `"18 May – 25 May"` or null when no range is set.
		 */
		formatDashboardDateRange() {
			const rng = this.dashboardDateRange
			if (!rng) return null
			return this.formatRangeLabel(rng.from || null, rng.to || null)
		},

		/**
		 * Friendly compact label: "18 May – 25 May" / "18 Dec 2025 – 2 Jan 2026".
		 * The year is only shown when a bound falls outside the current
		 * year, keeping the common same-year case short while staying
		 * unambiguous for older / cross-year windows.
		 *
		 * @param {string|null} from ISO-8601 lower bound (or null).
		 * @param {string|null} to ISO-8601 upper bound (or null).
		 * @return {string|null} Formatted label, or null when both bounds are empty.
		 */
		formatRangeLabel(from, to) {
			if (!from && !to) return null
			const toDate = (v) => {
				if (typeof v !== 'string' || v.length < 10) return null
				const d = new Date(`${v.slice(0, 10)}T00:00:00`)
				return Number.isNaN(d.getTime()) ? null : d
			}
			const fromDate = toDate(from)
			const toDateValue = toDate(to)
			const thisYear = new Date().getFullYear()
			const needsYear = [fromDate, toDateValue].some((d) => d && d.getFullYear() !== thisYear)
			const fmt = (d) => {
				if (!d) return ''
				return d.toLocaleDateString(undefined, {
					day: 'numeric',
					month: 'short',
					...(needsYear ? { year: 'numeric' } : {}),
				})
			}
			const left = fmt(fromDate)
			const right = fmt(toDateValue)
			if (left && right) return `${left} – ${right}`
			return (left || right) || null
		},

		/**
		 * Handle a preset pick from the in-chip date-range popover. The
		 * popover renders the same preset list the global picker uses
		 * (effectivePresets). On click we resolve the preset to a from/to
		 * window, build a `{ from, to, preset }` value, and forward to the
		 * existing `onDateRangeChange` — same handler the top picker uses.
		 * Effect: the chip is a per-chart shortcut to the dashboard-wide
		 * range, not a per-widget override.
		 *
		 * @param {{ label: string, value: string }} preset Preset descriptor.
		 * @param {object} _item Layout item (unused — included so the
		 *   binding shape matches the template's @click signature).
		 * @return {void}
		 */
		onChipPresetPick(preset, _item) {
			if (!preset || !preset.id) return
			if (preset.id === 'custom') return
			const win = resolvePresetWindow(preset.id, this.effectivePresets)
			if (!win) return
			this.onDateRangeChange({ ...win, preset: preset.id })
		},

		/**
		 * Handle a manual datetime-input change inside the in-chip popover.
		 * The `<input type="datetime-local">` emits a local "YYYY-MM-DDTHH:mm"
		 * string (or a DOM Event in some NcActionInput versions); we
		 * normalise to an ISO-8601 UTC string for storage and forward
		 * `{ from, to, preset: 'custom' }` to `onDateRangeChange`.
		 *
		 * @param {'from'|'to'} field The half being edited.
		 * @param {string|Event} value Local datetime string or input Event.
		 * @return {void}
		 */
		onChipDateInput(field, value) {
			const raw = typeof value === 'string'
				? value
				: (value && value.target ? value.target.value : '')
			const next = {
				from: this.currentRange?.from || '',
				to: this.currentRange?.to || '',
				preset: 'custom',
			}
			next[field] = raw ? this.localDateTimeInputToIso(raw) : ''
			this.onDateRangeChange(next)
		},

		/**
		 * Format a stored ISO-8601 string as the local "YYYY-MM-DDTHH:mm"
		 * value an `<input type="datetime-local">` expects. Returns empty
		 * string for null / unparseable input.
		 *
		 * @param {string} iso ISO-8601 timestamp.
		 * @return {string} Local datetime-local input value.
		 */
		toLocalDateTimeInput(iso) {
			if (!iso) return ''
			const d = new Date(iso)
			if (Number.isNaN(d.getTime())) return ''
			const pad = (n) => String(n).padStart(2, '0')
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
		},

		/**
		 * Parse a local "YYYY-MM-DDTHH:mm" datetime-local value into an
		 * ISO-8601 UTC string. `new Date(local)` interprets the bare
		 * string in the runtime's local timezone, matching what the
		 * native input shows the user.
		 *
		 * @param {string} local Local datetime-local input value.
		 * @return {string} ISO-8601 UTC string, or empty when unparseable.
		 */
		localDateTimeInputToIso(local) {
			const d = new Date(local)
			return Number.isNaN(d.getTime()) ? '' : d.toISOString()
		},

		/**
		 * Push pageKind = 'dashboard' into the reactive cnAiContext.
		 * registerSlug/schemaSlug are populated when the dashboard page
		 * receives those props (some dashboards are schema-specific).
		 */
		pushAiContext() {
			if (!this.cnAiContext) return
			this.cnAiContext.pageKind = 'dashboard'
			// Dashboard pages don't universally carry register/schema props —
			// leave them undefined (they'll be whatever the previous page set,
			// but we reset to undefined here for a clean context).
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
			this.cnAiContext.objectUuid = undefined
		},

		/**
		 * Resolve the initial date-range value when the feature is on.
		 * Priority: explicit `dateRange.default` → persisted
		 * `localStorage` entry (when `persistKey`) → `last-7` preset.
		 * No-ops when the feature is disabled. Emits
		 * `date-range-change` if a non-null value was resolved so
		 * consumers can wire their initial fetch to the same event.
		 */
		initDateRange() {
			if (!this.dateRangeEnabled) return
			let initial = null
			// 1. Persisted state (when a key is set).
			if (this.dateRange?.persistKey) {
				initial = this.readPersisted(this.dateRange.persistKey)
			}
			// 2. Explicit consumer-supplied default. A default may be given
			//    as an explicit { from, to } window OR as just a preset id
			//    (e.g. `default: { preset: 'last-7' }`) — in the latter case
			//    we resolve the window from the preset so the manifest can
			//    declare a starting range by name without hard-coding dates.
			if (!initial && this.dateRange?.default) {
				const def = this.dateRange.default
				if ((!def.from || !def.to) && def.preset && def.preset !== 'custom') {
					const win = resolvePresetWindow(def.preset, this.effectivePresets)
					if (win) {
						initial = { from: win.from, to: win.to, preset: def.preset }
					}
				}
				if (!initial) {
					initial = {
						from: def.from || null,
						to: def.to || null,
						preset: def.preset || 'custom',
					}
				}
			}
			// 3. Last-7 fallback.
			if (!initial) {
				const win = resolvePresetWindow('last-7', this.effectivePresets)
				if (win) {
					initial = { from: win.from, to: win.to, preset: 'last-7' }
				}
			}
			if (initial) {
				this.currentRange = initial
				this.dashboardDateRange = initial
				/**
				 * @event date-range-change Fired whenever the dashboard's effective date range changes (initial resolve, picker change, or persisted-range restore). Payload: `{ from, to, preset }`.
				 */
				this.$emit('date-range-change', { ...initial })
			}
		},

		/**
		 * Handle a picker change. Persists (when `persistKey` is
		 * set), updates the provided ref, emits `date-range-change`.
		 *
		 * @param {{ from: string, to: string, preset: string }} value
		 *   The new range, emitted by `CnDateRangePicker`.
		 */
		onDateRangeChange(value) {
			this.currentRange = value
			this.dashboardDateRange = value
			if (this.dateRange?.persistKey) {
				this.persistRange(this.dateRange.persistKey, value)
			}
			/**
			 * @event date-range-change Fired whenever the dashboard's effective date range changes. Payload: `{ from, to, preset }`.
			 */
			this.$emit('date-range-change', { ...value })
		},

		/**
		 * Read a persisted range from `localStorage`. Returns `null`
		 * when the key is missing, the stored value isn't valid JSON,
		 * or the parsed value doesn't have both `from` and `to`
		 * strings. Storage failures (private windows, opaque iframes)
		 * are swallowed.
		 *
		 * @param {string} key The localStorage key.
		 * @return {{ from: string, to: string, preset: string }|null}
		 */
		readPersisted(key) {
			try {
				if (typeof localStorage === 'undefined') return null
				const raw = localStorage.getItem(key)
				if (!raw) return null
				const parsed = JSON.parse(raw)
				if (!parsed || typeof parsed.from !== 'string' || typeof parsed.to !== 'string') {
					return null
				}
				return {
					from: parsed.from,
					to: parsed.to,
					preset: typeof parsed.preset === 'string' ? parsed.preset : 'custom',
				}
			} catch (_e) {
				return null
			}
		},

		/**
		 * Persist a range to `localStorage`. Swallows errors (quota
		 * exhaustion, private-window restrictions) — the picker
		 * keeps working in-memory.
		 *
		 * @param {string} key The localStorage key.
		 * @param {object} value The range to persist.
		 */
		persistRange(key, value) {
			try {
				if (typeof localStorage === 'undefined') return
				localStorage.setItem(key, JSON.stringify(value))
			} catch (_e) {
				// Intentionally swallowed — non-fatal.
			}
		},

		toggleEdit() {
			this.isEditing = !this.isEditing
			/**
			 * @event edit-toggle Emitted when the user toggles edit mode. Payload: `true` when entering edit mode, `false` when leaving.
			 */
			this.$emit('edit-toggle', this.isEditing)
		},

		onLayoutChange(updated) {
			// Write the new geometry back into the layout items IN PLACE so the
			// in-place manifest editor's diff (ADR-041) captures drag/resize —
			// CnDashboardGrid emits a freshly-mapped array, which on its own
			// never reaches the diffed manifest, so a resize would survive the
			// session (GridStack DOM) but vanish on reload.
			if (Array.isArray(updated) && Array.isArray(this.layout)) {
				for (const u of updated) {
					const item = this.layout.find((l) => String(l.id) === String(u.id))
						|| this.layout.find((l) => l.widgetId === u.widgetId)
					if (!item) continue
					if (u.gridX !== undefined) this.$set(item, 'gridX', u.gridX)
					if (u.gridY !== undefined) this.$set(item, 'gridY', u.gridY)
					if (u.gridWidth !== undefined) this.$set(item, 'gridWidth', u.gridWidth)
					if (u.gridHeight !== undefined) this.$set(item, 'gridHeight', u.gridHeight)
				}
			}
			/**
			 * @event layout-change Emitted when the user finishes dragging/resizing a widget. Payload: the updated layout array `[{ widgetId, x, y, w, h }, ...]`.
			 */
			this.$emit('layout-change', this.layout)
		},

		getWidgetDef(widgetId) {
			return this.widgetMap[widgetId] || null
		},

		/**
		 * The dashboardWidgetRegistry renderer for a layout item, when its widget
		 * definition's `type` is a registered catalog widget and no consumer
		 * `#widget-{id}` slot handles it. This is how widgets added via the
		 * in-app "Add widget…" flow (ADR-041) render on a dashboard.
		 *
		 * @param {object} item Layout item.
		 * @return {(object|null)} The widget renderer component, or null.
		 */
		registryRenderer(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || !def.type) return null
			const entry = getWidgetTypeEntry(def.type)
			return (entry && entry.renderer) || null
		},

		/**
		 * The stored content/config for a catalog widget (passed to its renderer).
		 *
		 * @param {object} item Layout item.
		 * @return {object}
		 */
		getWidgetContent(item) {
			const def = this.getWidgetDef(item.widgetId)
			return (def && def.content && typeof def.content === 'object') ? def.content : {}
		},

		/**
		 * Remove a widget from the dashboard while editing (ADR-041): drops it from
		 * `config.widgets` + `config.layout` (the working manifest, by reference)
		 * and emits the updated layout so consumers persist.
		 *
		 * @param {object} item Layout item to remove.
		 */
		removeWidget(item) {
			const id = item.widgetId
			const layoutIdx = this.layout.findIndex((l) => l.widgetId === id)
			if (layoutIdx !== -1) this.layout.splice(layoutIdx, 1)
			if (Array.isArray(this.widgets)) {
				const wIdx = this.widgets.findIndex((w) => w.id === id)
				if (wIdx !== -1) this.widgets.splice(wIdx, 1)
			}
			this.$emit('layout-change', this.layout)
		},

		/**
		 * Open the per-widget style/config editor for a layout item.
		 * Launchpad-style cog: selects the widget and shows the modal.
		 *
		 * @param {object} item Layout item to configure.
		 */
		configureWidget(item) {
			this.configWidgetId = item.widgetId
			this.showWidgetConfig = true
		},

		/**
		 * Persist the editor's changes onto the matching widget definition
		 * IN PLACE (so the in-place manifest editor picks them up) and close
		 * the modal. Mirrors the relevant chrome fields onto the layout
		 * entry's `styleConfig` too, since the grid reads styleConfig from
		 * the layout item.
		 *
		 * @param {object} edited The widget object mutated by the editor.
		 */
		onWidgetConfigSave(edited) {
			const def = Array.isArray(this.widgets)
				? this.widgets.find((w) => w.id === this.configWidgetId)
				: null
			if (def) {
				this.$set(def, 'title', edited.title !== undefined ? edited.title : def.title)
				this.$set(def, 'styleConfig', edited.styleConfig || {})
				this.$set(def, 'showTitle', edited.showTitle !== false)
				this.$set(def, 'customTitle', edited.customTitle || null)
				this.$set(def, 'customIcon', edited.customIcon || null)
				if (edited.content !== undefined) this.$set(def, 'content', edited.content)
			}
			const layoutItem = this.layout.find((l) => l.widgetId === this.configWidgetId)
			if (layoutItem) {
				this.$set(layoutItem, 'styleConfig', edited.styleConfig || {})
			}
			this.showWidgetConfig = false
			this.$emit('layout-change', this.layout)
		},

		/**
		 * Delete from inside the editor — drop the widget and close.
		 *
		 * @param {object} _w The widget the editor wants deleted (unused; we
		 *   route by `configWidgetId`).
		 */
		onWidgetConfigDelete(_w) {
			this.removeWidget({ widgetId: this.configWidgetId })
			this.showWidgetConfig = false
		},

		getWidgetTitle(item) {
			const def = this.getWidgetDef(item.widgetId)
			// Prefer a per-placement override, then the widget def's customTitle
			// (set by the in-place style editor cog), then the def's base title.
			return item.customTitle || def?.customTitle || def?.title || item.widgetId
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

		/**
		 * Whether this layout item resolves to an integration-typed
		 * widget — `def.type === 'integration'` with an `integrationId`
		 * pointing at a provider registered on the pluggable
		 * integration registry. Mirrors `isTile` / `isChart`.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widgetDef is an integration widget
		 */
		isIntegration(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'integration' && typeof def.integrationId === 'string'
		},

		/**
		 * Resolve the Vue component for an integration widget, applying
		 * the AD-19 surface fallback. Returns null when the integration
		 * isn't registered (renders the unavailable fallback instead).
		 *
		 * @param {object} item Layout item
		 * @return {object|null} Vue component, or null.
		 */
		resolveIntegrationWidget(item) {
			const def = this.getWidgetDef(item.widgetId)
			if (!def || typeof def.integrationId !== 'string') {
				return null
			}
			return this.resolveRegistryWidget(def.integrationId, this.surface)
		},

		/**
		 * Props passed to an integration widget: the rendering surface,
		 * the (optional) object context, and any extra `props` declared
		 * on the widget definition (per-widget props win on overlap).
		 *
		 * @param {object} item Layout item
		 * @return {object} Props object for the widget component.
		 */
		getIntegrationProps(item) {
			const def = this.getWidgetDef(item.widgetId)
			return {
				surface: this.surface,
				...(this.integrationContext || {}),
				...(def?.props || {}),
			}
		},

		/**
		 * Whether this layout item resolves to a chart-typed widget
		 * definition. Mirrors `isTile` and `isNcWidget`. Used by the
		 * dispatcher template to mount CnChartWidget.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widgetDef.type is 'chart'
		 */
		isChart(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'chart'
		},

		/**
		 * Whether this layout item resolves to a stats-block widget
		 * definition. Mirrors `isChart`. Used by the dispatcher
		 * template to mount CnStatsBlockWidget.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widgetDef.type is 'stats-block'
		 */
		isStatsBlock(item) {
			const def = this.getWidgetDef(item.widgetId)
			return def?.type === 'stats-block'
		},

		/**
		 * Read the manifest `dataSource` block from a widget
		 * definition. Returns `null` when none is set so the child
		 * components can render their fallback (or stay loading).
		 *
		 * @param {object} item Layout item
		 * @return {object|null} The dataSource block or null
		 */
		getWidgetDataSource(item) {
			const def = this.getWidgetDef(item.widgetId)
			// Prefer the in-app-editable `content.dataSource` (ADR-041), else the
			// legacy top-level manifest `dataSource`.
			return (def?.content && def.content.dataSource) || def?.dataSource || null
		},

		/**
		 * Build the v-bind payload for CnStatsBlockWidget from a
		 * stats-block widget definition. Forwards `props.countLabel`,
		 * `props.variant`, `props.showZeroCount`, `props.horizontal`,
		 * `props.route`, and `props.iconClass` plus the widgetDef's
		 * `title`. The `dataSource` is bound separately by the template
		 * (see `getWidgetDataSource`) so the prop appears clearly in
		 * the template even when it lives on the widgetDef root.
		 *
		 * `iconClass` is a Nextcloud core CSS class (`icon-link`, …)
		 * applied to the widget's wrapping `<div>` — a lightweight icon
		 * path that doesn't require MDI dynamic-import. See
		 * CnStatsBlockWidget for usage notes.
		 *
		 * @param {object} item Layout item
		 * @return {object} v-bind payload for CnStatsBlockWidget
		 */
		getStatsBlockProps(item) {
			const def = this.getWidgetDef(item.widgetId)
			// In-app-editable cards carry config in `content` (set by
			// CnStatsBlockWidgetForm); legacy manifests use top-level props.
			const content = def?.content || {}
			const props = content.props || def?.props || {}
			const out = { title: content.title || def?.title || item.widgetId }
			for (const key of ['countLabel', 'variant', 'showZeroCount', 'horizontal', 'route', 'iconClass']) {
				if (props[key] !== undefined) out[key] = props[key]
			}
			return out
		},

		/**
		 * Build the v-bind payload for CnChartWidget from a chart-typed
		 * widget definition. Translates `props.chartKind` → `type` (so
		 * the manifest's free-form `chartKind` does not collide with
		 * apexcharts' own reserved `type` prop) and forwards the
		 * supported subset (`series`, `categories`, `labels`, `options`,
		 * `colors`, `toolbar`, `legend`, `height`, `width`,
		 * `unavailableLabel`).
		 *
		 * Unknown keys on `props` (including the reserved `dataSource`
		 * union) are ignored at render time so manifest authors can ship
		 * forward-compatible declarations.
		 *
		 * @param {object} item Layout item
		 * @return {object} v-bind payload for CnChartWidget
		 */
		getChartProps(item) {
			const def = this.getWidgetDef(item.widgetId)
			// In-app-editable charts (ADR-041) carry their config in `content`
			// (set by CnChartWidgetForm); legacy manifest charts use `props`.
			const content = def?.content || {}
			const props = content.props || def?.props || {}
			const out = {}
			const chartKind = content.chartKind || props.chartKind
			if (chartKind) out.type = chartKind
			for (const key of CHART_PROP_KEYS) {
				const v = content[key] !== undefined ? content[key] : props[key]
				if (v !== undefined) out[key] = v
			}
			return out
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
	/* Scroll the dashboard itself when its widgets are taller than the host
	   region (height:100% is a no-op when the host height is content-sized, so
	   this only kicks in when an ancestor constrains the height). */
	height: 100%;
	overflow-y: auto;
	box-sizing: border-box;
}

.cn-dashboard-page__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 20px;
	flex-wrap: wrap;
	gap: 12px;
	/* Clear the Nextcloud navigation toggle button (44px wide, absolutely
	   positioned at the left edge of .app-content) plus 12px breathing
	   room. Only the HEADER shifts right — body widgets keep full width. */
	padding-inline-start: 56px;
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

/* Date-range chip rendered in a chart widget's title bar via the
   CnWidgetWrapper `#title-meta` slot. Wrapped in an NcActions trigger
   so clicking opens a popover with preset + from/to inputs — same
   controls as the global picker, just inline at the chart. */
.cn-dashboard-page__date-chip-trigger {
	/* Eat the default NcActions trigger button styling so the only
	   visible chrome is the chip span itself. */
	display: inline-flex;
}

.cn-dashboard-page__date-chip-trigger :deep(.action-item__menutoggle) {
	min-width: 0;
	min-height: 0;
	padding: 0;
	background: transparent;
	border: none;
}

/* The chip text lives in NcActions' icon slot, whose default toggle is
   sized for a single ~44px icon and clips wider content (the cause of the
   "8 → 2" truncation). Let the toggle + its icon wrapper grow to the
   chip's natural width so the full "18 May – 25 May" range reads. */
.cn-dashboard-page__date-chip-trigger :deep(.button-vue),
.cn-dashboard-page__date-chip-trigger :deep(.button-vue__wrapper),
.cn-dashboard-page__date-chip-trigger :deep(.button-vue__icon) {
	width: auto !important;
	min-width: 0 !important;
	overflow: visible !important;
}

.cn-dashboard-page__date-chip {
	display: inline-flex;
	align-items: center;
	padding: 2px 10px;
	border-radius: 999px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	cursor: pointer;
	transition: background 100ms ease;
}

.cn-dashboard-page__date-chip-trigger:hover .cn-dashboard-page__date-chip,
.cn-dashboard-page__date-chip-trigger:focus-within .cn-dashboard-page__date-chip {
	background: var(--color-primary-element-light, var(--color-background-darker));
	color: var(--color-main-text);
}

/* Empty span used to keep preset NcActionButtons' label aligned with
   the row that shows the current-selection CalendarRange icon. NcActionButton
   icon slot is roughly 20px wide. */
.cn-dashboard-page__date-chip-preset-spacer {
	display: inline-block;
	width: 16px;
	height: 16px;
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

.cn-dashboard-page__widget-edit {
	position: absolute;
	top: 4px;
	inset-inline-end: 4px;
	z-index: 5;
	background: var(--color-main-background);
	border-radius: var(--border-radius);
	box-shadow: 0 1px 4px var(--color-box-shadow, rgba(0, 0, 0, 0.2));
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

/* widget-ref content items */
.cn-dashboard-page__content {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-dashboard-page__content-item {
	width: 100%;
}
</style>

<!-- Unscoped: the chip's NcActions menu is teleported to <body> (container="body"),
     so scoped :deep() can't reach it. NcActions forwards the trigger's data-testid
     onto the popper, so we target it here to (a) give the custom From/To
     datetime-local inputs comfortable width and (b) keep the menu content from
     clipping the native picker. -->
<style>
.action-item__popper[data-testid^="cn-dashboard-page-date-chip-"] .v-popper__inner,
[data-testid^="cn-dashboard-page-date-chip-"].v-popper__popper .v-popper__inner {
	overflow: visible;
}

[data-testid^="cn-dashboard-page-date-chip-"] .action-input__form,
[data-testid^="cn-dashboard-page-date-chip-"] .action-input {
	min-width: 240px;
}
</style>
