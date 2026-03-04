<template>
	<div class="cn-index-page">
		<!-- Header (hidden by default — shown in sidebar instead) -->
		<CnPageHeader
			v-if="showTitle"
			:title="title"
			:description="description"
			:icon="resolvedIcon" />

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
			<template v-if="$scopedSlots['header-actions']" #header-actions>
				<slot name="header-actions" />
			</template>
		</CnActionsBar>

		<!-- Mass delete dialog -->
		<CnMassDeleteDialog
			v-if="showMassDeleteDialog"
			ref="massDeleteDialog"
			:items="selectedObjects"
			:name-field="massActionNameField"
			@confirm="onMassDeleteConfirm"
			@close="showMassDeleteDialog = false" />

		<!-- Mass copy dialog -->
		<CnMassCopyDialog
			v-if="showMassCopyDialog"
			ref="massCopyDialog"
			:items="selectedObjects"
			:name-field="massActionNameField"
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
				@confirm="onSingleCopyConfirm"
				@close="closeSingleCopy" />
		</slot>

		<!-- Form dialog for create/edit (overridable via slot) -->
		<slot
			name="form-dialog"
			:item="editItem"
			:schema="schema"
			:close="closeFormDialog">
			<CnFormDialog
				v-if="showFormDialogVisible"
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
					@row-click="$emit('row-click', $event)">
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
								@action="$emit('action', $event)" />
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
					@click="$emit('row-click', $event)"
					@select="onSelect">
					<template v-if="$scopedSlots.card" #card="{ object, selected }">
						<slot name="card" :object="object" :selected="selected" />
					</template>
					<template v-if="hasRowActions" #card-actions="{ object }">
						<slot name="row-actions" :row="object">
							<CnRowActions
								:actions="mergedActions"
								:row="object"
								@action="$emit('action', $event)" />
						</slot>
					</template>
				</CnCardGrid>

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
 * - `#form-fields` — Replace only the form content inside the built-in form dialog
 *
 * @example Minimal usage (auto-generated dialogs from schema)
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
 *
 * @example With custom form dialog
 * <CnIndexPage ...>
 *   <template #form-dialog="{ item, schema, close }">
 *     <MyCustomFormDialog :item="item" @close="close" />
 *   </template>
 * </CnIndexPage>
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
			default: 2,
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
			if (this.$listeners && this.$listeners['row-click']) {
				builtIn.push({
					label: 'View',
					icon: this.schemaIconComponent,
					handler: (row) => {
						this.$emit('row-click', row)
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

		/** Merged actions: app-provided first, then built-in defaults */
		mergedActions() {
			return [...this.actions, ...this.defaultActions]
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

		/** @public Forward result to mass delete dialog */
		setMassDeleteResult(resultData) {
			if (this.$refs.massDeleteDialog) {
				this.$refs.massDeleteDialog.setResult(resultData)
			}
		},

		/** @public Forward result to mass copy dialog */
		setMassCopyResult(resultData) {
			if (this.$refs.massCopyDialog) {
				this.$refs.massCopyDialog.setResult(resultData)
			}
		},

		/** @public Forward result to export dialog */
		setExportResult(resultData) {
			if (this.$refs.exportDialog) {
				this.$refs.exportDialog.setResult(resultData)
			}
		},

		/** @public Forward result to import dialog */
		setImportResult(resultData) {
			if (this.$refs.importDialog) {
				this.$refs.importDialog.setResult(resultData)
			}
		},

		// --- Backward-compatible aliases ---
		/** @public @deprecated Use setMassDeleteResult instead */
		setDeleteResult(resultData) {
			this.setMassDeleteResult(resultData)
		},
		/** @public @deprecated Use setMassCopyResult instead */
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

		onFormConfirm(formData) {
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

		/** @public Forward result to single delete dialog */
		setSingleDeleteResult(resultData) {
			if (this.$refs.singleDeleteDialog) {
				this.$refs.singleDeleteDialog.setResult(resultData)
			}
		},

		/** @public Forward result to single copy dialog */
		setSingleCopyResult(resultData) {
			if (this.$refs.singleCopyDialog) {
				this.$refs.singleCopyDialog.setResult(resultData)
			}
		},

		/** @public Forward result to form dialog */
		setFormResult(resultData) {
			if (this.$refs.formDialog) {
				this.$refs.formDialog.setResult(resultData)
			}
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
	},
}
</script>

<!-- Styles in css/index-page.css -->
