<template>
	<div class="cn-index-page">
		<!-- Header -->
		<div class="cn-index-page__header">
			<div class="cn-index-page__title-area">
				<h2 class="cn-index-page__title">{{ title }}</h2>
				<span v-if="pagination && pagination.total > 0" class="cn-index-page__count">
					{{ countText }}
				</span>
			</div>
			<div class="cn-index-page__header-actions">
				<!-- Mass actions dropdown (shows when items selected) -->
				<CnMassActionBar
					v-if="selectable"
					:selected-ids="selectedIds"
					:count="selectedIds.length"
					:show-import="showMassImport"
					:show-export="showMassExport"
					:show-copy="showMassCopy"
					:show-delete="showMassDelete"
					@mass-import="showImportDialog = true"
					@mass-export="showExportDialog = true"
					@mass-copy="showCopyDialog = true"
					@mass-delete="showDeleteDialog = true">
					<template #actions="{ count: selCount, selectedIds: selIds }">
						<slot name="mass-actions" :count="selCount" :selected-ids="selIds" />
					</template>
				</CnMassActionBar>

				<CnViewModeToggle
					v-if="showViewToggle"
					:value="currentViewMode"
					@input="onViewModeChange" />
				<slot name="header-actions" />
			</div>
		</div>

		<!-- Mass delete dialog -->
		<CnMassDeleteDialog
			v-if="showDeleteDialog"
			ref="deleteDialog"
			:items="selectedObjects"
			:name-field="massActionNameField"
			@confirm="onMassDeleteConfirm"
			@close="showDeleteDialog = false" />

		<!-- Mass copy dialog -->
		<CnMassCopyDialog
			v-if="showCopyDialog"
			ref="copyDialog"
			:items="selectedObjects"
			:name-field="massActionNameField"
			@confirm="onMassCopyConfirm"
			@close="showCopyDialog = false" />

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

		<!-- Body: sidebar + main content -->
		<div class="cn-index-page__body" :class="{ 'cn-index-page__body--with-sidebar': showSidebar }">
			<!-- Facet sidebar -->
			<aside v-if="showSidebar" class="cn-index-page__sidebar">
				<slot name="sidebar">
					<CnFacetSidebar
						v-if="schema"
						:schema="schema"
						:facet-data="facetData"
						:active-filters="activeFilters"
						:loading="facetLoading"
						@filter-change="$emit('filter-change', $event)"
						@clear-all="$emit('clear-filters')" />
				</slot>
			</aside>

			<!-- Main content area -->
			<div class="cn-index-page__main">
				<!-- Search bar -->
				<div v-if="showSearch" class="cn-index-page__search">
					<CnFilterBar
						:search-value="searchValue"
						:search-placeholder="searchPlaceholder"
						:filters="inlineFilters"
						:show-clear-all="false"
						@search="$emit('search', $event)"
						@filter-change="$emit('filter-change', $event)" />
				</div>

				<!-- Loading state -->
				<div v-if="loading" class="cn-index-page__loading">
					<NcLoadingIcon :size="32" />
				</div>

				<!-- Empty state -->
				<div v-else-if="objects.length === 0" class="cn-index-page__empty">
					<slot name="empty">
						<NcEmptyContent :name="emptyText">
							<template #icon>
								<DatabaseSearch :size="64" />
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
					:selected-ids="selectedIds"
					:row-key="rowKey"
					:empty-text="emptyText"
					:exclude-columns="excludeColumns"
					:include-columns="includeColumns"
					:column-overrides="columnOverrides"
					:row-class="rowClass"
					@sort="$emit('sort', $event)"
					@select="$emit('select', $event)"
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
								v-if="actions.length > 0"
								:actions="actions"
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
					:selected-ids="selectedIds"
					:row-key="rowKey"
					:empty-text="emptyText"
					@click="$emit('row-click', $event)"
					@select="$emit('select', $event)">
					<template v-if="$scopedSlots.card" #card="{ object, selected }">
						<slot name="card" :object="object" :selected="selected" />
					</template>
					<template v-if="hasRowActions" #card-actions="{ object }">
						<slot name="row-actions" :row="object">
							<CnRowActions
								v-if="actions.length > 0"
								:actions="actions"
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
import { CnDataTable } from '../CnDataTable/index.js'
import { CnCardGrid } from '../CnCardGrid/index.js'
import { CnPagination } from '../CnPagination/index.js'
import { CnFilterBar } from '../CnFilterBar/index.js'
import { CnFacetSidebar } from '../CnFacetSidebar/index.js'
import { CnViewModeToggle } from '../CnViewModeToggle/index.js'
import { CnRowActions } from '../CnRowActions/index.js'
import { CnMassActionBar } from '../CnMassActionBar/index.js'
import { CnMassDeleteDialog } from '../CnMassDeleteDialog/index.js'
import { CnMassCopyDialog } from '../CnMassCopyDialog/index.js'
import { CnMassExportDialog } from '../CnMassExportDialog/index.js'
import { CnMassImportDialog } from '../CnMassImportDialog/index.js'

/**
 * CnIndexPage — Top-level schema-driven index page component.
 *
 * Assembles all sub-components (table, cards, pagination, search, faceted
 * sidebar, view mode toggle) into a single zero-config page. Takes a schema
 * and objects array, then auto-generates everything.
 *
 * @example Minimal usage
 * <CnIndexPage
 *   title="Publications"
 *   :schema="schema"
 *   :objects="publications"
 *   :pagination="pagination"
 *   :loading="loading"
 *   :search-value="search"
 *   @search="onSearch"
 *   @row-click="openPublication"
 *   @page-changed="onPage" />
 *
 * @example Full usage with sidebar, actions, mass actions
 * <CnIndexPage
 *   ref="indexPage"
 *   title="Cases"
 *   :schema="caseSchema"
 *   :objects="cases"
 *   :pagination="pagination"
 *   :loading="loading"
 *   :search-value="search"
 *   :selected-ids="selectedIds"
 *   :facet-data="facetData"
 *   :active-filters="filters"
 *   :actions="[{ label: 'Edit', handler: editCase }]"
 *   @search="onSearch"
 *   @select="selectedIds = $event"
 *   @row-click="openCase"
 *   @mass-delete="onMassDelete"
 *   @mass-copy="onMassCopy">
 *   <template #header-actions>
 *     <NcButton type="primary" @click="createCase">New case</NcButton>
 *   </template>
 *   <template #mass-actions="{ count, selectedIds }">
 *     <NcButton @click="exportSelected(selectedIds)">Export {{ count }}</NcButton>
 *   </template>
 * </CnIndexPage>
 *
 * // In methods:
 * async onMassDelete(ids) {
 *   try {
 *     await store.massDelete(ids)
 *     this.$refs.indexPage.setDeleteResult({ success: true })
 *   } catch (e) {
 *     this.$refs.indexPage.setDeleteResult({ error: e.message })
 *   }
 * }
 * async onMassCopy({ ids, getName }) {
 *   try {
 *     for (const obj of this.selectedObjects) {
 *       await store.copyObject(obj.id, { title: getName(obj) })
 *     }
 *     this.$refs.indexPage.setCopyResult({ success: true })
 *   } catch (e) {
 *     this.$refs.indexPage.setCopyResult({ error: e.message })
 *   }
 * }
 */
export default {
	name: 'CnIndexPage',

	components: {
		NcLoadingIcon,
		NcEmptyContent,
		DatabaseSearch,
		CnDataTable,
		CnCardGrid,
		CnPagination,
		CnFilterBar,
		CnFacetSidebar,
		CnViewModeToggle,
		CnRowActions,
		CnMassActionBar,
		CnMassDeleteDialog,
		CnMassCopyDialog,
		CnMassExportDialog,
		CnMassImportDialog,
	},

	props: {
		/** Page title */
		title: {
			type: String,
			required: true,
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
		/** Current search term */
		searchValue: {
			type: String,
			default: '',
		},
		/** Search input placeholder */
		searchPlaceholder: {
			type: String,
			default: 'Search...',
		},
		/** Inline filter definitions (shown in the search bar) */
		inlineFilters: {
			type: Array,
			default: () => [],
		},
		/** Facet data from API: { fieldName: { values: [{value, count}] } } */
		facetData: {
			type: Object,
			default: null,
		},
		/** Current active facet filters: { fieldName: [values] } */
		activeFilters: {
			type: Object,
			default: () => ({}),
		},
		/** Whether facet data is loading */
		facetLoading: {
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
		/** Row action definitions */
		actions: {
			type: Array,
			default: () => [],
		},
		/** Text shown when no items found */
		emptyText: {
			type: String,
			default: 'No items found',
		},
		/** Whether to show the view mode toggle */
		showViewToggle: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the search bar */
		showSearch: {
			type: Boolean,
			default: true,
		},
		/** Function returning CSS class(es) for a row */
		rowClass: {
			type: Function,
			default: null,
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
		/** Property name used to display item names in mass action dialogs */
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
	},

	data() {
		return {
			currentViewMode: this.viewMode,
			showDeleteDialog: false,
			showCopyDialog: false,
			showExportDialog: false,
			showImportDialog: false,
		}
	},

	computed: {
		countText() {
			if (!this.pagination) return ''
			return `Showing ${this.objects.length} of ${this.pagination.total}`
		},

		showSidebar() {
			return this.$scopedSlots.sidebar || this.facetData !== null
		},

		hasRowActions() {
			return this.$scopedSlots['row-actions'] || this.actions.length > 0
		},

		/** Whether all visible items are selected */
		allSelected() {
			if (this.objects.length === 0 || this.selectedIds.length === 0) return false
			return this.objects.every((o) => this.selectedIds.includes(o[this.rowKey]))
		},

		/** Full objects for the selected IDs (used by mass action dialogs) */
		selectedObjects() {
			return this.objects.filter((o) => this.selectedIds.includes(o[this.rowKey]))
		},

		/** Column slot names that the parent has provided (for pass-through) */
		slotColumns() {
			return Object.keys(this.$scopedSlots)
				.filter((name) => name.startsWith('column-'))
				.map((name) => name.replace('column-', ''))
		},
	},

	watch: {
		viewMode(val) {
			this.currentViewMode = val
		},
	},

	methods: {
		onViewModeChange(mode) {
			this.currentViewMode = mode
			this.$emit('view-mode-change', mode)
		},

		/**
		 * Handle mass delete confirm. Emits 'mass-delete' with the IDs.
		 * Parent should call `this.$refs.indexPage.setDeleteResult(...)` when done.
		 * @param {Array} ids Array of item IDs to delete
		 */
		onMassDeleteConfirm(ids) {
			this.$emit('mass-delete', ids)
		},

		/**
		 * Handle mass copy confirm. Emits 'mass-copy' with the payload.
		 * Parent should call `this.$refs.indexPage.setCopyResult(...)` when done.
		 * @param {{ ids: Array, getName: Function }} payload
		 */
		onMassCopyConfirm(payload) {
			this.$emit('mass-copy', payload)
		},

		/**
		 * Set the result of a mass delete operation. Call from parent after API call.
		 * @param {{ success?: boolean, error?: string }} resultData
		 * @public
		 */
		setDeleteResult(resultData) {
			if (this.$refs.deleteDialog) {
				this.$refs.deleteDialog.setResult(resultData)
			}
		},

		/**
		 * Set the result of a mass copy operation. Call from parent after API call.
		 * @param {{ success?: boolean, error?: string }} resultData
		 * @public
		 */
		setCopyResult(resultData) {
			if (this.$refs.copyDialog) {
				this.$refs.copyDialog.setResult(resultData)
			}
		},

		/**
		 * Handle mass export confirm.
		 * @param {{ format: string }} payload
		 */
		onMassExportConfirm(payload) {
			this.$emit('mass-export', payload)
		},

		/**
		 * Handle mass import confirm.
		 * @param {{ file: File, options: object }} payload
		 */
		onMassImportConfirm(payload) {
			this.$emit('mass-import', payload)
		},

		/**
		 * Set the result of a mass export operation.
		 * @param {{ success?: boolean, error?: string }} resultData
		 * @public
		 */
		setExportResult(resultData) {
			if (this.$refs.exportDialog) {
				this.$refs.exportDialog.setResult(resultData)
			}
		},

		/**
		 * Set the result of a mass import operation.
		 * @param {{ success?: boolean, error?: string, summary?: object }} resultData
		 * @public
		 */
		setImportResult(resultData) {
			if (this.$refs.importDialog) {
				this.$refs.importDialog.setResult(resultData)
			}
		},
	},
}
</script>

<style scoped>
.cn-index-page {
	padding: 20px;
}

.cn-index-page__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-index-page__title-area {
	display: flex;
	align-items: baseline;
	gap: 8px;
}

.cn-index-page__title {
	margin: 0;
	font-size: 22px;
	font-weight: 700;
}

.cn-index-page__count {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

.cn-index-page__header-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-index-page__body {
	display: flex;
	gap: 0;
}

.cn-index-page__body--with-sidebar {
	gap: 0;
}

.cn-index-page__sidebar {
	flex-shrink: 0;
}

.cn-index-page__main {
	flex: 1;
	min-width: 0;
}

.cn-index-page__search {
	margin-bottom: 16px;
}

.cn-index-page__loading {
	display: flex;
	justify-content: center;
	padding: 60px;
}

.cn-index-page__empty {
	padding: 40px 20px;
	text-align: center;
}

.cn-index-page__pagination {
	margin-top: 16px;
}
</style>
