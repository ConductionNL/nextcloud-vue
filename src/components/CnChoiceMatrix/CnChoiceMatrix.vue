<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-choice-matrix" data-testid="cn-choice-matrix">
		<header v-if="title || description" class="cn-choice-matrix__header">
			<h3 v-if="title" class="cn-choice-matrix__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-choice-matrix__description">
				{{ description }}
			</p>
		</header>

		<p v-if="rows.length === 0 || columns.length === 0"
			class="cn-choice-matrix__empty"
			data-testid="cn-choice-matrix-empty">
			{{ emptyLabel || t('nextcloud-vue', 'Nothing to set yet.') }}
		</p>

		<div v-else class="cn-choice-matrix__scroller">
			<table class="cn-choice-matrix__table">
				<caption v-if="title" class="cn-choice-matrix__caption">
					{{ title }}
				</caption>
				<thead>
					<tr>
						<th scope="col" class="cn-choice-matrix__corner">
							{{ rowHeader }}
						</th>
						<th v-for="column in columns"
							:key="column.key"
							scope="col"
							class="cn-choice-matrix__col-header"
							:data-testid="`cn-choice-matrix-col-${column.key}`">
							<span>{{ column.label }}</span>
							<span v-if="column.description" class="cn-choice-matrix__col-description">{{ column.description }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="rowId(row)">
						<th scope="row" class="cn-choice-matrix__row-header">
							{{ row[rowLabelKey] }}
						</th>
						<td v-for="column in columns"
							:key="column.key"
							class="cn-choice-matrix__cell"
							:data-testid="`cn-choice-matrix-cell-${rowId(row)}-${column.key}`">
							<NcSelect v-if="editable(row, column)"
								:modelValue="choiceOf(row, column)"
								:options="choices"
								:clearable="false"
								:searchable="false"
								:ariaLabelCombobox="cellLabel(row, column)"
								label="label"
								@update:modelValue="(choice) => setCell(row, column, choice)" />
							<span v-else
								class="cn-choice-matrix__value"
								:class="toneClass(row, column)"
								data-testid="cn-choice-matrix-value">{{ valueText(row, column) }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'

/**
 * CnChoiceMatrix: rows against columns, every cell one choice out of the same
 * closed set (board DqZaaktypeVelden: fields against role and status, each
 * cell hidden, required or read only). `CnDataMatrix` is the grid for free
 * values, `CnActionAuthMatrix` the one for ticks.
 *
 * The value is a map `{ [rowId]: { [columnKey]: choiceValue } }`. A cell with
 * no stored value shows `defaultValue`. A change emits the whole new map, so
 * the host saves it or a single cell as it likes, and refusing a save is only
 * a matter of not passing the new map back in.
 *
 * ```vue
 * <CnChoiceMatrix
 *   row-header="Field"
 *   :rows="[{ id: 'costs', label: 'Building costs' }]"
 *   :columns="[{ key: 'intake', label: 'Intake', description: 'received' }]"
 *   :choices="[
 *     { value: 'hidden', label: 'Hidden', tone: 'muted' },
 *     { value: 'required', label: 'Required', tone: 'strong' },
 *     { value: 'readonly', label: 'Read only' },
 *   ]"
 *   :model-value="rights"
 *   default-value="readonly"
 *   @update:model-value="rights = $event" />
 * ```
 *
 * @event update:modelValue The whole new map after a cell changed.
 * @event cell-change One changed cell: `{ rowId, columnKey, value, previous }`.
 *
 * @spec openspec/changes/choice-matrix/specs/choice-matrix/spec.md
 */
export default {
	name: 'CnChoiceMatrix',

	components: { NcSelect },

	props: {
		/** The rows: objects with an id (`rowIdKey`), a label (`rowLabelKey`) and an optional `readOnly`. */
		rows: { type: Array, default: () => [] },
		/** The columns: `{ key, label, description?, readOnly? }`. */
		columns: { type: Array, default: () => [] },
		/** The closed set every cell picks from: `{ value, label, tone? }`, `tone` being `muted` or `strong`. */
		choices: { type: Array, default: () => [] },
		/** The stored choices: `{ [rowId]: { [columnKey]: value } }`. */
		modelValue: { type: Object, default: () => ({}) },
		/** The choice value a cell shows while nothing is stored for it. */
		defaultValue: { type: String, default: '' },
		/** Key of a row's id. */
		rowIdKey: { type: String, default: 'id' },
		/** Key of a row's label. */
		rowLabelKey: { type: String, default: 'label' },
		/** Heading of the row column, already translated. */
		rowHeader: { type: String, default: '' },
		/** Title above the grid, already translated. */
		title: { type: String, default: '' },
		/** A line under the title, already translated. */
		description: { type: String, default: '' },
		/** Text when there are no rows or columns; the library default is "Nothing to set yet.". */
		emptyLabel: { type: String, default: '' },
		/** Draw every cell as text. */
		readOnly: { type: Boolean, default: false },
	},

	emits: ['update:modelValue', 'cell-change'],

	methods: {
		t,

		/**
		 * @param {object} row A row.
		 * @return {string} The row's id as a string.
		 */
		rowId(row) {
			return String(row[this.rowIdKey])
		},

		/**
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {boolean} Whether this cell offers a choice.
		 */
		editable(row, column) {
			return !this.readOnly && !row.readOnly && !column.readOnly
		},

		/**
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {string} The stored value, else `defaultValue`.
		 */
		valueOf(row, column) {
			return this.modelValue?.[this.rowId(row)]?.[column.key] ?? this.defaultValue
		},

		/**
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {object|null} The choice the cell holds, null when it matches none.
		 */
		choiceOf(row, column) {
			const value = this.valueOf(row, column)
			return this.choices.find((choice) => choice.value === value) ?? null
		},

		/**
		 * The cell as text. A stored value outside the set shows as it is, so
		 * it is seen rather than read as empty.
		 *
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {string} What a read-only cell says.
		 */
		valueText(row, column) {
			return this.choiceOf(row, column)?.label ?? String(this.valueOf(row, column))
		},

		/**
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {string} The class of the cell's tone, or ''.
		 */
		toneClass(row, column) {
			const tone = this.choiceOf(row, column)?.tone
			return tone ? `cn-choice-matrix__value--${tone}` : ''
		},

		/**
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {string} A name for the cell's control, naming both axes.
		 */
		cellLabel(row, column) {
			return `${row[this.rowLabelKey]}, ${column.label}`
		},

		/**
		 * Emit the new map for a picked choice. Picking what the cell already
		 * holds, or nothing, changes nothing.
		 *
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @param {object|null} choice The picked choice.
		 * @return {void}
		 */
		setCell(row, column, choice) {
			const previous = this.valueOf(row, column)
			if (!choice || choice.value === previous) {
				return
			}
			const rowId = this.rowId(row)
			this.$emit('update:modelValue', {
				...this.modelValue,
				[rowId]: { ...(this.modelValue?.[rowId] ?? {}), [column.key]: choice.value },
			})
			this.$emit('cell-change', { rowId, columnKey: column.key, value: choice.value, previous })
		},
	},
}
</script>

<style scoped>
.cn-choice-matrix {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-choice-matrix__title {
	font-size: 1.1em;
	margin: 0;
}

.cn-choice-matrix__description,
.cn-choice-matrix__empty,
.cn-choice-matrix__col-description {
	color: var(--color-text-maxcontrast);
}

.cn-choice-matrix__description,
.cn-choice-matrix__empty {
	margin: 0;
}

.cn-choice-matrix__scroller {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	overflow-x: auto;
}

.cn-choice-matrix__table {
	border-collapse: collapse;
	width: 100%;
}

.cn-choice-matrix__caption {
	block-size: 1px;
	clip-path: inset(50%);
	inline-size: 1px;
	overflow: hidden;
	position: absolute;
	white-space: nowrap;
}

.cn-choice-matrix__corner,
.cn-choice-matrix__col-header {
	background: var(--color-background-hover);
	border-bottom: 1px solid var(--color-border);
	font-weight: 600;
	padding: 8px 12px;
	text-align: start;
	vertical-align: top;
}

.cn-choice-matrix__col-header > span {
	display: block;
}

.cn-choice-matrix__col-description {
	font-size: 0.9em;
	font-weight: normal;
}

.cn-choice-matrix__row-header {
	border-bottom: 1px solid var(--color-border);
	font-weight: 500;
	padding: 6px 12px;
	text-align: start;
	white-space: nowrap;
}

.cn-choice-matrix__cell {
	border-bottom: 1px solid var(--color-border);
	min-width: 160px;
	padding: 6px 12px;
}

tbody tr:last-child > * {
	border-bottom: 0;
}

.cn-choice-matrix__value--muted {
	color: var(--color-text-maxcontrast);
}

.cn-choice-matrix__value--strong {
	font-weight: 600;
}
</style>
