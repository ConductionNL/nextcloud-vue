<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-child-records-field">
		<div class="cn-child-records-field__head">
			<span class="cn-child-records-field__label">{{ inputLabel }}</span>
			<NcButton
				v-if="!disabled"
				data-testid="cn-child-records-add"
				@click="addRow">
				{{ t('nextcloud-vue', 'Add row') }}
			</NcButton>
		</div>
		<NcLoadingIcon v-if="loading" :name="t('nextcloud-vue', 'Loading …')" />
		<table v-else class="cn-child-records-field__table">
			<thead>
				<tr>
					<th v-for="col in columns" :key="col.key" scope="col">
						{{ col.label }}
					</th>
					<th v-if="!disabled" scope="col">
						<span class="cn-child-records-field__sr">{{ t('nextcloud-vue', 'Row actions') }}</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-if="list.length === 0">
					<td :colspan="columns.length + 1" class="cn-child-records-field__empty">
						{{ t('nextcloud-vue', 'No rows yet.') }}
					</td>
				</tr>
				<tr v-for="(row, index) in list" :key="index" data-testid="cn-child-records-row">
					<td v-for="col in columns" :key="col.key">
						<NcTextField
							v-if="col.inline && !disabled"
							:modelValue="cellText(row, col)"
							:label="`${col.label} ${index + 1}`"
							:labelOutside="true"
							:type="col.numeric ? 'number' : 'text'"
							@update:modelValue="value => setCell(index, col, value)" />
						<span v-else>{{ cellText(row, col) }}</span>
					</td>
					<td v-if="!disabled" class="cn-child-records-field__actions">
						<NcButton variant="tertiary" :aria-label="t('nextcloud-vue', 'Edit row {n}', { n: index + 1 })" @click="editing = index">
							{{ t('nextcloud-vue', 'Edit') }}
						</NcButton>
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Remove row {n}', { n: index + 1 })"
							data-testid="cn-child-records-remove"
							@click="removeRow(index)">
							{{ t('nextcloud-vue', 'Remove') }}
						</NcButton>
					</td>
				</tr>
			</tbody>
		</table>
		<p v-if="total > list.length" class="cn-child-records-field__more" data-testid="cn-child-records-more">
			<template v-if="listUrl">
				<a :href="listUrl">{{ moreLabel }}</a>
			</template>
			<template v-else>
				{{ moreLabel }}
			</template>
		</p>
		<p v-if="error || problemText" class="cn-child-records-field__error" role="alert">
			{{ error || problemText }}
		</p>
		<CnFormDialog
			v-if="editing !== null && childSchema"
			:schema="childSchema"
			:item="list[editing]"
			:excludeFields="[config.parentField]"
			:dialogTitle="t('nextcloud-vue', 'Edit row {n}', { n: editing + 1 })"
			:recoverDraft="false"
			@confirm="onRowConfirm"
			@close="editing = null" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import { defineAsyncComponent } from 'vue'
import { describeRowProblem, useChildRecords, validateChildRows } from '../../composables/useChildRecords.js'

/**
 * CnChildRecordsField — edits the records of another schema that point at this
 * one, as a table inside the parent form (`child-records` form widget).
 *
 * Add row, inline editing of the columns shown, an Edit dialog for the other
 * fields, and Remove. On an existing parent it loads the first 50 children
 * (those whose `parentField` names the parent) and links to the list for the
 * rest. The rows are the v-model; the parent form saves them as their own
 * objects after the parent is saved (see `useChildRecords`), never nested in
 * the parent's payload. Each row is checked against the child schema's
 * required properties and the field reports the problems through `validity`.
 *
 * ```vue
 * <CnChildRecordsField v-model="lines" register="shop" :config="{ schema: 'order-line', parentField: 'order' }" parentId="o-1" />
 * ```
 */
export default {
	name: 'CnChildRecordsField',

	components: {
		// Lazy: CnFormDialog renders this field, so a static import is a cycle.
		CnFormDialog: defineAsyncComponent(() => import('../CnFormDialog/CnFormDialog.vue')),
		NcButton,
		NcLoadingIcon,
		NcTextField,
	},

	props: {
		/** The rows (v-model). Each saved row carries its `id`. */
		modelValue: {
			type: Array,
			default: () => [],
		},

		/**
		 * The relation: `schema` (child schema slug), `parentField` (the child
		 * property pointing at the parent) and optional `columns` (keys shown).
		 *
		 * @type {{schema: string, parentField: string, columns?: string[]}}
		 */
		config: {
			type: Object,
			required: true,
		},

		/** Register slug the child schema lives in. */
		register: {
			type: String,
			default: '',
		},

		/** Id of the parent being edited; empty when creating (no children to load). */
		parentId: {
			type: [String, Number],
			default: '',
		},

		/** Visible label of the table. */
		inputLabel: {
			type: String,
			default: '',
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

		/** Base URL of the OpenRegister API. */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},

		/** Most columns shown in the table. */
		maxColumns: {
			type: Number,
			default: 4,
		},
	},

	emits: [
		/**
		 * The rows changed (v-model).
		 *
		 * @event update:modelValue
		 * @type {object[]}
		 */
		'update:modelValue',
		/**
		 * The children as loaded from the server, so the form can tell what changed on save.
		 *
		 * @event loaded
		 * @type {object[]}
		 */
		'loaded',
		/**
		 * The current row problems (empty when every row is valid).
		 *
		 * @event validity
		 * @type {Array<{row: number, field: string, label: string}>}
		 */
		'validity',
	],

	data() {
		return {
			loading: false,
			childSchema: null,
			total: 0,
			editing: null,
		}
	},

	computed: {
		list() {
			return Array.isArray(this.modelValue) ? this.modelValue : []
		},

		/** The columns: the configured keys, else the child schema's first required properties. */
		columns() {
			const props = this.childSchema?.properties || {}
			let keys = Array.isArray(this.config.columns) ? [...this.config.columns] : []
			if (keys.length === 0) {
				const required = Array.isArray(this.childSchema?.required) ? this.childSchema.required : []
				keys = required.filter((k) => k !== this.config.parentField)
				if (keys.length === 0) {
					keys = Object.keys(props).filter((k) => k !== this.config.parentField)
				}
				keys = keys.slice(0, this.maxColumns)
			}
			return keys.filter((k) => k !== this.config.parentField).map((key) => {
				const type = props[key]?.type || 'string'
				const inline = ['string', 'number', 'integer'].includes(type) && !props[key]?.enum && !props[key]?.$ref
				return { key, label: props[key]?.title || key, inline, numeric: type === 'number' || type === 'integer' }
			})
		},

		problems() {
			return validateChildRows(this.list, this.childSchema, this.config.parentField)
		},

		problemText() {
			return describeRowProblem(this.problems)
		},

		moreLabel() {
			return t('nextcloud-vue', 'Showing {shown} of {total} rows. Edit the rest on the list page.', { shown: this.list.length, total: this.total })
		},

		listUrl() {
			return this.config.listUrl || ''
		},
	},

	watch: {
		problems: {
			immediate: true,
			handler(problems) {
				this.$emit('validity', problems)
			},
		},

		parentId() {
			this.load()
		},
	},

	created() {
		this.load()
	},

	methods: {
		t,

		/** Load the child schema and, for an existing parent, its children. */
		async load() {
			this.loading = true
			try {
				const response = await axios.get(generateUrl(`${this.apiBase}/schemas/${encodeURIComponent(this.config.schema)}`))
				this.childSchema = response?.data || null
			} catch {
				this.childSchema = null
			}
			if (this.parentId !== '' && this.parentId !== null && this.parentId !== undefined) {
				try {
					const { rows, total } = await useChildRecords({ apiBase: this.apiBase }).load({
						register: this.register,
						schema: this.config.schema,
						parentField: this.config.parentField,
						parentId: this.parentId,
					})
					this.total = total
					this.$emit('loaded', rows.map((r) => ({ ...r })))
					this.$emit('update:modelValue', rows)
				} catch {
					this.total = 0
				}
			}
			this.loading = false
		},

		/**
		 * The text of a cell.
		 *
		 * @param {object} row The row.
		 * @param {{key: string}} col The column.
		 * @return {string} The text.
		 */
		cellText(row, col) {
			const value = row?.[col.key]
			if (value === undefined || value === null) {
				return ''
			}
			return typeof value === 'object' ? JSON.stringify(value) : String(value)
		},

		/**
		 * Write one cell.
		 *
		 * @param {number} index The row index.
		 * @param {{key: string, numeric: boolean}} col The column.
		 * @param {string} value The typed value.
		 */
		setCell(index, col, value) {
			const next = this.list.map((r, i) => (i === index ? { ...r, [col.key]: col.numeric && value !== '' ? Number(value) : value } : r))
			this.$emit('update:modelValue', next)
		},

		/** Append an empty row. */
		addRow() {
			this.$emit('update:modelValue', [...this.list, {}])
		},

		/**
		 * Remove a row.
		 *
		 * @param {number} index The row index.
		 */
		removeRow(index) {
			this.$emit('update:modelValue', this.list.filter((_, i) => i !== index))
		},

		/**
		 * The row dialog was confirmed: take its values.
		 *
		 * @param {object} values The row values.
		 */
		onRowConfirm(values) {
			const index = this.editing
			this.$emit('update:modelValue', this.list.map((r, i) => (i === index ? { ...r, ...values } : r)))
			this.editing = null
		},
	},
}

</script>

<style scoped>
.cn-child-records-field__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}

.cn-child-records-field__label {
	font-weight: 600;
}

.cn-child-records-field__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-child-records-field__table th,
.cn-child-records-field__table td {
	padding: 4px 8px;
	text-align: start;
	border-bottom: 1px solid var(--color-border);
}

.cn-child-records-field__empty,
.cn-child-records-field__more {
	color: var(--color-text-maxcontrast);
}

.cn-child-records-field__actions {
	white-space: nowrap;
}

.cn-child-records-field__error {
	color: var(--color-error);
	margin: 8px 0 0;
}

.cn-child-records-field__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
}
</style>
