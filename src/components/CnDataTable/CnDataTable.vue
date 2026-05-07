<template>
	<div class="cn-table-container" :class="{ 'cn-table-container--scrollable': scrollable }">
		<!-- Loading State -->
		<div v-if="loading" class="cn-table-loading">
			<NcLoadingIcon :size="32" />
			<p>{{ loadingText }}</p>
		</div>

		<!-- Table -->
		<table v-else class="cn-data-table">
			<thead>
				<tr>
					<!-- Checkbox column -->
					<th v-if="selectable" class="cn-table-col--checkbox">
						<NcCheckboxRadioSwitch
							:checked="allSelected"
							:indeterminate="someSelected && !allSelected"
							@update:checked="toggleSelectAll" />
					</th>

					<!-- Data columns -->
					<th
						v-for="col in effectiveColumns"
						:key="col.key"
						:class="[
							col.sortable ? 'cn-table-header--sortable' : '',
							col.class || '',
						]"
						:style="col.width ? { width: col.width } : {}"
						@click="col.sortable ? onSort(col.key) : null">
						{{ col.label }}
						<span
							v-if="col.sortable && sortKey === col.key"
							class="cn-table-sort-indicator">
							{{ sortOrder === 'asc' ? '▲' : '▼' }}
						</span>
					</th>

					<!-- Actions column -->
					<th v-if="$scopedSlots['row-actions']" class="cn-table-col--actions">
						<slot name="actions-header" />
					</th>
				</tr>
			</thead>

			<tbody>
				<!-- Empty state -->
				<tr v-if="rows.length === 0" class="cn-table-empty">
					<td :colspan="totalColumns">
						<slot name="empty">
							{{ emptyText }}
						</slot>
					</td>
				</tr>

				<!-- Data rows -->
				<tr
					v-for="row in rows"
					v-else
					:key="row[rowKey]"
					class="cn-table-row"
					:class="[
						isSelected(row) ? 'cn-table-row--selected' : '',
						rowClass ? rowClass(row) : '',
					]"
					@click="$emit('row-click', row)"
					@contextmenu.prevent="$emit('row-context-menu', { row, event: $event })">
					<!-- Checkbox -->
					<td v-if="selectable" class="cn-table-col--checkbox" @click.stop>
						<NcCheckboxRadioSwitch
							:checked="isSelected(row)"
							@update:checked="toggleSelect(row)" />
					</td>

					<!-- Data cells -->
					<td
						v-for="col in effectiveColumns"
						:key="col.key"
						:class="[col.class || '', col.cellClass || '', cellClass ? cellClass(row, col) : '']"
						:style="col.width ? { maxWidth: col.width } : {}">
						<slot :name="'column-' + col.key" :row="row" :value="getCellValue(row, col.key)">
							<!-- Schema-driven: use CnCellRenderer -->
							<CnCellRenderer
								v-if="isSchemaColumn(col)"
								:value="getCellValue(row, col.key)"
								:property="getSchemaProperty(col.key)" />
							<!-- Manual: plain text -->
							<template v-else>
								{{ getCellValue(row, col.key) }}
							</template>
						</slot>
					</td>

					<!-- Row actions -->
					<td v-if="$scopedSlots['row-actions']" :class="['cn-table-col--actions', cellClass ? cellClass(row, { key: 'actions' }) : '']" @click.stop>
						<slot name="row-actions" :row="row" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { columnsFromSchema } from '../../utils/schema.js'

/**
 * CnDataTable — Generic sortable data table for list views.
 *
 * Replaces the copy-pasted `<table class="viewTable">` HTML pattern found in
 * every list view across OpenRegister, Pipelinq, and Procest. Supports sorting,
 * row selection, custom cell rendering via scoped slots, loading states,
 * and empty states.
 *
 * When a `schema` prop is provided, columns are auto-generated from schema
 * properties and cells render through CnCellRenderer for type-aware formatting
 * (dates, booleans, UUIDs, enums, etc.). Scoped slots still override individual
 * columns when needed.
 *
 * Manual columns (backwards compatible)
 * ```vue
 * <CnDataTable
 *   :columns="[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *   ]"
 *   :rows="clients"
 *   @row-click="openClient" />
 * ```
 *
 * Schema-driven (auto columns)
 * ```vue
 * <CnDataTable :schema="schema" :rows="objects" />
 * ```
 *
 * Schema with overrides and custom cell
 * ```vue
 * <CnDataTable
 *   :schema="schema"
 *   :exclude-columns="['description']"
 *   :column-overrides="{ status: { width: '200px' } }"
 *   :rows="objects">
 *   <template #column-status="{ row, value }">
 *     <QuickStatusDropdown :case-obj="row" />
 *   </template>
 * </CnDataTable>
 * ```
 */
export default {
	name: 'CnDataTable',

	components: {
		NcLoadingIcon,
		NcCheckboxRadioSwitch,
		CnCellRenderer,
	},

	props: {
		/**
		 * Column definitions (manual mode).
		 * Not required when `schema` is provided.
		 * @type {Array<{key: string, label: string, sortable: boolean, width: string, class: string, cellClass: string}>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},
		/**
		 * Schema object with `properties` field (schema-driven mode).
		 * When provided, columns are auto-generated from schema properties.
		 */
		schema: {
			type: Object,
			default: null,
		},
		/** Per-column overrides when using schema mode: { key: { width, label, sortable, ... } } */
		columnOverrides: {
			type: Object,
			default: () => ({}),
		},
		/** Column keys to exclude when using schema mode */
		excludeColumns: {
			type: Array,
			default: () => [],
		},
		/** Column keys to include when using schema mode (whitelist) */
		includeColumns: {
			type: Array,
			default: null,
		},
		/** Row data array. Each row should have a unique identifier (see rowKey). */
		rows: {
			type: Array,
			default: () => [],
		},
		/** Whether data is loading (shows loading spinner) */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Current sort column key */
		sortKey: {
			type: String,
			default: null,
		},
		/** Current sort order: 'asc', 'desc', or null (no sort) */
		sortOrder: {
			type: String,
			default: 'asc',
			validator: (v) => v === null || ['asc', 'desc'].includes(v),
		},
		/** Whether rows can be selected with checkboxes */
		selectable: {
			type: Boolean,
			default: false,
		},
		/** Array of currently selected row IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},
		/** Property name used as unique row identifier */
		rowKey: {
			type: String,
			default: 'id',
		},
		/** Text shown when there are no rows */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No items found'),
		},
		/** Function returning CSS class(es) for a row: (row) => string|object */
		rowClass: {
			type: Function,
			default: null,
		},
		/** Function returning CSS class(es) for a data cell: (row, col) => string|object */
		cellClass: {
			type: Function,
			default: null,
		},
		/** Whether to constrain table height and make it scrollable */
		scrollable: {
			type: Boolean,
			default: false,
		},
		/** Text shown while loading */
		loadingText: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
	},

	computed: {
		/**
		 * Effective columns: schema-generated or manually provided.
		 * Schema columns take precedence when schema is provided and no manual columns given.
		 */
		effectiveColumns() {
			if (this.schema && this.columns.length === 0) {
				return columnsFromSchema(this.schema, {
					exclude: this.excludeColumns,
					include: this.includeColumns,
					overrides: this.columnOverrides,
				})
			}
			return this.columns
		},

		totalColumns() {
			let count = this.effectiveColumns.length
			if (this.selectable) count++
			if (this.$scopedSlots['row-actions']) count++
			return count
		},

		allSelected() {
			return this.rows.length > 0
				&& this.rows.every((row) => this.selectedIds.includes(row[this.rowKey]))
		},

		someSelected() {
			return this.rows.some((row) => this.selectedIds.includes(row[this.rowKey]))
		},
	},

	methods: {
		/**
		 * Get a cell value from a row using dot-notation key.
		 * @param {object} row The row data
		 * @param {string} key The column key (supports dot notation: 'address.city')
		 * @return {*} The cell value
		 */
		getCellValue(row, key) {
			if (key.includes('.')) {
				return key.split('.').reduce((obj, k) => obj?.[k], row)
			}
			return row[key]
		},

		/**
		 * Check if a column was generated from schema (has type info).
		 * @param {object} col Column definition
		 * @return {boolean}
		 */
		isSchemaColumn(col) {
			return !!(this.schema && col.type)
		},

		/**
		 * Get the schema property definition for a column key.
		 * @param {string} key Column key
		 * @return {object} Property definition
		 */
		getSchemaProperty(key) {
			return this.schema?.properties?.[key] || {}
		},

		isSelected(row) {
			return this.selectedIds.includes(row[this.rowKey])
		},

		/**
		 * Handle sort column click.
		 * @param {string} key Column key
		 */
		onSort(key) {
			let newKey = key
			let order = 'asc'
			if (this.sortKey === key) {
				if (this.sortOrder === 'asc') {
					order = 'desc'
				} else {
					// desc → disabled: clear sort entirely
					newKey = null
					order = null
				}
			}
			/**
			 * @event sort Emitted when a sortable column header is clicked.
			 * @type {{ key: string|null, order: 'asc'|'desc'|null }}
			 */
			this.$emit('sort', { key: newKey, order })
		},

		toggleSelect(row) {
			const id = row[this.rowKey]
			const newIds = this.isSelected(row)
				? this.selectedIds.filter((i) => i !== id)
				: [...this.selectedIds, id]
			/** @event select Emitted when row selection changes. Payload: array of selected IDs. */
			this.$emit('select', newIds)
		},

		toggleSelectAll() {
			if (this.allSelected) {
				// Remove only current page IDs, preserving cross-page selections
				const currentPageIds = new Set(this.rows.map((row) => row[this.rowKey]))
				this.$emit('select', this.selectedIds.filter((id) => !currentPageIds.has(id)))
			} else {
				// Add current page IDs to existing selections
				const merged = new Set([...this.selectedIds, ...this.rows.map((row) => row[this.rowKey])])
				this.$emit('select', [...merged])
			}
			/** @event select-all Emitted when select-all checkbox is toggled. */
			this.$emit('select-all', !this.allSelected)
		},
	},
}
</script>
