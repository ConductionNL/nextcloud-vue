<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-sub-objects-field">
		<div class="cn-sub-objects-field__head">
			<span class="cn-sub-objects-field__label">{{ inputLabel }}</span>
			<NcButton
				v-if="!disabled"
				ref="addButton"
				data-testid="cn-sub-objects-add"
				@click="openAdd">
				{{ addLabel }}
			</NcButton>
		</div>
		<CnDataTable
			:columns="columns"
			:rows="tableRows"
			rowKey="__row"
			:emptyText="emptyText || t('nextcloud-vue', 'No rows yet.')">
			<template v-for="col in inlineColumns" #[`column-${col.key}`]="{ row }" :key="col.key">
				<NcSelect
					v-if="col.kind === 'select'"
					:modelValue="list[row.__index][col.key] ?? null"
					:options="col.options"
					:reduce="(option) => option.value"
					label="label"
					:clearable="!col.required"
					:inputLabel="cellLabel(col, row.__index)"
					:labelOutside="true"
					:disabled="disabled"
					:data-testid="`cn-sub-objects-cell-${col.key}-${row.__index}`"
					@update:modelValue="(value) => setCell(row.__index, col.key, value)" />
				<NcCheckboxRadioSwitch
					v-else-if="col.kind === 'boolean'"
					:modelValue="list[row.__index][col.key] === true"
					:disabled="disabled"
					:aria-label="cellLabel(col, row.__index)"
					:data-testid="`cn-sub-objects-cell-${col.key}-${row.__index}`"
					@update:modelValue="(value) => setCell(row.__index, col.key, value)" />
				<NcTextField
					v-else
					:modelValue="cellText(list[row.__index][col.key])"
					:type="col.kind"
					:label="cellLabel(col, row.__index)"
					:labelOutside="true"
					:disabled="disabled"
					:data-testid="`cn-sub-objects-cell-${col.key}-${row.__index}`"
					@update:modelValue="(value) => setCell(row.__index, col.key, col.kind === 'number' ? toNumber(value) : value)" />
			</template>
			<template v-if="!disabled" #row-actions="{ row }">
				<NcActions
					class="cn-sub-objects-field__row-actions"
					:data-row-index="row.__index"
					:ariaLabel="t('nextcloud-vue', 'Actions for {row}', { row: rowName(row.__index) })">
					<NcActionButton v-if="!inline" @click="openEdit(row.__index)">
						{{ t('nextcloud-vue', 'Edit') }}
					</NcActionButton>
					<NcActionButton @click="duplicateRow(row.__index)">
						{{ t('nextcloud-vue', 'Duplicate') }}
					</NcActionButton>
					<NcActionButton :disabled="row.__index === 0" @click="moveRow(row.__index, -1)">
						{{ t('nextcloud-vue', 'Move up') }}
					</NcActionButton>
					<NcActionButton :disabled="row.__index >= list.length - 1" @click="moveRow(row.__index, 1)">
						{{ t('nextcloud-vue', 'Move down') }}
					</NcActionButton>
					<NcActionButton @click="removeRow(row.__index)">
						{{ t('nextcloud-vue', 'Remove') }}
					</NcActionButton>
				</NcActions>
			</template>
		</CnDataTable>
		<p v-if="summaryText" class="cn-sub-objects-field__summary" data-testid="cn-sub-objects-summary">
			{{ summaryText }}
		</p>
		<p v-if="error || ruleMessage"
			class="cn-sub-objects-field__error"
			role="alert"
			data-testid="cn-sub-objects-error">
			{{ error || ruleMessage }}
		</p>
		<CnFormDialog
			v-if="editing !== null"
			:schema="items"
			:item="editing.row"
			:initialData="editing.index === null && newItem ? newItem : null"
			:fieldOverrides="fieldOverrides"
			:dialogTitle="editing.index === null ? addLabel : t('nextcloud-vue', 'Edit {row}', { row: rowName(editing.index) })"
			data-testid="cn-sub-objects-dialog"
			@confirm="onDialogConfirm"
			@close="editing = null" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActions, NcButton, NcCheckboxRadioSwitch, NcSelect, NcTextField } from '@nextcloud/vue'
import { defineAsyncComponent } from 'vue'
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import { readPath } from '../../utils/readPath.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'

/**
 * The rows that break a row rule, the first problem per row.
 *
 * A rule is `{ when, message }`: `when` is a local `visibleWhen` condition on
 * the row, and when it holds the row is wrong. `@row.<field>` on its right-hand
 * side names another field of the same row (open time against close time).
 *
 * @param {object[]} rows The rows.
 * @param {object[]} rules The rules.
 * @return {Array<{index: number, message: string}>} The problems.
 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-a-row-rule-names-the-row-that-breaks-it
 */
export function rowRuleProblems(rows, rules) {
	if (!Array.isArray(rows) || !Array.isArray(rules) || rules.length === 0) {
		return []
	}
	const withRow = (node, row) => {
		if (typeof node === 'string' && node.startsWith('@row.')) {
			return readPath(row, node.slice(5))
		}
		if (Array.isArray(node)) {
			return node.map((entry) => withRow(entry, row))
		}
		if (node && typeof node === 'object') {
			return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, withRow(value, row)]))
		}
		return node
	}
	const problems = []
	rows.forEach((row, index) => {
		const broken = rules.find((rule) => rule && rule.when && typeof rule.message === 'string'
			&& evaluateVisibleWhenLocal(withRow(rule.when, row || {}), row || {}))
		if (broken) {
			problems.push({ index, message: broken.message })
		}
	})
	return problems
}

/**
 * CnSubObjectsField — edits an array of objects embedded in one object as a
 * table: Add, Edit (a nested `CnFormDialog` over `items`), Duplicate,
 * Move up, Move down and Remove. `CnFormDialog` renders it for a property with
 * `x-widget: sub-objects` (or a field override naming that widget).
 *
 * Columns come from `items.properties`, up to `maxColumns`; the rest stay
 * editable in the row dialog. When `items.properties` declares `order`, it is
 * rewritten to 1..n on every change. For rows that are their own records use
 * an object-list widget instead.
 *
 * Example:
 * ```vue
 * <CnSubObjectsField v-model="statuses" input-label="Statuses" :items="itemsSchema" />
 * ```
 */
export default {
	name: 'CnSubObjectsField',

	components: {
		CnDataTable,
		CnFormDialog: defineAsyncComponent(() => import('../CnFormDialog/CnFormDialog.vue')),
		NcActionButton,
		NcActions,
		NcButton,
		NcCheckboxRadioSwitch,
		NcSelect,
		NcTextField,
	},

	props: {
		/** The array of row objects (v-model). */
		modelValue: {
			type: Array,
			default: () => [],
		},

		/**
		 * JSON Schema of one row (`type: object`, `properties`, optional `required`).
		 *
		 * @type {{properties: object, required?: string[]}}
		 */
		items: {
			type: Object,
			default: () => ({ properties: {} }),
		},

		/** Visible label of the table. */
		inputLabel: {
			type: String,
			default: '',
		},

		/** Most columns shown in the table; further properties are edited in the row dialog. */
		maxColumns: {
			type: Number,
			default: 6,
		},

		/** Hide the editing controls. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/** Validation message shown under the table. */
		error: {
			type: String,
			default: '',
		},

		/** Label of the add button. */
		addLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Add row'),
		},

		/** Field overrides forwarded to the row dialog, e.g. `{ color: { widget: 'text' } }`. */
		fieldOverrides: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The values a new row starts with, e.g. `{ required: false }`; the row
		 * schema's own defaults fill the rest.
		 */
		newItem: {
			type: Object,
			default: null,
		},

		/**
		 * What one row is called, for the row's accessible name and the edit
		 * dialog title: "Checklist item" gives "Checklist item 2". Defaults to
		 * "Row".
		 */
		itemLabel: {
			type: String,
			default: '',
		},

		/** Shown while there are no rows. Defaults to "No rows yet.". */
		emptyText: {
			type: String,
			default: '',
		},

		/**
		 * Edit the cells in the row itself, without a row dialog: for two to four
		 * short columns (a day and two times). An `enum` column is a select, a
		 * boolean a switch, `integer`/`number` a number field, `format: time` or
		 * `date` a time or date field, anything else a text field.
		 */
		inline: {
			type: Boolean,
			default: false,
		},

		/**
		 * A line under the table: `{count}` is the number of rows, `{sum:<path>}`
		 * the sum of a number field over the rows, `{@object.<path>}` a field of
		 * the object the rows belong to (`parentData`). Pass it translated.
		 */
		summary: {
			type: String,
			default: '',
		},

		/**
		 * Rules a row must not break, `{ when, message }`: when the local
		 * `visibleWhen` condition `when` holds for a row, the row is wrong and
		 * the message shows under the table, naming the row. `@row.<field>`
		 * names another field of the same row. Pass the messages translated.
		 */
		rowRules: {
			type: Array,
			default: () => [],
		},

		/** The object the rows belong to, for `{@object.<path>}` in `summary`. */
		parentData: {
			type: Object,
			default: null,
		},
	},

	emits: ['update:modelValue'],

	data() {
		return { editing: null }
	},

	computed: {
		list() {
			return Array.isArray(this.modelValue) ? this.modelValue : []
		},

		propertyKeys() {
			return Object.keys((this.items && this.items.properties) || {})
		},

		columns() {
			const props = (this.items && this.items.properties) || {}
			return this.propertyKeys.slice(0, this.maxColumns).map((key) => ({ key, label: props[key].title || key }))
		},

		/**
		 * The columns edited in the row, with the control each one takes.
		 *
		 * @return {Array<{key: string, label: string, kind: string, options?: Array, required: boolean}>}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		inlineColumns() {
			if (!this.inline) {
				return []
			}
			const props = (this.items && this.items.properties) || {}
			const required = Array.isArray(this.items && this.items.required) ? this.items.required : []
			return this.columns.map(({ key, label }) => {
				const prop = props[key] || {}
				let kind = 'text'
				if (Array.isArray(prop.enum)) {
					kind = 'select'
				} else if (prop.type === 'boolean') {
					kind = 'boolean'
				} else if (prop.type === 'integer' || prop.type === 'number') {
					kind = 'number'
				} else if (prop.format === 'time' || prop.format === 'date') {
					kind = prop.format
				}
				const labels = prop['x-enum-labels'] && typeof prop['x-enum-labels'] === 'object' ? prop['x-enum-labels'] : {}
				const options = kind === 'select' ? prop.enum.map((value) => ({ value, label: labels[value] || String(value) })) : undefined
				return { key, label, kind, options, required: required.includes(key) }
			})
		},

		/**
		 * The first broken row rule, as a message naming the row ("Row 2: …").
		 *
		 * @return {string}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-a-row-rule-names-the-row-that-breaks-it
		 */
		ruleMessage() {
			const [first] = rowRuleProblems(this.list, this.rowRules)
			return first ? t('nextcloud-vue', '{row}: {message}', { row: this.rowName(first.index), message: first.message }) : ''
		},

		/**
		 * The summary line with its placeholders filled.
		 *
		 * @return {string}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-a-summary-adds-up-the-rows
		 */
		summaryText() {
			if (!this.summary || this.list.length === 0) {
				return ''
			}
			return this.summary.replace(/\{([^{}]+)\}/g, (match, token) => {
				if (token === 'count') {
					return String(this.list.length)
				}
				if (token.startsWith('sum:')) {
					const path = token.slice(4)
					const total = this.list.reduce((sum, row) => sum + (Number(readPath(row, path)) || 0), 0)
					return String(Math.round(total * 100) / 100)
				}
				if (token.startsWith('@object.')) {
					const value = this.parentData ? readPath(this.parentData, token.slice(8)) : undefined
					return value === undefined || value === null ? '' : String(value)
				}
				return match
			})
		},

		tableRows() {
			return this.list.map((row, index) => {
				const out = { __row: index, __index: index }
				this.columns.forEach(({ key }) => {
					const v = row ? row[key] : undefined
					out[key] = (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
				})
				return out
			})
		},
	},

	methods: {
		/**
		 * Write the rows, renumbering `order` when the row schema has one.
		 *
		 * @param {object[]} rows The rows in their new sequence.
		 */
		commit(rows) {
			const next = this.propertyKeys.includes('order')
				? rows.map((r, i) => ({ ...r, order: i + 1 }))
				: rows
			/** @event update:modelValue The rows in their new sequence. */
			this.$emit('update:modelValue', next)
		},

		/**
		 * A row's name: the item label and its number ("Checklist item 2").
		 *
		 * @param {number} index The row's index.
		 * @return {string}
		 */
		rowName(index) {
			const label = this.itemLabel || t('nextcloud-vue', 'Row')
			return `${label} ${index + 1}`
		},

		/**
		 * Move focus to a row's actions, or to the add button when there is no
		 * such row, after the table re-renders.
		 *
		 * @param {number} index The row's index.
		 * @return {Promise<void>}
		 */
		async focusRow(index) {
			await this.$nextTick()
			const el = this.$el && this.$el.querySelector(`.cn-sub-objects-field__row-actions[data-row-index="${index}"] button`)
			const add = this.$refs.addButton && (this.$refs.addButton.$el || this.$refs.addButton)
			const target = el || add
			if (target && typeof target.focus === 'function') {
				target.focus()
			}
		},

		/**
		 * Add a row: a dialog, or inline a new row with the start values and its
		 * first cell focused.
		 *
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		openAdd() {
			if (this.inline) {
				const rows = [...this.list, { ...(this.newItem || {}) }]
				this.commit(rows)
				this.focusCell(rows.length - 1)
				return
			}
			this.editing = { index: null, row: null }
		},

		/**
		 * Write one cell of a row edited inline.
		 *
		 * @param {number} index The row.
		 * @param {string} key The field.
		 * @param {unknown} value The value.
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		setCell(index, key, value) {
			const rows = [...this.list]
			rows[index] = { ...rows[index], [key]: value }
			this.commit(rows)
		},

		/**
		 * The accessible name of an inline cell: "Day, Row 2".
		 *
		 * @param {{label: string}} col The column.
		 * @param {number} index The row.
		 * @return {string}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		cellLabel(col, index) {
			return t('nextcloud-vue', '{column}, {row}', { column: col.label, row: this.rowName(index) })
		},

		/**
		 * A stored value as a text field shows it.
		 *
		 * @param {unknown} value The value.
		 * @return {string}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		cellText(value) {
			return value === null || value === undefined ? '' : String(value)
		},

		/**
		 * A number field's text as a number, or null when empty or not a number.
		 *
		 * @param {string} value The text.
		 * @return {number|null}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		toNumber(value) {
			const number = Number(value)
			return value === '' || value === null || !Number.isFinite(number) ? null : number
		},

		/**
		 * Focus the first cell of a row added inline.
		 *
		 * @param {number} index The row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/sub-objects-inline-and-summary/specs/sub-objects-field/spec.md#requirement-short-rows-are-edited-in-the-row
		 */
		async focusCell(index) {
			await this.$nextTick()
			const cell = this.$el && this.$el.querySelector(`[data-testid^="cn-sub-objects-cell-"][data-testid$="-${index}"] input, input[data-testid^="cn-sub-objects-cell-"][data-testid$="-${index}"]`)
			if (cell && typeof cell.focus === 'function') {
				cell.focus()
			}
		},

		openEdit(index) {
			this.editing = { index, row: { ...this.list[index] } }
		},

		onDialogConfirm(data) {
			const { index } = this.editing
			const rows = [...this.list]
			if (index === null) {
				rows.push({ ...data })
			} else {
				rows[index] = { ...data }
			}
			this.editing = null
			this.commit(rows)
			if (index === null) {
				this.focusRow(rows.length - 1)
			}
		},

		duplicateRow(index) {
			const rows = [...this.list]
			rows.splice(index + 1, 0, JSON.parse(JSON.stringify(this.list[index])))
			this.commit(rows)
		},

		moveRow(index, delta) {
			const target = index + delta
			if (target < 0 || target >= this.list.length) {
				return
			}
			const rows = [...this.list]
			const [moved] = rows.splice(index, 1)
			rows.splice(target, 0, moved)
			this.commit(rows)
		},

		removeRow(index) {
			this.commit(this.list.filter((_, i) => i !== index))
			this.focusRow(Math.max(index - 1, 0))
		},
	},
}
</script>

<style scoped>
.cn-sub-objects-field__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 4px;
}

.cn-sub-objects-field__label {
	font-weight: bold;
}

.cn-sub-objects-field__summary {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-sub-objects-field__error {
	margin: 4px 0 0;
	color: var(--color-error-text);
}
</style>
