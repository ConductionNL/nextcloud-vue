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
						v-for="col in columns"
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
						<!-- Actions header intentionally empty -->
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
					@click="$emit('row-click', row)">
					<!-- Checkbox -->
					<td v-if="selectable" class="cn-table-col--checkbox" @click.stop>
						<NcCheckboxRadioSwitch
							:checked="isSelected(row)"
							@update:checked="toggleSelect(row)" />
					</td>

					<!-- Data cells -->
					<td
						v-for="col in columns"
						:key="col.key"
						:class="col.cellClass || ''"
						:style="col.width ? { maxWidth: col.width } : {}">
						<slot :name="'column-' + col.key" :row="row" :value="getCellValue(row, col.key)">
							{{ getCellValue(row, col.key) }}
						</slot>
					</td>

					<!-- Row actions -->
					<td v-if="$scopedSlots['row-actions']" class="cn-table-col--actions" @click.stop>
						<slot name="row-actions" :row="row" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import { NcLoadingIcon, NcCheckboxRadioSwitch } from '@nextcloud/vue'

/**
 * CnDataTable — Generic sortable data table for list views.
 *
 * Replaces the copy-pasted `<table class="viewTable">` HTML pattern found in
 * every list view across OpenRegister, Pipelinq, and Procest. Supports sorting,
 * row selection, custom cell rendering via scoped slots, loading states,
 * and empty states.
 *
 * NL Design tokens used:
 * - --nldesign-component-table-header-background-color
 * - --nldesign-component-table-row-hover-background-color
 * - --nldesign-component-table-border-color
 *
 * @example
 * <CnDataTable
 *   :columns="[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'status', label: 'Status', sortable: true, width: '120px' },
 *   ]"
 *   :rows="clients"
 *   :loading="isLoading"
 *   :sort-key="sortField"
 *   :sort-order="sortDirection"
 *   empty-text="No clients found"
 *   @sort="handleSort"
 *   @row-click="openClient">
 *   <template #column-status="{ value }">
 *     <CnStatusBadge :label="value" :color-map="statusColors" />
 *   </template>
 *   <template #row-actions="{ row }">
 *     <NcActions><NcActionButton @click="edit(row)">Edit</NcActionButton></NcActions>
 *   </template>
 * </CnDataTable>
 */
export default {
	name: 'CnDataTable',

	components: {
		NcLoadingIcon,
		NcCheckboxRadioSwitch,
	},

	props: {
		/**
		 * Column definitions.
		 * @type {Array<{key: string, label: string, sortable?: boolean, width?: string, class?: string, cellClass?: string}>}
		 */
		columns: {
			type: Array,
			required: true,
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
		/** Current sort order: 'asc' or 'desc' */
		sortOrder: {
			type: String,
			default: 'asc',
			validator: (v) => ['asc', 'desc'].includes(v),
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
			default: 'No items found',
		},
		/** Function returning CSS class(es) for a row: (row) => string|object */
		rowClass: {
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
			default: 'Loading...',
		},
	},

	computed: {
		totalColumns() {
			let count = this.columns.length
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

		isSelected(row) {
			return this.selectedIds.includes(row[this.rowKey])
		},

		/**
		 * Handle sort column click.
		 * @param {string} key Column key
		 */
		onSort(key) {
			let order = 'asc'
			if (this.sortKey === key) {
				order = this.sortOrder === 'asc' ? 'desc' : 'asc'
			}
			/**
			 * @event sort Emitted when a sortable column header is clicked.
			 * @type {{ key: string, order: 'asc'|'desc' }}
			 */
			this.$emit('sort', { key, order })
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
				this.$emit('select', [])
			} else {
				this.$emit('select', this.rows.map((row) => row[this.rowKey]))
			}
			/** @event select-all Emitted when select-all checkbox is toggled. */
			this.$emit('select-all', !this.allSelected)
		},
	},
}
</script>
