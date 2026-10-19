<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-matrix-widget" data-testid="cn-matrix-widget">
		<p v-if="subtitle" class="cn-matrix-widget__subtitle">
			{{ subtitle }}
		</p>
		<div class="cn-matrix-widget__scroller">
			<table class="cn-matrix-widget__table">
				<caption class="hidden-visually">
					{{ caption }}
				</caption>
				<thead>
					<tr>
						<td class="cn-matrix-widget__corner" />
						<th
							v-for="column in columns"
							:key="column.value"
							scope="col"
							class="cn-matrix-widget__column-header">
							{{ column.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.value">
						<th scope="row" class="cn-matrix-widget__row-header">
							{{ row.label }}
						</th>
						<td
							v-for="cell in row.cells"
							:key="cell.column"
							class="cn-matrix-widget__cell"
							:class="{ 'cn-matrix-widget__cell--chosen': cell.chosen }"
							:data-tone="cell.tone || null"
							:aria-current="cell.chosen ? 'true' : null">
							<span class="cn-matrix-widget__text">{{ cell.text }}</span>
							<span v-if="cell.chosen" class="hidden-visually">{{ chosenLabel }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { readPath } from '../../utils/readPath.js'

/**
 * CnMatrixWidget: the `matrix` widget, a categorical grid with row and column
 * headers, a tone per cell and one chosen cell outlined.
 *
 * Board DqHandhaving draws the national enforcement strategy this way:
 * behaviour by consequence, the advised measure in each cell, the cell that
 * applies to the case outlined. Nothing in it is specific to that: the axes,
 * the cell texts and their tones are content.
 *
 * `content`:
 * - `columns`: `[{ value, label }]`; `rows`: `[{ value, label, cells }]`, where
 *   `cells` is an array in column order or a map keyed by column value. A cell
 *   is its text, or `{ text, tone }`.
 * - `tones`: a map from cell text to tone (`success`, `warning`, `error`,
 *   `error-strong`, `info`, `neutral`), for cells that do not name one.
 * - `rowField` / `columnField`: the record fields whose values pick the chosen
 *   cell; `selected: { row, column }` fixes it instead.
 * - `subtitle`: a line above the grid.
 *
 * Labels and cell texts go through the app's translate.
 */
export default {
	name: 'CnMatrixWidget',

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The widget's content: axes, cells, tones and how the chosen cell is picked. */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record, read by `rowField` and `columnField`. */
		objectData: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** @return {Array<{value: string, label: string}>} The columns. */
		columns() {
			return (Array.isArray(this.content?.columns) ? this.content.columns : [])
				.filter((column) => column && column.value !== undefined && column.value !== null)
				.map((column) => ({ value: String(column.value), label: this.tr(column.label || String(column.value)) }))
		},

		/** @return {{row: string, column: string}|null} The chosen cell's row and column values. */
		chosen() {
			const c = this.content || {}
			if (c.selected && typeof c.selected === 'object' && c.selected.row !== undefined && c.selected.column !== undefined) {
				return { row: String(c.selected.row), column: String(c.selected.column) }
			}
			if (!this.objectData || !c.rowField || !c.columnField) {
				return null
			}
			const row = readPath(this.objectData, c.rowField)
			const column = readPath(this.objectData, c.columnField)
			if (row === undefined || row === null || column === undefined || column === null) {
				return null
			}
			return { row: String(row), column: String(column) }
		},

		/** @return {Array<{value: string, label: string, cells: Array<object>}>} The rows with resolved cells. */
		rows() {
			const tones = this.content?.tones && typeof this.content.tones === 'object' ? this.content.tones : {}
			return (Array.isArray(this.content?.rows) ? this.content.rows : [])
				.filter((row) => row && row.value !== undefined && row.value !== null)
				.map((row) => {
					const value = String(row.value)
					return {
						value,
						label: this.tr(row.label || value),
						cells: this.columns.map((column, index) => {
							const raw = Array.isArray(row.cells) ? row.cells[index] : (row.cells || {})[column.value]
							const text = raw && typeof raw === 'object' ? String(raw.text ?? '') : String(raw ?? '')
							const tone = (raw && typeof raw === 'object' && raw.tone) || tones[text] || ''
							return {
								column: column.value,
								text: this.tr(text),
								tone,
								chosen: !!this.chosen && this.chosen.row === value && this.chosen.column === column.value,
							}
						}),
					}
				})
		},

		/** @return {string} The line above the grid. */
		subtitle() {
			return this.content?.subtitle ? this.tr(this.content.subtitle) : ''
		},

		/** @return {string} The table's accessible name. */
		caption() {
			return this.content?.title ? this.tr(this.content.title) : t('nextcloud-vue', 'Matrix')
		},

		/** @return {string} What a screen reader hears after the chosen cell's text. */
		chosenLabel() {
			return t('nextcloud-vue', '(chosen)')
		},
	},

	methods: {
		/**
		 * Translate through the app's translate.
		 *
		 * @param {string} key The source string.
		 * @return {string} The translation.
		 */
		tr(key) {
			return key && typeof this.cnTranslate === 'function' ? this.cnTranslate(key) : (key || '')
		},
	},
}
</script>

<style scoped>
.cn-matrix-widget {
	display: flex;
	flex-direction: column;
	gap: calc(3 * var(--default-grid-baseline));
}

.cn-matrix-widget__subtitle {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-matrix-widget__scroller {
	overflow-x: auto;
}

.cn-matrix-widget__table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 4px;
	font-size: 13px;
	table-layout: fixed;
}

.cn-matrix-widget__corner {
	width: 170px;
}

.cn-matrix-widget__column-header,
.cn-matrix-widget__row-header {
	padding: 6px;
	color: var(--color-text-maxcontrast);
	font-weight: 600;
	text-align: start;
	vertical-align: bottom;
}

.cn-matrix-widget__row-header {
	vertical-align: middle;
}

.cn-matrix-widget__cell {
	padding: 10px 8px;
	border-radius: 6px;
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-weight: 500;
}

.cn-matrix-widget__cell[data-tone='success'] {
	background: color-mix(in srgb, var(--color-success) 14%, var(--color-main-background));
}

.cn-matrix-widget__cell[data-tone='warning'] {
	background: color-mix(in srgb, var(--color-warning) 18%, var(--color-main-background));
}

.cn-matrix-widget__cell[data-tone='error'] {
	background: color-mix(in srgb, var(--color-error) 12%, var(--color-main-background));
}

.cn-matrix-widget__cell[data-tone='error-strong'] {
	background: color-mix(in srgb, var(--color-error) 24%, var(--color-main-background));
}

.cn-matrix-widget__cell[data-tone='info'] {
	background: var(--color-primary-element-light);
}

.cn-matrix-widget__cell--chosen {
	outline: 3px solid var(--color-primary-element);
	outline-offset: -3px;
	font-weight: 700;
}
</style>
