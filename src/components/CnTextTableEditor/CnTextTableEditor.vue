<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-text-table-editor">
		<div class="cn-text-table-editor__toolbar">
			<label class="cn-text-table-editor__inline">
				<input
					type="checkbox"
					:checked="value.headerRow"
					@change="onHeaderRowToggle($event.target.checked)">
				{{ t('nextcloud-vue', 'Header row') }}
			</label>

			<button
				type="button"
				class="cn-text-table-editor__btn"
				@click="onAddRow('above')">
				{{ t('nextcloud-vue', 'Add row above') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				@click="onAddRow('below')">
				{{ t('nextcloud-vue', 'Add row below') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				@click="onAddColumn('left')">
				{{ t('nextcloud-vue', 'Add column left') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				@click="onAddColumn('right')">
				{{ t('nextcloud-vue', 'Add column right') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				:disabled="!hasSelection"
				@click="onDeleteRow">
				{{ t('nextcloud-vue', 'Delete row') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				:disabled="!hasSelection"
				@click="onDeleteColumn">
				{{ t('nextcloud-vue', 'Delete column') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				:disabled="!canMerge"
				@click="onMergeCells">
				{{ t('nextcloud-vue', 'Merge cells') }}
			</button>
			<button
				type="button"
				class="cn-text-table-editor__btn"
				:disabled="!canSplit"
				@click="onSplitCell">
				{{ t('nextcloud-vue', 'Split cell') }}
			</button>
		</div>

		<div class="cn-text-table-editor__alignments">
			<span class="cn-text-table-editor__hint">{{ t('nextcloud-vue', 'Column alignment') }}:</span>
			<select
				v-for="(_, cIdx) in value.columnAlignments"
				:key="`align-${cIdx}`"
				class="cn-text-table-editor__align-select"
				:value="value.columnAlignments[cIdx]"
				:aria-label="t('nextcloud-vue', 'Column alignment')"
				@change="onAlignmentChange(cIdx, $event.target.value)">
				<option value="left">
					{{ t('nextcloud-vue', 'Left') }}
				</option>
				<option value="center">
					{{ t('nextcloud-vue', 'Center') }}
				</option>
				<option value="right">
					{{ t('nextcloud-vue', 'Right') }}
				</option>
			</select>
		</div>

		<div v-if="errorMessage" class="cn-text-table-editor__error">
			{{ errorMessage }}
		</div>

		<table class="cn-text-table-editor__grid">
			<tbody>
				<tr v-for="(row, rIdx) in value.rows" :key="`r-${rIdx}`">
					<template v-for="(cell, cIdx) in row" :key="`c-${rIdx}-${cIdx}`">
						<td
							v-show="!isPlaceholder(rIdx, cIdx)"
							:rowspan="cell.rowSpan || 1"
							:colspan="cell.colSpan || 1"
							:class="cellClass(rIdx, cIdx)"
							:style="cellStyle(cIdx)"
							@click="selectCell(rIdx, cIdx, $event)">
							<input
								type="text"
								class="cn-text-table-editor__input"
								:value="cell.text"
								:placeholder="cellPlaceholder(rIdx)"
								:aria-label="cellLabel(rIdx, cIdx)"
								@input="onCellInput(rIdx, cIdx, $event.target.value)"
								@focus="selectCell(rIdx, cIdx, $event)">
						</td>
					</template>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	emptyTable,
	addRow,
	addColumn,
	deleteRow,
	deleteColumn,
	mergeCells,
	splitCell,
	setHeaderRow,
	setColumnAlignment,
	setCellText,
	isPlaceholderCell,
	validateTable,
} from '../../utils/textTable.js'

/**
 * CnTextTableEditor — in-place visual table editor used by the text widget form
 * when `tableMode === true`.
 *
 * Cells are edited directly in the grid (one `<input type="text">` per cell);
 * row/column/merge operations live in a toolbar above the grid. The editor is
 * "controlled": the parent owns the `tableData` state via `v-model` and
 * receives a fresh, validated copy on every change.
 *
 * Selection is single-cell by default; Shift+Click extends the selection to a
 * rectangular region so the user can merge cells. The Merge / Split / Delete
 * buttons enable / disable themselves based on the current selection.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnTextTableEditor',

	props: {
		/**
		 * The current tableData object — the `v-model` value.
		 *
		 * @type {{headerRow: boolean, columnAlignments: string[], rows: Array<Array<{text: string, rowSpan: number, colSpan: number}>>}}
		 */
		value: {
			type: Object,
			default: () => emptyTable(),
		},
	},

	emits: [
		/** `v-model` update; payload is the next validated tableData object. */
		'input',
	],

	data() {
		return {
			anchor: { rIdx: 0, cIdx: 0 },
			extent: { rIdx: 0, cIdx: 0 },
			errorMessage: '',
		}
	},

	computed: {
		/**
		 * Whether the table currently has a selectable cell (non-empty grid).
		 *
		 * @return {boolean} true when there is at least one row and column.
		 */
		hasSelection() {
			return this.value.rows.length > 0 && this.value.columnAlignments.length > 0
		},

		/**
		 * Whether the current selection spans more than one cell (merge gate).
		 *
		 * @return {boolean} true when anchor and extent differ.
		 */
		canMerge() {
			if (!this.hasSelection) {
				return false
			}
			return this.anchor.rIdx !== this.extent.rIdx
				|| this.anchor.cIdx !== this.extent.cIdx
		},

		/**
		 * Whether the anchored cell is a merged span that can be split.
		 *
		 * @return {boolean} true when the anchor cell has a row/col span > 1.
		 */
		canSplit() {
			if (!this.hasSelection) {
				return false
			}
			const cell = this.value.rows[this.anchor.rIdx]?.[this.anchor.cIdx]
			return cell && ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1)
		},
	},

	methods: {
		t,

		/**
		 * Translate a change-helper output into a `v-model` update, re-running
		 * validation so the user sees errors as they edit.
		 *
		 * @param {object} next the next tableData value.
		 * @return {void}
		 */
		emitUpdate(next) {
			const errors = validateTable(next)
			this.errorMessage = errors.length > 0 ? errors[0] : ''
			this.$emit('input', next)
		},

		/**
		 * Selection handling — single-click sets a new anchor; Shift+Click
		 * extends the selection from the current anchor for merge ops.
		 *
		 * @param {number} rIdx the clicked row.
		 * @param {number} cIdx the clicked column.
		 * @param {Event} event the originating click/focus event.
		 * @return {void}
		 */
		selectCell(rIdx, cIdx, event) {
			if (event && event.shiftKey) {
				this.extent = { rIdx, cIdx }
			} else {
				this.anchor = { rIdx, cIdx }
				this.extent = { rIdx, cIdx }
			}
		},

		/**
		 * Whether the cell at the coordinate is covered by another cell's span.
		 *
		 * @param {number} rIdx the row index.
		 * @param {number} cIdx the column index.
		 * @return {boolean} true when the cell is a hidden placeholder.
		 */
		isPlaceholder(rIdx, cIdx) {
			return isPlaceholderCell(this.value.rows, rIdx, cIdx)
		},

		/**
		 * Compute the class binding for a cell (header / anchor / selected).
		 *
		 * @param {number} rIdx the row index.
		 * @param {number} cIdx the column index.
		 * @return {object} the class binding object.
		 */
		cellClass(rIdx, cIdx) {
			const isAnchor = rIdx === this.anchor.rIdx && cIdx === this.anchor.cIdx
			const inSelection = this.cellInSelection(rIdx, cIdx)
			return {
				'cn-text-table-editor__cell': true,
				'cn-text-table-editor__cell--header': this.value.headerRow && rIdx === 0,
				'cn-text-table-editor__cell--anchor': isAnchor,
				'cn-text-table-editor__cell--selected': inSelection && !isAnchor,
			}
		},

		/**
		 * Whether the cell falls inside the current rectangular selection.
		 *
		 * @param {number} rIdx the row index.
		 * @param {number} cIdx the column index.
		 * @return {boolean} true when inside the anchor→extent rectangle.
		 */
		cellInSelection(rIdx, cIdx) {
			const r0 = Math.min(this.anchor.rIdx, this.extent.rIdx)
			const r1 = Math.max(this.anchor.rIdx, this.extent.rIdx)
			const c0 = Math.min(this.anchor.cIdx, this.extent.cIdx)
			const c1 = Math.max(this.anchor.cIdx, this.extent.cIdx)
			return rIdx >= r0 && rIdx <= r1 && cIdx >= c0 && cIdx <= c1
		},

		/**
		 * Compute the per-cell inline style (column text alignment).
		 *
		 * @param {number} cIdx the column index.
		 * @return {{'text-align': string}} the inline style object.
		 */
		cellStyle(cIdx) {
			return {
				'text-align': this.value.columnAlignments[cIdx] || 'left',
			}
		},

		/**
		 * Placeholder text for a cell input (Header vs Cell for the header row).
		 *
		 * @param {number} rIdx the row index.
		 * @return {string} the localised placeholder.
		 */
		cellPlaceholder(rIdx) {
			return this.value.headerRow && rIdx === 0
				? t('nextcloud-vue', 'Header')
				: t('nextcloud-vue', 'Cell')
		},

		/**
		 * Accessible label for a cell input naming its 1-indexed coordinate.
		 *
		 * @param {number} rIdx the row index.
		 * @param {number} cIdx the column index.
		 * @return {string} the localised aria-label.
		 */
		cellLabel(rIdx, cIdx) {
			return t('nextcloud-vue', 'Row {row}, column {col}', { row: rIdx + 1, col: cIdx + 1 })
		},

		/**
		 * Handle text input into a cell.
		 *
		 * @param {number} rIdx the row index.
		 * @param {number} cIdx the column index.
		 * @param {string} text the new cell text.
		 * @return {void}
		 */
		onCellInput(rIdx, cIdx, text) {
			this.emitUpdate(setCellText(this.value, rIdx, cIdx, text))
		},

		/**
		 * Toggle the header-row flag.
		 *
		 * @param {boolean} checked the new checkbox state.
		 * @return {void}
		 */
		onHeaderRowToggle(checked) {
			this.emitUpdate(setHeaderRow(this.value, checked === true))
		},

		/**
		 * Change a column's text alignment.
		 *
		 * @param {number} cIdx the column index.
		 * @param {string} alignment the new alignment value.
		 * @return {void}
		 */
		onAlignmentChange(cIdx, alignment) {
			this.emitUpdate(setColumnAlignment(this.value, cIdx, alignment))
		},

		/**
		 * Insert a row above or below the anchor.
		 *
		 * @param {'above'|'below'} position where to insert.
		 * @return {void}
		 */
		onAddRow(position) {
			this.emitUpdate(addRow(this.value, this.anchor.rIdx, position))
		},

		/**
		 * Insert a column left or right of the anchor.
		 *
		 * @param {'left'|'right'} position where to insert.
		 * @return {void}
		 */
		onAddColumn(position) {
			this.emitUpdate(addColumn(this.value, this.anchor.cIdx, position))
		},

		/**
		 * Delete the anchored row (confirms when it holds text).
		 *
		 * @return {void}
		 */
		onDeleteRow() {
			const rIdx = this.anchor.rIdx
			const row = this.value.rows[rIdx] || []
			const hasText = row.some((cell) => typeof cell?.text === 'string' && cell.text.trim() !== '')
			if (hasText) {
				const proceed = typeof window !== 'undefined' && typeof window.confirm === 'function'
					? window.confirm(t('nextcloud-vue', 'This row contains text. Delete?'))
					: true
				if (!proceed) {
					return
				}
			}
			this.emitUpdate(deleteRow(this.value, rIdx))
			this.anchor = { rIdx: Math.max(0, rIdx - 1), cIdx: this.anchor.cIdx }
			this.extent = { ...this.anchor }
		},

		/**
		 * Delete the anchored column (confirms when it holds text).
		 *
		 * @return {void}
		 */
		onDeleteColumn() {
			const cIdx = this.anchor.cIdx
			const hasText = this.value.rows.some(
				(row) => row[cIdx] && typeof row[cIdx].text === 'string' && row[cIdx].text.trim() !== '',
			)
			if (hasText) {
				const proceed = typeof window !== 'undefined' && typeof window.confirm === 'function'
					? window.confirm(t('nextcloud-vue', 'This column contains text. Delete?'))
					: true
				if (!proceed) {
					return
				}
			}
			this.emitUpdate(deleteColumn(this.value, cIdx))
			this.anchor = { rIdx: this.anchor.rIdx, cIdx: Math.max(0, cIdx - 1) }
			this.extent = { ...this.anchor }
		},

		/**
		 * Merge the current rectangular selection into one cell.
		 *
		 * @return {void}
		 */
		onMergeCells() {
			this.emitUpdate(mergeCells(this.value, this.anchor, this.extent))
			this.extent = { ...this.anchor }
		},

		/**
		 * Split the anchored merged cell back into 1×1 cells.
		 *
		 * @return {void}
		 */
		onSplitCell() {
			this.emitUpdate(splitCell(this.value, this.anchor.rIdx, this.anchor.cIdx))
		},
	},
}
</script>

<style scoped>
.cn-text-table-editor {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-text-table-editor__toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
}

.cn-text-table-editor__alignments {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
}

.cn-text-table-editor__hint {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-text-table-editor__inline {
	display: inline-flex;
	gap: 4px;
	align-items: center;
	font-size: 13px;
}

.cn-text-table-editor__btn {
	padding: 4px 8px;
	font-size: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	cursor: pointer;
}

.cn-text-table-editor__btn[disabled] {
	opacity: 0.5;
	cursor: not-allowed;
}

.cn-text-table-editor__align-select {
	font-size: 12px;
	padding: 2px 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
}

.cn-text-table-editor__error {
	color: var(--color-error, #d32f2f);
	font-size: 12px;
	padding: 4px 8px;
	border: 1px solid var(--color-error, #d32f2f);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
}

.cn-text-table-editor__grid {
	border-collapse: collapse;
	width: 100%;
}

.cn-text-table-editor__cell {
	border: 1px solid var(--color-border);
	padding: 0;
	vertical-align: top;
}

.cn-text-table-editor__cell--header {
	background: var(--color-background-hover);
	font-weight: bold;
}

.cn-text-table-editor__cell--anchor {
	outline: 2px solid var(--color-primary, #006aa3);
	outline-offset: -2px;
}

.cn-text-table-editor__cell--selected {
	background: var(--color-primary-light, #e8f1f8);
}

.cn-text-table-editor__input {
	width: 100%;
	padding: 6px 8px;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: inherit;
	box-sizing: border-box;
}

.cn-text-table-editor__input:focus {
	outline: none;
}
</style>
