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
	<div class="cn-detail-page" data-testid="cn-detail-page" :style="{ maxWidth: maxWidth }">
		<!-- Header -->
		<div class="cn-detail-page__header" data-testid="cn-detail-page-header">
			<!-- Header (left block) — overridable via #header slot. Default
			     renders the icon + title + description. The right-hand
			     #actions slot remains separate so headerComponent and
			     actionsComponent can be replaced independently. -->
			<!--
				@slot header
				@description Replace the entire left header block (icon + title + description).
				@binding {string} title Page title.
				@binding {string} description Subtitle / description.
				@binding {string} icon MDI icon name resolved by CnIcon.
				@binding {number} icon-size Icon size in pixels.
			-->
			<slot
				name="header"
				:title="title"
				:description="description"
				:icon="icon"
				:icon-size="iconSize">
				<div class="cn-detail-page__header-left">
					<!--
						@slot icon
						@description Replace only the header icon (keeping the lib's title +
						description rendering). Default content: a `<CnIcon>` resolved from
						the `icon` prop.
					-->
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
						<!--
							@slot translation-badge
							@description Replace the default `CnTranslatedBadge` rendered when the
							resolved object's `_translationMeta.translatedFrom` is set. Receives
							`:object="resolvedObject"`. Default renders `<CnTranslatedBadge :object="resolvedObject" />`
							(which auto-hides when there's nothing to surface). See
							`openspec/changes/cn-detail-translation-aware-surfacing`.
						-->
						<slot name="translation-badge" :object="resolvedObject">
							<CnTranslatedBadge v-if="resolvedObject" :object="resolvedObject" />
						</slot>
						<p v-if="description" class="cn-detail-page__description">
							{{ description }}
						</p>
						<!-- Declarative cross-schema summary chips (manifest
						     `config.summaryAggregates`). Count/sum/avg over a
						     related schema scoped to this object via @objectId. -->
						<CnSummaryAggregates
							v-if="summaryAggregates && summaryAggregates.length > 0"
							:aggregates="summaryAggregates" />
					</div>
				</div>
			</slot>
			<div class="cn-detail-page__header-actions">
				<!-- Declarative lifecycle/transition buttons (manifest
				     `config.lifecycleActions`). Status-gated; driven by the
				     object's x-openregister-lifecycle. Renders nothing when no
				     transitions apply. -->
				<CnLifecycleActions
					v-if="lifecycleActions && (objectId || currentObject)"
					:object-id="objectId"
					:object="currentObject"
					:config="lifecycleActions"
					@transitioned="onTransitioned"
					@reload="onLifecycleReload" />
				<!-- Declarative header actions (#91 Wave 3): a manifest
				     `config.headerActions[]` renders as buttons (api-call /
				     open-form / toggle / navigate) with visibleWhen gating —
				     the object context this page provides drives `@objectId` /
				     `@object.<field>` tokens + local predicates (the shillinq
				     PaymentRunDetailActions contract). -->
				<CnActionButtons
					v-if="headerActions && headerActions.length"
					:actions="headerActions"
					data-testid="cn-detail-page-header-actions"
					@created="onLifecycleReload" />
				<!--
					@slot actions
					@description Right-hand action surface in the page header (typically NcActions
					or buttons). Renders alongside (not inside) the `header` slot. Receives the
					resolved object context so an actionsComponent (resolved by CnPageRenderer)
					can act on the current record without re-fetching.
					@binding {object} object The resolved record.
					@binding {string} objectId The resolved object id.
					@binding {object} schema The resolved schema.
					@binding {string} objectType The resolved object type.
					@binding {object} store The effective object store.
				-->
				<slot
					name="actions"
					:object="resolvedObject"
					:object-id="objectId"
					:schema="currentSchema"
					:object-type="resolvedObjectType"
					:store="effectiveObjectStore" />
				<!-- NB: no sidebar-toggle here — NcObjectSidebar/NcAppSidebar
				     renders its own open toggle (`.app-sidebar__toggle`) when
				     closed and an X (`.app-sidebar__close`) when open, so a custom
				     button would duplicate it. -->
				<!-- In-app edit button (ADR-041): icon-only, self-wires from CnAppRoot. -->
				<CnOpenBuildEditButton />
				<CnActionsMenu
					:show-refresh="effectiveHeaderShowRefresh"
					:refreshing="effectiveRefreshing"
					:show-request-feature="showRequestFeature"
					:documentation-url="documentationUrl"
					:documentation-label="documentationLabel || undefined"
					:widget-id="resolvedPageId"
					:title="title"
					:surface="`detail:${resolvedPageId}`"
					refresh-channel="cn:page:refresh"
					testid-base="cn-detail-page"
					@refresh="onHeaderRefresh"
					@request-feature="onHeaderRequestFeature" />
			</div>
		</div>

		<!-- Locked-by-other banner. Renders only when a `lockState`
		     was wired by `setup()` AND a remote lock is active.
		     Suppressed when the lock is held by the current user. -->
		<CnLockedBanner
			v-if="lockState && lockState.locked.value && !lockState.lockedByMe.value"
			:locked-by="lockState.lockedBy.value"
			:expires-at="lockState.expiresAt.value" />

		<!-- Loading state -->
		<div v-if="showLoadingState" class="cn-detail-page__loading">
			<NcLoadingIcon :size="32" />
			<span>{{ loadingLabel }}</span>
		</div>

		<!-- Error state -->
		<div v-else-if="error" class="cn-detail-page__error">
			<!--
				@slot error
				@description Replace the default `<NcEmptyContent>` error surface. Default
				content uses `errorMessage` + an MDI alert icon + an optional retry button.
			-->
			<slot name="error">
				<NcEmptyContent :name="errorMessage">
					<template #icon>
						<AlertCircleOutline :size="48" />
					</template>
					<template #action>
						<NcButton v-if="onRetry" variant="primary" @click="onRetry">
							<template #icon>
								<Refresh :size="20" />
							</template>
							{{ retryLabel }}
						</NcButton>
						<!--
							@slot error-actions
							@description Extra buttons rendered inside the default error
							surface's action area, after the (optional) Retry button.
						-->
						<slot name="error-actions" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Empty state -->
		<div v-else-if="empty" class="cn-detail-page__empty">
			<!--
				@slot empty
				@description Replace the default empty-state `<NcEmptyContent>` surface.
			-->
			<slot name="empty">
				<NcEmptyContent :name="emptyLabel">
					<template #icon>
						<InformationOutline :size="48" />
					</template>
					<template #action>
						<!--
							@slot empty-actions
							@description Buttons rendered inside the default empty-state
							action area.
						-->
						<slot name="empty-actions" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>

		<!-- Main content -->
		<div v-else class="cn-detail-page__body">
			<div v-if="$scopedSlots['before-body'] || $slots['before-body']" class="cn-detail-page__before-body">
				<!--
					@slot before-body
					@description Content rendered at the top of the body, above the grid
					layout / stats / schema-driven auto-body (Data + Related). Use it to
					surface page-level widgets (e.g. a KPI/insights dashboard) in the body
					below the header+actions line without suppressing the auto Data/Related
					sections (which a `default` slot override would).
					@binding {object} object The resolved record.
					@binding {object} schema The resolved schema.
					@binding {string} objectType The resolved object type.
					@binding {string} objectId The resolved object id.
					@binding {object} store The effective object store.
				-->
				<slot
					name="before-body"
					:object="resolvedObject"
					:schema="currentSchema"
					:object-type="resolvedObjectType"
					:object-id="objectId"
					:store="effectiveObjectStore" />
			</div>

			<!-- Declarative in-body sections, `placement: "before-body"` —
			     above the grid / stats / auto-body. -->
			<CnBodySections
				v-if="hasBodyWidgets"
				:sections="bodyWidgets"
				:context="sectionContext"
				placement="before-body"
				data-testid="cn-detail-body-sections-before-body" />

			<!-- Adjustable widget grid (GridStack). The detail body is, at its
			     core, a real drag/resize grid: by default it is seeded with the
			     schema-driven Data + Related widgets (see `bodyGridLayout`), but in
			     OpenBuild edit mode widgets can be moved, resized, configured and
			     added. Explicit `layout` + `widgets` props (manifest grid pages)
			     feed the same engine, so hand-authored grid pages also become
			     draggable. -->
			<CnDashboardGrid
				v-if="hasBodyGrid"
				:layout="bodyGridLayout"
				:editable="editingBody"
				:columns="12"
				class="cn-detail-page__grid"
				@layout-change="onBodyLayoutChange">
				<template #widget="{ item }">
					<div
						class="cn-detail-page__grid-item"
						:aria-labelledby="showGridTitle(item) ? `widget-title-${item.id}` : undefined">
						<!-- In-app edit overlay (ADR-041): a configure cog appears on
						     widgets that have a registered config form while the page
						     is in OpenBuild edit mode. The modal's own Delete affordance
						     covers removal, so no separate remove button here. -->
						<div v-if="editingBody && registryFormFor(item)" class="cn-detail-page__widget-edit">
							<NcButton type="tertiary" :aria-label="t('nextcloud-vue', 'Configure widget')" @click="configureWidget(item)">
								<template #icon>
									<Cog :size="18" />
								</template>
							</NcButton>
						</div>
						<!-- Section heading ONLY for consumer-supplied bare-content slots.
						     Built-in widgets (data / related / integration / catalog)
						     render their own titled card header, so a grid <h3> here would
						     duplicate the title above the widget. -->
						<h3
							v-if="showGridTitle(item)"
							:id="`widget-title-${item.id}`"
							class="cn-detail-page__widget-title">
							{{ findWidget(item).title }}
						</h3>
						<!--
							@slot `widget-${item.widgetId}`
							@description Per-widget slot whose name is `widget-<widgetId>`. Use
							it to inject custom widget content into a grid slot. Default
							fallback renders a registry widget: `type: 'data'` renders the
							schema-driven data widget; `type: 'related'` the related-objects
							widget; `type: 'integration'` resolves from the integration
							registry; any other content-driven catalog type (stat / chart /
							delta / gauge / object-list / …) renders its registered renderer.
							@binding {object} item Layout item descriptor.
							@binding {object} widget Resolved widget definition.
						-->
						<slot
							:name="`widget-${item.widgetId}`"
							:item="item"
							:widget="findWidget(item)">
							<!-- `type: 'data'` widget: render the schema-driven data
							     widget with the page's loaded object + the def's
							     per-property overrides. This is the default body widget. -->
							<CnObjectDataWidget
								v-if="isDataWidget(item) && currentSchema"
								:title="findWidget(item).title || widgetContentFor(item).title || undefined"
								:schema="currentSchema"
								:object-data="currentObject"
								:object-type="resolvedObjectType"
								:store="effectiveObjectStore"
								:overrides="widgetContentFor(item).overrides || {}"
								:columns="widgetContentFor(item).columns || 3" />
							<!-- `type: 'related'` widget: the related-objects widget,
							     the second default body widget. Resolves this object's
							     relations and links into integrations. -->
							<CnRelatedObjectsWidget
								v-else-if="isRelatedWidget(item)"
								:title="findWidget(item).title || widgetContentFor(item).title || undefined"
								:object-type="resolvedObjectType"
								:object-id="objectId"
								:object-data="currentObject"
								:register="register"
								:schema="schema"
								:store="effectiveObjectStore"
								:include-groups="widgetContentFor(item).groups || []"
								@open-integration="onAutoBodyOpenIntegration" />
							<!-- Fallback for `type: 'integration'` widget defs:
							     render the registry widget on the detail-page
							     surface. A consumer-supplied #widget-<id> slot
							     still overrides this. -->
							<component
								:is="resolveIntegrationWidget(item)"
								v-else-if="isIntegrationWidget(item) && resolveIntegrationWidget(item)"
								v-bind="getIntegrationProps(item)" />
							<!-- Fallback for content-driven catalog widgets
							     (stat / chart / delta / gauge / object-list / …):
							     render the registered renderer with the def's
							     `content`. These self-fetch from OpenRegister.
							     The current object's context is forwarded too (same
							     shape CnWidgetGrid merges on the v2 widgets[] path) so
							     object-aware catalog widgets — e.g. the `files` widget
							     binding to this object's folder — receive it; widgets
							     that don't declare these props ignore them. `content`
							     is spread LAST so explicit widget config still wins. -->
							<component
								:is="registryRendererFor(item)"
								v-else-if="registryRendererFor(item)"
								:content="widgetContentFor(item)"
								:object-id="objectId"
								:register="register"
								:schema="schema"
								:object-data="currentObject"
								:object-type="resolvedObjectType"
								:store="effectiveObjectStore"
								v-bind="widgetContentFor(item)" />
						</slot>
					</div>
				</template>
			</CnDashboardGrid>

			<!-- Statistics table -->
			<div v-if="hasStats" class="cn-detail-page__stats">
				<!--
					@slot stats-header
					@description Replace the heading above the stats table. Default
					content: an `<h3>` showing `statsTitle`.
				-->
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
						<!--
							@slot stats-rows
							@description Replace the default rendering of the `statsRows`
							prop. Use when rows need custom formatting per column.
						-->
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

			<!-- Default vertical stacking mode. The schema-driven auto-body (Data +
			     Related) is now rendered by the adjustable grid above (seeded by
			     `bodyGridLayout`), so this branch only carries hand-authored
			     default-slot content when no widget grid is active. -->
			<div v-else class="cn-detail-page__content">
				<!-- Default content -->
				<div v-if="!hasBodyGrid" class="cn-detail-page__content">
					<!--
						@slot default
						@description Main body content rendered when no grid layout, no
						stats table, and no schema-driven auto-body apply. Use it to ship
						a hand-authored detail page.
					-->
					<slot />
				</div>

				<!-- Sections slot — additional content below stats -->
				<div v-if="$slots.sections" class="cn-detail-page__sections">
					<!--
						@slot sections
						@description Additional vertically-stacked content rendered below
						the default body / stats table.
					-->
					<slot name="sections" />
				</div>
			</div>

			<!-- Declarative in-body sections, `placement: "after-data"` —
			     below the data/auto-body, above the related-object lists. -->
			<CnBodySections
				v-if="hasBodyWidgets"
				:sections="bodyWidgets"
				:context="sectionContext"
				placement="after-data"
				data-testid="cn-detail-body-sections-after-data" />

			<!-- Declarative related-object list sections (manifest
			     `config.relatedCollections`). Rendered below the detail body;
			     each section's filter is scoped to this object via @objectId.
			     An optional relation-link button opens CnRelationLinkModal. -->
			<div
				v-if="(relatedCollections && relatedCollections.length > 0) || (relationLinks && relationLinks.length > 0)"
				class="cn-detail-page__related-collections">
				<div v-if="relationLinks && relationLinks.length > 0" class="cn-detail-page__relation-links">
					<NcButton
						v-for="(link, li) in relationLinks"
						:key="li"
						class="cn-detail-page__relation-link-button"
						:data-testid="`cn-detail-relation-link-${li}`"
						@click="openRelationLink(link)">
						<template #icon>
							<Plus :size="18" />
						</template>
						{{ link.label || t('nextcloud-vue', 'Link related object') }}
					</NcButton>
				</div>
				<CnRelatedCollections
					v-if="relatedCollections && relatedCollections.length > 0"
					:collections="relatedCollections"
					@row-click="onRelatedRowClick" />
			</div>

			<!-- Declarative in-body sections, `placement: "after-related"` —
			     below the related-object lists. -->
			<CnBodySections
				v-if="hasBodyWidgets"
				:sections="bodyWidgets"
				:context="sectionContext"
				placement="after-related"
				data-testid="cn-detail-body-sections-after-related" />

			<!-- Declarative in-body sections, `placement: "end"` (the default
			     placement) — the last body content, above the footer. -->
			<CnBodySections
				v-if="hasBodyWidgets"
				:sections="endPlacementSections"
				:context="sectionContext"
				:placement="null"
				data-testid="cn-detail-body-sections-end" />

			<!-- Footer -->
			<div v-if="$slots.footer" class="cn-detail-page__footer">
				<!--
					@slot footer
					@description Footer surface rendered below the detail-page body. Use
					it for save/cancel button rows or status text.
				-->
				<slot name="footer" />
			</div>
		</div>

		<!-- Per-widget style/config editor (ADR-041). Opened by the per-widget
		     configure cog while in OpenBuild edit mode; the modal's own Delete
		     button removes the widget from the grid. -->
		<CnWidgetStyleEditorModal
			v-if="showWidgetConfig"
			:show="showWidgetConfig"
			:widget="configWidget"
			:deletable="true"
			@save="onWidgetConfigSave"
			@delete="onWidgetConfigDelete"
			@close="showWidgetConfig = false" />

		<!-- Relation-link modal (manifest `config.relationLinks`): async-search a
		     target schema and patch a FK on the current object. -->
		<CnRelationLinkModal
			v-if="activeRelationLink"
			:title="activeRelationLink.title || undefined"
			:select-label="activeRelationLink.selectLabel || undefined"
			:register="activeRelationLink.register"
			:schema="activeRelationLink.schema"
			:label-field="activeRelationLink.labelField || 'name'"
			:allow-create="activeRelationLink.allowCreate === true"
			:current-type="resolvedObjectType"
			:current-object="currentObject || {}"
			:fk-field="activeRelationLink.fkField"
			@linked="onRelationLinked"
			@close="activeRelationLink = null" />
	</div>
</template>

<script>
import { provide, ref, watch } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnActionsMenu from '../CnActionsMenu/CnActionsMenu.vue'
import CnOpenBuildEditButton from '../CnOpenBuildEditButton/CnOpenBuildEditButton.vue'
import CnLockedBanner from '../CnLockedBanner/CnLockedBanner.vue'
import CnObjectDataWidget from '../CnObjectDataWidget/CnObjectDataWidget.vue'
import CnRelatedObjectsWidget from '../CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import CnDashboardGrid from '../CnDashboardGrid/CnDashboardGrid.vue'
import CnLifecycleActions from '../CnLifecycleActions/CnLifecycleActions.vue'
import { CnActionButtons } from '../CnActionButtons/index.js'
import CnSummaryAggregates from '../CnSummaryAggregates/CnSummaryAggregates.vue'
import CnRelatedCollections from '../CnRelatedCollections/CnRelatedCollections.vue'
import CnBodySections from '../CnBodySections/CnBodySections.vue'
import CnWidgetStyleEditorModal from '../../modals/CnWidgetStyleEditorModal.vue'
import CnRelationLinkModal from '../../modals/CnRelationLinkModal.vue'
import { getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'
import '../CnWidgetGrid/registerDashboardWidgets.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { useObjectLock } from '../../composables/useObjectLock.js'
import { useObjectSubscription } from '../../composables/useObjectSubscription.js'
import { gridLayout } from '../../mixins/gridLayout.js'
import { cnGridCellStyle, hasGridRow } from '../../utils/grid.js'
import { defaultDetailGrid } from '../../utils/defaultDetailGrid.js'
import { useObjectStore } from '../../store/index.js'
import { CnIcon } from '../CnIcon/index.js'
import CnTranslatedBadge from '../CnTranslatedBadge/CnTranslatedBadge.vue'

/** Surfaces understood by the pluggable integration registry (AD-19). */
const INTEGRATION_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnDetailPage — Generic detail/overview page.
 *
 * Supports two layout modes:
 * 1. **Default (vertical stacking):** Content provided via default slot, cards stack vertically.
 * 2. **Grid layout:** When `layout` and `widgets` props are provided, content renders in a
 *    12-column CSS grid with `#widget-{widgetId}` scoped slots. Same API as CnDashboardPage.
 *
 * Basic usage (vertical stacking)
 *
 * A simpler alternative to CnIndexPage for pages that display detail info,
 * statistics, charts, or card grids — without multi-object tables or CRUD
 * dialogs. Provides a consistent layout with header, loading/error/empty
 * states, a statistics table, and flexible content slots.
 *
 * Basic usage with stats table and content
 * ```vue
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
 * ```
 *
 * Grid layout mode
 * ```vue
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
 * ```
 *
 * With header actions and error handling
 * ```vue
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
 * ```
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
		CnActionsMenu,
		CnOpenBuildEditButton,
		CnLockedBanner,
		CnObjectDataWidget,
		CnRelatedObjectsWidget,
		CnDashboardGrid,
		CnLifecycleActions,
		CnActionButtons,
		CnSummaryAggregates,
		CnRelatedCollections,
		CnBodySections,
		CnTranslatedBadge,
		CnWidgetStyleEditorModal,
		CnRelationLinkModal,
		Cog,
		Plus,
	},

	mixins: [gridLayout],

	inject: {
		objectSidebarState: { default: null },
		/**
		 * Reactive AI context holder provided by CnAppRoot. This page
		 * component writes pageKind, objectUuid, registerSlug, schemaSlug
		 * in created() and watches for changes. Resets on beforeDestroy().
		 */
		cnAiContext: { default: null },
		/**
		 * OpenBuild in-app edit state (ADR-041), a ref provided by CnAppRoot /
		 * the edit button. When truthy, configurable grid widgets show a
		 * configure cog. Defaults to null (no edit affordance) for standalone use.
		 */
		cnEditingBody: { default: null },
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
			default: () => t('nextcloud-vue', 'Loading…'),
		},

		/**
		 * Sidebar configuration. Accepts EITHER form:
		 *
		 *   - **Boolean (legacy, deprecated):** `true` activates the
		 *     external sidebar, `false` deactivates. The first time this
		 *     form is observed per component instance a one-shot
		 *     `console.warn` is logged pointing at the migration path.
		 *     Continues to work in v1.x for back-compat.
		 *
		 *   - **Object (preferred):** mirrors `CnIndexPage.sidebar` plus
		 *     the detail-specific fields previously on `sidebarProps`:
		 *     ```ts
		 *     {
		 *       show?: boolean,        // default true; false suppresses sidebar
		 *       enabled?: boolean,     // default true; false bypasses external sidebar
		 *       register?: string,
		 *       schema?: string,
		 *       hiddenTabs?: string[],
		 *       title?: string,
		 *       subtitle?: string,
		 *       tabs?: Array<TabDef>,  // see manifest-abstract-sidebar
		 *     }
		 *     ```
		 *     When BOTH `sidebar` (Object) and `sidebarProps` are set
		 *     with overlapping fields, the Object form wins and a
		 *     `console.warn` lists the conflicting fields once per
		 *     component instance.
		 *
		 * @type {boolean | object}
		 */
		sidebar: {
			type: [Boolean, Object],
			// Object default (not Boolean `false`) so apps that omit the
			// prop don't trip the Boolean-form deprecation warning. Equivalent
			// to `false`: resolves to a suppressed/inactive sidebar.
			default: () => ({ enabled: false }),
		},

		/**
		 * Initial open state of the object sidebar when it first activates.
		 * Defaults to closed so the detail content fills the page; the user
		 * opens it on demand via the header sidebar-toggle (and the sidebar's
		 * own X closes it). After the first activation the open state is owned
		 * by the shared `objectSidebarState` channel (toggle / close), so this
		 * prop only seeds the initial value.
		 */
		sidebarOpen: {
			type: Boolean,
			default: false,
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

		/**
		 * Rendering surface forwarded to integration widgets in the
		 * grid layout (widget defs with `type === 'integration'`).
		 * Drives the AD-19 surface fallback. Defaults to
		 * `'detail-page'` — the surface this page represents.
		 *
		 * @type {'user-dashboard'|'app-dashboard'|'detail-page'|'single-entity'}
		 */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (value) => INTEGRATION_SURFACES.includes(value),
		},

		/**
		 * Object context forwarded to integration widgets:
		 * `{ register, schema, objectId }`. When omitted it is derived
		 * from `sidebarProps.register` / `sidebarProps.schema` (or
		 * `objectType`) and `objectId`, so `CnFilesCard` etc. can
		 * fetch the right object's sub-resources without extra wiring.
		 *
		 * @type {object|null}
		 */
		integrationContext: {
			type: Object,
			default: null,
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
		 * @type {Array<{ key: string, label: string, align: string }>}
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

		/**
		 * Whether to auto-subscribe to live updates for this object.
		 * Defaults to true. When `useObjectStore` and `objectType` +
		 * `objectId` are both available, the page calls
		 * `objectStore.subscribe(objectType, objectId)` on mount and
		 * unsubscribes on unmount via `tryOnScopeDispose`. Set
		 * `false` for read-only / archive views.
		 *
		 * @type {boolean}
		 */
		subscribe: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether the schema-driven auto-body renders the related-objects widget
		 * beneath the data widget. Defaults to true (back-compat). Set false on a
		 * page that surfaces relations elsewhere (e.g. in the sidebar) to drop the
		 * "Related" section from the body.
		 *
		 * @type {boolean}
		 */
		showRelatedObjects: {
			type: Boolean,
			default: true,
		},

		/**
		 * Optional explicit Pinia store instance to subscribe / lock
		 * against. When omitted, the page resolves `useObjectStore()`
		 * lazily so consumer apps that haven't activated Pinia yet
		 * (e.g. tests) don't crash.
		 *
		 * @type {object|null}
		 */
		objectStore: {
			type: Object,
			default: null,
		},

		/**
		 * OpenRegister register slug. Pair with `schema` to opt into the
		 * schema-driven mode: the page fuses the two into an internal
		 * `${register}-${schema}` object-type slug, registers it on the
		 * store, fetches the object identified by `objectId`, and auto-
		 * renders `CnObjectDataWidget` + `CnObjectMetadataWidget` when no
		 * default-slot content is supplied. Compatible with the existing
		 * `objectType` prop — `objectType` wins on collision, so legacy
		 * direct mounts are unaffected.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * OpenRegister schema slug. See `register` for the schema-driven
		 * contract.
		 *
		 * @type {string}
		 */
		schema: {
			type: String,
			default: '',
		},

		/**
		 * Tab definitions forwarded to the host App's `CnObjectSidebar`
		 * via the injected `objectSidebarState`. Each entry follows the
		 * `CnObjectSidebar` tab shape (see that component for the exact
		 * fields). When empty (default) the sidebar falls back to its
		 * own default tab set. The actual `<CnObjectSidebar>` is rendered
		 * at `NcContent` level by `CnAppRoot` (ADR-017 — external sidebar
		 * pattern); this page only publishes the tabs.
		 *
		 * @type {Array<object>}
		 */
		sidebarTabs: {
			type: Array,
			default: () => [],
		},

		/**
		 * Documentation link surfaced in the page-header Actions menu. When
		 * set, the menu renders a "Documentation" entry that opens this URL
		 * in a new tab. The Refresh and Request-a-feature entries render by
		 * default regardless of this value.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},

		/** Label for the Documentation entry in the header menu. */
		documentationLabel: {
			type: String,
			default: '',
		},

		/**
		 * Stable id for the page-header Actions menu — forwarded as the
		 * `widgetId` on the `@refresh` / `cn:page:refresh` payloads and as
		 * the `surface: "detail:<pageId>"` on the feature-request modal.
		 * Falls back to a slugified title when empty.
		 */
		pageId: {
			type: String,
			default: '',
		},

		/**
		 * Whether the Refresh entry renders in the page-header menu.
		 * Tri-state:
		 * - `true` / `false` — force it on or off.
		 * - `null` (the default) — **auto**: show Refresh only when it will
		 *   do something, i.e. a consumer attached an `@refresh` listener OR
		 *   the page is in schema-driven mode (`register` + `schema` +
		 *   `objectId`) and can self-fetch. Legacy `objectType`-mode detail
		 *   pages that never wire `@refresh` therefore show no dead button.
		 *
		 * @type {boolean|null}
		 */
		showRefresh: {
			type: Boolean,
			default: null,
		},

		/**
		 * Whether a header refresh is in flight. Disables the Refresh entry
		 * and swaps its icon for a spinner. Wire this to the same flag the
		 * host toggles around its `@refresh` handler.
		 */
		refreshing: {
			type: Boolean,
			default: false,
		},

		/** Whether the Request-a-feature entry renders in the page-header menu. */
		showRequestFeature: {
			type: Boolean,
			default: true,
		},

		/**
		 * Declarative lifecycle/transition actions (manifest `config.lifecycleActions`).
		 * When set, renders status-gated transition buttons in the page header driven
		 * by the object's `x-openregister-lifecycle`. Shape:
		 * `{ field?: 'status', transitions?: [{ from, to, action, label, confirm?, variant? }], autoFetch?: boolean }`.
		 * With just `{ field: 'status' }` the allowed transitions are fetched live from
		 * OpenRegister's `/available-actions` endpoint (server-authoritative). An
		 * explicit `transitions` array is filtered client-side by the object's current
		 * state. Omit (default `null`) to keep the current behaviour (no transition
		 * buttons). See `CnLifecycleActions`.
		 *
		 * @type {object|null}
		 */
		lifecycleActions: {
			type: Object,
			default: null,
		},

		/**
		 * Declarative header actions (manifest `config.headerActions`, #91
		 * Wave 3) rendered as buttons in the page header via CnActionButtons —
		 * `api-call` (POST/PUT + toast + refresh), `open-form`, `toggle`,
		 * `navigate` / `open-modal`, each with an optional `visibleWhen`
		 * predicate. Distinct from `lifecycleActions` (state-machine
		 * transitions): these are free-form record actions (approve, send,
		 * archive). The page's object context drives `@objectId` /
		 * `@object.<field>` token + local-predicate resolution. Empty (the
		 * default) renders nothing.
		 *
		 * @type {Array<object>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Declarative related-object list sections (manifest
		 * `config.relatedCollections`). Each entry renders a titled
		 * `CnObjectListWidget` below the detail body, filtered to this object via
		 * `@objectId` / `@object.<field>` tokens. Shape per entry:
		 * `{ title?, register, schema, filter?, columns?, sort?, limit?, rowRoute? }`.
		 * Empty / omitted (default `[]`) renders nothing. See `CnRelatedCollections`.
		 *
		 * @type {Array<object>}
		 */
		relatedCollections: {
			type: Array,
			default: () => [],
		},

		/**
		 * Declarative cross-schema summary chips (manifest
		 * `config.summaryAggregates`). Each entry runs ONE count/sum/avg over a
		 * related schema scoped to this object and shows it as a stat chip in the
		 * header. Shape per entry:
		 * `{ label, register, schema, metric?, field?, filter?, format? }`.
		 * Empty / omitted (default `[]`) renders nothing. See `CnSummaryAggregates`.
		 *
		 * @type {Array<object>}
		 */
		summaryAggregates: {
			type: Array,
			default: () => [],
		},

		/**
		 * Declarative relation-link actions (manifest `config.relationLinks`).
		 * Each entry renders a button that opens a search-and-link modal which
		 * patches a foreign-key field on THIS object with the chosen object's id.
		 * Shape per entry:
		 * `{ label?, register, schema, fkField, labelField?, allowCreate?, title?, selectLabel? }`.
		 * Empty / omitted (default `[]`) renders nothing.
		 *
		 * @type {Array<object>}
		 */
		relationLinks: {
			type: Array,
			default: () => [],
		},

		/**
		 * Declarative IN-BODY sections (manifest `config.bodyWidgets`). Each
		 * entry renders a REGISTERED host-app component as a titled section in
		 * the page BODY (not the sidebar), with the object/page context injected.
		 * This is the primitive that lets a rich bespoke detail page (BRP panels,
		 * activity timelines, comms history, relationship graphs, bookings, …)
		 * become declarative while keeping its sections in the body. Shape per
		 * entry:
		 * `{ id?, component, title?, props?, placement?, colSpan? }`.
		 *   - `component` — registry name resolved from the app's v2 `registry`
		 *     (any `kind` exposing a `.component`, e.g. `kind:"section"` or
		 *     `kind:"widget"`) or the legacy `customComponents` map. NO sidebar
		 *     tab is required (unlike integration widgets).
		 *   - `props` — values are token-resolved: `@objectId` → this object's id,
		 *     `@object.<field>` → a field off it, `@workspace.<key>` → page
		 *     context; unset `@…?` optional / unresolved tokens are dropped.
		 *   - `placement` — `before-body` | `after-data` | `after-related` | `end`
		 *     (default `end`). Controls where in the body the section lands.
		 *   - `colSpan` — 1–12 grid span when sections share a placement.
		 * The loaded object + objectId are also `provide`d on `cnSectionContext`
		 * so a host component can inject them instead of taking explicit props.
		 * Empty / omitted (default `[]`) renders nothing. See `CnBodySections`.
		 *
		 * @type {Array<{id?: string, component: string, title?: string, props?: object, placement?: string, colSpan?: number}>}
		 */
		bodyWidgets: {
			type: Array,
			default: () => [],
		},
		/**
		 * Page-level app config map exposed to declarative widget / section
		 * config via the `@config.<key>` token (e.g. the reporting `currency`
		 * the setup wizard captures). Provided to descendants on `cnAppConfig`,
		 * so a stat widget's `format: { style: 'currency', currency:
		 * '@config.currency' }` formats with the configured value (falling back
		 * to the literal default when unset). A manifest renderer typically seeds
		 * this from `loadState(appId, 'config', {})`. Empty (default) leaves every
		 * `@config.<key>` token to fall back to its literal default.
		 *
		 * @type {object}
		 */
		appConfig: {
			type: Object,
			default: () => ({}),
		},
	},

	setup(props) {
		// Pluggable integration registry — used to resolve `type:
		// 'integration'` widgets in the grid layout to their Vue
		// component (AD-19 surface fallback). Always wired; cheap when
		// no integration widgets are configured.
		const { resolveWidget } = useIntegrationRegistry()
		const registryExposed = { resolveRegistryWidget: resolveWidget }

		// Object context for detail-page abstract widgets (ADR-041): a reactive
		// `{ objectId, object, register, schema }` holder kept current by the
		// Options watcher below. Provided so CnObjectListWidget / CnStatWidget
		// can resolve `@objectId` / `@object.<field>` filter tokens and scope
		// their query to the object on this page. Null fields until loaded.
		const cnObjectContext = ref({ objectId: props.objectId || null, object: null, register: props.register || '', schema: props.schema || '' })
		provide('cnObjectContext', cnObjectContext)
		registryExposed.cnObjectContextRef = cnObjectContext

		// Page-level APP CONFIG exposed to declarative widget / section config via
		// the `@config.<key>` token (e.g. the reporting currency the setup wizard
		// captures). Provided so CnStatWidget / CnBodySections can format with the
		// configured value. Kept in sync with the `appConfig` prop.
		const cnAppConfig = ref({ ...(props.appConfig || {}) })
		provide('cnAppConfig', cnAppConfig)
		registryExposed.cnAppConfigRef = cnAppConfig
		watch(
			() => props.appConfig,
			(next) => { cnAppConfig.value = { ...(next || {}) } },
			{ deep: true },
		)

		// Auto-subscribe + reactive lock state for the current object.
		// Both are no-ops when objectStore is null (no Pinia active),
		// when subscribe is false (read-only / archive views), or when
		// objectType / objectId aren't yet known. Using composables in
		// setup() keeps the lifecycle bound to the component scope —
		// `tryOnScopeDispose` releases the subscription on unmount.
		if (!props.objectStore || !props.subscribe) {
			return { ...registryExposed, lockState: null }
		}
		// Resolve the effective object-type slug the same way `computed.resolvedObjectType`
		// does — the explicit `objectType` prop wins, else fuse `register` + `schema`.
		// The composables take getter functions so the resolution stays reactive when
		// `register` / `schema` / `objectType` change at runtime.
		const resolveType = () => props.objectType || (props.register && props.schema ? `${props.register}-${props.schema}` : '')
		const subscription = useObjectSubscription(
			props.objectStore,
			resolveType,
			() => props.objectId,
			{ enabled: () => Boolean(resolveType() && props.objectId) },
		)
		const sidebarReg = props.sidebarProps?.register || props.resolvedSidebar?.register || props.register || ''
		const sidebarSchema = props.sidebarProps?.schema || props.resolvedSidebar?.schema || props.schema || ''
		const lock = useObjectLock(
			props.objectStore,
			() => sidebarReg,
			() => resolveType() || sidebarSchema,
			() => props.objectId,
		)
		return {
			...registryExposed,
			subscriptionStatus: subscription.status,
			lockState: lock,
		}
	},

	data() {
		return {
			/** Whether the per-widget style/config editor modal is open. */
			showWidgetConfig: false,
			/** The widgetId currently being configured via the cog. */
			configWidgetId: null,
			/**
			 * Whether the object sidebar has been seeded with its initial open
			 * state for the current activation. Gates the one-shot `sidebarOpen`
			 * seed in `syncSidebarState` so user close/toggle is not clobbered.
			 */
			sidebarSeeded: false,
			/** The relation-link descriptor whose modal is currently open (or null). */
			activeRelationLink: null,
			/**
			 * Materialized default body grid for the schema-driven auto-body (Data +
			 * Related). Lazily built by `materializeAutoBody()` the first time the
			 * object resolves so the detail body is a real, mutable GridStack grid
			 * (drag / resize / configure) rather than a static stack. `null` until
			 * materialized; reset when the schema-driven context changes.
			 */
			autoBodyLayout: null,
			/** Widget definitions paired with `autoBodyLayout` (id ↔ widgetId). */
			autoBodyWidgets: null,
			/**
			 * Drives the Actions-menu Refresh spinner during a schema-driven
			 * self-fetch refresh, where the host has no promise to bind
			 * `:refreshing` to. Mirrors CnIndexPage.internalRefreshing.
			 */
			internalRefreshing: false,
			/**
			 * Whether a load has completed at least once. Gates the
			 * full-page loading state to the FIRST load only: once content
			 * has been shown, later loads (refresh, re-fetch) stay in place
			 * and surface as the action-button spinner instead of blanking
			 * the page. Set true the first time `loading` falls to false.
			 */
			hasLoadedOnce: false,
		}
	},

	computed: {
		/**
		 * Stable id for the page-header Actions menu. Prefers the explicit
		 * `pageId` prop; falls back to a slugified `title` so the menu still
		 * gets a usable id / surface.
		 *
		 * @return {string}
		 */
		/**
		 * Whether the page is in OpenBuild edit mode — unwraps the injected
		 * `cnEditingBody` ref (or plain boolean). Drives the per-widget cog.
		 *
		 * @return {boolean}
		 */
		editingBody() {
			const e = this.cnEditingBody
			return Boolean(e && typeof e === 'object' && 'value' in e ? e.value : e)
		},

		/**
		 * The widget definition currently being configured, shaped for
		 * `CnWidgetStyleEditorModal` (carries `id`, `type`, `title`, `content`).
		 *
		 * @return {object|null}
		 */
		configWidget() {
			if (!this.configWidgetId) return null
			const def = this.bodyGridWidgets.find((w) => w.id === this.configWidgetId)
			return def || null
		},

		resolvedPageId() {
			if (this.pageId) return this.pageId
			return String(this.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
		},

		/**
		 * Whether to show the full-page loading state (spinner that replaces
		 * the page content). Only on the FIRST load — when `loading` is true
		 * and nothing has been shown yet. Once `hasLoadedOnce` is set, a
		 * subsequent `loading` (refresh / re-fetch) keeps the existing
		 * content in place; the action-button spinner signals the refresh
		 * instead (see `effectiveRefreshing`).
		 *
		 * @return {boolean}
		 */
		showLoadingState() {
			return this.loading && !this.hasLoadedOnce
		},

		/**
		 * Refresh-spinner flag for the page-header Actions menu. True when:
		 * an explicit `refreshing` prop is set; OR a schema-driven self-fetch
		 * is in flight (`internalRefreshing`); OR a background load is running
		 * after the first one completed (`loading && hasLoadedOnce`) — so
		 * legacy `objectType` hosts get the spinner for free just by passing
		 * `:loading`, without wiring `:refreshing` themselves.
		 *
		 * @return {boolean}
		 */
		effectiveRefreshing() {
			return this.refreshing || this.internalRefreshing || (this.loading && this.hasLoadedOnce)
		},

		/**
		 * Effective object-type slug, used for subscription, lock, store
		 * registration, fetch, and sidebar state. Explicit `objectType`
		 * prop wins (existing direct-mount call sites stay untouched);
		 * otherwise `${register}-${schema}` fuses the schema-driven props
		 * the manifest renderer passes. Returns `''` when neither path
		 * yields a slug — the schema-driven gates downstream key off that.
		 */
		resolvedObjectType() {
			if (this.objectType) {
				return this.objectType
			}
			if (this.register && this.schema) {
				return `${this.register}-${this.schema}`
			}
			return ''
		},

		/**
		 * True when this mount is wired for the manifest's schema-driven
		 * contract: `register`, `schema`, and `objectId` are all set, so
		 * the page should fetch the object + schema, register the type
		 * on the store, and render the auto-body widgets when no slot
		 * content is supplied. Legacy direct mounts (which pass an
		 * explicit `objectType` instead) return `false` here and skip
		 * the fetch path entirely.
		 */
		hasSchemaDrivenFetch() {
			return Boolean(this.register && this.schema && this.objectId)
		},

		/**
		 * Effective Refresh visibility for the page header. An explicit
		 * `showRefresh` prop wins; when unset (`null`), show Refresh only if
		 * it will do something — a consumer attached an `@refresh` listener,
		 * or the page can self-fetch (`hasSchemaDrivenFetch`).
		 *
		 * @return {boolean}
		 */
		effectiveHeaderShowRefresh() {
			if (this.showRefresh !== null) return this.showRefresh
			return Boolean(this.$listeners.refresh) || this.hasSchemaDrivenFetch
		},

		/**
		 * Pinia store instance used for the schema-driven fetch.
		 * Mirrors `CnLogsPage.objectStore`: explicit `objectStore` prop
		 * wins; otherwise falls back to the library's default
		 * `useObjectStore()`. The composable is invoked lazily inside a
		 * computed so test mounts that never activate Pinia don't crash.
		 *
		 * @return {object|null} The resolved store, or null when the page
		 *   is not in schema-driven mode (no need to touch Pinia at all).
		 */
		effectiveObjectStore() {
			if (this.objectStore) {
				return this.objectStore
			}
			if (!this.hasSchemaDrivenFetch) {
				return null
			}
			try {
				return useObjectStore()
			} catch (err) {
				// Pinia not active in this consumer — fall back to no-op
				// and let the page render as if no store-driven content
				// were available. Real consumers (CnAppRoot-hosted apps)
				// always have Pinia active, so this branch only protects
				// stand-alone test mounts.

				console.warn('[CnDetailPage] useObjectStore() unavailable; schema-driven mode disabled.', err)
				return null
			}
		},

		/**
		 * The fetched OR object for the schema-driven mode. Read straight
		 * from the store's normalised `objects[type][id]` cache so any
		 * other component fetching the same object (sidebar widgets,
		 * locked-banner) shares state with no second request.
		 *
		 * @return {object|null}
		 */
		currentObject() {
			const store = this.effectiveObjectStore
			if (!store) return null
			const type = this.resolvedObjectType
			if (!type || !this.objectId) return null
			return store.objects?.[type]?.[this.objectId] ?? null
		},

		/**
		 * The resolved OR object surfaced to the header's translation
		 * badge slot (cn-detail-translation-aware-surfacing). Falls
		 * back to `currentObject` from the schema-driven path AND, when
		 * the schema-driven path is unavailable, attempts to read the
		 * store via `objectType` + `objectId` directly (so legacy direct
		 * mounts that don't pass `register` / `schema` still benefit).
		 * Returns `null` when nothing can be resolved — the badge then
		 * auto-hides.
		 *
		 * @return {object|null}
		 */
		resolvedObject() {
			// Schema-driven path: reuse what `currentObject` already
			// computed.
			const fromSchemaDriven = this.currentObject
			if (fromSchemaDriven) return fromSchemaDriven
			// Direct-mount fallback: legacy callers pass `objectType` +
			// `objectId`. Read the same cache shape but keyed off the
			// explicit slug.
			const store = this.effectiveObjectStore
			if (!store) return null
			if (!this.objectType || !this.objectId) return null
			return store.objects?.[this.objectType]?.[this.objectId] ?? null
		},

		/**
		 * The fetched JSON Schema for the schema-driven mode. Read from
		 * the store's `schemas[type]` cache populated by `fetchSchema`.
		 * Required to render `CnObjectDataWidget` (which takes a schema
		 * Object, not a slug).
		 *
		 * @return {object|null}
		 */
		currentSchema() {
			const store = this.effectiveObjectStore
			if (!store) return null
			const type = this.resolvedObjectType
			if (!type) return null
			return store.schemas?.[type] ?? null
		},

		/**
		 * True when no consumer-supplied default slot content is
		 * present. Treats whitespace-only / empty vnodes as no content
		 * so a stray newline in the template doesn't accidentally
		 * suppress the auto-body.
		 */
		hasDefaultSlotContent() {
			const nodes = this.$slots.default
			if (!nodes || !nodes.length) return false
			return nodes.some((vnode) => !(vnode.text !== undefined && vnode.text.trim() === ''))
		},

		/**
		 * True when the auto-body (CnObjectDataWidget + CnObjectMetadataWidget)
		 * should render. Conditions: schema-driven mount, the object has
		 * loaded, no consumer slot wins, and the grid-layout mode is not
		 * active (grid mode owns the body when present).
		 */
		shouldRenderAutoBody() {
			return this.hasSchemaDrivenFetch
				&& this.currentObject
				&& !this.hasDefaultSlotContent
				&& !this.hasGridLayout
		},

		/**
		 * Effective layout array driving the body grid. An explicit `layout` prop
		 * (manifest grid page) wins; otherwise the materialized default auto-body
		 * (Data + Related) is used when the schema-driven object has loaded.
		 *
		 * @return {Array} Layout items for CnDashboardGrid.
		 */
		bodyGridLayout() {
			if (this.hasGridLayout) return this.layout
			if (this.shouldRenderAutoBody) return this.autoBodyLayout || []
			return []
		},

		/**
		 * Effective widget-definition array paired with `bodyGridLayout`. Used by
		 * the overridden `findWidget` so both the prop-driven and the default
		 * auto-body grids resolve their widget defs from one place.
		 *
		 * @return {Array} Widget definitions.
		 */
		bodyGridWidgets() {
			if (this.hasGridLayout) return this.widgets
			if (this.shouldRenderAutoBody) return this.autoBodyWidgets || []
			return []
		},

		/**
		 * Whether the body renders as an adjustable widget grid (vs. the
		 * hand-authored default slot). True for explicit grid pages and for the
		 * schema-driven default Data + Related body.
		 *
		 * @return {boolean}
		 */
		hasBodyGrid() {
			return this.bodyGridLayout.length > 0
		},

		/**
		 * Whether the sidebar is rendered externally (via objectSidebarState inject)
		 * rather than inline. When external, CnDetailPage only manages state —
		 * the parent App renders the actual NcAppSidebar.
		 */
		hasExternalSidebar() {
			return !!this.objectSidebarState
		},

		/**
		 * Normalised sidebar config object regardless of input shape.
		 *
		 *   - Boolean `true`  → `{ show: true, enabled: true }`
		 *   - Boolean `false` → `{ show: false, enabled: false }`
		 *   - Object          → fields passed through; `show` and
		 *     `enabled` default to `true` when omitted.
		 *
		 * Centralising the normalisation here keeps `syncSidebarState`
		 * and the deprecation/conflict-warning logic single-sourced.
		 */
		resolvedSidebar() {
			const cfg = this.sidebar
			// A non-empty manifest `sidebarTabs` prop is itself an opt-in:
			// a `type:"detail"` page that declares tabs clearly wants the
			// sidebar. The `sidebar` prop defaults to Boolean `false`, and
			// CnPageRenderer only forwards a `sidebar` config when the
			// manifest page sets one — so a page that declares ONLY
			// `config.sidebarTabs` (procest CaseDetail) would otherwise fall
			// into the Boolean-`false` branch below and never publish its
			// strip. When tabs are present we treat the sidebar as enabled
			// (the explicit Object form below still overrides show/enabled).
			const hasTabs = Array.isArray(this.sidebarTabs) && this.sidebarTabs.length > 0
			if (typeof cfg === 'boolean') {
				if (cfg) return { show: true, enabled: true }
				return hasTabs ? { show: true, enabled: true } : { show: false, enabled: false }
			}
			if (cfg && typeof cfg === 'object') {
				return {
					show: cfg.show !== false,
					enabled: cfg.enabled !== false,
					...cfg,
				}
			}
			return hasTabs ? { show: true, enabled: true } : { show: false, enabled: false }
		},

		/**
		 * True when the sidebar should be wired into the external
		 * `objectSidebarState` channel. Both `show` and `enabled`
		 * must be non-`false` (defaults are `true`); either can
		 * suppress the sidebar declaratively.
		 */
		sidebarActive() {
			const r = this.resolvedSidebar
			// An explicit `show: false` always suppresses the sidebar. Otherwise a
			// non-empty `sidebarTabs` opt-in activates it even past the prop's
			// default `{ enabled: false }` — the procest CaseDetail manifest
			// pattern, where a page declares only `config.sidebarTabs`.
			if (r.show === false) return false
			if (r.enabled === false) {
				return Array.isArray(this.sidebarTabs) && this.sidebarTabs.length > 0
			}
			return true
		},

		hasStats() {
			return this.statsColumns.length > 0 && (this.statsRows.length > 0 || !!this.$slots['stats-rows'])
		},

		/** Whether any declarative in-body sections are configured. */
		hasBodyWidgets() {
			return Array.isArray(this.bodyWidgets) && this.bodyWidgets.length > 0
		},

		/**
		 * Sections that land at the END placement: those with no `placement`
		 * (the default) or an explicit `placement: "end"`. The three named
		 * placement mounts (before-body / after-data / after-related) filter by
		 * exact value; this catches the rest so nothing is silently dropped.
		 *
		 * @return {Array}
		 */
		endPlacementSections() {
			if (!this.hasBodyWidgets) return []
			const named = ['before-body', 'after-data', 'after-related']
			return this.bodyWidgets.filter((s) => !s || !s.placement || !named.includes(s.placement))
		},

		/**
		 * Page/object context forwarded to CnBodySections for token resolution
		 * (`@objectId` / `@object.<field>` / `@workspace.<key>`) AND provided on
		 * `cnSectionContext` for host section components that inject. Mirrors the
		 * `cnObjectContext` ref the abstract list/stat widgets already read.
		 *
		 * @return {{objectId: (string|null), object: (object|null), register: string, schema: string}}
		 */
		sectionContext() {
			const resolved = this.resolvedSidebar || {}
			return {
				objectId: (this.objectId !== undefined && this.objectId !== null) ? String(this.objectId) : null,
				object: this.resolvedObject || null,
				register: resolved.register || this.register || this.sidebarProps?.register || '',
				schema: resolved.schema || this.schema || this.resolvedObjectType || this.sidebarProps?.schema || '',
				config: this.cnAppConfigRef,
			}
		},
	},

	watch: {
		// A load just settled (true → false) — remember it so later loads
		// refresh in place (full-page spinner only on the first load). Not
		// `immediate`: `loading` starts false before the first fetch begins,
		// so reacting to that initial false would suppress the first spinner.
		loading(val) {
			if (!val) {
				this.hasLoadedOnce = true
				// Refresh settled — re-assert the sidebar state that
				// syncSidebarState skipped while loading was in flight.
				this.syncSidebarState()
			}
		},

		sidebar: {
			immediate: true,
			handler() { this.syncSidebarState() },
		},

		// Keep the provided object context current so detail-page abstract
		// widgets (CnObjectListWidget / CnStatWidget) can resolve `@objectId` /
		// `@object.<field>` tokens against the live object.
		currentObject: {
			immediate: true,
			handler() { this.syncObjectContext() },
		},

		// Materialize the default body grid (Data + Related) the first time the
		// schema-driven object resolves so the detail body is an adjustable grid.
		shouldRenderAutoBody: {
			immediate: true,
			handler(active) {
				if (active && !this.autoBodyLayout) this.materializeAutoBody()
			},
		},

		// A different schema means a fresh default grid — drop the materialized
		// one so it rebuilds for the new object type.
		resolvedObjectType() {
			this.autoBodyLayout = null
			this.autoBodyWidgets = null
		},

		title() { this.syncSidebarState() },
		subtitle() { this.syncSidebarState() },
		objectType() { this.syncSidebarState() },
		// Schema-driven props feed both the sidebar state (via
		// resolvedObjectType) and the auto-fetch path. Re-sync + re-fetch
		// whenever any of the three move so the page stays consistent if
		// a parent component swaps the active object.
		register() {
			this.syncSidebarState()
			this.pushAiContext()
			this.fetchObjectIfNeeded()
		},

		schema() {
			this.syncSidebarState()
			this.pushAiContext()
			this.fetchObjectIfNeeded()
		},

		objectId() {
			this.syncSidebarState()
			this.pushAiContext()
			this.fetchObjectIfNeeded()
			this.syncObjectContext()
		},

		sidebarTabs: {
			deep: true,
			handler() { this.syncSidebarState() },
		},

		sidebarProps: {
			deep: true,
			handler() { this.syncSidebarState() },
		},
	},

	created() {
		this.pushAiContext()
	},

	mounted() {
		// Kick the schema-driven fetch once the component has mounted —
		// `effectiveObjectStore` relies on a live Pinia context, which
		// is guaranteed by mounted() but not by created().
		this.fetchObjectIfNeeded()
	},

	beforeDestroy() {
		if (this.hasExternalSidebar) {
			this.objectSidebarState.active = false
			// Clear manifest-driven tabs so the next mount starts fresh
			// rather than inheriting the previous page's tab strip.
			this.objectSidebarState.tabs = undefined
		}
		// Reset AI context fields so stale detail context doesn't leak
		if (this.cnAiContext) {
			this.cnAiContext.pageKind = 'custom'
			this.cnAiContext.objectUuid = undefined
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
		}
	},

	methods: {
		// Expose the shared grid helpers to the template (grid mode + auto-body).
		cnGridCellStyle,
		hasGridRow,

		/**
		 * Re-emit the page-header menu's Refresh to the host.
		 * @param {{ widgetId: string, title: string }} payload - Action payload.
		 * @param {object} event - Synthetic event (host may preventDefault).
		 */
		async onHeaderRefresh(payload, event) {
			/**
			 * @event refresh The page-header Refresh action was clicked.
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('refresh', payload, event)
			// Schema-driven (manifest) detail pages self-fetch — without this
			// the Refresh action has no host listener to act on and does
			// nothing. Re-fetch the object + schema and spin the action.
			if (!this.hasSchemaDrivenFetch) return
			this.internalRefreshing = true
			try {
				await this.fetchObjectIfNeeded()
			} finally {
				this.internalRefreshing = false
			}
		},

		/**
		 * Re-emit the page-header menu's Request-a-feature to the host.
		 * @param {{ widgetId: string, title: string }} payload - Action payload.
		 * @param {object} event - Synthetic event (host may preventDefault).
		 */
		onHeaderRequestFeature(payload, event) {
			/**
			 * @event request-feature The page-header Request-a-feature action
			 * was clicked.
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('request-feature', payload, event)
		},

		/**
		 * Open the sidebar leaf a "Linked apps" row on the auto-body
		 * CnRelatedObjectsWidget points at. Publishes the requested tab and
		 * opens the external sidebar via `objectSidebarState`, and re-emits
		 * `open-integration` so a host can override the routing.
		 *
		 * @param {string} integrationId - The leaf integration id (tab id).
		 */
		onAutoBodyOpenIntegration(integrationId) {
			if (this.hasExternalSidebar && this.objectSidebarState) {
				this.objectSidebarState.open = true
				this.objectSidebarState.requestedTab = integrationId
			}
			/**
			 * @event open-integration A related-objects "Linked apps" row
			 * was clicked on the auto-body. Payload is the leaf id.
			 * @type {string}
			 */
			this.$emit('open-integration', integrationId)
		},

		/**
		 * Re-emit a successful lifecycle transition to the host.
		 *
		 * @param {{ action: string, to: string, object: object }} payload The transition result.
		 */
		onTransitioned(payload) {
			/**
			 * @event transitioned A declarative lifecycle transition succeeded on this
			 * page's object. Payload is `{ action, to, object }`.
			 * @type {{ action: string, to: string, object: object }}
			 */
			this.$emit('transitioned', payload)
		},

		/**
		 * Re-fetch the page's object after a lifecycle transition so the new state
		 * (and any other server-side mutations the guard applied) render.
		 */
		onLifecycleReload() {
			this.fetchObjectIfNeeded()
		},

		/**
		 * Open the relation-link modal for a configured `relationLinks` entry.
		 *
		 * @param {object} link The relation-link descriptor.
		 */
		openRelationLink(link) {
			this.activeRelationLink = link
		},

		/**
		 * A relation-link modal saved a patched FK — re-fetch the object and
		 * re-emit so the host can react.
		 *
		 * @param {object} saved The updated object.
		 */
		onRelationLinked(saved) {
			this.fetchObjectIfNeeded()
			/**
			 * @event relation-linked A relation-link action patched a foreign key on
			 * this page's object. Payload is the updated object.
			 * @type {object}
			 */
			this.$emit('relation-linked', saved)
		},

		/**
		 * Re-emit a related-collection row click to the host.
		 *
		 * @param {{ collection: object, row: object, index: number }} payload The click payload.
		 */
		onRelatedRowClick(payload) {
			/**
			 * @event related-row-click A row in a `relatedCollections` section was
			 * clicked. Payload is `{ collection, row, index }`.
			 * @type {{ collection: object, row: object, index: number }}
			 */
			this.$emit('related-row-click', payload)
		},

		/**
		 * Schema-driven fetch entry point — no-op outside the
		 * `register`+`schema`+`objectId` mode. Registers the type on
		 * the store with the canonical 4-arg signature (matches what
		 * `CnIndexPage` does), then fetches the object and its schema
		 * in parallel. Errors land on `this._fetchError` (exposed via
		 * the `error` template gate); the loading flag is intentionally
		 * left to the store's own per-type `loading[type]` so it
		 * cooperates with parallel fetches from sibling components.
		 *
		 * Called from `mounted()` and from the `register` / `schema` /
		 * `objectId` watchers — every prop change re-runs in one
		 * place so the request lifecycle stays predictable.
		 */
		async fetchObjectIfNeeded() {
			if (!this.hasSchemaDrivenFetch) return
			const store = this.effectiveObjectStore
			if (!store) return
			const type = this.resolvedObjectType
			// (slug, schemaId, registerId, slugs) — same shape as the
			// CnIndexPage / CnLogsPage fix. Passing the slug strings into
			// the positional id slots is intentional (OR's REST accepts
			// either numeric ids or kebab slugs there), and the 4th-arg
			// hints feed the live-updates transport.
			// Register the type ONCE. `registerObjectType` resets the type's
			// cache (`objects[type] = {}`, `schemas[type] = null`), so calling
			// it on every refresh blanks the object + schema until the
			// re-fetch lands — the content visibly disappears mid-refresh.
			// Skip re-registration when the type is already registered so a
			// refresh re-fetches and replaces the data in place.
			if (typeof store.registerObjectType === 'function'
				&& !store.objectTypeRegistry?.[type]) {
				store.registerObjectType(
					type,
					this.schema,
					this.register,
					{ registerSlug: this.register, schemaSlug: this.schema },
				)
			}
			try {
				const tasks = []
				if (typeof store.fetchObject === 'function') {
					tasks.push(store.fetchObject(type, this.objectId))
				}
				if (typeof store.fetchSchema === 'function') {
					tasks.push(store.fetchSchema(type))
				}
				await Promise.all(tasks)
			} catch (err) {
				console.error('[CnDetailPage] schema-driven fetch failed:', err)
			}
		},

		/**
		 * Whether a grid-layout item resolves to an integration-typed
		 * widget — `def.type === 'integration'` with a string
		 * `integrationId`. Used by the grid template to render the
		 * registry widget as the slot fallback.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widget def is an integration widget
		 */
		isIntegrationWidget(item) {
			const def = this.findWidget(item)
			return Boolean(def) && def.type === 'integration' && typeof def.integrationId === 'string'
		},

		/**
		 * Resolve the Vue component for an integration widget, applying
		 * the AD-19 surface fallback. Null when the integration isn't
		 * registered (the grid section simply renders nothing extra).
		 *
		 * @param {object} item Layout item
		 * @return {object|null} Vue component, or null.
		 */
		resolveIntegrationWidget(item) {
			const def = this.findWidget(item)
			if (!def || typeof def.integrationId !== 'string') {
				return null
			}
			return this.resolveRegistryWidget(def.integrationId, this.surface)
		},

		/**
		 * Props passed to an integration widget: surface, object
		 * context (explicit `integrationContext` prop, else derived
		 * from the sidebar config + objectId), and per-widget `props`.
		 *
		 * @param {object} item Layout item
		 * @return {object} Props object for the widget component.
		 */
		getIntegrationProps(item) {
			const def = this.findWidget(item)
			const resolved = this.resolvedSidebar || {}
			const derivedContext = {
				register: resolved.register || this.sidebarProps?.register || this.register || '',
				schema: resolved.schema || this.schema || this.resolvedObjectType || this.sidebarProps?.schema || '',
				objectId: this.objectId ? String(this.objectId) : '',
			}
			return {
				surface: this.surface,
				...(this.integrationContext || derivedContext),
				...(def?.props || {}),
			}
		},

		/**
		 * Whether a grid item is a schema-driven `data` widget — rendered via
		 * CnObjectDataWidget with the page's loaded object + the def's overrides.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widget def is `type: 'data'`.
		 */
		isDataWidget(item) {
			const def = this.findWidget(item)
			return Boolean(def) && def.type === 'data'
		},

		/**
		 * Whether a grid item is the schema-driven `related` widget — rendered via
		 * CnRelatedObjectsWidget with the page's loaded object. One of the two
		 * default body widgets.
		 *
		 * @param {object} item Layout item
		 * @return {boolean} true when the matching widget def is `type: 'related'`.
		 */
		isRelatedWidget(item) {
			const def = this.findWidget(item)
			return Boolean(def) && def.type === 'related'
		},

		/**
		 * Whether to render the grid section `<h3>` title above a widget. Only for
		 * consumer-supplied `#widget-<id>` slots (whose content may be bare) — the
		 * built-in widget renderers (data / related / integration / catalog) draw
		 * their own titled card header, so a grid heading would show the title
		 * twice. Honours `item.showTitle === false` to opt out entirely.
		 *
		 * @param {object} item Layout item.
		 * @return {boolean} true when the grid heading should render.
		 */
		showGridTitle(item) {
			if (item.showTitle === false || !this.findWidget(item)) return false
			return Boolean(this.$scopedSlots[`widget-${item.widgetId}`] || this.$slots[`widget-${item.widgetId}`])
		},

		/**
		 * Resolve the widget definition for a layout item. Overrides the
		 * gridLayout mixin's `findWidget` (which only reads the `widgets` prop) so
		 * the materialized default auto-body widgets resolve too. Searches the
		 * effective `bodyGridWidgets`.
		 *
		 * @param {{ widgetId: string }} item Layout item.
		 * @return {object|undefined} The matching widget definition.
		 */
		findWidget(item) {
			return this.bodyGridWidgets.find((w) => w.id === item.widgetId)
		},

		/**
		 * Build the default body grid for the schema-driven auto-body: a full-width
		 * Data widget with the Related-objects widget beneath it. Materialized once
		 * (lazily) so the geometry is a mutable, reactive array the user can drag /
		 * resize in edit mode. Both widgets carry `showTitle: false` because they
		 * render their own card chrome.
		 */
		materializeAutoBody() {
			// One source of truth (shared with the OpenBuild edit button's
			// "eject" on edit) so the in-memory default and the manifest-ejected
			// default are identical. The data widget's content carries the page's
			// register/schema so its per-property editor can resolve the schema
			// (empty on legacy objectType-only mounts → the editor falls back to
			// the injected `cnObjectContext`).
			const grid = defaultDetailGrid({
				register: this.register || '',
				schema: this.schema || '',
				showRelated: this.showRelatedObjects,
			})
			// Drop the Data widget when there's no schema to render (the helper
			// always includes it; the auto-body only shows it with a schema).
			if (!this.currentSchema) {
				grid.widgets = grid.widgets.filter((w) => w.widgetId !== 'data')
				grid.layout = grid.layout.filter((l) => l.widgetId !== 'data')
			}
			this.autoBodyWidgets = grid.widgets
			this.autoBodyLayout = grid.layout
		},

		/**
		 * Persist a drag/resize from the body grid. For the default auto-body the
		 * new geometry is kept locally so the move sticks; for an explicit `layout`
		 * prop the change is emitted upward (`layout-change` + `update:layout`) for
		 * the manifest renderer / host to persist.
		 *
		 * @param {Array} updated The new layout array from CnDashboardGrid.
		 *
		 * @event layout-change Emitted with the updated body-grid layout. The
		 *   sibling `update:layout` event is also emitted so `:layout.sync`
		 *   consumers stay in sync.
		 */
		onBodyLayoutChange(updated) {
			if (this.hasGridLayout) {
				// Config-backed grid (manifest editor, ADR-041): the `layout` prop is
				// the SAME array the working manifest holds (the route-sentinel
				// resolver is reference-preserving), so write the new geometry back
				// onto its items in place — Save page then persists the resize.
				for (const u of updated) {
					const item = this.layout.find((l) => String(l.id) === String(u.id))
					if (item) {
						item.gridX = u.gridX
						item.gridY = u.gridY
						item.gridWidth = u.gridWidth
						item.gridHeight = u.gridHeight
					}
				}
			} else {
				// In-memory default grid — keep the new geometry locally so the move
				// sticks for the session (un-customised page, nothing to persist).
				this.autoBodyLayout = updated
			}
			/**
			 * @event layout-change Emitted when a body-grid widget is dragged or
			 *   resized. Payload is the updated layout array.
			 * @type {Array}
			 */
			this.$emit('layout-change', updated)
			/**
			 * @event update:layout Sibling of `layout-change` so `:layout.sync`
			 *   consumers stay in sync.
			 * @type {Array}
			 */
			this.$emit('update:layout', updated)
		},

		/**
		 * The registered config FORM for a grid item's widget type, or null.
		 * Used to gate the per-widget configure cog (only configurable widgets
		 * show one) in OpenBuild edit mode.
		 *
		 * @param {object} item Layout item
		 * @return {object|null} The form component, or null.
		 */
		registryFormFor(item) {
			const def = this.findWidget(item)
			if (!def || !def.type) return null
			const entry = getWidgetTypeEntry(def.type)
			return (entry && entry.form) || null
		},

		/**
		 * The registered RENDERER for a grid item's content-driven catalog
		 * widget type (stat / chart / delta / gauge / object-list / …), or null.
		 * Integration widgets resolve separately; the `data` renderer needs
		 * object context the slot supplies, so it is excluded from this generic
		 * fallback.
		 *
		 * @param {object} item Layout item
		 * @return {object|null} The renderer component, or null.
		 */
		registryRendererFor(item) {
			const def = this.findWidget(item)
			if (!def || !def.type || def.type === 'integration' || def.type === 'data') return null
			const entry = getWidgetTypeEntry(def.type)
			return (entry && entry.renderer) || null
		},

		/**
		 * The stored content/config blob for a grid item's catalog widget
		 * (passed to its renderer).
		 *
		 * @param {object} item Layout item
		 * @return {object} The widget def's `content`, or an empty object.
		 */
		widgetContentFor(item) {
			const def = this.findWidget(item)
			return (def && def.content && typeof def.content === 'object') ? def.content : {}
		},

		/**
		 * Open the per-widget style/config editor for a grid item (cog click).
		 *
		 * @param {object} item Layout item to configure.
		 */
		configureWidget(item) {
			this.configWidgetId = item.widgetId
			this.showWidgetConfig = true
		},

		/**
		 * Persist the editor's changes onto the matching widget definition IN
		 * PLACE (so an injected in-place manifest editor picks them up), close
		 * the modal, and emit `widget-config-change` for consumers that persist
		 * the page config themselves.
		 *
		 * @param {object} edited The widget object mutated by the editor.
		 *
		 * @event widget-config-change Emitted after a widget's config is saved.
		 * @type {object}
		 */
		onWidgetConfigSave(edited) {
			const def = this.bodyGridWidgets.find((w) => w.id === this.configWidgetId)
			if (def) {
				if (edited.title !== undefined) this.$set(def, 'title', edited.title)
				if (edited.content !== undefined) this.$set(def, 'content', edited.content)
				this.$set(def, 'styleConfig', edited.styleConfig || {})
			}
			this.showWidgetConfig = false
			/**
			 * @event widget-config-change Emitted after a grid widget's config is
			 * saved via the cog editor, or after the widget is removed (payload
			 * null). Consumers persist the updated page/widget config.
			 * @type {object|null}
			 */
			this.$emit('widget-config-change', def || null)
		},

		/**
		 * Delete from inside the editor — drop the widget def + its layout
		 * placement and close.
		 *
		 * @param {object} _w The widget the editor wants deleted (unused; routed
		 *   by `configWidgetId`).
		 *
		 * @event widget-config-change Emitted after the widget is removed.
		 * @type {null}
		 */
		onWidgetConfigDelete(_w) {
			const id = this.configWidgetId
			// Drop from whichever pair backs the active grid: the explicit
			// `layout`/`widgets` props (manifest grid page) or the materialized
			// default auto-body arrays.
			const widgetArr = this.hasGridLayout ? this.widgets : this.autoBodyWidgets
			const layoutArr = this.hasGridLayout ? this.layout : this.autoBodyLayout
			if (Array.isArray(widgetArr)) {
				const wIdx = widgetArr.findIndex((w) => w.id === id)
				if (wIdx !== -1) widgetArr.splice(wIdx, 1)
			}
			if (Array.isArray(layoutArr)) {
				const lIdx = layoutArr.findIndex((l) => l.widgetId === id)
				if (lIdx !== -1) layoutArr.splice(lIdx, 1)
			}
			this.showWidgetConfig = false
			this.$emit('widget-config-change', null)
		},

		/**
		 * Push pageKind + objectUuid + register/schema context into the
		 * reactive cnAiContext holder so the AI Chat Companion knows
		 * what object the user is viewing.
		 */
		pushAiContext() {
			if (!this.cnAiContext) return
			const resolved = this.resolvedSidebar || {}
			this.cnAiContext.pageKind = 'detail'
			this.cnAiContext.objectUuid = this.objectId ? String(this.objectId) : undefined
			this.cnAiContext.registerSlug = resolved.register || this.register || this.sidebarProps?.register || undefined
			this.cnAiContext.schemaSlug = resolved.schema || this.schema || this.resolvedObjectType || this.sidebarProps?.schema || undefined
		},

		/**
		 * Refresh the provided `cnObjectContext` ref so detail-page abstract
		 * widgets can resolve `@objectId` / `@object.<field>` filter tokens
		 * against the current object. No-op when setup() didn't expose the ref
		 * (standalone / read-only mounts).
		 */
		syncObjectContext() {
			if (!this.cnObjectContextRef) return
			const resolved = this.resolvedSidebar || {}
			this.cnObjectContextRef.value = {
				objectId: this.objectId !== undefined && this.objectId !== null ? String(this.objectId) : null,
				object: this.currentObject || null,
				register: resolved.register || this.register || this.sidebarProps?.register || '',
				schema: resolved.schema || this.schema || this.resolvedObjectType || this.sidebarProps?.schema || '',
			}
		},

		/**
		 * Pushes the resolved sidebar config into the
		 * `objectSidebarState` provide/inject channel for the host
		 * App's mounted `<CnObjectSidebar>` to consume.
		 *
		 * Object form fields take precedence over `sidebarProps` for
		 * any field they declare; `sidebarProps` continues to fill
		 * fields the Object form omits, preserving back-compat.
		 *
		 * Suppression (`show: false` or `enabled: false`) clears
		 * `tabs` so a hidden detail page does not leak prior tab
		 * state to the next mount.
		 */
		syncSidebarState() {
			if (!this.hasExternalSidebar) return
			this.warnIfDeprecatedSidebarShape()
			// During a background refresh (content stays in place — see
			// `hasLoadedOnce`), a transient loading-driven `enabled: false`
			// must NOT tear down the sidebar. Hosts commonly bind
			// `:sidebar="{ enabled: !loading }"`, so without this guard every
			// refresh unmounts the host's CnObjectSidebar and re-fetches all
			// its sub-resources (files/notes/tags/tasks/audit). Skip the sync
			// while refreshing; the `loading` watcher re-syncs once it settles.
			if (this.loading && this.hasLoadedOnce) return
			const r = this.resolvedSidebar
			if (this.sidebarActive && this.resolvedObjectType && this.objectId) {
				const merged = this.mergeSidebarSources(r)
				// Seed `open` only on the inactive→active edge (first activation
				// of this object). Subsequent syncs must NOT clobber it, otherwise
				// the user's close/toggle would be undone on the next reactive
				// change. The shared channel owns `open` after seeding.
				if (!this.sidebarSeeded) {
					this.sidebarSeeded = true
				}
				// Manifest-driven open-enum tabs (forwarded to the host
				// app's mounted CnObjectSidebar via inject). When the
				// top-level `sidebarTabs` prop is non-empty it provides
				// the tabs (manifest pattern); otherwise the merged
				// `sidebar.tabs` / `sidebarProps.tabs` legacy paths win.
				// Falls back to `undefined` so the host's CnObjectSidebar
				// renders its built-in tab set.
				const tabs = (this.sidebarTabs && this.sidebarTabs.length > 0)
					? this.sidebarTabs
					: merged.tabs
				this.assignSidebarState({
					active: true,
					open: this.sidebarOpen,
					objectType: this.resolvedObjectType,
					objectId: this.objectId,
					title: merged.title || this.title || '',
					subtitle: merged.subtitle || this.subtitle || '',
					register: merged.register || this.register || '',
					schema: merged.schema || this.schema || '',
					hiddenTabs: merged.hiddenTabs || [],
					tabs,
				})
			} else {
				this.assignSidebarState({ active: false, tabs: undefined })
				// Re-arm the seed so the next activation re-applies `sidebarOpen`.
				this.sidebarSeeded = false
			}
		},
		/**
		 * Apply fields onto the shared `objectSidebarState` only when they
		 * actually change. Writing the same logical value — notably a fresh
		 * `[]` for `hiddenTabs` when none is configured — would otherwise put
		 * a new array reference on the reactive object every call and trigger
		 * a host re-render. That churn fed an infinite render loop: the host
		 * App re-renders on the new `hiddenTabs` ref → its `<router-view>`
		 * re-renders the routed detail page → the page's inline `:sidebar`
		 * prop re-fires this sync → repeat. Arrays are compared shallowly so
		 * an equivalent array is treated as unchanged.
		 *
		 * @param {object} fields Partial `objectSidebarState` to apply.
		 */
		assignSidebarState(fields) {
			const state = this.objectSidebarState
			for (const key of Object.keys(fields)) {
				const next = fields[key]
				const cur = state[key]
				if (Array.isArray(next) && Array.isArray(cur)
					&& next.length === cur.length
					&& next.every((v, i) => v === cur[i])) {
					continue
				}
				if (cur !== next) {
					state[key] = next
				}
			}
		},

		/**
		 * Merge the Object-form `sidebar` fields with the legacy
		 * `sidebarProps` fields. Object form wins on conflict; first
		 * conflict per instance fires a one-shot console.warn naming
		 * the conflicting fields.
		 *
		 * @param {object} resolved Pre-normalised sidebar config object.
		 * @return {object} Merged config — Object form fields override
		 *   sidebarProps fields where both are set.
		 */
		mergeSidebarSources(resolved) {
			const objectForm = (this.sidebar && typeof this.sidebar === 'object') ? this.sidebar : null
			const props = this.sidebarProps || {}
			const merged = {
				title: objectForm?.title ?? props.title,
				subtitle: objectForm?.subtitle ?? props.subtitle,
				register: objectForm?.register ?? props.register,
				schema: objectForm?.schema ?? props.schema,
				hiddenTabs: objectForm?.hiddenTabs ?? props.hiddenTabs,
				tabs: objectForm?.tabs ?? props.tabs,
			}
			if (objectForm && !this.__sidebarConflictWarned) {
				const overlap = ['title', 'subtitle', 'register', 'schema', 'hiddenTabs', 'tabs']
					.filter((field) => objectForm[field] !== undefined && props[field] !== undefined)
				if (overlap.length > 0) {
					console.warn(`[CnDetailPage] :sidebar (Object) and :sidebarProps both set ${overlap.join(', ')}; the :sidebar values win. Move all fields to :sidebar to silence this warning.`)
					this.__sidebarConflictWarned = true
				}
			}
			// Re-anchor `resolved` for the contract — callers expect
			// the returned object to reflect the normalised shape.
			return { ...resolved, ...merged }
		},

		/**
		 * Log a one-shot deprecation warning when the legacy Boolean
		 * form of the `sidebar` prop is observed. Tracked via a
		 * non-reactive instance flag so subsequent renders/toggles
		 * don't spam the console.
		 */
		warnIfDeprecatedSidebarShape() {
			if (typeof this.sidebar !== 'boolean') return
			if (this.__sidebarBooleanWarned) return
			this.__sidebarBooleanWarned = true

			console.warn('[CnDetailPage] :sidebar=Boolean is deprecated; pass an Object — see docs/components/cn-detail-page.md for the new shape.')
		},
	},
}
</script>

<!-- Styles in css/detail-page.css -->
