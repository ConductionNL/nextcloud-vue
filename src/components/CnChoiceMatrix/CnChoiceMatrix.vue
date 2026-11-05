<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-choice-matrix" data-testid="cn-choice-matrix" tabindex="-1">
		<header v-if="title || description" class="cn-choice-matrix__header">
			<h3 v-if="title" class="cn-choice-matrix__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-choice-matrix__description">
				{{ description }}
			</p>
		</header>

		<p v-if="isEmpty"
			class="cn-choice-matrix__empty"
			data-testid="cn-choice-matrix-empty">
			{{ emptyLabel || t('nextcloud-vue', 'Nothing to set yet.') }}
		</p>

		<template v-else-if="pickPerRow">
			<fieldset v-for="row in rows"
				:key="rowId(row)"
				class="cn-choice-matrix__row"
				role="radiogroup"
				:aria-invalid="rowError(row) ? 'true' : undefined"
				:aria-describedby="rowError(row) ? errorId(row) : undefined"
				:data-testid="`cn-choice-matrix-row-${rowId(row)}`">
				<legend class="cn-choice-matrix__legend">
					{{ row[rowLabelKey] }}
					<span v-if="weightText(row)" class="cn-choice-matrix__weight">{{ weightText(row) }}</span>
				</legend>
				<div class="cn-choice-matrix__options">
					<label v-for="option in optionsOf(row)"
						:key="option.key"
						class="cn-choice-matrix__option"
						:class="{ 'cn-choice-matrix__option--picked': pickedKey(row) === option.key }">
						<input type="radio"
							:name="`${uid}-${rowId(row)}`"
							:value="option.key"
							:checked="pickedKey(row) === option.key"
							:disabled="readOnly || Boolean(row.readOnly)"
							:data-testid="`cn-choice-matrix-option-${rowId(row)}-${option.key}`"
							@change="pick(row, option)">
						<span class="cn-choice-matrix__option-text">
							<span>{{ option.label }}</span>
							<span v-if="option.description" class="cn-choice-matrix__option-detail">{{ option.description }}</span>
							<span v-if="pointsText(option)" class="cn-choice-matrix__option-detail">{{ pointsText(option) }}</span>
						</span>
					</label>
				</div>
				<p v-if="rowError(row)"
					:id="errorId(row)"
					class="cn-choice-matrix__error"
					data-testid="cn-choice-matrix-row-error">
					{{ rowError(row) }}
				</p>
				<NcButton v-if="removable(row)"
					variant="tertiary"
					class="cn-choice-matrix__remove"
					:aria-label="removeLabel(row)"
					:data-testid="`cn-choice-matrix-remove-${rowId(row)}`"
					@click="removeRow(row)">
					{{ t('nextcloud-vue', 'Remove') }}
				</NcButton>
			</fieldset>
			<div v-if="scoreLine || $slots.scoreNote" class="cn-choice-matrix__score" data-testid="cn-choice-matrix-score">
				<strong role="status">{{ scoreLine }}</strong>
				<!-- @slot scoreNote A remark beside the score. -->
				<slot name="scoreNote" />
			</div>
		</template>

		<div v-else class="cn-choice-matrix__scroller">
			<table class="cn-choice-matrix__table">
				<caption v-if="title" class="cn-choice-matrix__caption">
					{{ title }}
				</caption>
				<thead>
					<tr>
						<th scope="col" class="cn-choice-matrix__corner" :aria-sort="ariaSort(rowColumn)">
							<span v-if="sortable || filterable" class="cn-choice-matrix__head">
								<button v-if="sortable"
									type="button"
									class="cn-choice-matrix__sort"
									data-testid="cn-choice-matrix-sort-row"
									@click="sortBy(rowColumn)">
									{{ rowHeader }}
									<ChevronUp v-if="sortIs(rowColumn, 'asc')" :size="14" />
									<ChevronDown v-else :size="14" />
								</button>
								<span v-else>{{ rowHeader }}</span>
								<NcActions v-if="filterable"
									class="cn-choice-matrix__filter"
									:aria-label="filterLabel(rowHeader)"
									data-testid="cn-choice-matrix-filter-row">
									<template #icon>
										<FilterOutline :size="14" />
									</template>
									<NcActionInput :modelValue="rowFilter"
										:label="filterLabel(rowHeader)"
										@update:modelValue="(typed) => rowFilter = String(typed || '')" />
								</NcActions>
							</span>
							<template v-else>
								{{ rowHeader }}
							</template>
						</th>
						<th v-for="column in columns"
							:key="column.key"
							scope="col"
							class="cn-choice-matrix__col-header"
							:aria-sort="ariaSort(column.key)"
							:data-testid="`cn-choice-matrix-col-${column.key}`">
							<span v-if="sortable || filterable" class="cn-choice-matrix__head">
								<button v-if="sortable"
									type="button"
									class="cn-choice-matrix__sort"
									:data-testid="`cn-choice-matrix-sort-${column.key}`"
									@click="sortBy(column.key)">
									{{ column.label }}
									<ChevronUp v-if="sortIs(column.key, 'asc')" :size="14" />
									<ChevronDown v-else :size="14" />
								</button>
								<span v-else>{{ column.label }}</span>
								<NcActions v-if="filterable"
									class="cn-choice-matrix__filter"
									:aria-label="filterLabel(column.label)"
									:data-testid="`cn-choice-matrix-filter-${column.key}`">
									<template #icon>
										<FilterOutline :size="14" />
									</template>
									<NcActionCheckbox v-for="value in columnValues(column)"
										:key="value"
										:modelValue="(filters[column.key] || []).includes(value)"
										@update:modelValue="toggleFilter(column.key, value)">
										{{ choiceLabel(value) }}
									</NcActionCheckbox>
								</NcActions>
							</span>
							<template v-else>
								<span>{{ column.label }}</span>
							</template>
							<span v-if="column.description" class="cn-choice-matrix__col-description">{{ column.description }}</span>
						</th>
						<th v-if="hasRemovable" scope="col" class="cn-choice-matrix__actions">
							<span class="cn-choice-matrix__sr">{{ t('nextcloud-vue', 'Row actions') }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="shownRows.length === 0" data-testid="cn-choice-matrix-no-match">
						<td :colspan="columns.length + 1 + (hasRemovable ? 1 : 0)" class="cn-choice-matrix__no-match">
							{{ t('nextcloud-vue', 'No rows match the filters.') }}
						</td>
					</tr>
					<tr v-for="row in shownRows" :key="rowId(row)" data-testid="cn-choice-matrix-grid-row">
						<th scope="row" class="cn-choice-matrix__row-header">
							{{ row[rowLabelKey] }}
							<span v-if="rowError(row)" class="cn-choice-matrix__error" data-testid="cn-choice-matrix-row-error">{{ rowError(row) }}</span>
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
							<CnStatusBadge v-else-if="pills"
								:label="valueText(row, column)"
								:variant="pillVariant(row, column)"
								size="small"
								data-testid="cn-choice-matrix-pill" />
							<span v-else
								class="cn-choice-matrix__value"
								:class="toneClass(row, column)"
								data-testid="cn-choice-matrix-value">{{ valueText(row, column) }}</span>
						</td>
						<td v-if="hasRemovable" class="cn-choice-matrix__actions">
							<NcButton v-if="removable(row)"
								variant="tertiary"
								:aria-label="removeLabel(row)"
								:data-testid="`cn-choice-matrix-remove-${rowId(row)}`"
								@click="removeRow(row)">
								{{ t('nextcloud-vue', 'Remove') }}
							</NcButton>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="cn-choice-matrix__sr" aria-live="polite" data-testid="cn-choice-matrix-status">
			{{ status }}
		</p>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionCheckbox, NcActionInput, NcActions, NcButton, NcSelect } from '@nextcloud/vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import { nextSort, ROW_COLUMN, rowPasses, sortRows, valuesIn } from '../../utils/choiceMatrixView.js'
import { userLocale } from '../../utils/userLocale.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

let lastUid = 0

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
 * With `pickPerRow` a row holds one pick rather than a value per column, as a
 * rubric does (boards LqInleveringNakijken, LqLlInleveren): radio buttons per
 * row, each with its text and points, and a running score. The value is then
 * `{ [rowId]: optionKey }`. The options are the `columns`, or a row's own
 * `options` when its levels differ.
 *
 * The grid's heads can sort and filter, and its read-only cells can be pills,
 * as board DqZaaktypeVelden draws the field rights: `sortable` puts a sort
 * button in every head (the row column by label, a column by the order of
 * `choices`), `filterable` a funnel (the row column a text filter, a column
 * a tick per value it holds), and `pills` draws a read-only cell as a
 * `CnStatusBadge` in its choice's `variant`.
 *
 * @event update:modelValue The whole new map after a cell changed.
 * @event cell-change One changed cell: `{ rowId, columnKey, value, previous }`.
 * @event score-change With `pickPerRow`, on mount and on every change: `{ score, max, complete }`.
 *
 * @spec openspec/changes/choice-matrix/specs/choice-matrix/spec.md
 */
export default {
	name: 'CnChoiceMatrix',

	components: { ChevronDown, ChevronUp, CnStatusBadge, FilterOutline, NcActionCheckbox, NcActionInput, NcActions, NcButton, NcSelect },

	props: {
		/**
		 * The rows: objects with an id (`rowIdKey`), a label (`rowLabelKey`) and an optional `readOnly`.
		 * With `pickPerRow` also `weight` and `options`: `{ key, label, description?, points? }`.
		 */
		rows: { type: Array, default: () => [] },
		/** The columns: `{ key, label, description?, readOnly?, points? }`. */
		columns: { type: Array, default: () => [] },
		/** The closed set every cell picks from: `{ value, label, tone? }`, `tone` being `muted` or `strong`. */
		choices: { type: Array, default: () => [] },
		/** The stored choices: `{ [rowId]: { [columnKey]: value } }`, or with `pickPerRow` `{ [rowId]: optionKey }`. */
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
		/** A row holds one pick, drawn as radio buttons, rather than a choice per column. */
		pickPerRow: { type: Boolean, default: false },
		/** Show the score: `true` for the library's words, or a text with `{score}` and `{max}`, already translated. */
		scoreLabel: { type: [Boolean, String], default: false },
		/** The most a user can score; the sum of each row's highest points when null. */
		scoreMax: { type: Number, default: null },
		/** How picks add up: `sum` adds the points, `weighted` multiplies each by its row's `weight` first. */
		scoreMode: { type: String, default: 'sum', validator: (value) => ['sum', 'weighted'].includes(value) },
		/** A row's weight in words, already translated, with `{weight}`. */
		weightTemplate: { type: String, default: '' },
		/** Errors per row, already translated: `{ [rowId]: text }`. */
		rowErrors: { type: Object, default: () => ({}) },
		/** A Remove button per row; a row with `removable: false` keeps none. Ignored when `readOnly`. */
		removableRows: { type: Boolean, default: false },
		/** A sort button in every head of the grid: the row column by label, a column by the order of `choices`. */
		sortable: { type: Boolean, default: false },
		/** A filter in every head of the grid: a text filter on the row column, a tick per value on a column. */
		filterable: { type: Boolean, default: false },
		/** Draw a read-only cell as a pill (`CnStatusBadge`) in its choice's `variant`, `default` when it names none. */
		pills: { type: Boolean, default: false },
	},

	emits: ['update:modelValue', 'cell-change', 'score-change', 'remove-row'],

	data() {
		lastUid += 1
		return {
			uid: `cn-choice-matrix-${lastUid}`,
			status: '',
			/** The heads' sort: the key sorted on (`@row` for the row column) and `asc` or `desc`. */
			sort: { key: '', dir: '' },
			/** The column heads' filters: the values each keeps, by column key. */
			filters: {},
			/** The row head's text filter. */
			rowFilter: '',
			rowColumn: ROW_COLUMN,
		}
	},

	computed: {
		/**
		 * The grid's rows after the heads' filters, in the heads' sort.
		 *
		 * @spec openspec/changes/choice-matrix-sort-filter-pills/specs/choice-matrix/spec.md#requirement-a-column-head-sorts-the-rows
		 * @return {Array<object>}
		 */
		shownRows() {
			const view = { ...this.sort, filters: this.filters, text: this.rowFilter, valueAt: this.cellValue, labelOf: this.rowLabel, rank: this.rankOf }
			return sortRows(this.rows.filter((row) => rowPasses(row, view)), view)
		},

		/** @return {boolean} Whether there is nothing to draw. */
		/**
		 * @return {boolean} Whether any row shows a Remove button, which adds the actions column.
		 */
		hasRemovable() {
			return this.rows.some((row) => this.removable(row))
		},

		isEmpty() {
			if (this.rows.length === 0) {
				return true
			}
			return this.pickPerRow
				? this.rows.every((row) => this.optionsOf(row).length === 0)
				: this.columns.length === 0
		},

		/** @return {{score: number, max: number, complete: boolean}} The running score. */
		score() {
			let score = 0
			let max = 0
			let complete = true
			for (const row of this.rows) {
				const factor = this.scoreMode === 'weighted' ? (Number(row.weight) || 0) : 1
				const options = this.optionsOf(row)
				const picked = options.find((option) => option.key === this.pickedKey(row))
				max += Math.max(0, ...options.map((option) => Number(option.points) || 0)) * factor
				score += (Number(picked?.points) || 0) * factor
				complete = complete && (Boolean(picked) || Boolean(row.readOnly))
			}
			return { score, max: this.scoreMax ?? max, complete }
		},

		/** @return {string} The score in words, or ''. */
		scoreLine() {
			if (!this.scoreLabel) {
				return ''
			}
			const score = this.formatNumber(this.score.score)
			const max = this.formatNumber(this.score.max)
			return typeof this.scoreLabel === 'string'
				? this.scoreLabel.replace('{score}', score).replace('{max}', max)
				: t('nextcloud-vue', 'Score: {score} of {max}', { score, max })
		},
	},

	watch: {
		score: {
			immediate: true,
			handler(next, previous) {
				if (this.pickPerRow && JSON.stringify(next) !== JSON.stringify(previous)) {
					this.$emit('score-change', next)
				}
			},
		},
	},

	methods: {
		t,

		/**
		 * Sort on a head: ascending first, then descending.
		 *
		 * @param {string} key The column key, or `@row`.
		 * @return {void}
		 */
		sortBy(key) {
			this.sort = nextSort(this.sort, key)
		},

		/**
		 * @param {string} key The column key, or `@row`.
		 * @param {string} dir `asc` or `desc`.
		 * @return {boolean} Whether the grid sorts on that head in that direction.
		 */
		sortIs(key, dir) {
			return this.sort.key === key && this.sort.dir === dir
		},

		/**
		 * @param {string} key The column key, or `@row`.
		 * @return {string|undefined} The head's `aria-sort` while it sorts.
		 */
		ariaSort(key) {
			if (!this.sortable || this.sort.key !== key) {
				return undefined
			}
			return this.sort.dir === 'desc' ? 'descending' : 'ascending'
		},

		/**
		 * Keep or drop one value in a column's filter.
		 *
		 * @spec openspec/changes/choice-matrix-sort-filter-pills/specs/choice-matrix/spec.md#requirement-a-column-head-filters-the-rows
		 * @param {string} key The column key.
		 * @param {string} value The value.
		 * @return {void}
		 */
		toggleFilter(key, value) {
			const kept = this.filters[key] || []
			this.filters = { ...this.filters, [key]: kept.includes(value) ? kept.filter((held) => held !== value) : [...kept, value] }
		},

		/**
		 * @param {object} column A column.
		 * @return {string[]} The values the column holds, in the order of the choices.
		 */
		columnValues(column) {
			return valuesIn(this.rows.map((row) => this.cellValue(row, column.key)), this.choices)
		},

		/**
		 * @param {object} row A row.
		 * @param {string} key A column key.
		 * @return {string} The cell's value, else `defaultValue`.
		 */
		cellValue(row, key) {
			return this.valueOf(row, { key })
		},

		/**
		 * @param {object} row A row.
		 * @return {string} The row's label.
		 */
		rowLabel(row) {
			return String(row[this.rowLabelKey] ?? '')
		},

		/**
		 * @param {string} value A choice value.
		 * @return {number} Its place in the choices; a value outside them sorts last.
		 */
		rankOf(value) {
			const index = this.choices.findIndex((choice) => choice.value === value)
			return index === -1 ? this.choices.length : index
		},

		/**
		 * @param {string} value A choice value.
		 * @return {string} The choice's label, else the value.
		 */
		choiceLabel(value) {
			return this.choices.find((choice) => choice.value === value)?.label ?? String(value)
		},

		/**
		 * @param {string} head The head's text.
		 * @return {string} The name of its filter.
		 */
		filterLabel(head) {
			return t('nextcloud-vue', 'Filter by {column}', { column: head })
		},

		/**
		 * @param {object} row A row.
		 * @param {object} column A column.
		 * @return {string} The pill's variant: the choice's `variant`, else `default`.
		 */
		pillVariant(row, column) {
			return this.choiceOf(row, column)?.variant || 'default'
		},

		/**
		 * @param {number} value A number.
		 * @return {string} The number in the user's locale, with at most two decimals.
		 */
		formatNumber(value) {
			return value.toLocaleString(userLocale(), { maximumFractionDigits: 2 })
		},

		/**
		 * @param {object} row A row.
		 * @return {object[]} What the row picks from: its own options, else the columns.
		 */
		optionsOf(row) {
			return Array.isArray(row.options) ? row.options : this.columns
		},

		/**
		 * @param {object} row A row.
		 * @return {string|undefined} The key of the option the row holds.
		 */
		pickedKey(row) {
			return this.modelValue?.[this.rowId(row)]
		},

		/**
		 * @param {object} row A row.
		 * @return {string} The row's weight in words, or ''.
		 */
		weightText(row) {
			if (row.weight === undefined || row.weight === null || row.weight === '') {
				return ''
			}
			const weight = String(row.weight)
			return this.weightTemplate
				? this.weightTemplate.replace('{weight}', weight)
				: t('nextcloud-vue', '(weight {weight})', { weight })
		},

		/**
		 * @param {object} option An option.
		 * @return {string} Its points in words, or ''.
		 */
		pointsText(option) {
			if (option.points === undefined || option.points === null) {
				return ''
			}
			const points = this.formatNumber(Number(option.points))
			return Number(option.points) === 1
				? t('nextcloud-vue', '{points} point', { points })
				: t('nextcloud-vue', '{points} points', { points })
		},

		/**
		 * @param {object} row A row.
		 * @return {string} The row's error, or ''.
		 */
		rowError(row) {
			return this.rowErrors?.[this.rowId(row)] ?? ''
		},

		/**
		 * @param {object} row A row.
		 * @return {string} The id of the row's error line.
		 */
		errorId(row) {
			return `${this.uid}-error-${this.rowId(row)}`
		},

		/**
		 * Emit the new map for a picked option.
		 *
		 * @param {object} row A row.
		 * @param {object} option The picked option.
		 * @return {void}
		 */
		pick(row, option) {
			const rowId = this.rowId(row)
			const previous = this.pickedKey(row)
			this.$emit('update:modelValue', { ...this.modelValue, [rowId]: option.key })
			this.$emit('cell-change', { rowId, columnKey: option.key, value: option.key, previous })
		},

		/**
		 * @param {object} row A row.
		 * @return {boolean} Whether the row shows a Remove button.
		 * @spec openspec/changes/choice-matrix-removable-rows/tasks.md#task-1
		 */
		removable(row) {
			return this.removableRows && !this.readOnly && row.removable !== false
		},

		/**
		 * @param {object} row A row.
		 * @return {string} The accessible name of its Remove button.
		 */
		removeLabel(row) {
			return t('nextcloud-vue', 'Remove {row}', { row: String(row[this.rowLabelKey] ?? '') })
		},

		/**
		 * Remove a row: emit the map without it and `remove-row`, so the host
		 * drops it from `rows`, and say so to a screen reader.
		 *
		 * @param {object} row A row.
		 * @return {void}
		 * @spec openspec/changes/choice-matrix-removable-rows/tasks.md#task-1
		 */
		removeRow(row) {
			const rowId = this.rowId(row)
			const next = { ...this.modelValue }
			delete next[rowId]
			this.$emit('update:modelValue', next)
			this.$emit('remove-row', { rowId, row })
			this.status = t('nextcloud-vue', 'Removed {row}.', { row: String(row[this.rowLabelKey] ?? '') })
			const index = this.rows.indexOf(row)
			this.$nextTick(() => this.focusAfterRemove(index))
		},

		/**
		 * Keep the keyboard in the grid after a row is gone: the Remove button
		 * now at the removed row's place, else the last one, else the grid.
		 *
		 * @param {number} index Where the removed row was.
		 * @return {void}
		 */
		focusAfterRemove(index) {
			const buttons = this.$el.querySelectorAll('[data-testid^="cn-choice-matrix-remove-"]')
			const target = buttons[Math.min(index, buttons.length - 1)] || this.$el
			target.focus()
		},

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

.cn-choice-matrix__row {
	border: 0;
	border-top: 1px solid var(--color-border);
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	min-width: 0;
	padding: 12px 0 0;
}

.cn-choice-matrix__legend {
	font-weight: 600;
	padding: 0;
}

.cn-choice-matrix__weight {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	font-weight: normal;
}

.cn-choice-matrix__options {
	display: grid;
	gap: 8px;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.cn-choice-matrix__option {
	align-items: flex-start;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	cursor: pointer;
	display: flex;
	gap: 8px;
	padding: 8px 12px;
}

.cn-choice-matrix__option--picked {
	background: var(--color-primary-element-light);
	border-color: var(--color-primary-element);
	color: var(--color-primary-element-light-text);
}

.cn-choice-matrix__option input {
	accent-color: var(--color-primary-element);
	flex: none;
	margin: 2px 0 0;
}

.cn-choice-matrix__option-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-choice-matrix__option-detail {
	font-size: 0.9em;
}

.cn-choice-matrix__actions {
	width: 1%;
	white-space: nowrap;
}

.cn-choice-matrix__remove {
	margin-top: 4px;
}

.cn-choice-matrix__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.cn-choice-matrix__error {
	color: var(--color-error-text, var(--color-error));
	display: block;
	font-weight: normal;
	margin: 0;
	white-space: normal;
}

.cn-choice-matrix__score {
	align-items: center;
	background: var(--color-background-hover);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-wrap: wrap;
	gap: 8px 16px;
	justify-content: space-between;
	padding: 12px 16px;
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

/* A head's text, its sort chevron and its 22px funnel on one line
   (DqZaaktypeVelden). */
.cn-choice-matrix__head {
	display: flex;
	gap: 4px;
	align-items: center;
}

.cn-choice-matrix__sort {
	display: inline-flex;
	flex: 0 1 auto;
	gap: 4px;
	align-items: center;
	min-width: 0;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.cn-choice-matrix__filter {
	flex: none;
}

.cn-choice-matrix__filter :deep(.button-vue) {
	--button-size: 22px;
	width: 22px;
	min-width: 22px;
	height: 22px;
	min-height: 22px;
	border-radius: 4px;
}

.cn-choice-matrix__no-match {
	padding: 12px;
	color: var(--color-text-maxcontrast);
}
</style>
