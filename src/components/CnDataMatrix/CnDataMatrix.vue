<template>
	<div class="cn-data-matrix" data-testid="cn-data-matrix">
		<header v-if="title || description" class="cn-data-matrix__header">
			<h3 v-if="title" class="cn-data-matrix__title">{{ title }}</h3>
			<p v-if="description" class="cn-data-matrix__description">{{ description }}</p>
		</header>

		<div class="cn-data-matrix__scroller">
			<table class="cn-data-matrix__table">
				<thead>
					<tr>
						<th v-if="rowHeader" class="cn-data-matrix__row-header-corner">{{ rowHeader }}</th>
						<th v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__col-header"
							:style="col.width ? { width: col.width } : null">
							{{ col.label || col.key }}
						</th>
						<th v-if="showRowTotals" class="cn-data-matrix__total-header">{{ rowTotalsLabel }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows"
						:key="row[rowIdKey]"
						class="cn-data-matrix__row">
						<th v-if="rowHeader" class="cn-data-matrix__row-header" :title="row[rowLabelKey]">
							{{ row[rowLabelKey] }}
						</th>
						<td v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__cell"
							:class="cellClass(row, col)"
							:data-row-id="row[rowIdKey]"
							:data-col-key="col.key">
							<input v-if="isEditing(row, col)"
								ref="activeInput"
								type="text"
								class="cn-data-matrix__cell-input"
								:value="cellValue(row, col)"
								:disabled="readOnly || isCellReadOnly(row, col)"
								@blur="commitEdit(row, col, $event.target.value)"
								@keydown.enter="commitEdit(row, col, $event.target.value)"
								@keydown.esc="cancelEdit">
							<span v-else
								class="cn-data-matrix__cell-value"
								@click="startEdit(row, col)">
								{{ formatCell(cellValue(row, col), col) }}
							</span>
						</td>
						<td v-if="showRowTotals" class="cn-data-matrix__total-cell">
							{{ formatCell(rowTotal(row), { type: 'number' }) }}
						</td>
					</tr>
					<tr v-if="showColumnTotals" class="cn-data-matrix__totals-row">
						<th v-if="rowHeader" class="cn-data-matrix__totals-label">{{ columnTotalsLabel }}</th>
						<td v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__total-cell">
							{{ formatCell(columnTotal(col), { type: 'number' }) }}
						</td>
						<td v-if="showRowTotals" class="cn-data-matrix__total-cell cn-data-matrix__grand-total">
							{{ formatCell(grandTotal, { type: 'number' }) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<p v-if="rows.length === 0" class="cn-data-matrix__empty">{{ emptyLabel }}</p>
	</div>
</template>

<script>
/**
 * CnDataMatrix — Inline-edit data grid for matrix-shaped data
 * (rows × columns). Each cell is click-to-edit; commits emit
 * `@cell-edit({ rowId, colKey, value })` so the parent can persist.
 * Optional row / column / grand totals computed from the live data
 * with the column's `aggregate` setting (`sum` by default).
 *
 * Use for gradebooks, weight matrices, allocation tables, scoring
 * rubrics — the "spreadsheet" shape where cells are independently
 * editable values rather than a row/object form.
 *
 * Not a full spreadsheet engine — there's no formula language, no
 * cell-range references, no charts. Consumers wanting that should
 * embed a dedicated library (e.g. handsontable) and use this for
 * the simpler cases.
 *
 * ```vue
 * <CnDataMatrix
 *   title="Cohort gradebook"
 *   row-header="Student"
 *   :rows="students"
 *   :columns="[
 *     { key: 'midterm',  label: 'Midterm',  type: 'number', aggregate: 'sum' },
 *     { key: 'final',    label: 'Final',    type: 'number', aggregate: 'sum' },
 *     { key: 'notes',    label: 'Notes',    type: 'string', readOnly: true },
 *   ]"
 *   :show-row-totals="true"
 *   :show-column-totals="true"
 *   @cell-edit="onCellEdit" />
 * ```
 */
export default {
	name: 'CnDataMatrix',
	props: {
		/**
		 * Row records. Each record holds an `id`, an optional row
		 * label, and one field per column key.
		 *
		 * @type {Array<object>}
		 */
		rows: { type: Array, default: () => [] },
		/**
		 * Column declarations.
		 *
		 * @type {Array<{key:string,label?:string,type?:'number'|'string',readOnly?:boolean,formatter?:Function,aggregate?:'sum'|'avg'|'count'|'none',width?:string}>}
		 */
		columns: { type: Array, default: () => [] },
		/** Field on each row carrying its id. */
		rowIdKey: { type: String, default: 'id' },
		/** Field on each row carrying its label (shown in the row header). */
		rowLabelKey: { type: String, default: 'label' },
		/** Header for the row-label column (empty hides it). */
		rowHeader: { type: String, default: '' },
		/** Optional title. */
		title: { type: String, default: '' },
		/** Optional description. */
		description: { type: String, default: '' },
		/** Empty-state text when rows[] is empty. */
		emptyLabel: { type: String, default: 'No data.' },
		/** Disable all cell editing globally. */
		readOnly: { type: Boolean, default: false },
		/** Render the per-row totals column. */
		showRowTotals: { type: Boolean, default: false },
		/** Render the per-column totals row at the bottom. */
		showColumnTotals: { type: Boolean, default: false },
		/** Label for the row-totals column header. */
		rowTotalsLabel: { type: String, default: 'Total' },
		/** Label preceding the column-totals row. */
		columnTotalsLabel: { type: String, default: 'Total' },
	},
	data() {
		return {
			editing: null, // { rowId, colKey }
		}
	},
	computed: {
		/**
		 * Grand total (sum of every numeric cell). Shown in the
		 * bottom-right corner when both totals are enabled.
		 *
		 * @return {number}
		 */
		grandTotal() {
			let total = 0
			for (const row of this.rows) {
				for (const col of this.columns) {
					if (col.type === 'number') {
						const v = Number(row[col.key])
						if (Number.isFinite(v)) total += v
					}
				}
			}
			return total
		},
	},
	methods: {
		/**
		 * Whether the given (row, col) is the active edit cell.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {boolean}
		 */
		isEditing(row, col) {
			return this.editing && this.editing.rowId === row[this.rowIdKey] && this.editing.colKey === col.key
		},
		/**
		 * Effective read-only flag for a single cell.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {boolean}
		 */
		isCellReadOnly(row, col) {
			return Boolean(col.readOnly)
		},
		/**
		 * Read the cell value from the row.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {*} The raw value.
		 */
		cellValue(row, col) {
			return row[col.key]
		},
		/**
		 * Format a cell value for display. Number columns get a
		 * locale-formatted number; others go through the column's
		 * `formatter` (if any) or are returned verbatim.
		 *
		 * @param {*} value The raw value.
		 * @param {object} col Column definition.
		 * @return {string} The display string.
		 */
		formatCell(value, col) {
			if (value === undefined || value === null || value === '') return ''
			if (typeof col.formatter === 'function') return col.formatter(value)
			if (col.type === 'number') {
				const n = Number(value)
				if (!Number.isFinite(n)) return value
				return n.toLocaleString()
			}
			return value
		},
		/**
		 * BEM modifier(s) for a cell — currently only the read-only
		 * flag. Consumers extend via the `formatter` if they want
		 * to swap to a styled component.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {object} Class binding.
		 */
		cellClass(row, col) {
			return {
				'cn-data-matrix__cell--read-only': this.readOnly || this.isCellReadOnly(row, col),
				'cn-data-matrix__cell--number': col.type === 'number',
			}
		},
		/**
		 * Start editing a cell.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {void}
		 */
		startEdit(row, col) {
			if (this.readOnly || this.isCellReadOnly(row, col)) return
			this.editing = { rowId: row[this.rowIdKey], colKey: col.key }
			this.$nextTick(() => {
				if (this.$refs.activeInput && this.$refs.activeInput[0]) {
					this.$refs.activeInput[0].focus()
					this.$refs.activeInput[0].select()
				} else if (this.$refs.activeInput && this.$refs.activeInput.focus) {
					this.$refs.activeInput.focus()
					this.$refs.activeInput.select()
				}
			})
		},
		/**
		 * Commit an edit — coerces the value to the column type and
		 * emits `@cell-edit`.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @param {string} raw The raw input string.
		 * @return {void}
		 */
		commitEdit(row, col, raw) {
			if (!this.editing) return
			let value = raw
			if (col.type === 'number') {
				const n = Number(raw)
				value = Number.isFinite(n) ? n : null
			}
			this.editing = null
			/**
			 * @event cell-edit Emitted on commit (blur or Enter).
			 *   Payload: `{rowId, colKey, value, row}`.
			 * @type {object}
			 */
			this.$emit('cell-edit', { rowId: row[this.rowIdKey], colKey: col.key, value, row })
		},
		/**
		 * Cancel the active edit (Esc).
		 *
		 * @return {void}
		 */
		cancelEdit() {
			this.editing = null
		},
		/**
		 * Per-row total — sum of every numeric column.
		 *
		 * @param {object} row Row record.
		 * @return {number}
		 */
		rowTotal(row) {
			let total = 0
			for (const col of this.columns) {
				if (col.type === 'number') {
					const v = Number(row[col.key])
					if (Number.isFinite(v)) total += v
				}
			}
			return total
		},
		/**
		 * Per-column total — aggregate over all rows using the
		 * column's `aggregate` setting (`sum` by default).
		 *
		 * @param {object} col Column definition.
		 * @return {number}
		 */
		columnTotal(col) {
			if (col.type !== 'number') return ''
			const mode = col.aggregate || 'sum'
			if (mode === 'none') return ''
			const values = this.rows
				.map((r) => Number(r[col.key]))
				.filter((v) => Number.isFinite(v))
			if (values.length === 0) return 0
			if (mode === 'count') return values.length
			if (mode === 'avg') return values.reduce((a, b) => a + b, 0) / values.length
			// default: sum
			return values.reduce((a, b) => a + b, 0)
		},
	},
}
</script>

<style scoped>
.cn-data-matrix {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-data-matrix__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-data-matrix__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-data-matrix__scroller {
	overflow-x: auto;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.cn-data-matrix__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.95em;
}

.cn-data-matrix__col-header,
.cn-data-matrix__row-header-corner,
.cn-data-matrix__total-header {
	background: var(--color-background-hover);
	text-align: left;
	padding: 8px 10px;
	font-weight: 600;
	border-bottom: 1px solid var(--color-border);
	border-right: 1px solid var(--color-border);
}

.cn-data-matrix__row-header {
	background: var(--color-background-hover);
	text-align: left;
	padding: 6px 10px;
	font-weight: 500;
	border-right: 1px solid var(--color-border);
	border-bottom: 1px solid var(--color-border);
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-data-matrix__cell {
	padding: 0;
	border-right: 1px solid var(--color-border);
	border-bottom: 1px solid var(--color-border);
	min-width: 80px;
}

.cn-data-matrix__cell--number {
	text-align: right;
}

.cn-data-matrix__cell-value {
	display: block;
	padding: 6px 10px;
	cursor: cell;
	min-height: 28px;
}

.cn-data-matrix__cell--read-only .cn-data-matrix__cell-value {
	cursor: default;
	background: var(--color-background-hover);
}

.cn-data-matrix__cell-input {
	width: 100%;
	padding: 5px 10px;
	border: 1px solid var(--color-primary-element);
	background: var(--color-main-background);
	outline: none;
	font: inherit;
}

.cn-data-matrix__totals-row .cn-data-matrix__total-cell,
.cn-data-matrix__total-header {
	background: var(--color-background-darker, var(--color-background-hover));
	font-weight: 600;
	text-align: right;
	padding: 6px 10px;
}

.cn-data-matrix__totals-label {
	background: var(--color-background-darker, var(--color-background-hover));
	font-weight: 600;
	padding: 6px 10px;
	text-align: left;
}

.cn-data-matrix__grand-total {
	background: var(--color-primary-element-light);
}

.cn-data-matrix__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}
</style>
