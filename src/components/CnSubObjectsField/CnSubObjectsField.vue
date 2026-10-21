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
			<template v-if="!disabled" #row-actions="{ row }">
				<NcActions
					class="cn-sub-objects-field__row-actions"
					:data-row-index="row.__index"
					:ariaLabel="t('nextcloud-vue', 'Actions for {row}', { row: rowName(row.__index) })">
					<NcActionButton @click="openEdit(row.__index)">
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
		<p v-if="error" class="cn-sub-objects-field__error" role="alert">
			{{ error }}
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
import { NcActionButton, NcActions, NcButton } from '@nextcloud/vue'
import { defineAsyncComponent } from 'vue'
import CnDataTable from '../CnDataTable/CnDataTable.vue'

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

		openAdd() {
			this.editing = { index: null, row: null }
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

.cn-sub-objects-field__error {
	margin: 4px 0 0;
	color: var(--color-error-text);
}
</style>
