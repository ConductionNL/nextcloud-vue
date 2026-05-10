<template>
	<div class="cn-index-page">
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
			:pagination="pagination"
			:object-count="objects.length"
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
			@refresh="$emit('refresh')"
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
			:schema="schema"
			:close="closeFormDialog">
			<CnFormDialog
				v-if="showFormDialogVisible && !useAdvancedFormDialog"
				ref="formDialog"
				:schema="schema"
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
				:schema="schema"
				:item="editItem"
				:exclude-fields="excludeFields"
				:include-fields="includeFields"
				:field-overrides="fieldOverrides"
				:name-field="massActionNameField"
				@confirm="onFormConfirm"
				@close="closeFormDialog" />
		</slot>

		<!-- Body -->
		<div class="cn-index-page__body">
			<div class="cn-index-page__main">
				<!-- Loading state -->
				<div v-if="loading" class="cn-index-page__loading">
					<NcLoadingIcon :size="32" />
				</div>

				<!-- Empty state -->
				<div v-else-if="objects.length === 0" class="cn-index-page__empty">
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
					:schema="schema"
					:columns="columns"
					:rows="objects"
					:sort-key="sortKey"
					:sort-order="sortOrder"
					:selectable="selectable"
					:selected-ids="internalSelectedIds"
					:row-key="rowKey"
					:empty-text="emptyText"
					:exclude-columns="excludeColumns"
					:include-columns="includeColumns"
					:column-overrides="columnOverrides"
					:row-class="rowClass"
					@sort="$emit('sort', $event)"
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
					:objects="objects"
					:schema="schema"
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
							:schema="schema"
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
					v-if="pagination && pagination.pages > 1"
					:current-page="pagination.page || 1"
					:total-pages="pagination.pages || 1"
					:total-items="pagination.total || 0"
					:current-page-size="pagination.limit || 20"
					class="cn-index-page__pagination"
					@page-changed="$emit('page-changed', $event)"
					@page-size-changed="$emit('page-size-changed', $event)" />
			</div>
		</div>

		<!-- Manifest-driven sidebar — auto-mounted when sidebar.enabled
		     AND sidebar.show !== false. The legacy slot-based pattern
		     (consumer wires their own CnIndexSidebar at App.vue level)
		     is preserved when the `sidebar` prop is null / has
		     enabled:false. The `show` flag is the visibility gate —
		     `enabled` is the existence gate; both default to true
		     so existing consumers see no behaviour change. -->
		<CnIndexSidebar
			v-if="resolvedSidebar.enabled && resolvedSidebar.show !== false"
			:schema="schema"
			:title="title"
			:icon="resolvedIcon"
			:search-value="searchValue"
			:visible-columns="visibleColumns"
			:active-filters="activeFilters"
			:column-groups="resolvedSidebar.columnGroups || []"
			:facet-data="resolvedSidebar.facets || {}"
			:show-metadata="resolvedSidebar.showMetadata !== false"
			v-bind="sidebarSearchProps"
			@search="$emit('search', $event)"
			@columns-change="$emit('columns-change', $event)"
			@filter-change="$emit('filter-change', $event)" />
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
import { useContextMenu } from '../../composables/index.js'

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
 *   :schema="schema"
 *   :objects="clients"
 *   :pagination="pagination"
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
		/** Schema definition */
		schema: {
			type: Object,
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

	setup() {
		const {
			isOpen: contextMenuOpen,
			targetItem: contextMenuRow,
			open: openContextMenu,
			close: closeContextMenu,
		} = useContextMenu()

		return {
			contextMenuOpen,
			contextMenuRow,
			openContextMenu,
			closeContextMenu,
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
		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			if (this.icon) return this.icon
			return this.schema?.icon || ''
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
		 * the injected ancestor registry. Used to resolve
		 * `actions[].handler` registry names (REQ-MAD-3,
		 * manifest-actions-dispatch).
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
			if (this.objects.length === 0 || this.internalSelectedIds.length === 0) return false
			return this.objects.every((o) => this.internalSelectedIds.includes(o[this.rowKey]))
		},

		/** Full objects for the selected IDs (used by mass action dialogs) */
		selectedObjects() {
			return this.objects.filter((o) => this.internalSelectedIds.includes(o[this.rowKey]))
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
			return 'Add ' + (this.schema?.title || 'Item')
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
		 * Effective customComponents registry used to resolve the
		 * `cardComponent` name. Explicit prop wins, inject falls back,
		 * empty object is the last resort.
		 *
		 * @return {object}
		 */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
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
	},

	methods: {
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
