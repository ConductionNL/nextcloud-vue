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
		<div v-if="$scopedSlots['below-header']" class="cn-index-page__below-header">
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
			:refreshing="refreshing"
			:refresh-disabled="refreshDisabled"
			:add-disabled="addDisabled"
			:show-add="showAdd"
			@add="onAddClick"
			@refresh="onRefreshEvent"
			@show-import="showImportDialog = true"
			@show-export="showExportDialog = true"
			@show-copy="showMassCopyDialog = true"
			@show-delete="showMassDeleteDialog = true"
			@view-mode-change="onViewModeChange">
			<template v-if="$scopedSlots['mass-actions']" #mass-actions="{ count, selectedIds: ids }">
				<slot name="mass-actions" :count="count" :selected-ids="ids" />
			</template>
			<template v-if="$scopedSlots['action-items']" #action-items>
				<slot name="action-items" />
			</template>
			<template v-if="$scopedSlots['actions']" #actions>
				<slot name="actions" />
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
			<template v-if="$scopedSlots['import-fields']" #fields="{ file }">
				<slot name="import-fields" :file="file" />
			</template>
		</CnMassImportDialog>

		<!-- Single delete dialog (overridable via slot) -->
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

		<!-- Single copy dialog (overridable via slot) -->
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

		<!-- Form dialog for create/edit (overridable via slot) -->
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
				:exclude-fields="excludeFields"
				:include-fields="includeFields"
				:field-overrides="fieldOverrides"
				:name-field="massActionNameField"
				@confirm="onFormConfirm"
				@close="closeFormDialog">
				<template v-if="$scopedSlots['form-fields']" #form="scope">
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

		<!-- Quick-filter tabs (REQ-MIPFU-1) — rendered above the body when
		     the manifest declares `config.quickFilters`. Switching tabs
		     re-fetches with the merged filter; @event quick-filter-change. -->
		<CnQuickFilterBar
			v-if="quickFilters && quickFilters.length > 0"
			:tabs="quickFilters"
			:active-index="activeQuickFilterIndex"
			@update:active-index="onQuickFilterChange" />

		<!-- Body -->
		<div class="cn-index-page__body">
			<div class="cn-index-page__main">
				<!-- Loading state -->
				<div v-if="effectiveLoading" class="cn-index-page__loading">
					<NcLoadingIcon :size="32" />
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
					:rows="effectiveObjects"
					:sort-key="effectiveSortKey"
					:sort-order="effectiveSortOrder"
					:selectable="selectable"
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
				</CnDataTable>

				<!-- Card view -->
				<CnCardGrid
					v-else
					:objects="effectiveObjects"
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
					<template v-if="$scopedSlots.card" #card="{ object, selected }">
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
					:open.sync="contextMenuOpen"
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
			@search="onSearchEvent"
			@columns-change="onColumnsEvent"
			@filter-change="onFilterEvent" />
	</div>
</template>

<script>
import { NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import DatabaseSearch from 'vue-material-design-icons/DatabaseSearch.vue'
import Eye from 'vue-material-design-icons/Eye.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { CnPageHeader } from '../CnPageHeader/index.js'
import { CnActionsBar } from '../CnActionsBar/index.js'
import { CnQuickFilterBar } from '../CnQuickFilterBar/index.js'
import { CnIcon, ICON_MAP } from '../CnIcon/index.js'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnCardGrid } from '../CnCardGrid/index.js'
import { CnPagination } from '../CnPagination/index.js'
import { CnRowActions } from '../CnRowActions/index.js'
import { CnMassDeleteDialog } from '../CnMassDeleteDialog/index.js'
import { CnMassCopyDialog } from '../CnMassCopyDialog/index.js'
import { CnMassExportDialog } from '../CnMassExportDialog/index.js'
import { CnMassImportDialog } from '../CnMassImportDialog/index.js'
import { CnDeleteDialog } from '../CnDeleteDialog/index.js'
import { CnCopyDialog } from '../CnCopyDialog/index.js'
import { CnFormDialog } from '../CnFormDialog/index.js'
import { CnAdvancedFormDialog } from '../CnAdvancedFormDialog/index.js'
import { CnContextMenu } from '../CnContextMenu/index.js'
import { CnIndexSidebar } from '../CnIndexSidebar/index.js'
import { getCurrentInstance, inject, ref, watch } from 'vue'
import { useContextMenu, useListView } from '../../composables/index.js'
import { useObjectStore } from '../../store/index.js'

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
		DatabaseSearch,
		CnPageHeader,
		CnQuickFilterBar,
		CnActionsBar,
		CnIcon,
		CnDataTable,
		CnCardGrid,
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
		 * beforeDestroy(), fields are reset to avoid stale context on
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
		/**
		 * Base filter for the self-fetch path (manifest `pages[].config.filter`).
		 * A map whose string values of the form `"@route.<name>"` or `":<name>"`
		 * are interpolated from `$route.params`; everything else is a literal.
		 * Applied as a FIXED filter — always wins over the user's facet filters.
		 * No effect in consumer-managed mode (the consumer owns the fetch).
		 */
		filter: {
			type: Object,
			default: null,
		},
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
		/** Currently selected IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},
		/** View mode: 'table' or 'cards' */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards'].includes(v),
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
		/** Unique row identifier property */
		rowKey: {
			type: String,
			default: 'id',
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
		/** Whether the refresh action is currently in progress */
		refreshing: {
			type: Boolean,
			default: false,
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
	},

	setup(props) {
		const {
			isOpen: contextMenuOpen,
			targetItem: contextMenuRow,
			open: openContextMenu,
			close: closeContextMenu,
		} = useContextMenu()

		// ── Self-fetch mode ──────────────────────────────────────────────────
		// A manifest `type:"index"` page reaches CnIndexPage with `register` and
		// `schema` from `config` but NEVER an `objects` prop (CnPageRenderer
		// spreads `config`, not runtime data). So when `register` + `schema` are
		// set AND the caller did not pass `objects`, we self-fetch: drive the
		// list via `useListView('${register}-${schema}', …)` (which itself
		// registers the object type, fetches the collection with
		// _search/_order/_page/_limit/activeFilters, loads the schema, wires the
		// sidebar and returns the search/sort/page/filter handlers). When
		// `objects` IS passed (every existing consumer), nothing changes — the
		// props win, no store is touched, the @events bubble as before.
		const instance = getCurrentInstance()
		const objectsProvided = !!(
			instance && instance.proxy && instance.proxy.$options && instance.proxy.$options.propsData
			&& Object.prototype.hasOwnProperty.call(instance.proxy.$options.propsData, 'objects')
		)
		const isSelfFetch = !!(props.register && props.schema) && !objectsProvided

		// ── Quick-filter tabs (REQ-MIPFU-1) ─────────────────────────────────
		// `props.quickFilters` declares clickable tabs above the table; the
		// active tab's `filter` is merged into the useListView fetch (after
		// `props.filter` so the tab wins). Initial active index: first entry
		// with `default:true`, else 0 if non-empty, else null.
		const quickInit = (() => {
			const tabs = Array.isArray(props.quickFilters) ? props.quickFilters : null
			if (!tabs || tabs.length === 0) return null
			const di = tabs.findIndex((t) => t && t.default === true)
			return di >= 0 ? di : 0
		})()
		const activeQuickFilterIndex = ref(quickInit)

		/**
		 * Resolve a single filter map's values: `@route.<name>` / `:<name>`
		 * pull from `$route.params`; literals pass through. Returns `{}` for
		 * a non-object input (so callers can safely spread the result).
		 *
		 * @param {object|null|undefined} filterMap
		 * @param {object} params Current `$route.params`.
		 * @return {object}
		 */
		function resolveFilterMap(filterMap, params) {
			if (!filterMap || typeof filterMap !== 'object') return {}
			const out = {}
			for (const [k, v] of Object.entries(filterMap)) {
				if (typeof v === 'string' && v.startsWith('@route.')) out[k] = params[v.slice('@route.'.length)]
				else if (typeof v === 'string' && v.startsWith(':')) out[k] = params[v.slice(1)]
				else out[k] = v
			}
			return out
		}

		let list = null
		if (isSelfFetch) {
			const objectType = `${props.register}-${props.schema}`
			const sidebarState = inject('sidebarState', null) ?? inject('objectSidebarState', null)
			const objectStore = useObjectStore()
			// Register the `${register}-${schema}` type (mirrors CnLogsPage) so the
			// store has a slot for it before `useListView` issues the first fetch.
			if (typeof objectStore.registerObjectType === 'function') {
				// useObjectStore.registerObjectType signature is positional:
				// (slug, schemaId, registerId, slugs?). Passing an object as
				// the second argument made schemaId === {register, schema} and
				// registerId === undefined, which produced URLs like
				// /apps/openregister/api/schemas/[object Object] at fetch time.
				objectStore.registerObjectType(objectType, props.schema, props.register)
			}
			list = useListView(objectType, {
				objectStore,
				sidebarState,
				defaultSort: props.sortKey ? { key: props.sortKey, order: props.sortOrder || 'asc' } : undefined,
				defaultPageSize: (props.pagination && props.pagination.limit) || undefined,
				// Re-read on every fetch so route-param changes (`/forms/:id/...`)
				// AND quick-filter switches both flow into the next fetch. CnIndexPage
				// also watches $route.params → list.refresh() (see watch:); changing
				// `activeQuickFilterIndex` triggers a refresh below.
				fixedFilters: () => {
					const route = instance && instance.proxy && instance.proxy.$route
					const params = (route && route.params) || {}
					const base = resolveFilterMap(props.filter, params)
					// Active quick-filter tab spread LAST so it overrides a
					// colliding `props.filter` entry (intentional — the tab is
					// the user's intent).
					const tabs = Array.isArray(props.quickFilters) ? props.quickFilters : null
					const activeIdx = activeQuickFilterIndex.value
					const tabFilter = (tabs && activeIdx != null) ? tabs[activeIdx]?.filter : null
					return { ...base, ...resolveFilterMap(tabFilter, params) }
				},
			})

			// Refresh when the user switches tabs. Reset to page 1 so the
			// new filter starts from the top of its result set.
			watch(activeQuickFilterIndex, () => {
				if (list && typeof list.refresh === 'function') list.refresh(1)
			})
		}

		return {
			contextMenuOpen,
			contextMenuRow,
			openContextMenu,
			closeContextMenu,
			isSelfFetch,
			list,
			activeQuickFilterIndex,
		}
	},

	data() {
		return {
			currentViewMode: this.viewMode,
			internalSelectedIds: [...this.selectedIds],
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
		}
	},

	computed: {
		// ── Self-fetch ↔ consumer-managed: the "effective" source of each
		//    list datum is the useListView instance in self-fetch mode, the
		//    prop otherwise. The template binds to these.
		/** True when self-fetch mode is active and the useListView instance exists. */
		isSelfFetchMode() { return this.isSelfFetch && !!this.list },
		/** Rows: store collection in self-fetch mode, else the `objects` prop. */
		effectiveObjects() { return this.isSelfFetchMode ? (this.list.objects.value || []) : this.objects },
		/** Loading flag: store loading in self-fetch mode, else the `loading` prop. */
		effectiveLoading() { return this.isSelfFetchMode ? !!this.list.loading.value : this.loading },
		/** Pagination: store pagination in self-fetch mode, else the `pagination` prop. */
		effectivePagination() { return this.isSelfFetchMode ? this.list.pagination.value : this.pagination },
		/** Resolved schema OBJECT (for column generation / icons / labels). */
		effectiveSchema() {
			if (this.isSelfFetchMode) return this.list.schema.value
			return (this.schema && typeof this.schema === 'object') ? this.schema : null
		},
		/** Sort key / order: list state in self-fetch mode, else the props. */
		effectiveSortKey() { return this.isSelfFetchMode ? this.list.sortKey.value : this.sortKey },
		effectiveSortOrder() { return this.isSelfFetchMode ? this.list.sortOrder.value : this.sortOrder },
		/** Search term / visible columns / active facet filters for the embedded sidebar. */
		effectiveSearchValue() { return this.isSelfFetchMode ? (this.list.searchTerm.value || '') : (this.searchValue || '') },
		effectiveVisibleColumns() { return this.isSelfFetchMode ? this.list.visibleColumns.value : this.visibleColumns },
		effectiveActiveFilters() { return this.isSelfFetchMode ? (this.list.activeFilters.value || {}) : (this.activeFilters || {}) },
		/**
		 * Columns handed to CnDataTable — same as the `columns` prop, except any
		 * `aggregate` block lacking a `register` is defaulted to this page's
		 * `register` slug (so manifests can omit `aggregate.register`).
		 */
		tableColumns() {
			const reg = typeof this.register === 'string' && this.register ? this.register : undefined
			if (!reg) return this.columns || []
			return (this.columns || []).map((c) => (
				c && c.aggregate && !c.aggregate.register
					? { ...c, aggregate: { ...c.aggregate, register: reg } }
					: c
			))
		},
		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			if (this.icon) return this.icon
			return this.effectiveSchema?.icon || ''
		},

		/** Resolved schema icon component for View action */
		schemaIconComponent() {
			if (this.resolvedIcon && ICON_MAP[this.resolvedIcon]) {
				return ICON_MAP[this.resolvedIcon]
			}
			return Eye
		},

		/** Built-in row actions based on show*Action props */
		defaultActions() {
			const builtIn = []
			if (this.showViewAction) {
				builtIn.push({
					label: 'View',
					icon: this.schemaIconComponent,
					handler: (row) => {
						this.onView(row)
					},
				})
			}
			if (this.showEditAction) {
				builtIn.push({
					label: 'Edit',
					icon: Pencil,
					handler: (row) => {
						this.editItem = row
						this.showFormDialogVisible = true
					},
				})
			}
			if (this.showCopyAction) {
				builtIn.push({
					label: 'Copy',
					icon: ContentCopy,
					handler: (row) => {
						this.actionTargetItem = row
						this.showSingleCopyDialog = true
					},
				})
			}
			if (this.showDeleteAction) {
				builtIn.push({
					label: 'Delete',
					icon: TrashCanOutline,
					destructive: true,
					handler: (row) => {
						this.actionTargetItem = row
						this.showSingleDeleteDialog = true
					},
				})
			}
			return builtIn
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
			const dispatched = this.actions.map((action) => {
				if (typeof action.handler === 'function') {
					// Back-compat: programmatic function handler — keep as-is.
					return action
				}
				if (typeof action.handler !== 'string' || action.handler.length === 0) {
					// No handler → emit-only path (existing default).
					return action
				}
				const isNone = action.handler === 'none'
				const resolved = this.resolveHandler(action)
				if (resolved) {
					// `none` returns a sentinel no-op handler AND must
					// suppress the `@action` emit; flag it so onRowAction
					// can drop the bubbled event.
					return isNone
						? { ...action, handler: resolved, _dispatchSuppress: true }
						: { ...action, handler: resolved }
				}
				// Either reserved keyword "emit" / unknown name / non-function
				// registry entry → page emits @action only; no handler call.
				const { handler, ...rest } = action
				return rest
			})
			return [...dispatched, ...this.defaultActions]
		},

		hasRowActions() {
			return this.$scopedSlots['row-actions'] || this.mergedActions.length > 0
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
			return Object.keys(this.$scopedSlots)
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
				// eslint-disable-next-line no-console
				console.warn(
					`[CnIndexPage] cardComponent "${this.cardComponent}" not found in customComponents registry. Falling back to CnObjectCard.`,
				)
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
	},

	mounted() {
		this.publishHoistedSidebar()
		this.pushAiContext()
	},

	created() {
		this.pushAiContext()
	},

	beforeDestroy() {
		// Clear the holder so the hoisted sidebar disappears when
		// the user navigates away from the index page.
		if (this.cnHostsIndexSidebar && this.cnIndexSidebarConfig) {
			this.cnIndexSidebarConfig.value = null
		}
		// Reset AI context so the companion doesn't see stale index context
		// when the user navigates to a custom page.
		if (this.cnAiContext) {
			this.cnAiContext.pageKind = 'custom'
			this.cnAiContext.registerSlug = undefined
			this.cnAiContext.schemaSlug = undefined
			this.cnAiContext.objectUuid = undefined
		}
	},

	methods: {
		/**
		 * Push pageKind + register/schema context into the reactive cnAiContext
		 * holder so the AI Chat Companion knows what the user is looking at.
		 * Called from created(), mounted(), and via watchers when props change.
		 */
		pushAiContext() {
			if (!this.cnAiContext) return
			this.cnAiContext.pageKind = 'index'
			this.cnAiContext.registerSlug = this.register || undefined
			this.cnAiContext.schemaSlug = (typeof this.schema === 'string' && this.schema)
				|| this.effectiveSchema?.id || this.effectiveSchema?.slug
				|| (this.schema && (this.schema.id || this.schema.slug)) || undefined
			this.cnAiContext.objectUuid = undefined
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
		 * @param {{key: string, order: string}} payload Sort change from CnDataTable.
		 * @return {void}
		 */
		onSortEvent(payload) {
			if (this.isSelfFetchMode && typeof this.list.onSort === 'function') this.list.onSort(payload)
			this.$emit('sort', payload)
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
			if (this.isSelfFetchMode && typeof this.list.onFilterChange === 'function') this.list.onFilterChange(payload)
			this.$emit('filter-change', payload)
		},
		/**
		 * @param {Array} columns Visible-column change from the sidebar.
		 * @return {void}
		 */
		onColumnsEvent(columns) {
			if (this.isSelfFetchMode && this.list.visibleColumns) this.list.visibleColumns.value = columns
			this.$emit('columns-change', columns)
		},
		/** @return {void} */
		onRefreshEvent() {
			if (this.isSelfFetchMode && typeof this.list.refresh === 'function') this.list.refresh()
			this.$emit('refresh')
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
					search: (event) => this.onSearchEvent(event),
					'columns-change': (event) => this.onColumnsEvent(event),
					'filter-change': (event) => this.onFilterEvent(event),
				},
			}
		},

		/**
		 * REQ-MAD-3 / REQ-MAD-4 / REQ-MAD-5 / REQ-MAD-6 / REQ-MAD-7
		 * (manifest-actions-dispatch) — Resolve a manifest-declared
		 * action's `handler` string into a `(row) => void` invocation
		 * function. Returns null when the action should fall back to
		 * the page's `@action`-event-only path.
		 *
		 *   - Reserved keyword `"navigate"` → push the configured route
		 *     with `params: { id: row[rowKey] }`.
		 *   - Reserved keyword `"emit"` → null (page still bubbles
		 *     `@action`; explicit no-op).
		 *   - Reserved keyword `"none"` → returns a no-op function that
		 *     suppresses both the handler and the `@action` emit. The
		 *     suppression happens via the special `_dispatchSuppress`
		 *     flag on the cloned action; see mergedActions for the
		 *     detail.
		 *   - Registry name → look up in `effectiveCustomComponents`;
		 *     when it's a function, wrap as
		 *     `(row) => fn({ actionId: action.id, item: row })`. When
		 *     it's a non-function, console.warn and return null.
		 *   - Unknown registry name → silent fall-through (null).
		 *
		 * @param {object} action The manifest-shaped action object.
		 * @return {Function|null}
		 */
		resolveHandler(action) {
			const name = action.handler
			if (typeof name !== 'string' || name.length === 0) return null
			if (name === 'navigate') {
				const route = action.route
				if (typeof route !== 'string' || route.length === 0) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnIndexPage] action "${action.id}" declares handler:"navigate" `
						+ 'but route is missing; falling back to @action-only.',
					)
					return null
				}
				return (row) => {
					this.$router.push({
						name: route,
						params: { id: row[this.rowKey] },
					})
				}
			}
			if (name === 'emit') return null
			if (name === 'none') {
				// Returns a sentinel that CnRowActions will treat as a
				// no-op; we additionally short-circuit @action emit in
				// `onRowAction` via the action's id.
				return () => {}
			}
			const fn = this.effectiveCustomComponents[name]
			if (typeof fn === 'function') {
				return (row) => fn({ actionId: action.id, item: row })
			}
			if (fn !== undefined) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnIndexPage] action.handler "${name}" resolved to a non-function in `
					+ 'customComponents — components belong to slot overrides; falling '
					+ 'back to @action-only.',
				)
			}
			return null
		},

		/**
		 * REQ-MAD-6 (manifest-actions-dispatch) — `handler: "none"`
		 * blocks the `@action` emit entirely. CnRowActions emits
		 * `@action` with `{ action: action.label, row }` and the page
		 * forwards via `@action="$emit('action', $event)"`. This handler
		 * intercepts so the `none`-flagged action is dropped before
		 * re-emit.
		 *
		 * @param {{action: string, row: object}} payload The CnRowActions emit.
		 */
		onRowAction(payload) {
			const matched = this.mergedActions.find((a) => a.label === payload.action)
			if (matched && matched._dispatchSuppress) return
			this.$emit('action', payload)
		},

		/**
		 * Handle row click — emits row-click event for the parent to handle navigation.
		 * @param {object} row The clicked row object
		 */
		onRowClick(row) {
			this.$emit('row-click', row)
		},

		/**
		 * Handle the built-in View action — emits a dedicated `view` event.
		 * Kept distinct from `row-click` because the two are conceptually
		 * different: a row click might mean select/expand/drilldown, while
		 * View always means "open the detail view of this row".
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
		 * Handle view mode toggle.
		 * @param {string} mode 'table' or 'cards'
		 */
		onViewModeChange(mode) {
			this.currentViewMode = mode
			this.$emit('view-mode-change', mode)
		},

		/**
		 * Handle selection changes from CnDataTable/CnCardGrid.
		 * Updates internal state and re-emits for parent.
		 * @param {Array} ids Array of selected row IDs
		 */
		onSelect(ids) {
			this.internalSelectedIds = ids
			this.$emit('select', ids)
		},

		// --- Mass action handlers ---

		onMassDeleteConfirm(ids) {
			this.$emit('mass-delete', ids)
		},

		onMassCopyConfirm(payload) {
			this.$emit('mass-copy', payload)
		},

		onMassExportConfirm(payload) {
			this.$emit('mass-export', payload)
		},

		onMassImportConfirm(payload) {
			this.$emit('mass-import', payload)
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setMassDeleteResult(resultData) {
			if (this.$refs.massDeleteDialog) {
				this.$refs.massDeleteDialog.setResult(resultData)
			}
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setMassCopyResult(resultData) {
			if (this.$refs.massCopyDialog) {
				this.$refs.massCopyDialog.setResult(resultData)
			}
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setExportResult(resultData) {
			if (this.$refs.exportDialog) {
				this.$refs.exportDialog.setResult(resultData)
			}
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setImportResult(resultData) {
			if (this.$refs.importDialog) {
				this.$refs.importDialog.setResult(resultData)
			}
		},

		// --- Backward-compatible aliases ---
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setDeleteResult(resultData) {
			this.setMassDeleteResult(resultData)
		},
		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setCopyResult(resultData) {
			this.setMassCopyResult(resultData)
		},

		// --- Single-object dialog handlers ---

		onSingleDeleteConfirm(id) {
			this.$emit('delete', id)
		},

		onSingleCopyConfirm(payload) {
			this.$emit('copy', payload)
		},

		async onFormConfirm(formData) {
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
					this.setFormResult({ error: (err && err.message) || 'Save failed' })
				}
				return
			}
			if (this.editItem) {
				this.$emit('edit', formData)
			} else {
				this.$emit('create', formData)
			}
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
		setSingleDeleteResult(resultData) {
			if (this.$refs.singleDeleteDialog) {
				this.$refs.singleDeleteDialog.setResult(resultData)
			}
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setSingleCopyResult(resultData) {
			if (this.$refs.singleCopyDialog) {
				this.$refs.singleCopyDialog.setResult(resultData)
			}
		},

		/**
		 * @param {*} resultData Result data to pass to the dialog
		 * @public
		 */
		setFormResult(resultData) {
			if (this.$refs.formDialog) {
				this.$refs.formDialog.setResult(resultData)
			}
		},

		// --- Context menu handlers ---

		onRowContextMenu({ row, event }) {
			this.openContextMenu({ item: row, event })
		},

		/**
		 * Programmatically open the form dialog.
		 * @param {object|null} item Pass null for create mode, or an object for edit mode
		 * @public
		 */
		openFormDialog(item = null) {
			this.editItem = item
			this.showFormDialogVisible = true
		},

		/**
		 * Programmatically open the single-item delete dialog.
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
