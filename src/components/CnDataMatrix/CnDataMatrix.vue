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
						<th v-if="rowHeader" class="cn-data-matrix__row-header-corner">
							{{ rowHeader }}
						</th>
						<th v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__col-header"
							:style="col.width ? { width: col.width } : null">
							{{ col.label || col.key }}
							<span v-if="weightText(col)" class="cn-data-matrix__weight">{{ weightText(col) }}</span>
						</th>
						<th v-if="showRowTotals" class="cn-data-matrix__total-header">
							{{ rowTotalsLabel }}
						</th>
						<th v-if="showRank" class="cn-data-matrix__total-header cn-data-matrix__rank-header">
							{{ resolvedRankLabel }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows"
						:key="row[rowIdKey]"
						class="cn-data-matrix__row"
						:class="{ 'cn-data-matrix__row--top': highlightTopRank && ranks.get(row[rowIdKey]) === 1 }">
						<th v-if="rowHeader"
							scope="row"
							class="cn-data-matrix__row-header"
							:title="row[rowLabelKey]">
							{{ row[rowLabelKey] }}
							<span v-if="rowSublabelKey && row[rowSublabelKey]" class="cn-data-matrix__row-sublabel">{{ row[rowSublabelKey] }}</span>
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
								:aria-label="inputLabel(row, col)"
								:disabled="readOnly || isCellReadOnly(row, col)"
								@blur="commitEdit(row, col, $event.target.value)"
								@keydown="onInputKeydown($event, row, col)">
							<span v-else
								class="cn-data-matrix__cell-value"
								:tabindex="isCellEditable(row, col) ? 0 : null"
								:role="isCellEditable(row, col) ? 'button' : null"
								:aria-label="isCellEditable(row, col) ? cellLabel(row, col) : null"
								@click="startEdit(row, col)"
								@keydown="onCellKeydown($event, row, col)">
								{{ formatCell(cellValue(row, col), col) }}
							</span>
						</td>
						<td v-if="showRowTotals" class="cn-data-matrix__total-cell">
							{{ formatTotal(rowTotal(row)) }}
						</td>
						<td v-if="showRank" class="cn-data-matrix__total-cell cn-data-matrix__rank-cell">
							{{ ranks.has(row[rowIdKey]) ? ranks.get(row[rowIdKey]) : '' }}
						</td>
					</tr>
					<tr v-if="showColumnTotals" class="cn-data-matrix__totals-row">
						<th v-if="rowHeader" class="cn-data-matrix__totals-label">
							{{ columnTotalsLabel }}
						</th>
						<td v-for="col in columns"
							:key="col.key"
							class="cn-data-matrix__total-cell">
							{{ formatCell(columnTotal(col), { type: 'number' }) }}
						</td>
						<td v-if="showRowTotals" class="cn-data-matrix__total-cell cn-data-matrix__grand-total">
							{{ formatTotal(grandTotal) }}
						</td>
						<td v-if="showRank" class="cn-data-matrix__total-cell" />
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
import { evalFormula } from '../../utils/evalFormula.js'
import { userLocale } from '../../utils/userLocale.js'

const ROUNDERS = Object.freeze({ round: Math.round, ceil: Math.ceil, floor: Math.floor })

/**
 * The number a cell holds; an empty cell is no number, rather than zero.
 *
 * @param {unknown} raw The cell.
 * @return {number|null} The number, or null.
 */
function numberIn(raw) {
	return raw === null || raw === undefined || raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw)
}

/**
 * CnDataMatrix — Inline-edit data grid for matrix-shaped data
 * (rows × columns). Each cell is click-to-edit, and keyboard editable:
 * Tab reaches it, Enter or F2 opens it, Enter commits, Escape cancels. Commits emit
 * `@cell-edit({ rowId, colKey, value })` so the parent can persist.
 * Optional row / column / grand totals computed from the live data
 * with the column's `aggregate` setting (`sum` by default).
 *
 * Use for gradebooks, weight matrices, allocation tables, scoring
 * rubrics — the "spreadsheet" shape where cells are independently
 * editable values rather than a row/object form.
 *
 * A column with `formula` computes its cells from the other columns and is
 * read only: `now*(rate/100)`, with `prev_now` for the row above and `round`
 * set to `round`, `ceil` or `floor`. A row where the formula has no answer shows
 * its own stored value. Formulas are arithmetic only, through `evalFormula`.
 *
 * A scoring matrix weighs its columns: give each column a `weight` (and an
 * optional `weightLabel` such as "40%"), set `rowTotalsMode="weighted"` and
 * the row total is the weighted mean of the row's scores. `showRank` ranks
 * the rows by that total, highest first, and `highlightTopRank` tints the
 * leading row.
 *
 * Not a full spreadsheet engine — there are no cell-range references, no
 * charts. Consumers wanting that should
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
		 * @type {Array<{key:string,label?:string,type?:'number'|'string',readOnly?:boolean,formula?:string,round?:'round'|'ceil'|'floor',formatter?:(value: unknown) => string,aggregate?:'sum'|'avg'|'count'|'none',width?:string,weight?:number,weightLabel?:string}>}
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
		/**
		 * How a row total is computed: `sum` adds the number columns,
		 * `weighted` takes the mean of the number columns weighted by each
		 * column's `weight`, leaving out a cell without a value.
		 */
		rowTotalsMode: { type: String, default: 'sum', validator: (v) => ['sum', 'weighted'].includes(v) },
		/** Fraction digits of the totals; null keeps the locale default. */
		totalsFractionDigits: { type: Number, default: null },
		/** Render a rank column: the rows ranked by their row total, highest first, ties sharing a rank. */
		showRank: { type: Boolean, default: false },
		/** Header of the rank column, already translated; the library default is "Rank". */
		rankLabel: { type: String, default: '' },
		/** Tint the row ranked first. */
		highlightTopRank: { type: Boolean, default: false },
		/** Field on each row with a second line under its label, such as a price. */
		rowSublabelKey: { type: String, default: '' },
	},

	emits: ['cell-edit'],
	data() {
		return {
			editing: null, // { rowId, colKey }
		}
	},

	computed: {
		/** @return {string} The rank column header. */
		resolvedRankLabel() {
			return this.rankLabel || t('nextcloud-vue', 'Rank')
		},

		/**
		 * The rank of every row with a row total: highest total first, rows
		 * with an equal total sharing a rank (1, 2, 2, 4).
		 *
		 * @return {Map<unknown, number>} Rank per row id.
		 */
		ranks() {
			const totals = this.rows
				.map((row) => ({ id: row[this.rowIdKey], total: this.rowTotal(row) }))
				.filter((entry) => Number.isFinite(entry.total))
				.sort((a, b) => b.total - a.total)
			const ranks = new Map()
			totals.forEach((entry, index) => {
				const previous = totals[index - 1]
				ranks.set(entry.id, previous && previous.total === entry.total ? ranks.get(previous.id) : index + 1)
			})
			return ranks
		},

		/**
		 * The computed cells of every row, in order. A formula reads the row's
		 * numbers by column key and the previous row's as `prev_<key>`, and sees
		 * formula columns to its left. A formula without an answer has no entry
		 * here, so the cell shows what the row itself holds.
		 *
		 * @return {Map<object, Record<string, number>>} Computed values per row.
		 */
		formulaValues() {
			const values = new Map()
			if (!this.columns.some((col) => col.formula)) {
				return values
			}
			let previous = {}
			for (const row of this.rows) {
				const vars = { ...previous }
				for (const col of this.columns) {
					if (!col.formula && numberIn(row[col.key]) !== null) {
						vars[col.key] = numberIn(row[col.key])
					}
				}
				const computed = {}
				for (const col of this.columns) {
					if (col.formula) {
						const answer = evalFormula(col.formula, vars)
						if (answer !== null) {
							computed[col.key] = (ROUNDERS[col.round] ?? Number)(answer)
							vars[col.key] = computed[col.key]
						} else if (numberIn(row[col.key]) !== null) {
							vars[col.key] = numberIn(row[col.key])
						}
					}
				}
				values.set(row, computed)
				previous = Object.fromEntries(Object.entries(vars).filter(([key]) => !key.startsWith('prev_')).map(([key, value]) => [`prev_${key}`, value]))
			}
			return values
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
						const v = Number(this.cellValue(row, col))
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
			return Boolean(col.readOnly || col.formula)
		},

		/**
		 * Whether a cell can be edited, and so takes keyboard focus.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {boolean}
		 */
		isCellEditable(row, col) {
			return !this.readOnly && !this.isCellReadOnly(row, col)
		},

		/**
		 * Accessible name of a cell's input: its column and row.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {string} The label.
		 */
		inputLabel(row, col) {
			return t('nextcloud-vue', '{column}, {row}', {
				column: col.label || col.key,
				row: row[this.rowLabelKey] ?? row[this.rowIdKey],
			}, undefined, { escape: false })
		},

		/**
		 * Accessible name of an editable cell: its column, row and value.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {string} The label.
		 */
		cellLabel(row, col) {
			const value = this.formatCell(this.cellValue(row, col), col)
			const vars = { cell: this.inputLabel(row, col), value: String(value) }
			return value === ''
				? t('nextcloud-vue', '{cell}: empty', vars, undefined, { escape: false })
				: t('nextcloud-vue', '{cell}: {value}', vars, undefined, { escape: false })
		},

		/**
		 * Enter or F2 on a focused cell starts editing it.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {void}
		 */
		onCellKeydown(event, row, col) {
			if ((event.key === 'Enter' || event.key === 'F2') && this.isCellEditable(row, col)) {
				event.preventDefault()
				this.startEdit(row, col)
			}
		},

		/**
		 * Enter commits and Escape cancels the edit; both return focus to the cell.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {void}
		 */
		onInputKeydown(event, row, col) {
			if (event.key === 'Enter') {
				event.preventDefault()
				this.commitEdit(row, col, event.target.value)
				this.focusCell(row, col)
			} else if (event.key === 'Escape' || event.key === 'Esc') {
				event.preventDefault()
				this.cancelEdit()
				this.focusCell(row, col)
			}
		},

		/**
		 * Move focus to a cell's value after the edit input is gone.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {void}
		 */
		focusCell(row, col) {
			const rowId = String(row[this.rowIdKey])
			this.$nextTick(() => {
				const cell = Array.from(this.$el.querySelectorAll('.cn-data-matrix__cell'))
					.find((td) => td.dataset.rowId === rowId && td.dataset.colKey === col.key)
				cell?.querySelector('.cn-data-matrix__cell-value')?.focus()
			})
		},

		/**
		 * Read the cell value from the row.
		 *
		 * @param {object} row Row record.
		 * @param {object} col Column definition.
		 * @return {unknown} The raw value.
		 */
		cellValue(row, col) {
			if (col.formula && this.formulaValues.get(row)?.[col.key] !== undefined) {
				return this.formulaValues.get(row)[col.key]
			}
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
		 * The weight shown beside a column label: `weightLabel`, else the
		 * `weight` itself, or '' for an unweighted column.
		 *
		 * @param {object} col Column definition.
		 * @return {string} The weight text.
		 */
		weightText(col) {
			if (typeof col.weightLabel === 'string' && col.weightLabel !== '') {
				return col.weightLabel
			}
			return Number.isFinite(col.weight) ? String(col.weight) : ''
		},

		/**
		 * Format a total with `totalsFractionDigits` when set.
		 *
		 * @param {number|null} value The total.
		 * @return {string} The display string.
		 */
		formatTotal(value) {
			if (!Number.isFinite(value)) {
				return ''
			}
			if (this.totalsFractionDigits === null) {
				return this.formatCell(value, { type: 'number' })
			}
			const digits = this.totalsFractionDigits
			return value.toLocaleString(userLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })
		},

		/**
		 * Per-row total: the sum of every numeric column, or in `weighted`
		 * mode the weighted mean over the weighted columns that hold a value
		 * (null when none does).
		 *
		 * @param {object} row Row record.
		 * @return {number|null}
		 */
		rowTotal(row) {
			if (this.rowTotalsMode === 'weighted') {
				let weighted = 0
				let weights = 0
				for (const col of this.columns) {
					const raw = this.cellValue(row, col)
					const v = Number(raw)
					if (col.type === 'number' && Number.isFinite(col.weight) && col.weight > 0 && raw !== null && raw !== undefined && raw !== '' && Number.isFinite(v)) {
						weighted += v * col.weight
						weights += col.weight
					}
				}
				return weights > 0 ? weighted / weights : null
			}
			let total = 0
			for (const col of this.columns) {
				if (col.type === 'number') {
					const v = Number(this.cellValue(row, col))
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
				.map((r) => this.cellValue(r, col))
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

.cn-data-matrix__cell-value:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
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

.cn-data-matrix__weight {
	color: var(--color-text-maxcontrast);
	font-weight: 400;
	white-space: nowrap;
}

.cn-data-matrix__row-sublabel {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-weight: 400;
}

.cn-data-matrix__row--top > th,
.cn-data-matrix__row--top > td {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-data-matrix__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}
</style>
