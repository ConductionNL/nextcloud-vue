<template>
	<div class="cn-index-page" data-testid="cn-index-page">
		<!-- Header — overridable via #header slot. Default renders CnPageHeader
		     when showTitle is true (existing behaviour, hidden by default). -->
		<slot
			name="header"
			:title="title"
			:description="description"
			:icon="resolvedIcon"
			:show-title="showTitle">
			<CnPageHeader
				v-if="showTitle"
				:title="title"
				:description="description"
				:icon="resolvedIcon" />
		</slot>

		<!-- Optional content below header, above actions bar -->
		<div v-if="$slots['below-header']" class="cn-index-page__below-header">
			<slot name="below-header" />
		</div>

		<!-- Actions bar -->
		<CnActionsBar
			:pagination="effectivePagination"
			:object-count="effectiveObjects.length"
			:selectable="selectable"
			:selected-ids="internalSelectedIds"
			:add-label="resolvedAddLabel"
			:add-icon="resolvedIcon"
			:inline-action-count="inlineActionCount"
			:show-mass-import="showMassImport"
			:show-mass-export="showMassExport"
			:show-mass-copy="showMassCopy"
			:show-mass-delete="showMassDelete"
			:view-mode="currentViewMode"
			:show-view-toggle="showViewToggle"
			:available-view-modes="effectiveToggleModes"
			:cards-label="cardsLabel"
			:table-label="tableLabel"
			:list-label="listLabel"
			:cards-icon="cardsIcon"
			:table-icon="tableIcon"
			:show-map="showMapSegment"
			:map-label="mapLabel"
			:map-icon="mapIcon"
			:list-icon="listIcon"
			:show-sort-select="showSortSelect"
			:sort-options="sortSelectOptions"
			:sort-value="sortSelectValue"
			:show-search="inlineSearch"
			:search-value="effectiveSearchValue"
			:search-placeholder="searchPlaceholder"
			:refreshing="effectiveRefreshing"
			:refresh-disabled="refreshDisabled"
			:add-disabled="addDisabled"
			:show-add="showAdd"
			:show-sidebar-toggle="hasSidebar"
			:sidebar-open="sidebarOpen"
			:header-actions="mergedHeaderActions"
			:documentation-url="documentationUrl"
			:documentation-label="documentationLabel || undefined"
			@sort-change="$emit('sort-change', $event)"
			@add="onAddClick"
			@toggle-sidebar="sidebarOpen = !sidebarOpen"
			@refresh="onRefreshEvent"
			@header-action="onHeaderAction"
			@show-import="showImportDialog = true"
			@show-export="showExportDialog = true"
			@show-copy="showMassCopyDialog = true"
			@show-delete="showMassDeleteDialog = true"
			@search="onSearchEvent"
			@view-mode-change="onViewModeChange">
			<template v-if="$slots['mass-actions']" #mass-actions="{ count, selectedIds: ids }">
				<slot name="mass-actions" :count="count" :selected-ids="ids" />
			</template>
			<template v-if="$slots['action-items']" #action-items>
				<slot name="action-items" />
			</template>
			<template v-if="$slots['actions'] || isEditMode || showExportMenu || allowSavedViews" #actions>
				<slot name="actions" />
				<!-- Saved views (opt-in via `allowSavedViews`): lists the user's
				     OpenRegister saved-search views; applying one writes its stored
				     filters/search/sort into the route query. -->
				<CnSavedViewsControl
					v-if="allowSavedViews"
					:views="savedViews"
					:loading="savedViewsLoading"
					:current-user-id="currentSavedViewsUserId"
					@apply="onApplySavedView"
					@save-request="showSaveViewDialog = true"
					@delete-request="onDeleteViewRequest" />
				<!-- Native Export menu (opt-in via `allowExport` + schema.exportable):
				     CSV/Excel entries navigate to OR's export-leaf URL, passing the
				     current route's query params through as filters. -->
				<NcActions
					v-if="showExportMenu"
					:force-name="true"
					:menu-name="t('nextcloud-vue', 'Export')"
					data-testid="cn-index-export-menu"
					:aria-label="t('nextcloud-vue', 'Export')">
					<template #icon>
						<Export :size="20" />
					</template>
					<NcActionButton data-testid="cn-index-export-csv" @click="onExportClick('csv')">
						<template #icon>
							<Export :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Export as CSV') }}
					</NcActionButton>
					<NcActionButton data-testid="cn-index-export-excel" @click="onExportClick('excel')">
						<template #icon>
							<Export :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Export as Excel') }}
					</NcActionButton>
				</NcActions>
				<!-- Edit-mode config cog: opens the page's full config editor
				     (CnPageRenderer wires @configure to CnPageConfigModal). -->
				<NcButton v-if="isEditMode"
					type="tertiary"
					:aria-label="t('nextcloud-vue', 'Configure page')"
					@click="$emit('configure')">
					<template #icon>
						<Cog :size="20" />
					</template>
				</NcButton>
			</template>
			<!-- Quick-filter tabs (REQ-MIPFU-1) rendered INSIDE the action bar
			     (between the view toggle and the actions) when the manifest
			     declares `config.quickFilters`. Switching tabs re-fetches with
			     the merged filter; @event quick-filter-change. -->
			<template v-if="quickFilters && quickFilters.length > 0" #filters>
				<CnQuickFilterBar
					inline
					:tabs="quickFilters"
					:mode="quickFilterMode"
					:multiple="quickFilterMultiple"
					:active-index="activeQuickFilterIndex"
					:selected-indices="selectedQuickFilterIndices"
					@update:active-index="onQuickFilterChange"
					@update:selected-indices="onQuickFilterMultiChange" />
			</template>
		</CnActionsBar>

		<!-- Mass delete dialog -->
		<CnMassDeleteDialog
			v-if="showMassDeleteDialog"
			ref="massDeleteDialog"
			:items="selectedObjects"
			:name-field="massActionNameField"
			:name-formatter="nameFormatter"
			@confirm="onMassDeleteConfirm"
			@close="showMassDeleteDialog = false" />

		<!-- Mass copy dialog -->
		<CnMassCopyDialog
			v-if="showMassCopyDialog"
			ref="massCopyDialog"
			:items="selectedObjects"
			:name-field="massActionNameField"
			:name-formatter="nameFormatter"
			@confirm="onMassCopyConfirm"
			@close="showMassCopyDialog = false" />

		<!-- Mass export dialog -->
		<CnMassExportDialog
			v-if="showExportDialog"
			ref="exportDialog"
			:formats="exportFormats"
			@confirm="onMassExportConfirm"
			@close="showExportDialog = false" />

		<!-- Mass import dialog -->
		<CnMassImportDialog
			v-if="showImportDialog"
			ref="importDialog"
			:options="importOptions"
			@confirm="onMassImportConfirm"
			@close="showImportDialog = false">
			<template v-if="$slots['import-fields']" #fields="{ file }">
				<slot name="import-fields" :file="file" />
			</template>
		</CnMassImportDialog>

		<!-- Save-current-view dialog (saved-views-ui) -->
		<CnSaveViewDialog
			v-if="showSaveViewDialog"
			ref="saveViewDialog"
			@confirm="onSaveViewConfirm"
			@close="showSaveViewDialog = false" />

		<!-- Delete-saved-view confirm (saved-views-ui) -->
		<CnConfirmDialog
			v-if="viewPendingDelete"
			ref="deleteViewConfirmDialog"
			variant="error"
			:dialog-title="t('nextcloud-vue', 'Delete view')"
			:message="deleteViewMessage"
			:confirm-label="t('nextcloud-vue', 'Delete')"
			@confirm="onDeleteViewConfirm"
			@close="viewPendingDelete = null" />

		<!-- @slot delete-dialog Replace the single-item delete dialog. -->
		<!-- @binding {object} item The item targeted for deletion. -->
		<!-- @binding {Function} close Closes the delete dialog. -->
		<slot
			name="delete-dialog"
			:item="actionTargetItem"
			:close="closeSingleDelete">
			<CnDeleteDialog
				v-if="showSingleDeleteDialog && actionTargetItem"
				ref="singleDeleteDialog"
				:item="actionTargetItem"
				:name-field="massActionNameField"
				:name-formatter="nameFormatter"
				@confirm="onSingleDeleteConfirm"
				@close="closeSingleDelete" />
		</slot>

		<!-- @slot copy-dialog Replace the single-item copy dialog. -->
		<!-- @binding {object} item The item targeted for copy. -->
		<!-- @binding {Function} close Closes the copy dialog. -->
		<slot
			name="copy-dialog"
			:item="actionTargetItem"
			:close="closeSingleCopy">
			<CnCopyDialog
				v-if="showSingleCopyDialog && actionTargetItem"
				ref="singleCopyDialog"
				:item="actionTargetItem"
				:name-field="massActionNameField"
				:name-formatter="nameFormatter"
				@confirm="onSingleCopyConfirm"
				@close="closeSingleCopy" />
		</slot>

		<!-- @slot form-dialog Replace the create/edit form dialog (use CnFormDialog or CnAdvancedFormDialog). -->
		<!-- @binding {boolean} show Whether the form dialog is currently visible. -->
		<!-- @binding {?object} item The item being edited, or null in create mode. -->
		<!-- @binding {object} schema The effective JSON schema driving the form. -->
		<!-- @binding {Function} close Closes the form dialog. -->
		<slot
			name="form-dialog"
			:show="showFormDialogVisible"
			:item="editItem"
			:schema="effectiveSchema"
			:close="closeFormDialog">
			<CnFormDialog
				v-if="showFormDialogVisible && !useAdvancedFormDialog"
				ref="formDialog"
				:schema="effectiveSchema"
				:item="editItem"
				:register="register"
				:exclude-fields="excludeFields"
				:include-fields="includeFields"
				:field-overrides="fieldOverrides"
				:name-field="massActionNameField"
				@confirm="onFormConfirm"
				@close="closeFormDialog">
				<template v-if="$slots['form-fields']" #form="scope">
					<slot name="form-fields" v-bind="scope" />
				</template>
			</CnFormDialog>
			<CnAdvancedFormDialog
				v-if="showFormDialogVisible && useAdvancedFormDialog"
				ref="formDialog"
				:schema="effectiveSchema"
				:item="editItem"
				:exclude-fields="excludeFields"
				:include-fields="includeFields"
				:field-overrides="fieldOverrides"
				:name-field="massActionNameField"
				@confirm="onFormConfirm"
				@close="closeFormDialog" />
		</slot>

		<!-- Body -->
		<div class="cn-index-page__body" :class="{ 'cn-index-page__body--with-folders': folderSidebar }">
			<!-- Optional folder navigation pane (opt-in via the `folderSidebar`
			     config). Selecting a folder filters the list by the config's
			     `filterField`; "All" clears it. -->
			<div v-if="folderSidebar" class="cn-index-page__folder-pane">
				<CnFolderSidebar
					:source="folderSidebarSource"
					:folders="folderSidebarFolders"
					:objects="effectiveObjects"
					:group-by="folderSidebar.groupBy || folderSidebar.field || ''"
					:files-path="folderSidebar.filesPath || '/'"
					:selected-id="selectedFolderId"
					:all-label="folderSidebar.allLabel || undefined"
					:title="folderSidebar.title || ''"
					:id-field="folderPassthroughIdField"
					:name-field="folderPassthroughNameField"
					:allow-create="Boolean(folderSidebar.allowCreate)"
					@select="onFolderSelect"
					@create="$emit('folder-create', $event)" />
			</div>

			<div
				class="cn-index-page__main"
				:class="{ 'cn-index-page__main--map': currentViewMode === 'map' }">
				<!-- Loading state -->
				<div v-if="effectiveLoading" class="cn-index-page__loading">
					<!-- name gives NcLoadingIcon a non-empty aria-label (WCAG role-img-alt); empty name ships an unlabeled role="img" -->
					<NcLoadingIcon :size="32" :name="loadingText" />
				</div>

				<!-- Empty state -->
				<div v-else-if="effectiveObjects.length === 0" class="cn-index-page__empty">
					<slot name="empty">
						<NcEmptyContent :name="emptyText">
							<template #icon>
								<CnIcon v-if="resolvedIcon" :name="resolvedIcon" :size="64" />
								<DatabaseSearch v-else :size="64" />
							</template>
						</NcEmptyContent>
					</slot>
				</div>

				<!-- Table view -->
				<CnDataTable
					v-else-if="currentViewMode === 'table'"
					:schema="effectiveSchema"
					:columns="tableColumns"
					:row-icon="rowIcon"
					:rows="displayObjects"
					:sort-key="effectiveSortKey"
					:sort-order="effectiveSortOrder"
					:sort-keys="effectiveSortKeys"
					:selectable="selectable"
					:row-click-to-view="rowClickToView"
					:selected-ids="internalSelectedIds"
					:row-key="rowKey"
					:empty-text="emptyText"
					:exclude-columns="excludeColumns"
					:include-columns="includeColumns"
					:column-overrides="columnOverrides"
					:row-class="rowClass"
					@sort="onSortEvent"
					@select="onSelect"
					@row-click="onRowClick"
					@row-context-menu="onRowContextMenu">
					<!-- Pass through column slots -->
					<template
						v-for="col in slotColumns"
						#[`column-${col}`]="{ row, value }">
						<slot :name="'column-' + col" :row="row" :value="value" />
					</template>

					<!-- Row actions -->
					<template v-if="hasRowActions" #row-actions="{ row }">
						<slot name="row-actions" :row="row">
							<CnRowActions
								:actions="mergedActions"
								:row="row"
								@action="onRowAction" />
						</slot>
					</template>

					<!-- Table-header filter + column menus (both opt-in): funnel and
					     columns buttons above the row-actions column. The filter menu
					     lists each enum column's values as toggleable facet filters;
					     the column menu lists every governed column as a visibility
					     checkbox — compact, in-table alternatives to the sidebar. -->
					<template
						v-if="(filterMenu && filterableFields.length) || (columnMenu && governedColumns.length)"
						#actions-header>
						<NcActions
							v-if="filterMenu && filterableFields.length"
							:force-menu="true"
							:aria-label="t('nextcloud-vue', 'Filter')">
							<template #icon>
								<FilterOutline :size="20" />
							</template>
							<template v-for="field in filterableFields" :key="field.key">
								<NcActionCaption :name="field.label" />
								<NcActionCheckbox
									v-for="val in field.values"
									:key="`${field.key}-${val}`"
									:model-value="isFilterActive(field.key, val)"
									@update:model-value="toggleFilter(field.key, val)">
									{{ val }}
								</NcActionCheckbox>
							</template>
						</NcActions>
						<NcActions
							v-if="columnMenu && governedColumns.length"
							:force-menu="true"
							:aria-label="t('nextcloud-vue', 'Columns')">
							<template #icon>
								<ViewColumnOutline :size="20" />
							</template>
							<NcActionCaption :name="t('nextcloud-vue', 'Columns')" />
							<NcActionCheckbox
								v-for="col in governedColumns"
								:key="`col-${col.key}`"
								:model-value="isColumnVisible(col.key)"
								@update:model-value="toggleColumn(col.key)">
								{{ col.label || col.key }}
							</NcActionCheckbox>
						</NcActions>
					</template>
				</CnDataTable>

				<!-- Map view — plots the CURRENT filtered rows (displayObjects) as
				     inline markers; no separate fetch path, so it reuses the same
				     filter / sidebar / quick-filter machinery as table and cards.
				     A marker click routes back through onRowClick for identical
				     detail-page navigation. -->
				<CnMapWidget
					v-else-if="currentViewMode === 'map'"
					class="cn-index-page__map"
					:center="mapCenter"
					:layers="mapLayers"
					:basemaps="mapBasemaps"
					:markers="mapMarkers"
					:auto-fit="true"
					height="100%"
					@marker-click="onMarkerClick" />

				<!-- List view -->
				<CnObjectList
					v-else-if="currentViewMode === 'list'"
					:objects="displayObjects"
					:schema="effectiveSchema"
					:config="listConfig"
					:selectable="selectable"
					:selected-ids="internalSelectedIds"
					:row-key="rowKey"
					:empty-text="emptyText"
					@click="onRowClick"
					@select="onSelect">
					<!--
						List-item slot resolution priority (highest first):
						1. Parent-provided `#list-item` scoped slot — App.vue overrides win.
						2. `listComponent` prop (or manifest `pages[].config.listComponent`)
						   resolved against the customComponents registry.
						3. CnObjectList's default CnObjectRow.
					-->
					<template v-if="$slots['list-item']" #list-item="{ object, selected }">
						<slot name="list-item" :object="object" :selected="selected" />
					</template>
					<template v-else-if="resolvedListComponent" #list-item="{ object, selected }">
						<component
							:is="resolvedListComponent"
							:item="object"
							:object="object"
							:schema="effectiveSchema"
							:register="register"
							:selected="selected"
							@click="onRowClick(object)"
							@select="onSelect(toggleIdInArray(internalSelectedIds, object[rowKey]))" />
					</template>
					<!-- Per-part row slots (list view only): forwarded to CnObjectRow
					     so an app can override just the leading icon or the badge
					     while keeping the config-driven title/subtitle. -->
					<template v-if="$slots['row-icon']" #row-icon="{ object }">
						<slot name="row-icon" :object="object" />
					</template>
					<template v-if="$slots['row-badges']" #row-badges="{ object }">
						<slot name="row-badges" :object="object" />
					</template>
					<template v-if="hasRowActions || $slots['row-actions']" #row-actions="{ object }">
						<slot name="row-actions" :row="object">
							<CnRowActions
								:actions="mergedActions"
								:row="object"
								@action="onRowAction" />
						</slot>
					</template>
				</CnObjectList>

				<!-- Card view -->
				<CnCardGrid
					v-else
					:objects="displayObjects"
					:schema="effectiveSchema"
					:selectable="selectable"
					:selected-ids="internalSelectedIds"
					:row-key="rowKey"
					:empty-text="emptyText"
					@click="onRowClick"
					@select="onSelect">
					<!--
						Card slot resolution priority (highest first):
						1. Parent-provided `#card` scoped slot — App.vue overrides win.
						2. `cardComponent` prop (or manifest `pages[].config.cardComponent`)
						   resolved against the customComponents registry.
						3. CnCardGrid's default CnObjectCard.
					-->
					<template v-if="$slots.card" #card="{ object, selected }">
						<slot name="card" :object="object" :selected="selected" />
					</template>
					<template v-else-if="resolvedCardComponent" #card="{ object, selected }">
						<component
							:is="resolvedCardComponent"
							:item="object"
							:object="object"
							:schema="effectiveSchema"
							:register="register"
							:selected="selected"
							@click="onRowClick(object)"
							@select="onSelect(toggleIdInArray(internalSelectedIds, object[rowKey]))" />
					</template>
					<template v-if="hasRowActions" #card-actions="{ object }">
						<slot name="row-actions" :row="object">
							<CnRowActions
								:actions="mergedActions"
								:row="object"
								@action="onRowAction" />
						</slot>
					</template>
				</CnCardGrid>

				<!-- Right-click context menu (positioned at cursor via CSS) -->
				<CnContextMenu
					v-model:open="contextMenuOpen"
					:actions="mergedActions"
					:target-item="contextMenuRow"
					@action="onRowAction"
					@close="closeContextMenu" />

				<!-- Pagination -->
				<CnPagination
					v-if="effectivePagination && effectivePagination.pages > 1"
					:current-page="effectivePagination.page || 1"
					:total-pages="effectivePagination.pages || 1"
					:total-items="effectivePagination.total || 0"
					:current-page-size="effectivePagination.limit || 20"
					class="cn-index-page__pagination"
					@page-changed="onPageEvent"
					@page-size-changed="$emit('page-size-changed', $event)" />
			</div>
		</div>

		<!-- Manifest-driven sidebar — auto-mounted when sidebar.enabled
		     AND sidebar.show !== false.

		     When CnAppRoot is the host, the sidebar config is
		     PUBLISHED to the `cnIndexSidebarConfig` provide (see
		     mounted/beforeDestroy), and CnAppRoot mounts the
		     CnIndexSidebar at NcContent level — the only place where
		     Nextcloud's NcAppSidebar slides correctly from the right.

		     When no CnAppRoot ancestor exists (legacy apps mounting
		     CnIndexPage standalone), the inject default is the no-op
		     `{ value: null }` and we fall back to inline rendering
		     here so the legacy contract still works. -->
		<CnIndexSidebar
			v-if="shouldRenderInlineSidebar"
			:open="sidebarOpen"
			:schema="effectiveSchema"
			:title="title"
			:icon="resolvedIcon"
			:search-value="effectiveSearchValue"
			:visible-columns="effectiveVisibleColumns"
			:active-filters="effectiveActiveFilters"
			:column-groups="resolvedSidebar.columnGroups || []"
			:facet-data="resolvedSidebar.facets || {}"
			:show-metadata="resolvedSidebar.showMetadata !== false"
			v-bind="sidebarSearchProps"
			@update:open="sidebarOpen = $event"
			@search="onSearchEvent"
			@columns-change="onColumnsEvent"
			@filter-change="onFilterEvent" />
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton, NcActionCaption, NcActionCheckbox, NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import { getCurrentInstance, inject } from 'vue'
import DatabaseSearch from 'vue-material-design-icons/DatabaseSearch.vue'
import Export from 'vue-material-design-icons/Export.vue'
import Eye from 'vue-material-design-icons/Eye.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import { useContextMenu } from '../../composables/index.js'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { METADATA_COLUMNS } from '../../constants/metadata.js'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import { buildExportUrl } from '../../utils/indexExportHelpers.js'
import { buildRouteQueryFromViewState, buildViewCreatePayload, extractViewState, extractViewStateFromRouteQuery } from '../../utils/savedViewHelpers.js'
import { columnsFromSchema } from '../../utils/schema.js'
import { multiKeySort } from '../../utils/multiKeySort.js'
import { CnActionsBar } from '../CnActionsBar/index.js'
import { CnAdvancedFormDialog } from '../CnAdvancedFormDialog/index.js'
import { CnCardGrid } from '../CnCardGrid/index.js'
import { CnObjectList } from '../CnObjectList/index.js'
import { CnFolderSidebar } from '../CnFolderSidebar/index.js'
import { CnContextMenu } from '../CnContextMenu/index.js'
import { CnCopyDialog } from '../CnCopyDialog/index.js'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnDeleteDialog } from '../CnDeleteDialog/index.js'
import { CnFormDialog } from '../CnFormDialog/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnIndexSidebar } from '../CnIndexSidebar/index.js'
import { CnMapWidget } from '../CnMapWidget/index.js'
import { CnMassCopyDialog } from '../CnMassCopyDialog/index.js'
import { CnMassDeleteDialog } from '../CnMassDeleteDialog/index.js'
import { CnMassExportDialog } from '../CnMassExportDialog/index.js'
import { CnMassImportDialog } from '../CnMassImportDialog/index.js'
import { CnPageHeader } from '../CnPageHeader/index.js'
import { CnPagination } from '../CnPagination/index.js'
import { CnQuickFilterBar } from '../CnQuickFilterBar/index.js'
import { CnRowActions } from '../CnRowActions/index.js'
import { CnSavedViewsControl } from '../CnSavedViewsControl/index.js'
import { CnSaveViewDialog } from '../CnSaveViewDialog/index.js'
import { applyAiContext } from './aiContext.js'
import { buildDefaultActions } from './defaultActions.js'
import { dispatchAction } from './manifestActionDispatch.js'
import { createSelfModeActions } from './selfModeActions.js'
import { useSelfFetchList } from './useSelfFetchList.js'

/**
 * CnIndexPage — Top-level schema-driven index page component.
 *
 * Assembles sub-components (CnPageHeader, CnActionsBar, table, cards,
 * pagination, mass actions, single-object dialogs) into a single
 * zero-config page.
 *
 * Dialogs are overridable via named slots:
 * - `#form-dialog` — Replace the create/edit dialog entirely
 * - `#delete-dialog` — Replace the single-item delete dialog
 * - `#copy-dialog` — Replace the single-item copy dialog
 * - `#form-fields` — Replace only the form content inside the built-in form dialog (CnFormDialog only)
 *
 * Use the `useAdvancedFormDialog` prop to use CnAdvancedFormDialog for create/edit (properties table, JSON tab, optional metadata).
 *
 * Multi-column sort (self-fetch mode: `register` + `schema`, no external
 * `objects`): shift+click a second/third sortable header in the embedded
 * CnDataTable to build a priority-ordered sort. The active key list is
 * translated into OpenRegister's `_order` query param (`{field: 'asc'|
 * 'desc', ...}`, key order = priority — the exact shape `ObjectsController::
 * normalizeOrderParameter` / `MagicMapper` consume) and persisted in
 * `$route.query._order` (JSON-encoded), so a reload or a shared link
 * restores the same sort. Host-controlled (non-self-fetch) pages pass their
 * own `sortKeys` prop instead.
 *
 * Minimal usage (auto-generated dialogs from schema)
 * ```vue
 * <CnIndexPage
 *   title="Clients"
 *   :schema="effectiveSchema"
 *   :objects="clients"
 *   :pagination="effectivePagination"
 *   :loading="loading"
 *   @create="onCreate"
 *   @edit="onEdit"
 *   @delete="onDelete"
 *   @refresh="fetchClients"
 *   @row-click="openClient"
 *   @page-changed="onPage" />
 * ```
 *
 * With custom form dialog
 * ```vue
 * <CnIndexPage ...>
 *   <template #form-dialog="{ item, schema, close }">
 *     <MyCustomFormDialog :item="item" @close="close" />
 *   </template>
 * </CnIndexPage>
 * ```
 *
 * @event {void} add — Add button clicked (backward compat, only if listener attached)
 * @event {object} create — Form dialog create confirmed. Payload: formData object
 * @event {object} edit — Form dialog edit confirmed. Payload: formData object (includes id)
 * @event {string} delete — Single delete confirmed. Payload: item ID
 * @event {{ id: string, newName: string }} copy — Single copy confirmed
 * @event {string[]} mass-delete — Mass delete confirmed. Payload: array of IDs
 * @event {object} mass-copy — Mass copy confirmed. Payload: { ids, pattern }
 * @event {object} mass-export — Mass export confirmed. Payload: { ids, format }
 * @event {object} mass-import — Mass import confirmed. Payload: import data
 * @event {void} refresh — Refresh button clicked
 * @event {object} row-click — Table row or card clicked. Payload: row object
 * @event {{ key: string, order: string }} sort — Column sort changed
 * @event {number} page-changed — Pagination page changed
 * @event {number} page-size-changed — Pagination page size changed
 * @event {string[]} select — Selection changed. Payload: array of selected IDs
 * @event {object} action — Row action triggered. Payload: { action, row }
 * @event {object} apply-view — A saved view was applied (saved-views-ui). Payload: the View API object. Only emitted when `allowSavedViews`.
 * @event {string} search — Search input changed in the embedded sidebar. Only emitted when `sidebar.enabled`.
 * @event {string[]} columns-change — Visible columns changed in the embedded sidebar. Only emitted when `sidebar.enabled`.
 * @event {{ key: string, values: any[] }} filter-change — Facet filter changed in the embedded sidebar. Only emitted when `sidebar.enabled`.
 *
 * @slot mass-actions — Extra mass action buttons (shown when items are selected)
 * @slot action-items — Extra action bar buttons
 * @slot header-actions — Extra buttons in the page header
 * @slot delete-dialog — Replace the single-item delete dialog. Scope: `{ item, close }`
 * @slot copy-dialog — Replace the single-item copy dialog. Scope: `{ item, close }`
 * @slot form-dialog — Replace the create/edit form dialog. Scope: `{ item, schema, close }`
 * @slot form-fields — Replace form content inside the built-in CnFormDialog. Scope: `{ fields, formData, errors, updateField }`
 * @slot import-fields — Extra fields in the import dialog
 * @slot empty — Custom empty state content
 * @slot card — Custom card template for card view. Scope: `{ row }`
 * @slot row-actions — Custom row actions. Scope: `{ row }`
 * @slot column-{key} — Custom cell renderer for a specific column. Scope: `{ row, value }`
 */
export default {
	name: 'CnIndexPage',

	components: {
		NcLoadingIcon,
		NcEmptyContent,
		NcActions,
		NcActionButton,
		NcActionCaption,
		NcActionCheckbox,
		NcButton,
		Cog,
		DatabaseSearch,
		Export,
		FilterOutline,
		ViewColumnOutline,
		CnPageHeader,
		CnQuickFilterBar,
		CnActionsBar,
		CnIcon,
		CnDataTable,
		CnCardGrid,
		CnMapWidget,
		CnObjectList,
		CnFolderSidebar,
		CnPagination,
		CnRowActions,
		CnMassDeleteDialog,
		CnMassCopyDialog,
		CnMassExportDialog,
		CnMassImportDialog,
		CnDeleteDialog,
		CnCopyDialog,
		CnFormDialog,
		CnAdvancedFormDialog,
		CnContextMenu,
		CnIndexSidebar,
		CnSavedViewsControl,
		CnSaveViewDialog,
		CnConfirmDialog,
	},

	/**
	 * Inject the customComponents registry from a CnAppRoot ancestor.
	 * Used by:
	 * - REQ-MAD-3 / REQ-MAD-8 (manifest-actions-dispatch): resolves
	 *   `actions[].handler` registry names to functions called on
	 *   row-action click.
	 * - The cardComponent + form-dialog override paths: when set, the
	 *   prop-level `customComponents` wins, but the inject is the
	 *   default. See `effectiveCustomComponents`.
	 *
	 * Falls back to an empty object so `CnIndexPage` works standalone
	 * (unit tests, isolated mount) without `CnAppRoot`.
	 */
	inject: {
		cnCustomComponents: { default: () => ({}) },
		/**
		 * Reactive edit-mode flag from CnAppRoot's manifest editor. When truthy
		 * the page shows a config cog in its actions bar (emits `configure`).
		 */
		cnEditingBody: { default: false },
		/**
		 * Reactive holder provided by CnAppRoot for hoisting the
		 * embedded CnIndexSidebar to NcContent level. The default
		 * `{ value: null }` is what we get when no CnAppRoot
		 * ancestor exists; in that case we fall back to inline
		 * rendering inside the cn-index-page wrapper. See
		 * `shouldRenderInlineSidebar` and the mounted/beforeDestroy
		 * hooks below.
		 */
		cnIndexSidebarConfig: { default: () => ({ value: null }) },
		/**
		 * Sentinel set to `true` when a CnAppRoot ancestor exists.
		 * The default `false` is used for legacy apps that mount
		 * CnIndexPage standalone — those keep the inline sidebar
		 * render. See `shouldRenderInlineSidebar` for the gate.
		 */
		cnHostsIndexSidebar: { default: false },
		/**
		 * Reactive AI context holder provided by CnAppRoot. This page
		 * component writes pageKind, registerSlug, schemaSlug in
		 * created() and watches props for subsequent changes. On
		 * beforeUnmount(), fields are reset to avoid stale context on
		 * subsequent custom pages.
		 */
		cnAiContext: { default: null },
	},

	props: {
		/** Page title */
		title: {
			type: String,
			required: true,
		},

		/** Optional description shown below the title */
		description: {
			type: String,
			default: '',
		},

		/**
		 * Whether to show the page header (icon, title, description) inline.
		 * When false (default), the title is shown in the sidebar header instead.
		 */
		showTitle: {
			type: Boolean,
			default: false,
		},

		/** Optional MDI icon name. Defaults to schema.icon when a schema is provided. */
		icon: {
			type: String,
			default: '',
		},

		/**
		 * Schema. Either a resolved schema object (consumer-managed path) OR a
		 * schema-slug string — when a string is given together with `register`
		 * and no `objects` prop, the page enters self-fetch mode: it drives the
		 * list via `useListView('${register}-${schema}', …)` and the column
		 * generation uses the schema object that composable loads. Backwards-
		 * compatible: `[Object, String]` still accepts an object.
		 */
		schema: {
			type: [Object, String],
			default: null,
		},

		/* eslint-disable vue/no-unused-properties -- used in useSelfFetchList */
		/**
		 * Base filter for the self-fetch path. String values of the form
		 * `"@route.<name>"` / `":<name>"` are interpolated from `$route.params`.
		 */
		filter: {
			type: Object,
			default: null,
		},
		/* eslint-enable vue/no-unused-properties */

		/**
		 * Self-fetch mode only — an array of clickable filter tabs rendered as
		 * a strip above the table. Each entry is `{label, filter, default?, icon?}`;
		 * clicking a tab merges its `filter` into the fetch — spread AFTER
		 * `filter` (so the active tab wins) and BEFORE the user's `activeFilters`
		 * (so user facets still narrow within the active tab). String values
		 * in a tab's `filter` resolve `@route.<name>` / `:<name>` from
		 * `$route.params` just like the `filter` prop. The first tab with
		 * `default:true` (else index 0) is active on mount; changing tabs
		 * re-fetches at page 1. Omit (or `null`) → no tab strip, behaviour
		 * unchanged.
		 */
		quickFilters: {
			type: Array,
			default: null,
		},

		/**
		 * How the quick filters render: `'chips'` (pill strip, default) or
		 * `'dropdown'` (a single `NcSelect`). Sourced from the manifest as
		 * `pages[].config.quickFilterMode`.
		 * @type {'chips'|'dropdown'}
		 */
		quickFilterMode: {
			type: String,
			default: 'chips',
			validator: (v) => ['chips', 'dropdown'].includes(v),
		},

		/**
		 * Allow several quick filters active at once. Selected tabs' filters
		 * are OR-ed together into the fetch (same field → array value →
		 * `field[]=` IN query). Sourced from `pages[].config.quickFilterMultiple`.
		 */
		quickFilterMultiple: {
			type: Boolean,
			default: false,
		},

		/** Manual column definitions (used instead of schema when provided) */
		columns: {
			type: Array,
			default: () => [],
		},

		/** Object/row data array */
		objects: {
			type: Array,
			default: () => [],
		},

		/** Pagination state: { page, pages, total, limit } */
		pagination: {
			type: Object,
			default: null,
		},

		/** Whether data is loading */
		loading: {
			type: Boolean,
			default: false,
		},

		/** Whether rows/cards can be selected */
		selectable: {
			type: Boolean,
			default: true,
		},

		/**
		 * When true, a row/card click emits `row-click` (to open/navigate) even
		 * while `selectable` — selection then happens via the checkbox only.
		 * Manifest-driven index pages set this when a matching detail page
		 * exists, so clicking a row opens its detail. Default false preserves
		 * the legacy select-on-click behaviour.
		 * @type {boolean}
		 */
		rowClickToView: {
			type: Boolean,
			default: false,
		},

		/** Currently selected IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},

		/**
		 * View mode: 'table', 'cards', 'list', or 'map'. Default 'table'. List is
		 * opted in via `availableViewModes`; map via `mapConfig` / `config.viewModes`.
		 */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards', 'list', 'map'].includes(v),
		},

		/**
		 * Marker geometry mapping for the opt-in `map` view mode, mirroring the
		 * manifest `config.map` block 1:1. When non-empty (and not excluded by an
		 * explicit `config.viewModes`), a third "Map" segment appears in the view
		 * toggle and the current filtered rows are plotted on a CnMapWidget.
		 *
		 * - `latField` / `lngField` — object (or `@self`) property paths holding the
		 *   marker's latitude / longitude. Dotted paths are supported (e.g.
		 *   `@self.geo.lat`).
		 * - `geoField` — alternative single property holding a GeoJSON Point
		 *   geometry (`{ type: 'Point', coordinates: [lng, lat] }`); takes
		 *   precedence over lat/lngField when present and resolvable.
		 * - `popupField` — object property rendered in the marker popup.
		 * - `center` — optional `[lat, lng]` fallback centre when the filtered set
		 *   has no plottable rows.
		 * @type {{ latField?: string, lngField?: string, geoField?: string, popupField?: string, center?: [number, number] }}
		 */
		mapConfig: {
			type: Object,
			default: () => ({}),
		},

		/** Label for the map view-toggle segment (defaults to "Map"). */
		mapLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the map view-toggle segment (defaults to the built-in map-marker icon). */
		mapIcon: {
			type: String,
			default: '',
		},

		/**
		 * Explicit whitelist of view-toggle segments to offer, e.g.
		 * `['table', 'cards', 'map']`. Fed from the manifest as
		 * `pages[].config.viewModes`. When set it takes precedence over the
		 * inferred availability (map otherwise appears iff `mapConfig` is
		 * non-empty). Cards/table always render regardless of this list.
		 * @type {Array<'table' | 'cards' | 'list' | 'map'>}
		 */
		viewModes: {
			type: Array,
			default: null,
		},

		/**
		 * Which view-mode toggle segments to expose (cards/table/list), in order.
		 * Defaults to the historical Cards/Table pair; include `'list'` to offer the
		 * list view. Fed from the manifest as `pages[].config.availableViewModes`.
		 * Map is added separately via `mapConfig` / `viewModes`.
		 * @type {Array<'cards' | 'table' | 'list' | 'map'>}
		 */
		availableViewModes: {
			type: Array,
			default: () => ['cards', 'table'],
			validator: (modes) => modes.every((m) => ['cards', 'table', 'list', 'map'].includes(m)),
		},

		/** Current sort key */
		sortKey: {
			type: String,
			default: null,
		},

		/** Current sort order */
		sortOrder: {
			type: String,
			default: 'asc',
		},

		/**
		 * Ordered multi-column sort state (host-controlled / non-self-fetch
		 * mode): `[{ key, order }, ...]`, mirroring the `sortKey`/`sortOrder`
		 * pair but for more than one active key. Ignored in self-fetch mode
		 * (register + schema), which manages its own multi-sort state via
		 * `useSelfFetchList`/`useListView` and persists it in the route query.
		 * @type {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		sortKeys: {
			type: Array,
			default: () => [],
		},

		/**
		 * Optional declarative DEFAULT multi-key client-side sort, applied to the
		 * already-loaded rows whenever no explicit column sort is active (no
		 * `sortKey` selected by the user / passed in). Each entry is
		 * `{ field, order }` with `order` one of `'asc'` / `'desc'` (default
		 * `'asc'`); rows are compared by the first field, ties broken by the
		 * next, and so on. Comparison is type-aware (numbers numerically, dates
		 * by timestamp, strings via `localeCompare`). Clicking a sortable header
		 * takes over and suppresses this default. Useful for a fixed presentation
		 * order such as "group by type, then name".
		 * @type {Array<{field: string, order?: 'asc'|'desc'}>}
		 */
		defaultSort: {
			type: Array,
			default: () => [],
		},

		/** Unique row identifier property */
		rowKey: {
			type: String,
			default: 'id',
		},

		/**
		 * Optional leading icon for every table row — a static MDI icon name or
		 * a `(row) => iconName` function. Forwarded to CnDataTable. Fed from the
		 * manifest as `pages[].config.rowIcon`. Unset = no icon column.
		 * @type {string | ((row: object) => string) | null}
		 */
		rowIcon: {
			type: [String, Function],
			default: null,
		},

		/** Columns to exclude in schema mode */
		excludeColumns: {
			type: Array,
			default: () => [],
		},

		/** Columns to include in schema mode (whitelist) */
		includeColumns: {
			type: Array,
			default: null,
		},

		/** Per-column overrides in schema mode */
		columnOverrides: {
			type: Object,
			default: () => ({}),
		},

		/** Row action definitions (app-provided, merged with built-in actions) */
		actions: {
			type: Array,
			default: () => [],
		},

		/** Text shown when no items found */
		emptyText: {
			type: String,
			default: 'No items found',
		},

		/** Accessible label for the loading spinner (NcLoadingIcon aria-label) */
		loadingText: {
			type: String,
			default: 'Loading…',
		},

		/** Function returning CSS class(es) for a row */
		rowClass: {
			type: Function,
			default: null,
		},

		/** Override label for the Add button. Defaults to "Add {schema.title}" */
		addLabel: {
			type: String,
			default: '',
		},

		/** How many action buttons to show inline (rest go in overflow dropdown) */
		inlineActionCount: {
			type: Number,
			default: 0,
		},

		/** Whether to show the built-in mass Import action */
		showMassImport: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Export action */
		showMassExport: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Copy button */
		showMassCopy: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Delete button */
		showMassDelete: {
			type: Boolean,
			default: true,
		},

		/**
		 * Opt-in flag for the native Export menu (CSV/Excel) rendered in the
		 * toolbar next to the Add button. Defaults to `false` — an app must
		 * explicitly enable it per page. The menu only renders when this is
		 * `true` AND the resolved schema is flagged `exportable: true`; it
		 * navigates the browser to OpenRegister's export leaf
		 * (`GET /apps/openregister/api/objects/{register}/{schema}/export`),
		 * passing the current route's query params through as filters. This
		 * is distinct from the `showMassExport` mass-action, which exports
		 * only the fetched/selected rows via a blob download.
		 */
		allowExport: {
			type: Boolean,
			default: false,
		},

		/**
		 * Opt-in flag for the saved-views control (saved-views-ui) rendered
		 * in the toolbar. Defaults to `false` — an app must explicitly
		 * enable it per page. When `true`, a Views dropdown lists the
		 * current user's OpenRegister saved-search views
		 * (`GET /apps/openregister/api/views`); applying one writes its
		 * stored filters/search/sort into the route query (reusing the
		 * existing deep-link contract — non-underscore keys are filters,
		 * `_search`/`_sortKey`/`_sortOrder` are reserved), "Save current
		 * view…" persists the current route-query state via POST, and own
		 * views can be deleted after confirmation.
		 */
		allowSavedViews: {
			type: Boolean,
			default: false,
		},

		/** Property name used to display item names in dialogs */
		massActionNameField: {
			type: String,
			default: 'title',
		},

		/** Optional function to format item names in dialogs. Receives the item, returns a string. Overrides massActionNameField when provided. */
		nameFormatter: {
			type: Function,
			default: null,
		},

		/** Available export formats for the export dialog */
		exportFormats: {
			type: Array,
			default: () => [
				{ id: 'excel', label: 'Excel (.xlsx)' },
				{ id: 'csv', label: 'CSV (.csv)' },
			],
		},

		/** Import option definitions for the import dialog */
		importOptions: {
			type: Array,
			default: () => [],
		},

		/** Whether to show the built-in form dialog for Add/Edit */
		showFormDialog: {
			type: Boolean,
			default: true,
		},

		/** Use CnAdvancedFormDialog (properties table, JSON tab, optional metadata) instead of CnFormDialog for Add/Edit */
		useAdvancedFormDialog: {
			type: Boolean,
			default: false,
		},

		/**
		 * Opt-in async create hook. When provided, a **create** (not edit)
		 * confirmed from the built-in form dialog calls
		 * `await createOverride(formData, ctx)` INSTEAD of persisting via the
		 * store / self-store `saveObject`. The override owns persistence
		 * (e.g. an app posting through a contact-aware endpoint that fills a
		 * required FK before saving to OpenRegister) and MUST return the
		 * created object (a truthy value) on success; return a falsy value to
		 * signal failure. The returned object is used as the created result
		 * (`@create` payload + dialog success). Throwing rejects with the
		 * error surfaced in the form dialog. Edits are never routed here.
		 *
		 * `ctx` carries `{ register, schema, objectType, effectiveSchema }`
		 * so a single handler can branch per schema.
		 *
		 * When absent, create behaviour is unchanged (store / self-store save).
		 *
		 * @type {?(formData: object, ctx: { register: string, schema: (object|string), objectType: string, effectiveSchema: object }) => Promise<object>}
		 */
		createOverride: {
			type: Function,
			default: null,
		},

		/**
		 * Whether to add a View action to row actions. The action emits a
		 * dedicated `view` event — independent of `row-click`. Bind `@view`
		 * to handle "open detail" and `@row-click` to handle row click
		 * (selection, expand, etc.); they may share a handler when the app
		 * wants click-to-view, but they are conceptually distinct.
		 */
		showViewAction: {
			type: Boolean,
			default: true,
		},

		/** Whether to add an Edit action to row actions */
		showEditAction: {
			type: Boolean,
			default: true,
		},

		/** Whether to add a Copy action to row actions */
		showCopyAction: {
			type: Boolean,
			default: true,
		},

		/** Whether to add a Delete action to row actions */
		showDeleteAction: {
			type: Boolean,
			default: true,
		},

		/** Field keys to exclude from the form dialog */
		excludeFields: {
			type: Array,
			default: () => [],
		},

		/** Field keys to include in the form dialog (whitelist mode) */
		includeFields: {
			type: Array,
			default: null,
		},

		/** Per-field overrides passed to CnFormDialog */
		fieldOverrides: {
			type: Object,
			default: () => ({}),
		},

		/** Whether to show the Cards/Table view toggle in the actions bar */
		showViewToggle: {
			type: Boolean,
			default: true,
		},

		/**
		 * Show an inline search field in the actions bar (in addition to / instead
		 * of the sidebar search). Fed from the manifest as `pages[].config.inlineSearch`.
		 */
		inlineSearch: {
			type: Boolean,
			default: false,
		},

		/** Placeholder for the inline search field (manifest `config.searchPlaceholder`) */
		searchPlaceholder: {
			type: String,
			default: '',
		},

		/** Label for the cards view-toggle option (manifest `config.cardsLabel`, e.g. "Tiles") */
		cardsLabel: {
			type: String,
			default: '',
		},

		/** Label for the table view-toggle option (manifest `config.tableLabel`, e.g. "List") */
		tableLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the cards view-toggle option (manifest `config.cardsIcon`) */
		cardsIcon: {
			type: String,
			default: '',
		},

		/** MDI icon name for the table view-toggle option (manifest `config.tableIcon`) */
		tableIcon: {
			type: String,
			default: '',
		},

		/** Label for the list view-toggle option (manifest `config.listLabel`, e.g. "Rows") */
		listLabel: {
			type: String,
			default: '',
		},

		/**
		 * Show a standalone sort dropdown in the actions bar (for card/list
		 * views without sortable headers). Emits `@sort-change` with the value.
		 * Fed from the manifest as `pages[].config.showSortSelect`.
		 */
		showSortSelect: {
			type: Boolean,
			default: false,
		},

		/**
		 * Options for the standalone sort dropdown (manifest `config.sortSelectOptions`).
		 * @type {Array<{ value: string, label: string }>}
		 */
		sortSelectOptions: {
			type: Array,
			default: () => [],
		},

		/** Selected value of the standalone sort dropdown (controlled). */
		sortSelectValue: {
			type: String,
			default: '',
		},

		/** MDI icon name for the list view-toggle option (manifest `config.listIcon`) */
		listIcon: {
			type: String,
			default: '',
		},

		/**
		 * Field mapping for the default list-view rows (CnObjectRow). Overrides
		 * the schema-configuration defaults. Fed from the manifest as
		 * `pages[].config.listConfig`.
		 * @type {{ titleField?: string, subtitleField?: string, imageField?: string, iconField?: string, iconName?: string, badgeField?: string, badgeVariantField?: string, badgeVariant?: string, badgeColorMap?: object }}
		 */
		listConfig: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Opt-in folder navigation pane (rendered left of the list). Selecting a
		 * folder filters the list by `filterField` (via the self-fetch filter);
		 * "All" clears it. Fed from the manifest as `pages[].config.folderSidebar`.
		 *
		 * - `source` — `'register'` (fetch the folder list from an OpenRegister
		 *   register/schema), `'field'` (distinct values of the current rows'
		 *   `field`), `'custom'` (use `folders`), or `'files'` (NC folders).
		 * - `register` / `schema` — the OR source for `source:'register'`.
		 * - `idField` / `nameField` — which folder object props map to the folder
		 *   id (the filter value) and display name. Dotted paths supported.
		 * - `field` / `filterField` — the row field to group/filter by (filterField
		 *   defaults to `field`).
		 * - `folders` — explicit folder list for `source:'custom'`.
		 * - `allLabel` / `title` / `allowCreate` — passed to CnFolderSidebar.
		 * @type {object}
		 */
		folderSidebar: {
			type: Object,
			default: null,
		},

		/**
		 * Show a filter menu (funnel button) in the table header, above the
		 * row-actions column. Its menu lists every enum/badge column's values as
		 * toggleable facet filters — a compact alternative to the facet sidebar.
		 * Fed from the manifest as `pages[].config.filterMenu`.
		 */
		filterMenu: {
			type: Boolean,
			default: false,
		},

		/**
		 * Show a column menu (columns button) in the table header, above the
		 * row-actions column. Its menu lists every governed column as a toggleable
		 * checkbox — a compact, in-table alternative to the sidebar's Columns tab,
		 * so the sidebar space can be reclaimed. Fed from the manifest as
		 * `pages[].config.columnMenu`.
		 */
		columnMenu: {
			type: Boolean,
			default: false,
		},

		/** Whether the refresh action is currently in progress */
		refreshing: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whether to auto-subscribe to live collection updates in self-fetch
		 * mode. Defaults to true. When `register` + `schema` are set (and no
		 * `objects` prop is passed), the page subscribes to the collection's
		 * `or-collection-{register}-{schema}` scope on mount and refetches
		 * (coalesced — events are hints) when an update event arrives; the
		 * subscription is released on unmount. Set `false` (manifest:
		 * `config.subscribe: false`) for static / read-once views. No-op in
		 * consumer-managed mode (an `objects` prop was passed) and on stores
		 * without live-updates support.
		 *
		 * @type {boolean}
		 */
		subscribe: {
			type: Boolean,
			default: true,
		},

		/** Whether the refresh action is disabled (e.g. when required selections are missing) */
		refreshDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether the Add button is disabled (e.g. when required selections are missing) */
		addDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether to show the Add button in the actions bar */
		showAdd: {
			type: Boolean,
			default: true,
		},

		/**
		 * Store instance for automatic save integration. When provided alongside
		 * objectType, the form dialog saves directly to the store instead of
		 * emitting create/edit events. The object type must already be registered
		 * in the store via registerObjectType() before passing the store here.
		 */
		store: { type: Object, default: null },
		/**
		 * Object type slug for store integration (e.g. `${registerId}-${schemaId}`).
		 * Required when store is set — a console warning is emitted if missing.
		 */
		objectType: { type: String, default: '' },
		/**
		 * Manifest-driven sidebar configuration. When set with
		 * `enabled: true`, CnIndexPage auto-mounts an embedded
		 * CnIndexSidebar wired to the page's schema, search, columns,
		 * and facet props. When unset or `enabled: false`, the
		 * legacy slot-based interface is preserved — consumers
		 * mount their own CnIndexSidebar at the App.vue level.
		 *
		 * Shape:
		 * - `enabled` (boolean) — **existence gate**. Whether the
		 *   page configures an embedded sidebar at all. When `false`
		 *   or unset, the auto-mount path is bypassed (no
		 *   `<CnIndexSidebar>` rendered) and the consumer's slot
		 *   pattern stays active.
		 * - `show` (boolean, default `true`) — **visibility gate**.
		 *   Even when `enabled: true`, `show: false` SUPPRESSES
		 *   rendering for this page so manifest authors can hide
		 *   the sidebar declaratively without removing the config.
		 *   Distinct from `enabled` so config can be retained
		 *   (e.g. for a watcher / responsive layout) while the
		 *   visible surface is hidden.
		 * - `columnGroups` (array) — extra column groups beyond schema + Metadata.
		 * - `facets` (object) — live facet data { fieldName: { values: [...] } }.
		 * - `showMetadata` (boolean) — include the built-in Metadata column group (defaults true).
		 * - `search` (object) — search-related label overrides forwarded to CnIndexSidebar.
		 *
		 * @type {{ enabled: boolean, show?: boolean, columnGroups?: Array, facets?: object, showMetadata?: boolean, search?: object }|null}
		 */
		sidebar: {
			type: Object,
			default: null,
		},

		/** Current search term (forwarded to the embedded sidebar when sidebar.enabled). */
		searchValue: {
			type: String,
			default: '',
		},

		/** Currently visible column keys (forwarded to the embedded sidebar). */
		visibleColumns: {
			type: Array,
			default: null,
		},

		/** Currently active facet filters: { fieldName: [values] } (forwarded to the embedded sidebar). */
		activeFilters: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Effective register slug for the page. Forwarded as a prop to
		 * the resolved card component (when `cardComponent` is set) so
		 * bespoke card UIs can match the schema → register pair.
		 *
		 * Manifest-driven path: `pages[].config.register` flows in via
		 * CnPageRenderer's `v-bind="resolvedProps"` spread.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * Optional name of a consumer-provided card component (registered
		 * in the `customComponents` registry on `CnAppRoot`) to render in
		 * place of the default `CnObjectCard` when the page is in
		 * card-grid view mode.
		 *
		 * Resolution priority (highest first):
		 *   1. The parent's `#card` scoped slot (always wins).
		 *   2. The component resolved from `cardComponent` against the
		 *      effective customComponents registry.
		 *   3. The library default (`CnObjectCard`).
		 *
		 * Unknown names log `console.warn` once and fall back to the
		 * default so a misconfigured manifest never blanks the grid.
		 *
		 * @type {string}
		 */
		cardComponent: {
			type: String,
			default: '',
		},

		/**
		 * Name of a custom row component for list view, resolved against the
		 * customComponents registry (manifest `pages[].config.listComponent`).
		 * Same resolution priority as `cardComponent`: the `#list-item` slot
		 * wins, then this component, then the default `CnObjectRow`. Unknown
		 * names warn once and fall back to the default.
		 *
		 * @type {string}
		 */
		listComponent: {
			type: String,
			default: '',
		},

		/**
		 * Optional explicit customComponents registry. When set, this
		 * overrides the registry injected from `CnAppRoot` via
		 * `cnCustomComponents`. Provided primarily so unit tests can
		 * pass a registry without mounting `CnAppRoot`.
		 *
		 * Used by:
		 * - `cardComponent` resolution (REQ-MCI from manifest-card-index)
		 * - `actions[].handler` registry name resolution (REQ-MAD-3 from
		 *   manifest-actions-dispatch — handler funcs called on row-action click)
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},

		/**
		 * Manifest-driven page-level actions rendered inside the
		 * NcActions overflow dropdown between Refresh and the
		 * `#action-items` slot. Each entry is
		 * `{ id, label, icon?, handler?, route?, disabled? }`. The
		 * `handler` field mirrors the row-level
		 * `actions[].handler` pattern: a function, the keyword
		 * `'navigate'`, `'emit'`, `'none'`, or a string registry
		 * lookup against the resolved `customComponents`. The page
		 * dispatches the resolved handler via `onHeaderAction` AND
		 * (unless the handler is the `'none'` keyword) emits
		 * `@header-action({ action: id, id })`.
		 *
		 * Reserved ids (those used by built-ins on the bar — `refresh`,
		 * `import`, `export`, `copy`, `delete`) are dropped from the
		 * merged list with a `console.warn`.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, handler?: string|Function, route?: string, disabled?: boolean }>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Active organisation entity (multi-tenancy-context). When
		 * bound from a tenant-switcher higher in the tree, CnIndexPage
		 * watches it and calls `store.setActiveTenantOrganisation(uuid)`
		 * so the next fetchCollection() stamps the new tenant header
		 * and the in-memory caches are cleared. When the prop is unset
		 * the legacy single-tenant behaviour is preserved exactly.
		 *
		 * @type {object|null}
		 */
		activeOrganisation: {
			type: Object,
			default: null,
		},

		/**
		 * When set, adds a Documentation entry to the Actions overflow
		 * (after Refresh). Opens the URL in a new tab. Empty hides it.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},

		/** Label for the Documentation overflow entry. */
		documentationLabel: {
			type: String,
			default: '',
		},
	},

	setup(props) {
		const {
			isOpen: contextMenuOpen,
			targetItem: contextMenuRow,
			open: openContextMenu,
			close: closeContextMenu,
		} = useContextMenu()

		const {
			isSelfFetch,
			list,
			selfObjectStore,
			selfObjectType,
			activeQuickFilterIndex,
			selectedQuickFilterIndices,
		} = useSelfFetchList(props, getCurrentInstance(), inject)

		return {
			contextMenuOpen,
			contextMenuRow,
			openContextMenu,
			closeContextMenu,
			isSelfFetch,
			list,
			selfObjectStore,
			selfObjectType,
			activeQuickFilterIndex,
			selectedQuickFilterIndices,
		}
	},

	data() {
		return {
			currentViewMode: this.viewMode,
			internalSelectedIds: [...this.selectedIds],
			// Folder-sidebar state: selected folder id + the register-fetched list.
			selectedFolderId: null,
			folderRegisterList: [],
			// Mass action dialogs
			showMassDeleteDialog: false,
			showMassCopyDialog: false,
			showExportDialog: false,
			showImportDialog: false,
			// Single-object dialogs
			showSingleDeleteDialog: false,
			showSingleCopyDialog: false,
			showFormDialogVisible: false,
			// Dialog targets
			actionTargetItem: null,
			editItem: null,
			// Drives the Actions-menu Refresh spinner during a self-fetch
			// refresh, where the host has no promise to bind `:refreshing` to.
			internalRefreshing: false,
			// Search/Columns sidebar open state. Defaults closed so the page
			// content (table / cards) starts at the top and fills the width;
			// opened on demand via the actions-bar toggle.
			sidebarOpen: false,
			// Saved views (saved-views-ui): the fetched view list, its
			// loading flag, the save-dialog toggle, and the view awaiting
			// delete confirmation.
			savedViews: [],
			savedViewsLoading: false,
			showSaveViewDialog: false,
			viewPendingDelete: null,
		}
	},

	computed: {
		/**
		 * Whether the host manifest editor is in edit mode (unwraps the injected
		 * `cnEditingBody`, which may be a Vue ref or a plain boolean). Drives the
		 * in-header config cog.
		 *
		 * @return {boolean}
		 */
		isEditMode() {
			const e = this.cnEditingBody
			return !!(e && typeof e === 'object' && 'value' in e ? e.value : e)
		},
		/**
		 * Effective customComponents registry — the explicit prop wins
		 * over the injected `cnCustomComponents`. Mirrors the priority
		 * used by `cardComponent` resolution and `actions[].handler`
		 * dispatch.
		 *
		 * @return {object}
		 */
		resolvedCustomComponents() {
			return this.customComponents || this.cnCustomComponents || {}
		},
		/**
		 * Merged page-level header actions: drops reserved ids and
		 * resolves declarative `handler` keywords (`navigate` / `emit`
		 * / `none` / registry name) to either a function or
		 * no-handler (emit-only) entries. Function-typed handlers are
		 * passed through untouched. The `none` keyword sets
		 * `_dispatchSuppress: true` and provides a no-op function so
		 * the bar still shows a clickable item.
		 *
		 * @return {Array<object>}
		 */
		mergedHeaderActions() {
			const reserved = new Set(['refresh', 'import', 'export', 'copy', 'delete'])
			const merged = []
			for (const entry of this.headerActions || []) {
				if (entry && reserved.has(entry.id)) {
					// eslint-disable-next-line no-console
					console.warn(`CnIndexPage: headerActions[].id "${entry.id}" is reserved by the built-in bar; dropping entry`)
					continue
				}
				merged.push(this.resolveHeaderHandler(entry))
			}
			return merged
		},
		// ── Self-fetch ↔ consumer-managed: the "effective" source of each
		//    list datum is the useListView instance in self-fetch mode, the
		//    prop otherwise. The template binds to these.
		/** True when self-fetch mode is active and the useListView instance exists. */
		isSelfFetchMode() { return this.isSelfFetch && !!this.list },
		/** Rows: store collection in self-fetch mode, else the `objects` prop. */
		effectiveObjects() { return this.isSelfFetchMode ? (this.list.objects.value || []) : this.objects },
		/**
		 * Rows handed to the table / card grid — `effectiveObjects` re-sorted by
		 * the declarative `defaultSort` spec whenever no explicit user column
		 * sort is active. A live `sortKey` (user clicked a header, or one was
		 * passed in) takes over and this falls through to the unsorted rows so
		 * the server / prop order wins. No-op when `defaultSort` is empty.
		 *
		 * @return {object[]}
		 */
		displayObjects() {
			if (!this.defaultSort || this.defaultSort.length === 0) return this.effectiveObjects
			if (this.effectiveSortKey) return this.effectiveObjects
			return multiKeySort(this.effectiveObjects, this.defaultSort)
		},

		/**
		 * Whether the `map` segment is offered in the view toggle. An explicit
		 * `viewModes` whitelist wins; otherwise map is available iff `mapConfig`
		 * carries at least one field. Cards/table are always available.
		 *
		 * @return {boolean}
		 */
		showMapSegment() {
			if (Array.isArray(this.viewModes)) return this.viewModes.includes('map')
			return Object.keys(this.mapConfig || {}).length > 0
		},

		/**
		 * The base view-toggle segments (cards/table/list) passed to CnActionsBar.
		 * Beta's explicit `viewModes` whitelist wins when set; otherwise the
		 * `availableViewModes` list. Map is excluded here — it's added by the
		 * actions bar via the `showMap` bridge driven by `showMapSegment`.
		 *
		 * @return {Array<string>} The ordered toggle segments minus 'map'.
		 */
		effectiveToggleModes() {
			const list = (Array.isArray(this.viewModes) && this.viewModes.length)
				? this.viewModes
				: this.availableViewModes
			return list.filter((m) => m !== 'map')
		},

		/**
		 * The CnFolderSidebar source. A `register` source is fetched by this
		 * component and handed to CnFolderSidebar as a `custom` folder list.
		 *
		 * @return {string} The resolved CnFolderSidebar source.
		 */
		folderSidebarSource() {
			const s = this.folderSidebar && this.folderSidebar.source
			return (s === 'register' || !s) ? 'custom' : s
		},

		/**
		 * The folder list for CnFolderSidebar's custom source: register-fetched
		 * objects (source:'register') or the explicit `folders` (source:'custom').
		 * Empty for the field/files sources, which derive their own list.
		 *
		 * @return {Array<object>} The folder list.
		 */
		folderSidebarFolders() {
			if (!this.folderSidebar) return []
			if (this.folderSidebar.source === 'register') return this.folderRegisterList
			return this.folderSidebar.folders || []
		},

		/**
		 * id/name field names passed to CnFolderSidebar for the custom folder
		 * list. The `register` source is pre-mapped to `{ id, name }` by
		 * `loadFolderRegister`, so it uses the plain keys; a `custom` source
		 * passes the objects through untouched and honours the config's fields.
		 *
		 * @return {string} The id field key.
		 */
		folderPassthroughIdField() {
			if (this.folderSidebar && this.folderSidebar.source === 'register') return 'id'
			return (this.folderSidebar && this.folderSidebar.idField) || 'id'
		},

		/**
		 * @return {string} The name field key for CnFolderSidebar's custom list.
		 */
		folderPassthroughNameField() {
			if (this.folderSidebar && this.folderSidebar.source === 'register') return 'name'
			return (this.folderSidebar && this.folderSidebar.nameField) || 'name'
		},

		/**
		 * Inline GeoJSON markers for the map view, built from the CURRENT filtered
		 * `displayObjects` using `mapConfig`. Each feature stashes the row's
		 * `rowKey` in `properties` so a marker click can resolve back to its source
		 * row. Rows without finite, resolvable geometry are skipped silently.
		 *
		 * @return {{ features: object[], popupField: (string|undefined) }}
		 */
		mapMarkers() {
			const features = []
			for (const row of this.displayObjects) {
				const geometry = this.resolveRowGeometry(row)
				if (!geometry) continue
				features.push({
					type: 'Feature',
					geometry,
					properties: {
						[this.rowKey]: row[this.rowKey],
						...(this.mapConfig.popupField ? { [this.mapConfig.popupField]: row[this.mapConfig.popupField] } : {}),
					},
				})
			}
			return { features, popupField: this.mapConfig.popupField }
		},

		/**
		 * Extra (non-background) map layers — WMS / WFS / GeoJSON overlays declared in
		 * `mapConfig.layers`. The background map comes from `mapBasemaps` instead, so
		 * this is empty unless the consumer configured overlays.
		 *
		 * @return {Array<object>}
		 */
		mapLayers() {
			if (Array.isArray(this.mapConfig.layers) && this.mapConfig.layers.length > 0) {
				return this.mapConfig.layers
			}
			return []
		},

		/**
		 * Switchable background maps.
		 *
		 * Defaults to OpenStreetMap standard ONLY. Every extra basemap is an `<img>`
		 * load from a third-party host, which a Nextcloud app's Content-Security-Policy
		 * (`img-src`) blocks unless that app explicitly allowlists the host — so a
		 * richer default would ship dead options to consumers that never widened their
		 * CSP. Apps that want a switcher declare the set in `mapConfig.basemaps` AND
		 * allowlist those hosts (see Procest's `relaxCspForMapTiles()`).
		 *
		 * @return {Array<object>}
		 */
		mapBasemaps() {
			if (Array.isArray(this.mapConfig.basemaps) && this.mapConfig.basemaps.length > 0) {
				return this.mapConfig.basemaps
			}
			return [{
				name: t('nextcloud-vue', 'Standard'),
				url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				attribution: '© OpenStreetMap contributors',
			}]
		},

		/**
		 * Initial map centre `[lat, lng]`. Uses the centroid of the plotted markers
		 * when any exist (CnMapWidget's autoFit then tightens to the bounds); falls
		 * back to `mapConfig.center`, then a neutral world view when the set is empty.
		 *
		 * @return {[number, number]}
		 */
		mapCenter() {
			const feats = this.mapMarkers.features
			if (feats.length > 0) {
				let sumLat = 0
				let sumLng = 0
				for (const f of feats) {
					const _p = this.firstLatLng(f.geometry); if (!_p) continue; sumLng += _p.lng
					sumLat += _p.lat
				}
				return [sumLat / feats.length, sumLng / feats.length]
			}
			if (Array.isArray(this.mapConfig.center) && this.mapConfig.center.length === 2) {
				return this.mapConfig.center
			}
			return [0, 0]
		},
		/** Loading flag: store loading in self-fetch mode, else the `loading` prop. */
		effectiveLoading() { return this.isSelfFetchMode ? !!this.list.loading.value : this.loading },
		/**
		 * Refresh-spinner flag for the Actions menu: the `refreshing` prop
		 * OR (self-fetch mode) the internally-tracked refresh. Lets manifest
		 * and self-fetch pages spin the Refresh action without the host
		 * wiring `:refreshing` (it has no fetch promise to await).
		 */
		effectiveRefreshing() { return this.refreshing || this.internalRefreshing },
		/** Pagination: store pagination in self-fetch mode, else the `pagination` prop. */
		effectivePagination() { return this.isSelfFetchMode ? this.list.pagination.value : this.pagination },
		/** Resolved schema OBJECT (for column generation / icons / labels). */
		effectiveSchema() {
			if (this.isSelfFetchMode) return this.list.schema.value
			return (this.schema && typeof this.schema === 'object') ? this.schema : null
		},

		/**
		 * Schema slug for the export-leaf URL — the `schema` prop directly
		 * when it's a string (self-fetch mode's precondition), else the
		 * resolved schema object's `slug`/`name`.
		 */
		exportSchemaSlug() {
			if (typeof this.schema === 'string') return this.schema
			return this.effectiveSchema?.slug || this.effectiveSchema?.name || ''
		},

		/**
		 * Whether the native Export menu renders in the toolbar: opt-in via
		 * `allowExport` AND the resolved schema flagged `exportable: true`.
		 * Default-safe — false unless both hold.
		 */
		showExportMenu() {
			return Boolean(this.allowExport) && Boolean(this.effectiveSchema?.exportable) && Boolean(this.register) && Boolean(this.exportSchemaSlug)
		},

		/**
		 * The signed-in NC user id — passed to CnSavedViewsControl to gate
		 * the per-view delete affordance (saved-views-ui).
		 *
		 * @return {string}
		 */
		currentSavedViewsUserId() {
			const user = getCurrentUser()
			return (user && user.uid) || ''
		},

		/**
		 * Confirmation message for the delete-saved-view dialog.
		 *
		 * @return {string}
		 */
		deleteViewMessage() {
			if (!this.viewPendingDelete) return ''
			return t('nextcloud-vue', 'Delete the view "{name}"? This cannot be undone.', { name: this.viewPendingDelete.name })
		},

		/** Sort key / order: list state in self-fetch mode, else the props. */
		effectiveSortKey() { return this.isSelfFetchMode ? this.list.sortKey.value : this.sortKey },
		effectiveSortOrder() { return this.isSelfFetchMode ? this.list.sortOrder.value : this.sortOrder },
		/**
		 * Ordered multi-column sort state fed to CnDataTable: the self-fetch
		 * list's `sortKeys` in self-fetch mode, else the host-controlled
		 * `sortKeys` prop.
		 *
		 * @return {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		effectiveSortKeys() { return this.isSelfFetchMode ? (this.list.sortKeys.value || []) : this.sortKeys },
		/** Search term / visible columns / active facet filters for the embedded sidebar. */
		effectiveSearchValue() { return this.isSelfFetchMode ? (this.list.searchTerm.value || '') : (this.searchValue || '') },
		effectiveVisibleColumns() { return this.isSelfFetchMode ? this.list.visibleColumns.value : this.visibleColumns },
		effectiveActiveFilters() { return this.isSelfFetchMode ? (this.list.activeFilters.value || {}) : (this.activeFilters || {}) },

		/**
		 * Enum schema columns offered in the header filter menu: one entry per
		 * visible column whose schema property declares an `enum`, with its
		 * values. Empty (so the menu hides) when there is no schema or no enum
		 * column. Drives the `showFilterMenu` funnel button.
		 *
		 * @return {Array<{ key: string, label: string, values: string[] }>}
		 */
		filterableFields() {
			const props = this.effectiveSchema?.properties || {}
			const out = []
			for (const col of this.tableColumns) {
				const key = typeof col === 'string' ? col : col.key
				const def = props[key] || {}
				const colObj = typeof col === 'object' ? col : {}
				// Source the filter values, in priority order: schema enum, a
				// column `enum` hint, or a badge column's colorMap keys (so a
				// status column stays filterable even when the runtime schema
				// doesn't carry the enum).
				let values = null
				if (Array.isArray(def.enum) && def.enum.length) {
					values = def.enum
				} else if (Array.isArray(colObj.enum) && colObj.enum.length) {
					values = colObj.enum
				} else if (colObj.widget === 'badge' && colObj.widgetProps && colObj.widgetProps.colorMap) {
					values = Object.keys(colObj.widgetProps.colorMap)
				}
				if (values && values.length) {
					out.push({ key, label: colObj.label || def.title || key, values: values.map((v) => String(v)) })
				}
			}
			return out
		},
		/**
		 * Ordered column definitions the sidebar's Columns tab governs:
		 * schema-derived columns, the built-in Metadata group (when shown),
		 * and any external columnGroups. Mirrors CnIndexSidebar's column
		 * universe, and doubles as the source of definitions for columns the
		 * user enables that aren't in the configured `columns` list (metadata
		 * fields, schema properties beyond the default set).
		 */
		governedColumns() {
			const defs = []
			if (this.effectiveSchema) {
				defs.push(...columnsFromSchema(this.effectiveSchema, {}))
				if (this.resolvedSidebar.showMetadata !== false) {
					defs.push(...METADATA_COLUMNS)
				}
			}
			const groups = this.resolvedSidebar.columnGroups || []
			groups.forEach((g) => defs.push(...(g.columns || [])))
			return defs
		},

		/**
		 * Set of keys the sidebar governs (see `governedColumns`). Used so
		 * tableColumns only hides columns the user can actually toggle back
		 * on — custom columns outside this set are never silently dropped.
		 */
		sidebarGovernedColumnKeys() {
			return new Set(this.governedColumns.map((c) => c.key))
		},

		/**
		 * Columns handed to CnDataTable. Starts from the `columns` prop (with any
		 * `aggregate` block lacking a `register` defaulted to this page's `register`
		 * slug, so manifests can omit `aggregate.register`). When a visible-column
		 * set exists, governed columns the user toggled off are hidden, and governed
		 * columns the user toggled on that aren't already in the list (metadata
		 * fields, extra schema properties) are appended using their sidebar
		 * definitions. Custom columns outside the sidebar's universe are untouched.
		 */
		tableColumns() {
			const reg = typeof this.register === 'string' && this.register ? this.register : undefined
			let cols = this.columns || []
			if (reg) {
				cols = cols.map((c) => (
					c && c.aggregate && !c.aggregate.register
						? { ...c, aggregate: { ...c.aggregate, register: reg } }
						: c
				))
			}
			const visible = this.effectiveVisibleColumns
			if (!Array.isArray(visible)) return cols

			const governed = this.sidebarGovernedColumnKeys
			cols = cols.filter((c) => {
				const key = typeof c === 'string' ? c : c.key
				return !governed.has(key) || visible.includes(key)
			})

			const present = new Set(cols.map((c) => (typeof c === 'string' ? c : c.key)))
			const byKey = new Map(this.governedColumns.map((c) => [c.key, c]))
			visible.forEach((key) => {
				if (present.has(key)) return
				const def = byKey.get(key)
				if (def) {
					cols.push({ ...def })
					present.add(key)
				}
			})
			return cols
		},

		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			if (this.icon) return this.icon
			return this.effectiveSchema?.icon || ''
		},

		/** Built-in row actions based on show*Action props */
		defaultActions() {
			return buildDefaultActions({
				flags: {
					view: this.showViewAction,
					edit: this.showEditAction,
					copy: this.showCopyAction,
					del: this.showDeleteAction,
				},
				// The View action is always an eye — a universal "view" affordance,
				// independent of the object's schema icon (which is the header icon).
				viewIcon: Eye,
				handlers: {
					onView: (row) => this.onView(row),
					onEdit: (row) => {
						this.editItem = row
						this.showFormDialogVisible = true
					},
					onCopy: (row) => {
						this.actionTargetItem = row
						this.showSingleCopyDialog = true
					},
					onDelete: (row) => {
						this.actionTargetItem = row
						this.showSingleDeleteDialog = true
					},
				},
			})
		},

		/**
		 * Effective customComponents registry — explicit prop wins over
		 * the injected ancestor registry. Used to:
		 * - Resolve `actions[].handler` registry names (REQ-MAD-3,
		 *   manifest-actions-dispatch).
		 * - Resolve the `cardComponent` name for card-grid view (REQ-MCI,
		 *   manifest-card-index).
		 *
		 * @return {object}
		 */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
		},

		/**
		 * Merged actions: app-provided first, then built-in defaults.
		 *
		 * REQ-MAD-3 / REQ-MAD-4 / REQ-MAD-5 / REQ-MAD-6 / REQ-MAD-7
		 * (manifest-actions-dispatch) — for any action whose `handler`
		 * is a string, resolve it through `resolveHandler()` so
		 * `CnRowActions` sees the same `{ handler: fn }` shape it does
		 * for built-in defaults. Function-typed handlers (the existing
		 * runtime path) pass through untouched.
		 */
		mergedActions() {
			const ctx = {
				router: this.$router,
				rowKey: this.rowKey,
				customComponents: this.effectiveCustomComponents,
			}
			return [...this.actions.map((a) => dispatchAction(a, ctx)), ...this.defaultActions]
		},

		hasRowActions() {
			return this.$slots['row-actions'] || this.mergedActions.length > 0
		},

		/** Whether all visible items are selected */
		allSelected() {
			if (this.effectiveObjects.length === 0 || this.internalSelectedIds.length === 0) return false
			return this.effectiveObjects.every((o) => this.internalSelectedIds.includes(o[this.rowKey]))
		},

		/** Full objects for the selected IDs (used by mass action dialogs) */
		selectedObjects() {
			return this.effectiveObjects.filter((o) => this.internalSelectedIds.includes(o[this.rowKey]))
		},

		/** Column slot names that the parent has provided (for pass-through) */
		slotColumns() {
			return Object.keys(this.$slots)
				.filter((name) => name.startsWith('column-'))
				.map((name) => name.replace('column-', ''))
		},

		/** Add button label — derived from schema.title if not explicitly set */
		resolvedAddLabel() {
			if (this.addLabel) return this.addLabel
			return 'Add ' + (this.effectiveSchema?.title || 'Item')
		},

		/**
		 * Effective sidebar configuration. Returns the sidebar config object
		 * when `sidebar.enabled === true`, otherwise an `{ enabled: false }`
		 * stub so the embedded CnIndexSidebar is not mounted.
		 */
		resolvedSidebar() {
			if (this.sidebar && this.sidebar.enabled !== false) {
				return this.sidebar
			}
			return { enabled: false }
		},

		/**
		 * Whether a Search/Columns sidebar is configured for this page (mirrors
		 * the mount gate used by `shouldRenderInlineSidebar` /
		 * `publishHoistedSidebar`). Drives the actions-bar toggle visibility.
		 *
		 * @return {boolean}
		 */
		hasSidebar() {
			return !!this.resolvedSidebar.enabled && this.resolvedSidebar.show !== false
		},

		/** Search props forwarded to the embedded CnIndexSidebar (defaults applied per CnIndexSidebar). */
		sidebarSearchProps() {
			return (this.sidebar && this.sidebar.search) || {}
		},

		/**
		 * Whether the embedded sidebar should render inline inside the
		 * cn-index-page wrapper. False when CnAppRoot has provided a
		 * real `cnIndexSidebarConfig` holder — in that case CnAppRoot
		 * mounts the sidebar at NcContent level (correct NcAppSidebar
		 * parent). True when no CnAppRoot ancestor exists (legacy
		 * apps), so the embedded sidebar still renders even though
		 * its visual position is sub-optimal.
		 */
		shouldRenderInlineSidebar() {
			if (!this.resolvedSidebar.enabled || this.resolvedSidebar.show === false) {
				return false
			}
			// CnAppRoot ancestor present → hoist takes over.
			return !this.cnHostsIndexSidebar
		},

		/**
		 * Snapshot of every prop the hoisted CnIndexSidebar needs.
		 * Reactive — the sidebar in CnAppRoot re-renders whenever
		 * any of these change.
		 */
		hoistedSidebarProps() {
			return {
				open: this.sidebarOpen,
				schema: this.effectiveSchema,
				title: this.title,
				icon: this.resolvedIcon,
				searchValue: this.effectiveSearchValue,
				visibleColumns: this.effectiveVisibleColumns,
				activeFilters: this.effectiveActiveFilters,
				columnGroups: this.resolvedSidebar.columnGroups || [],
				facetData: this.resolvedSidebar.facets || {},
				showMetadata: this.resolvedSidebar.showMetadata !== false,
				...this.sidebarSearchProps,
			}
		},

		/**
		 * Resolved card component for card-grid view mode. Returns
		 * `null` when `cardComponent` is empty OR when the name is not
		 * in the registry (the latter also logs `console.warn`).
		 *
		 * `null` makes the template fall through to `CnCardGrid`'s
		 * default `CnObjectCard` rendering — exactly the legacy path.
		 *
		 * @return {object|null}
		 */
		resolvedCardComponent() {
			if (!this.cardComponent) {
				return null
			}
			const resolved = this.effectiveCustomComponents[this.cardComponent]
			if (!resolved) {
				console.warn(`[CnIndexPage] cardComponent "${this.cardComponent}" not found in customComponents registry. Falling back to CnObjectCard.`)
				return null
			}
			return resolved
		},

		/**
		 * Custom list-row component resolved against the customComponents
		 * registry, or `null` when `listComponent` is empty / unknown (default
		 * `CnObjectRow` is used). Mirrors `resolvedCardComponent`.
		 *
		 * @return {?object} The resolved component, or null.
		 */
		resolvedListComponent() {
			if (!this.listComponent) {
				return null
			}
			const resolved = this.effectiveCustomComponents[this.listComponent]
			if (!resolved) {
				console.warn(`[CnIndexPage] listComponent "${this.listComponent}" not found in customComponents registry. Falling back to CnObjectRow.`)
				return null
			}
			return resolved
		},
	},

	watch: {
		viewMode(val) {
			this.currentViewMode = val
		},

		selectedIds(val) {
			this.internalSelectedIds = [...val]
		},

		/**
		 * Tenant change pipeline (multi-tenancy-context).
		 * When the bound `activeOrganisation` prop changes, push the
		 * new UUID into the bound object store (when there is one)
		 * AND into the shared `useTenantContext()` context so every
		 * other tenant-aware surface stays consistent.
		 */
		activeOrganisation: {
			handler(next) {
				if (!next) return
				const uuid = next.uuid || null
				// Update the object store when one is bound — sub-store
				// methods may not exist on non-OR stores; guard with typeof.
				const store = this.list?.store ?? this.selfObjectStore ?? null
				if (store && typeof store.setActiveTenantOrganisation === 'function') {
					store.setActiveTenantOrganisation(uuid)
				}
			},
			deep: false,
		},

		/**
		 * Keep the hoisted sidebar in sync with reactive props.
		 * The watcher fires whenever any of the props snapshot
		 * (`hoistedSidebarProps`) changes; we re-write the entire
		 * config so Vue's NcAppSidebar in CnAppRoot picks up the
		 * new values. Cheap because it's just an object swap.
		 */
		hoistedSidebarProps: {
			handler() {
				this.publishHoistedSidebar()
			},

			deep: false,
		},

		shouldRenderInlineSidebar() {
			// When the gate flips (e.g. sidebar.show toggled), keep
			// the hoist in sync.
			this.publishHoistedSidebar()
		},

		// Re-push AI context when relevant props change
		register() { this.pushAiContext() },
		schema() { this.pushAiContext() },
		// In self-fetch mode, a same-component route-param change (e.g. the
		// `:id` of `/forms/:id/submissions`) must re-resolve `config.filter`
		// and re-fetch. useListView's `fixedFilters` getter re-reads $route on
		// each fetch; this watcher triggers the re-fetch.
		'$route.params': {
			deep: true,
			handler() {
				if (this.isSelfFetchMode && typeof this.list.refresh === 'function') this.list.refresh(1)
			},
		},
		// A same-path `$route.query` change (e.g. a dashboard deep-link
		// `/cases?caseType=X`) must also re-fetch — `fixedFilters` merges the
		// query into the fetch (see useSelfFetchList.resolveQueryFilters).
		'$route.query': {
			deep: true,
			handler() {
				if (this.isSelfFetchMode && typeof this.list.refresh === 'function') this.list.refresh(1)
			},
		},

		// When `?action=create` is injected into the query via router navigation
		// (e.g. a "New Case" button on another page), auto-open the create dialog
		// so the user lands on the index page with the form already open.
		'$route.query.action': {
			handler(val) {
				if (val === 'create') this.maybeOpenCreateFromQuery()
			},
		},
	},

	mounted() {
		this.publishHoistedSidebar()
		this.pushAiContext()
		this.maybeOpenCreateFromQuery()
		if (this.folderSidebar) {
			this.loadFolderRegister()
			// Reflect a deep-link filter (e.g. ?caseType=<id>) as the active folder.
			const key = this.folderSidebar.filterField || this.folderSidebar.field
			const active = key && this.effectiveActiveFilters[key]
			if (active) this.selectedFolderId = Array.isArray(active) ? active[0] : active
		}
	},

	created() {
		this.pushAiContext()
		if (this.allowSavedViews) this.fetchSavedViews()
		this.selfActions = createSelfModeActions({
			isSelfFetchMode: () => this.isSelfFetchMode,
			selfObjectStore: () => this.selfObjectStore,
			selfObjectType: () => this.selfObjectType,
			list: () => this.list,
			register: () => this.register,
			schema: () => this.schema,
			effectiveObjects: () => this.effectiveObjects,
			effectiveSchema: () => this.effectiveSchema,
			massActionNameField: () => this.massActionNameField,
			editItem: () => this.editItem,
			emit: (event, payload) => this.$emit(event, payload),
			setResults: {
				singleDelete: (r) => this.setSingleDeleteResult(r),
				massDelete: (r) => this.setMassDeleteResult(r),
				singleCopy: (r) => this.setSingleCopyResult(r),
				massCopy: (r) => this.setMassCopyResult(r),
				massImport: (r) => this.setImportResult(r),
				massExport: (r) => this.setExportResult(r),
				form: (r) => this.setFormResult(r),
				formValidation: (fieldErrors, message) => this.setFormValidationErrors(fieldErrors, message),
			},
		})
	},

	beforeUnmount() {
		// Clear the holder so the hoisted sidebar disappears when
		// the user navigates away from the index page.
		if (this.cnHostsIndexSidebar && this.cnIndexSidebarConfig) {
			this.cnIndexSidebarConfig.value = null
		}
		applyAiContext(this.cnAiContext, 'custom')
	},

	methods: {
		/**
		 * Resolve a declarative `headerActions[]` entry's `handler`
		 * field into the final dispatchable shape. Mirrors the
		 * row-level `actions[].handler` keyword set used by
		 * manifest-actions-dispatch — `navigate`, `emit`, `none`, or a
		 * registry name (looked up against `resolvedCustomComponents`).
		 *
		 * @param {object} entry Raw headerActions entry.
		 * @return {object} Possibly-mutated copy: function-typed
		 *   handlers untouched; `'emit'` and unknown registry names
		 *   strip the `handler` (emit-only fall-through); `'navigate'`
		 *   becomes a `$router.push` thunk (with the entry's literal
		 *   `params` map when present); `'none'` becomes a no-op +
		 *   `_dispatchSuppress: true`; a registry name resolves to a
		 *   `fn({ actionId })` thunk.
		 */
		resolveHeaderHandler(entry) {
			if (!entry) return entry
			const handler = entry.handler
			if (typeof handler === 'function') {
				return { ...entry }
			}
			if (typeof handler !== 'string') {
				// No handler declared — emit-only fall-through.
				return { ...entry }
			}
			if (handler === 'navigate') {
				if (!entry.route) {
					// eslint-disable-next-line no-console
					console.warn(`CnIndexPage: headerActions[].id "${entry.id}" handler:"navigate" requires "route"; falling back to emit-only`)
					const { handler: _ignored, ...rest } = entry
					return { ...rest }
				}
				const route = entry.route
				const router = this.$router
				// Literal params let a header action navigate to a detail route
				// with fixed params, e.g. a "New X" button → `{ id: "new" }`.
				const params = (entry.params && typeof entry.params === 'object') ? entry.params : null
				const out = { ...entry }
				out.handler = () => {
					if (router && typeof router.push === 'function') {
						router.push(params ? { name: route, params } : { name: route })
					}
				}
				return out
			}
			if (handler === 'emit') {
				const { handler: _ignored, ...rest } = entry
				return { ...rest }
			}
			if (handler === 'none') {
				return { ...entry, handler: () => {}, _dispatchSuppress: true }
			}
			// Registry name lookup.
			const resolved = this.resolvedCustomComponents[handler]
			if (typeof resolved === 'function') {
				const id = entry.id
				return { ...entry, handler: () => resolved({ actionId: id }) }
			}
			if (resolved !== undefined && resolved !== null) {
				// eslint-disable-next-line no-console
				console.warn(`CnIndexPage: headerActions[].handler "${handler}" resolved to a non-function in customComponents; falling back to emit-only`)
				const { handler: _ignored, ...rest } = entry
				return { ...rest }
			}
			// Unknown registry name — silent emit-only fall-through.
			const { handler: _ignored, ...rest } = entry
			return { ...rest }
		},
		/**
		 * Click dispatch from CnActionsBar's `@header-action`. Looks
		 * up the resolved entry by id, invokes its handler if any,
		 * and (unless the entry is `'none'`-suppressed) emits
		 * `@header-action({ action: id, id })` upward.
		 *
		 * @param {{action: string, id: string}} payload Bar payload.
		 */
		onHeaderAction(payload) {
			const id = payload && (payload.id ?? payload.action)
			const entry = this.mergedHeaderActions.find((e) => e.id === id)
			if (entry && typeof entry.handler === 'function') {
				entry.handler()
			}
			if (entry && entry._dispatchSuppress) {
				return
			}
			this.$emit('header-action', { action: id, id })
		},
		pushAiContext() {
			applyAiContext(this.cnAiContext, 'index', {
				register: this.register,
				schema: this.schema,
				effectiveSchema: this.effectiveSchema,
			})
		},

		// ── List-event handlers ──────────────────────────────────────────────
		// In self-fetch mode each routes to the useListView instance (re-fetch);
		// in every mode the event still bubbles via $emit so a host that wants
		// to observe (or take over) keeps working — unchanged for consumers.
		/**
		 * @param {string} value Search term from the sidebar / header.
		 * @return {void}
		 */
		onSearchEvent(value) {
			if (this.isSelfFetchMode && typeof this.list.onSearch === 'function') this.list.onSearch(value)
			this.$emit('search', value)
		},

		/**
		 * Quick-filter tab change. Updates the active index — the `setup()`
		 * watcher then triggers `list.refresh(1)` so the new tab's filter
		 * flows into the next fetch.
		 *
		 * @param {number} index Zero-based tab index (from CnQuickFilterBar).
		 * @return {void}
		 */
		onQuickFilterChange(index) {
			// `activeQuickFilterIndex` is a setup-returned ref; the
			// Vue 2 ref-unwrap proxy makes plain assignment work.
			this.activeQuickFilterIndex = index
			this.$emit('quick-filter-change', index)
		},

		/**
		 * Multi-select quick-filter change (`quickFilterMultiple`). Updates the
		 * selected-index array; the `setup()` watcher re-fetches with the
		 * OR-ed union of the selected tabs' filters.
		 *
		 * @param {number[]} indices Selected tab indices (from CnQuickFilterBar).
		 * @return {void}
		 */
		onQuickFilterMultiChange(indices) {
			this.selectedQuickFilterIndices = Array.isArray(indices) ? indices : []
			this.$emit('quick-filter-change', this.selectedQuickFilterIndices)
		},

		/**
		 * @param {{key: string, order: string, keys?: Array<{key: string, order: string}>}} payload Sort change from CnDataTable.
		 * @return {void}
		 */
		onSortEvent(payload) {
			if (this.isSelfFetchMode && typeof this.list.onSort === 'function') this.list.onSort(payload)
			if (this.isSelfFetchMode) {
				const keys = Array.isArray(payload.keys)
					? payload.keys
					: (payload.key ? [{ key: payload.key, order: payload.order || 'asc' }] : [])
				this.persistSortToRoute(keys)
			}
			this.$emit('sort', payload)
		},

		/**
		 * Persist the active multi-column sort to `$route.query._order`
		 * (JSON-encoded ordered array) so a reload or a shared/bookmarked
		 * link reproduces the same sort. An empty `keys` list removes the
		 * param entirely. Best-effort: a duplicate-navigation rejection
		 * (same resulting path/query) is swallowed, matching every other
		 * `$router.replace` call in this component.
		 *
		 * @param {Array<{key: string, order: string}>} keys The active ordered sort-key list.
		 * @return {void}
		 */
		persistSortToRoute(keys) {
			if (!this.$router || !this.$route) return
			const query = { ...this.$route.query }
			if (Array.isArray(keys) && keys.length > 0) {
				query._order = JSON.stringify(keys)
			} else {
				delete query._order
			}
			this.$router.replace({ query }).catch(() => {})
		},

		/**
		 * @param {number} page Requested page from CnPagination.
		 * @return {void}
		 */
		onPageEvent(page) {
			if (this.isSelfFetchMode && typeof this.list.onPageChange === 'function') this.list.onPageChange(page)
			this.$emit('page-changed', page)
		},

		/**
		 * @param {{key: string, values: Array}} payload Facet-filter change from the sidebar.
		 * @return {void}
		 */
		onFilterEvent(payload) {
			if (this.isSelfFetchMode && typeof this.list.onFilterChange === 'function') this.list.onFilterChange(payload.key, payload.values)
			this.$emit('filter-change', payload)
		},

		/**
		 * Folder selection from the opt-in folder sidebar: filter the list by the
		 * config's `filterField` (or `field`); a null id clears it.
		 *
		 * @param {(string|number|null)} folderId The selected folder id (null = All).
		 * @return {void}
		 */
		onFolderSelect(folderId) {
			this.selectedFolderId = folderId
			const key = (this.folderSidebar && (this.folderSidebar.filterField || this.folderSidebar.field)) || ''
			if (key) {
				this.onFilterEvent({ key, values: (folderId === null || folderId === undefined) ? [] : [folderId] })
			}
			/**
			 * @event folder-change Emitted when a folder is selected in the sidebar.
			 * @type {(string|number|null)} The selected folder id (null = All).
			 */
			this.$emit('folder-change', folderId)
		},

		/**
		 * Load the folder list from an OpenRegister register/schema for a
		 * `folderSidebar.source === 'register'` config. Maps each object to
		 * `{ id: <idField|@self.uuid>, name: <nameField|title> }`.
		 *
		 * @return {Promise<void>}
		 */
		async loadFolderRegister() {
			const cfg = this.folderSidebar
			if (!cfg || cfg.source !== 'register' || !cfg.register || !cfg.schema) return
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: cfg.register, schema: cfg.schema })
				const res = await axios.get(url, { params: { _limit: cfg.limit || 200 } })
				const rows = (res && res.data && (res.data.results || res.data)) || []
				const idField = cfg.idField || '@self.uuid'
				const nameField = cfg.nameField || 'title'
				this.folderRegisterList = rows
					.map((row) => ({ id: this.getByPath(row, idField), name: this.getByPath(row, nameField) || this.getByPath(row, idField) }))
					.filter((f) => f.id != null)
					.sort((a, b) => String(a.name).localeCompare(String(b.name)))
			} catch (e) {
				console.error('[CnIndexPage] failed to load folder register', e)
				this.folderRegisterList = []
			}
		},

		/**
		 * Whether a given value is currently an active facet filter for a field.
		 *
		 * @param {string} key The schema field key.
		 * @param {string} val The enum value.
		 * @return {boolean} True when the value is in the active filter set.
		 */
		isFilterActive(key, val) {
			const current = this.effectiveActiveFilters[key]
			return Array.isArray(current) && current.includes(val)
		},

		/**
		 * Toggle one enum value in a field's facet filter, then apply it through
		 * the standard filter path (`onFilterEvent`).
		 *
		 * @param {string} key The schema field key.
		 * @param {string} val The enum value to toggle.
		 * @return {void}
		 */
		toggleFilter(key, val) {
			const current = Array.isArray(this.effectiveActiveFilters[key]) ? this.effectiveActiveFilters[key] : []
			const values = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
			this.onFilterEvent({ key, values })
		},

		/**
		 * Whether a governed column is currently visible. A null visible-column set
		 * means "all governed columns visible" (the initial state).
		 *
		 * @param {string} key The column key.
		 * @return {boolean} True when the column is shown in the table.
		 */
		isColumnVisible(key) {
			const visible = this.effectiveVisibleColumns
			return Array.isArray(visible) ? visible.includes(key) : true
		},

		/**
		 * Toggle a governed column on/off from the table-header column menu, then
		 * apply it through the same path as the sidebar (`onColumnsEvent`).
		 *
		 * @param {string} key The column key to toggle.
		 * @return {void}
		 */
		toggleColumn(key) {
			const base = Array.isArray(this.effectiveVisibleColumns)
				? this.effectiveVisibleColumns
				: this.governedColumns.map((c) => c.key)
			const next = base.includes(key) ? base.filter((k) => k !== key) : [...base, key]
			this.onColumnsEvent(next)
		},

		/**
		 * @param {Array} columns Visible-column change from the sidebar.
		 * @return {void}
		 */
		onColumnsEvent(columns) {
			if (this.isSelfFetchMode && this.list.visibleColumns) this.list.visibleColumns.value = columns
			this.$emit('columns-change', columns)
		},

		/** @return {Promise<void>} */
		async onRefreshEvent() {
			this.$emit('refresh')
			if (this.isSelfFetchMode && typeof this.list.refresh === 'function') {
				this.internalRefreshing = true
				try {
					await this.list.refresh()
				} finally {
					this.internalRefreshing = false
				}
			}
		},

		/**
		 * Publish (or clear) the embedded CnIndexSidebar config to
		 * the `cnIndexSidebarConfig` holder so CnAppRoot can mount
		 * it at NcContent level. No-op when no CnAppRoot ancestor
		 * exists — in that case `shouldRenderInlineSidebar` keeps
		 * the inline render alive.
		 */
		publishHoistedSidebar() {
			if (!this.cnHostsIndexSidebar || !this.cnIndexSidebarConfig) return
			if (!this.resolvedSidebar.enabled || this.resolvedSidebar.show === false) {
				this.cnIndexSidebarConfig.value = null
				return
			}
			this.cnIndexSidebarConfig.value = {
				component: CnIndexSidebar,
				props: this.hoistedSidebarProps,
				listeners: {
					'update:open': (val) => { this.sidebarOpen = val },
					search: (event) => this.onSearchEvent(event),
					'columns-change': (event) => this.onColumnsEvent(event),
					'filter-change': (event) => this.onFilterEvent(event),
				},
			}
		},

		/**
		 * Intercepts CnRowActions' bubbled `@action` so `handler: "none"`
		 * actions are dropped before re-emit.
		 *
		 * @param {{action: string, row: object}} payload The bubbled action payload.
		 */
		onRowAction(payload) {
			const matched = this.mergedActions.find((a) => a.label === payload.action)
			if (matched && matched._dispatchSuppress) return
			this.$emit('action', payload)
		},

		/**
		 * Row/card click: toggles selection when `selectable` (covers the custom
		 * `cardComponent` path), otherwise emits `row-click` for navigation.
		 *
		 * @param {object} row The clicked row object
		 */
		onRowClick(row) {
			if (this.selectable && !this.rowClickToView) {
				this.onSelect(this.toggleIdInArray(this.internalSelectedIds, row[this.rowKey]))
				return
			}
			/**
			 * @event row-click Emitted on a row/card click for navigation. Fires when `selectable` is false, OR when `rowClickToView` is set (selection then happens via the checkbox).
			 * @type {object} The clicked row object.
			 */
			this.$emit('row-click', row)
		},

		/**
		 * Resolve a marker click on the map back to its source row and route it
		 * through `onRowClick`, so `@row-click` fires with the identical payload a
		 * table/card click would emit — giving uniform detail-page navigation
		 * across all three view modes.
		 *
		 * @param {{ feature: object }} payload CnMapWidget marker-click payload.
		 */
		onMarkerClick(payload) {
			const feature = payload && payload.feature
			const key = feature && feature.properties ? feature.properties[this.rowKey] : undefined
			if (key === undefined || key === null) return
			const row = this.displayObjects.find((o) => o[this.rowKey] === key)
			if (row) this.onRowClick(row)
		},

		/**
		 * Extract a `{ lat, lng }` pair from a row using `mapConfig`. Prefers a
		 * GeoJSON Point on `geoField` (`coordinates: [lng, lat]`), else reads the
		 * dotted `latField` / `lngField` paths. Returns null when the geometry is
		 * missing or non-finite, so callers can skip the row.
		 *
		 * @param {object} row The source object.
		 * @return {{ lat: number, lng: number } | null}
		 */
		resolveRowLatLng(row) {
			if (!row) return null
			const cfg = this.mapConfig || {}
			if (cfg.geoField) {
				let geo = this.getByPath(row, cfg.geoField)
				// OpenRegister often stores geometry as a JSON-encoded string on
				// object metadata; parse it before reading `coordinates`.
				if (typeof geo === 'string') {
					try {
						geo = JSON.parse(geo)
					} catch {
						geo = null
					}
				}
				const coords = geo && Array.isArray(geo.coordinates) ? geo.coordinates : null
				if (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
					return { lat: Number(coords[1]), lng: Number(coords[0]) }
				}
			}
			const lat = Number(this.getByPath(row, cfg.latField))
			const lng = Number(this.getByPath(row, cfg.lngField))
			if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
			return null
		},

		/**
		 * Resolve a row's GeoJSON geometry for the map view. Prefers a full
		 * geometry on `geoField`: a Point renders as a marker, a Polygon /
		 * MultiPolygon / LineString renders as an area/line — so location cases
		 * plot as both points AND areas. `geoField` is parsed from a JSON string
		 * when OpenRegister stores it encoded. Falls back to a Point built from
		 * `latField` / `lngField`. Returns null when nothing resolvable is present.
		 *
		 * @param {object} row The source object.
		 * @return {object|null} A GeoJSON geometry object, or null.
		 */
		resolveRowGeometry(row) {
			if (!row) return null
			const cfg = this.mapConfig || {}
			const GEO_TYPES = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection']
			if (cfg.geoField) {
				let geo = this.getByPath(row, cfg.geoField)
				if (typeof geo === 'string') {
					try { geo = JSON.parse(geo) } catch { geo = null }
				}
				if (geo && GEO_TYPES.includes(geo.type)) {
					const hasShape = geo.type === 'GeometryCollection'
						? Array.isArray(geo.geometries)
						: Array.isArray(geo.coordinates)
					if (hasShape) return geo
				}
			}
			const lat = Number(this.getByPath(row, cfg.latField))
			const lng = Number(this.getByPath(row, cfg.lngField))
			if (Number.isFinite(lat) && Number.isFinite(lng)) {
				return { type: 'Point', coordinates: [lng, lat] }
			}
			return null
		},

		/**
		 * Dig out the first `[lng, lat]` coordinate pair from any GeoJSON geometry
		 * (Point, Polygon ring, GeometryCollection, …) for a rough centroid.
		 *
		 * @param {object} geometry A GeoJSON geometry.
		 * @return {{lat: number, lng: number}|null}
		 */
		firstLatLng(geometry) {
			if (!geometry) return null
			if (geometry.type === 'GeometryCollection') {
				for (const g of (geometry.geometries || [])) {
					const p = this.firstLatLng(g)
					if (p) return p
				}
				return null
			}
			let c = geometry.coordinates
			while (Array.isArray(c) && Array.isArray(c[0])) c = c[0]
			if (Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
				return { lat: Number(c[1]), lng: Number(c[0]) }
			}
			return null
		},

		/**
		 * Read a possibly-dotted property path off an object (e.g. `@self.geo.lat`).
		 * Returns undefined on any missing segment. No path = undefined.
		 *
		 * @param {object} obj The object to read from.
		 * @param {string} path Dot-separated property path.
		 * @return {*} The resolved value or undefined.
		 */
		getByPath(obj, path) {
			if (!obj || !path) return undefined
			if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path]
			return path.split('.').reduce((acc, seg) => (acc == null ? undefined : acc[seg]), obj)
		},

		/**
		 * Handle the built-in View action — emits a dedicated `view` event.
		 * Kept distinct from `row-click` because the two are conceptually
		 * different: a row click might mean select/expand/drilldown, while
		 * View always means "open the detail view of this row".
		 *
		 * @param {object} row The row whose View action was triggered
		 */
		onView(row) {
			this.$emit('view', row)
		},

		/**
		 * Handle the Add button click. If the consumer listens to @add,
		 * emit the event (backward compatible). Otherwise open the form dialog.
		 */
		onAddClick() {
			if (this.$listeners && this.$listeners.add) {
				this.$emit('add')
			} else if (this.showFormDialog) {
				this.editItem = null
				this.showFormDialogVisible = true
			}
		},

		/**
		 * Open the built-in create dialog when the route carries `?action=create`.
		 * Called on `mounted()` and whenever `$route.query.action` changes, so it
		 * works both on initial navigation and on same-page deep-links (e.g. a
		 * "New Case" button on a sibling page that routes here with the query).
		 *
		 * After opening the dialog the query param is cleared via
		 * `$router.replace` so a page refresh does not re-open it and browser
		 * history stays clean. No-op when there is no router, when `showFormDialog`
		 * is false (consumer manages its own dialog), or when the query param is
		 * absent / not `'create'`.
		 */
		maybeOpenCreateFromQuery() {
			if (!this.$route || !this.$route.query || this.$route.query.action !== 'create') return
			if (!this.showFormDialog) return
			this.openFormDialog(null)
			// Clear the query param; guard against redundant navigation errors.
			if (this.$router) {
				const query = { ...this.$route.query }
				delete query.action
				const nav = this.$router.replace({ query })
				// $router.replace returns a Promise in Vue Router 3 but may
				// return undefined in mocked / legacy environments — guard.
				if (nav && typeof nav.catch === 'function') nav.catch(() => {})
			}
		},

		/**
		 * Handle view mode toggle.
		 *
		 * @param {string} mode 'table' or 'cards'
		 */
		onViewModeChange(mode) {
			this.currentViewMode = mode
			this.$emit('view-mode-change', mode)
		},

		/**
		 * Handle selection changes from CnDataTable/CnCardGrid.
		 * Updates internal state and re-emits for parent.
		 *
		 * @param {Array} ids Array of selected row IDs
		 */
		onSelect(ids) {
			this.internalSelectedIds = ids
			this.$emit('select', ids)
		},

		// --- Mass action handlers ---

		async onMassDeleteConfirm(ids) {
			if (await this.selfActions.handleMassDelete(ids)) return
			this.$emit('mass-delete', ids)
		},

		async onMassCopyConfirm(payload) {
			if (await this.selfActions.handleMassCopy(payload)) return
			this.$emit('mass-copy', payload)
		},

		async onMassExportConfirm(payload) {
			if (await this.selfActions.handleMassExport(payload)) return
			this.$emit('mass-export', payload)
		},

		/**
		 * Native Export menu entry click (`allowExport` + `schema.exportable`).
		 * Navigates the browser to OpenRegister's export leaf, passing the
		 * current route's query params through so a filtered index exports
		 * only the visible rows.
		 *
		 * @param {'csv'|'excel'} format The requested export format.
		 */
		onExportClick(format) {
			const routeQuery = (this.$route && this.$route.query) || {}
			const url = buildExportUrl(this.register, this.exportSchemaSlug, routeQuery, format)
			window.location.assign(url)
		},

		// ── Saved views (saved-views-ui) ─────────────────────────────────────

		/**
		 * Fetch the current user's saved views (own + public) from
		 * OpenRegister's views API. Called from created() when
		 * `allowSavedViews` is enabled.
		 */
		async fetchSavedViews() {
			this.savedViewsLoading = true
			try {
				this.savedViews = await useSavedViewsApi().fetchViews()
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('CnIndexPage: failed to fetch saved views', error)
			} finally {
				this.savedViewsLoading = false
			}
		},

		/**
		 * Apply a saved view: replace the route query with the view's
		 * stored filters/search/sort. `$router.replace` (not push) so the
		 * browser Back button doesn't step through every applied view —
		 * same precedent as the `?action=create` query cleanup. Dropping
		 * the whole previous query implicitly resets `_page` to 1.
		 *
		 * @param {object} view The View API object to apply.
		 */
		onApplySavedView(view) {
			const query = buildRouteQueryFromViewState(extractViewState(view))
			if (!this.$router) return
			const nav = this.$router.replace({ query })
			// Swallow the duplicate-navigation rejection (Vue Router 3)
			// when the applied view matches the current query.
			if (nav && typeof nav.catch === 'function') nav.catch(() => {})
			this.$emit('apply-view', view)
		},

		/**
		 * Persist the current route-query state as a named view via
		 * OpenRegister's views API (CnSaveViewDialog `@confirm`). On
		 * success the new view joins the list and the dialog closes; on
		 * failure the dialog stays open with the error surfaced.
		 *
		 * @param {{ name: string, isPublic: boolean }} payload Dialog payload.
		 */
		async onSaveViewConfirm({ name, isPublic }) {
			const state = extractViewStateFromRouteQuery((this.$route && this.$route.query) || {})
			const payload = buildViewCreatePayload({ name, description: '', isPublic, isDefault: false, state })
			try {
				const view = await useSavedViewsApi().createView(payload)
				if (view) this.savedViews = [...this.savedViews, view]
				this.showSaveViewDialog = false
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('CnIndexPage: failed to save view', error)
				this.$refs.saveViewDialog?.setError(error?.response?.data?.error || error?.message)
			}
		},

		/**
		 * Open the delete-confirmation dialog for a saved view
		 * (CnSavedViewsControl `@delete-request`).
		 *
		 * @param {object} view The View API object to delete.
		 */
		onDeleteViewRequest(view) {
			this.viewPendingDelete = view
		},

		/**
		 * Delete the pending view after confirmation (CnConfirmDialog
		 * `@confirm`), then report back via the dialog's setResult()
		 * contract and remove it from the local list.
		 */
		async onDeleteViewConfirm() {
			const view = this.viewPendingDelete
			if (!view) return
			try {
				await useSavedViewsApi().deleteView(view.id)
				this.savedViews = this.savedViews.filter((v) => v.id !== view.id)
				this.$refs.deleteViewConfirmDialog?.setResult({ success: true })
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('CnIndexPage: failed to delete view', error)
				this.$refs.deleteViewConfirmDialog?.setResult({ error: error?.response?.data?.error || error?.message || 'Failed to delete view' })
			}
		},

		async onMassImportConfirm(payload) {
			if (await this.selfActions.handleMassImport(payload)) return
			this.$emit('mass-import', payload)
		},

		_setResult(refName, resultData) {
			this.$refs[refName]?.setResult(resultData)
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setMassDeleteResult(resultData) { this._setResult('massDeleteDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setMassCopyResult(resultData) { this._setResult('massCopyDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setExportResult(resultData) { this._setResult('exportDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setImportResult(resultData) { this._setResult('importDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setDeleteResult(resultData) { this._setResult('massDeleteDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setCopyResult(resultData) { this._setResult('massCopyDialog', resultData) },

		// --- Single-object dialog handlers ---

		async onSingleDeleteConfirm(id) {
			if (await this.selfActions.handleSingleDelete(id)) return
			this.$emit('delete', id)
		},

		async onSingleCopyConfirm(payload) {
			if (await this.selfActions.handleSingleCopy(payload)) return
			this.$emit('copy', payload)
		},

		async onFormConfirm(formData) {
			// Opt-in create-override hook: an app supplies a custom async create
			// handler (e.g. a contact-aware endpoint that fills a required FK)
			// that owns persistence instead of saveObject. Create-only; edits
			// always fall through to the normal store / self-store path.
			if (!this.editItem && typeof this.createOverride === 'function') {
				try {
					const created = await this.createOverride(formData, {
						register: this.register,
						schema: this.schema,
						objectType: this.objectType || this.selfObjectType,
						effectiveSchema: this.effectiveSchema,
					})
					if (created) {
						this.setFormResult({ success: true })
						/**
						 * @event create Emitted after a create is confirmed (store, self-store, or createOverride).
						 * @type {object} The created object.
						 */
						this.$emit('create', created)
						if (this.list && typeof this.list.refresh === 'function') {
							this.list.refresh()
						}
					} else {
						this.setFormResult({ error: 'Save failed' })
					}
				} catch (err) {
					this.setFormResult({ error: (err && err.message) || 'Save failed' })
				}
				return
			}
			if (this.store) {
				if (!this.objectType) {
					console.warn('[CnIndexPage] store prop is set but objectType is missing. Cannot save to store.')
					return
				}
				const saved = await this.store.saveObject(this.objectType, formData)
				if (saved) {
					this.setFormResult({ success: true })
					this.$emit(this.editItem ? 'edit' : 'create', saved)
				} else {
					const err = this.store.getError?.(this.objectType)
					if (err && err.isValidation) {
						// Keep the form visible so the user can fix the invalid data.
						this.setFormValidationErrors(err.fields, err.message || 'Validation failed')
					} else {
						this.setFormResult({ error: (err && err.message) || 'Save failed' })
					}
				}
				return
			}
			if (await this.selfActions.handleFormSave(formData)) return
			this.$emit(this.editItem ? 'edit' : 'create', formData)
		},

		closeSingleDelete() {
			this.showSingleDeleteDialog = false
			this.actionTargetItem = null
		},

		closeSingleCopy() {
			this.showSingleCopyDialog = false
			this.actionTargetItem = null
		},

		closeFormDialog() {
			this.showFormDialogVisible = false
			this.editItem = null
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setSingleDeleteResult(resultData) { this._setResult('singleDeleteDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setSingleCopyResult(resultData) { this._setResult('singleCopyDialog', resultData) },
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setFormResult(resultData) { this._setResult('formDialog', resultData) },
		/**
		 * Show a validation error in the form dialog while keeping the form
		 * visible (so the user can fix the data), instead of replacing it with
		 * a result note. Use this for 400/422 responses; use setFormResult for
		 * terminal success/failure.
		 *
		 * @param {object} [fieldErrors] Per-field error messages keyed by field key
		 * @param {string} [message] Form-level message shown above the fields
		 * @public
		 */
		setFormValidationErrors(fieldErrors, message) { this.$refs.formDialog?.setValidationErrors(fieldErrors || {}, message) },

		// --- Context menu handlers ---

		onRowContextMenu({ row, event }) {
			this.openContextMenu({ item: row, event })
		},

		/**
		 * Programmatically open the form dialog.
		 *
		 * @param {object|null} item Pass null for create mode, or an object for edit mode
		 * @public
		 */
		openFormDialog(item = null) {
			this.editItem = item
			this.showFormDialogVisible = true
		},

		/**
		 * Programmatically open the single-item delete dialog.
		 *
		 * @param {object} item The item to delete
		 * @public
		 */
		openDeleteDialog(item) {
			this.actionTargetItem = item
			this.showSingleDeleteDialog = true
		},

		/**
		 * Pure helper used by the cardComponent dispatch path to toggle
		 * an id in the selected-ids array. Kept inline rather than
		 * pulled into a util because the only call site is the
		 * cardComponent `@select` listener template above.
		 *
		 * @param {Array} ids Current selection
		 * @param {string|number} id The id to toggle
		 * @return {Array} New array with `id` toggled in/out
		 */
		toggleIdInArray(ids, id) {
			if (ids.includes(id)) {
				return ids.filter((existing) => existing !== id)
			}
			return [...ids, id]
		},
	},
}
</script>

<!-- Styles in css/index-page.css -->
