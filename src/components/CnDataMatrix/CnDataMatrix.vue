<template>
	<div class="cn-data-matrix" data-testid="cn-data-matrix">
		<header v-if="title || description" class="cn-data-matrix__header">
			<h3 v-if="title" class="cn-data-matrix__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-data-matrix__description">
				{{ description }}
			</p>
		</header>

		<div class="cn-data-matrix__scroller">
			<table class="cn-data-matrix__table">
				<thead>
					<tr>
						<th v-if="rowHeader" class="cn-data-matrix__row-header-corner" scope="col">
							{{ rowHeader }}
						</th>
						<th v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__col-header"
							scope="col"
							:style="col.width ? { width: col.width } : null">
							{{ col.label || col.key }}
						</th>
						<th v-if="showRowTotals" class="cn-data-matrix__total-header" scope="col">
							{{ rowTotalsLabel }}
						</th>
						<th v-if="hasRowActions" class="cn-data-matrix__actions-header" scope="col">
							{{ rowActionsHeader }}
						</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="(row, rowIndex) in rows" :key="row[rowIdKey]">
						<tr v-if="startsGroup(rowIndex)"
							class="cn-data-matrix__group-row">
							<th :colspan="spanAll" scope="colgroup" class="cn-data-matrix__group-label">
								{{ row[groupKey] }}
							</th>
						</tr>
						<tr class="cn-data-matrix__row">
							<th v-if="rowHeader"
								class="cn-data-matrix__row-header"
								scope="row"
								:title="row[rowLabelKey]">
								{{ row[rowLabelKey] }}
							</th>
							<td v-for="col in columns"
								:key="col.key"
								class="cn-data-matrix__cell"
								:class="cellClass(row, col)"
								:data-row-id="row[rowIdKey]"
								:data-col-key="col.key">
								<template v-if="isEditing(row, col)">
									<textarea v-if="col.type === 'text'"
										ref="activeInput"
										class="cn-data-matrix__cell-input cn-data-matrix__cell-input--text"
										:aria-label="cellName(row, col)"
										:value="cellValue(row, col)"
										@blur="commitEdit(row, col, $event.target.value)"
										@keydown.esc="cancelEdit" />
									<input v-else
										ref="activeInput"
										type="text"
										class="cn-data-matrix__cell-input"
										:aria-label="cellName(row, col)"
										:value="cellValue(row, col)"
										:disabled="readOnly || isCellReadOnly(row, col)"
										@blur="commitEdit(row, col, $event.target.value)"
										@keydown.enter="commitEdit(row, col, $event.target.value)"
										@keydown.esc="cancelEdit">
								</template>
								<span v-else-if="isCellEditable(row, col)"
									class="cn-data-matrix__cell-value"
									role="button"
									tabindex="0"
									:aria-label="cellName(row, col)"
									@click="startEdit(row, col)"
									@keydown="onCellKeydown($event, row, col)">
									{{ formatCell(cellValue(row, col), col) }}
									<span v-if="isMarked(row, col)" class="cn-data-matrix__mark">{{ col.markLabel }}</span>
								</span>
								<span v-else class="cn-data-matrix__cell-value">
									{{ formatCell(cellValue(row, col), col) }}
									<span v-if="isMarked(row, col)" class="cn-data-matrix__mark">{{ col.markLabel }}</span>
								</span>
							</td>
							<td v-if="showRowTotals" class="cn-data-matrix__total-cell">
								{{ formatCell(rowTotal(row), { type: 'number' }) }}
							</td>
							<td v-if="hasRowActions" class="cn-data-matrix__actions-cell">
								<!-- @slot Actions for one row. Scope: `{ row }`. -->
								<slot name="row-actions" :row="row" />
							</td>
						</tr>
					</template>
					<tr v-if="showColumnTotals" class="cn-data-matrix__totals-row">
						<th v-if="rowHeader" class="cn-data-matrix__totals-label" scope="row">
							{{ columnTotalsLabel }}
						</th>
						<td v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__total-cell"
							:class="{ 'cn-data-matrix__total-cell--over': isOverNorm(col) }">
							{{ formatCell(columnTotal(col), { type: 'number' }) }}
							<span v-if="isOverNorm(col)" class="cn-data-matrix__mark">{{ overNormLabel }}</span>
						</td>
						<td v-if="showRowTotals" class="cn-data-matrix__total-cell cn-data-matrix__grand-total">
							{{ formatCell(grandTotal, { type: 'number' }) }}
						</td>
						<td v-if="hasRowActions" />
					</tr>
					<tr v-if="normRow" class="cn-data-matrix__norm-row">
						<th v-if="rowHeader" class="cn-data-matrix__totals-label" scope="row">
							{{ normRow.label }}
						</th>
						<td v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__total-cell">
							{{ formatCell(normOf(col), { type: 'number' }) }}
						</td>
						<td v-if="showRowTotals" />
						<td v-if="hasRowActions" />
					</tr>
				</tbody>
			</table>
		</div>

		<p v-if="rows.length === 0" class="cn-data-matrix__empty">
			{{ emptyLabel }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { userLocale } from '../../utils/userLocale.js'
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
 * Editable cells are reachable by keyboard (Tab, then Enter or F2). Rows
 * can be grouped (`groupKey`), a column can mark values below a threshold
 * (`markBelow`, said in text by `markLabel`), a `normRow` sets a norm per
 * column that its total is checked against, and the `#row-actions` slot adds
 * an actions column.
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
		 * `type: 'text'` edits in a multi-line field that commits on blur.
		 * `markBelow` marks a number below it, said by `markLabel`.
		 *
		 * @type {Array<{key:string,label?:string,type?:'number'|'string'|'text',readOnly?:boolean,formatter?:(value: unknown) => string,aggregate?:'sum'|'avg'|'count'|'none',width?:string,markBelow?:number,markLabel?:string}>}
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
		/** Field on each row naming its group; a group row is drawn before each new group. Empty draws none. */
		groupKey: { type: String, default: '' },
		/**
		 * A norm row below the totals: `{ label, values: { [colKey]: number } }`.
		 * A column total above its norm is marked.
		 *
		 * @type {{label: string, values: object}|null}
		 */
		normRow: { type: Object, default: null },
		/** Header of the row actions column, drawn when the `#row-actions` slot is used. */
		rowActionsHeader: { type: String, default: '' },
	},

	emits: ['cell-edit'],
	data() {
		return {
			editing: null, // { rowId, colKey }
		}
	},

	computed: {
		/** Whether the `#row-actions` slot adds an actions column. */
		hasRowActions() {
			return Boolean(this.$slots['row-actions'])
		},

		/**
		 * The number of columns a group row spans.
		 *
		 * @return {number}
		 */
		spanAll() {
			return this.columns.length + (this.rowHeader ? 1 : 0) + (this.showRowTotals ? 1 : 0) + (this.hasRowActions ? 1 : 0)
		},

		/** What a total above its norm says. */
		overNormLabel() {
			return t('nextcloud-vue', 'Above the norm')
		},

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
						if (Number.isFinite(v)) {
							total += v
						}
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
		 * Whether a cell can be edited.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {boolean}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-matrix-cells-are-reachable-by-keyboard
		 */
		isCellEditable(row, col) {
			return !this.readOnly && !this.isCellReadOnly(row, col)
		},

		/**
		 * The accessible name of a cell: its row, its column and its value.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {string}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-matrix-cells-are-reachable-by-keyboard
		 */
		cellName(row, col) {
			return t('nextcloud-vue', '{row}, {column}: {value}', {
				row: String(row[this.rowLabelKey] ?? row[this.rowIdKey] ?? ''),
				column: col.label || col.key,
				value: String(this.formatCell(this.cellValue(row, col), col)),
			})
		},

		/**
		 * Enter or F2 on a focused cell opens its editor.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {void}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-matrix-cells-are-reachable-by-keyboard
		 */
		onCellKeydown(event, row, col) {
			if (event.key === 'Enter' || event.key === 'F2') {
				event.preventDefault()
				this.startEdit(row, col)
			}
		},

		/**
		 * Whether a group row starts before the row at this index.
		 *
		 * @param {number} index The row index.
		 * @return {boolean}
		 */
		startsGroup(index) {
			if (!this.groupKey) {
				return false
			}
			const group = this.rows[index][this.groupKey]
			if (group === undefined || group === null || group === '') {
				return false
			}
			return index === 0 || this.rows[index - 1][this.groupKey] !== group
		},

		/**
		 * Whether a number cell is below its column's `markBelow`.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {boolean}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-shows-totals-and-checks-them-against-norms
		 */
		isMarked(row, col) {
			const below = Number(col.markBelow)
			const value = this.cellValue(row, col)
			if (!Number.isFinite(below) || col.markBelow === null || col.markBelow === undefined || value === null || value === undefined || value === '') {
				return false
			}
			const n = Number(value)
			return Number.isFinite(n) && n < below
		},

		/**
		 * The norm of a column, from `normRow`.
		 *
		 * @param {object} col Column definition.
		 * @return {number|string} The norm, or '' when it has none.
		 */
		normOf(col) {
			const value = this.normRow && this.normRow.values ? this.normRow.values[col.key] : undefined
			return value === undefined || value === null ? '' : value
		},

		/**
		 * Whether a column total is above its norm.
		 *
		 * @param {object} col Column definition.
		 * @return {boolean}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-shows-totals-and-checks-them-against-norms
		 */
		isOverNorm(col) {
			const norm = Number(this.normOf(col))
			if (this.normOf(col) === '' || !Number.isFinite(norm)) {
				return false
			}
			const total = Number(this.columnTotal(col))
			return Number.isFinite(total) && total > norm
		},

		/**
		 * Read the cell value from the row.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {unknown} The raw value.
		 */
		cellValue(row, col) {
			return row[col.key]
		},

		/**
		 * Format a cell value for display. Number columns get a
		 * locale-formatted number; others go through the column's
		 * `formatter` (if any) or are returned verbatim.
		 *
		 * @param {unknown} value The raw value.
		 * @param {object} col Column definition.
		 * @return {string} The display string.
		 */
		formatCell(value, col) {
			if (value === undefined || value === null || value === '') {
				return ''
			}
			if (typeof col.formatter === 'function') {
				return col.formatter(value)
			}
			if (col.type === 'number') {
				const n = Number(value)
				if (!Number.isFinite(n)) {
					return value
				}
				return n.toLocaleString(userLocale())
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
				'cn-data-matrix__cell--marked': this.isMarked(row, col),
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
			if (this.readOnly || this.isCellReadOnly(row, col)) {
				return
			}
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
			if (!this.editing) {
				return
			}
			let value = raw
			if (col.type === 'number') {
				const n = Number(raw)
				value = Number.isFinite(n) ? n : null
			}
			this.editing = null
			/**
			 * @event cell-edit Emitted on commit (blur or Enter).
			 *   Payload: `{rowId, colKey, value, raw, row}`; `raw` is the typed text.
			 * @type {object}
			 */
			this.$emit('cell-edit', { rowId: row[this.rowIdKey], colKey: col.key, value, raw, row })
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
					if (Number.isFinite(v)) {
						total += v
					}
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
			if (col.type !== 'number') {
				return ''
			}
			const mode = col.aggregate || 'sum'
			if (mode === 'none') {
				return ''
			}
			// Drop empty cells (null / undefined / '') BEFORE coercing —
			// `Number(null)` is `0`, which would otherwise be counted and
			// summed as a real zero value.
			const values = this.rows
				.map((r) => r[col.key])
				.filter((v) => v !== null && v !== undefined && v !== '')
				.map((v) => Number(v))
				.filter((v) => Number.isFinite(v))
			if (values.length === 0) {
				return 0
			}
			if (mode === 'count') {
				return values.length
			}
			if (mode === 'avg') {
				return values.reduce((a, b) => a + b, 0) / values.length
			}
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

.cn-data-matrix__cell-value:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-data-matrix__cell-input--text {
	min-height: 60px;
	resize: vertical;
}

.cn-data-matrix__cell--marked .cn-data-matrix__cell-value,
.cn-data-matrix__total-cell--over {
	color: var(--color-error-text, var(--color-error));
	font-weight: 600;
}

.cn-data-matrix__mark {
	margin-inline-start: 4px;
	font-size: 0.85em;
}

.cn-data-matrix__group-label {
	background: var(--color-background-dark, var(--color-background-hover));
	text-align: start;
	padding: 6px 10px;
	font-weight: 600;
	border-bottom: 1px solid var(--color-border);
}

.cn-data-matrix__norm-row .cn-data-matrix__total-cell {
	font-weight: 400;
	color: var(--color-text-maxcontrast);
	text-align: end;
	padding: 6px 10px;
}

.cn-data-matrix__actions-cell {
	padding: 2px 6px;
	border-bottom: 1px solid var(--color-border);
	white-space: nowrap;
}

.cn-data-matrix__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}
</style>
