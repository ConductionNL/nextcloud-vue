<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-child-records-field">
		<div class="cn-child-records-field__head">
			<span class="cn-child-records-field__label">{{ inputLabel }}</span>
			<div v-if="!disabled" class="cn-child-records-field__adds">
				<CnSearchSelect
					v-if="addFrom"
					class="cn-child-records-field__pick"
					data-testid="cn-child-records-add-from"
					:modelValue="null"
					:options="sourceOptions"
					:loading="sourceLoading"
					:inputLabel="addFromLabel"
					:filterable="false"
					@search="searchSource"
					@update:modelValue="addFromPicked" />
				<form
					v-if="addFrom && addFrom.codeField"
					class="cn-child-records-field__code"
					data-testid="cn-child-records-code"
					@submit.prevent="addByCode">
					<NcTextField
						:modelValue="code"
						:label="codeLabel"
						@update:modelValue="value => { code = value }" />
					<NcButton type="submit" data-testid="cn-child-records-code-add">
						{{ t('nextcloud-vue', 'Add') }}
					</NcButton>
				</form>
				<NcButton
					v-if="freeRows"
					data-testid="cn-child-records-add"
					@click="addRow">
					{{ t('nextcloud-vue', 'Add row') }}
				</NcButton>
			</div>
		</div>
		<NcLoadingIcon v-if="loading" :name="t('nextcloud-vue', 'Loading …')" />
		<table v-else class="cn-child-records-field__table">
			<thead>
				<tr>
					<th v-for="col in columns"
						:key="col.key"
						scope="col"
						:class="{ 'cn-child-records-field__num': col.numeric || col.computed }">
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
					<td v-for="col in columns" :key="col.key" :class="{ 'cn-child-records-field__num': col.numeric || col.computed }">
						<span v-if="col.computed" data-testid="cn-child-records-computed">{{ computedText(row, col) }}</span>
						<NcTextField
							v-else-if="col.inline && !disabled"
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
			<tfoot v-if="totalRows.length > 0">
				<tr v-for="totalRow in totalRows"
					:key="totalRow.key"
					:class="{ 'cn-child-records-field__total--emphasis': totalRow.emphasis }"
					data-testid="cn-child-records-total">
					<th scope="row" :colspan="Math.max(1, columns.length - 1)" class="cn-child-records-field__total-label">
						{{ totalRow.label }}
					</th>
					<td class="cn-child-records-field__num" data-testid="cn-child-records-total-value">
						{{ totalRow.text }}
					</td>
					<td v-if="!disabled" />
				</tr>
			</tfoot>
		</table>
		<p class="cn-child-records-field__sr" aria-live="polite" data-testid="cn-child-records-status">
			{{ status }}
		</p>
		<p v-if="total > list.length" class="cn-child-records-field__more" data-testid="cn-child-records-more">
			<template v-if="listUrl">
				<a :href="listUrl">{{ moreLabel }}</a>
			</template>
			<template v-else>
				{{ moreLabel }}
			</template>
		</p>
		<p v-if="error || problemText || addError" class="cn-child-records-field__error" role="alert">
			{{ error || problemText || addError }}
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
import CnSearchSelect from '../CnSearchSelect/CnSearchSelect.vue'
import { describeRowProblem, useChildRecords, validateChildRows } from '../../composables/useChildRecords.js'
import { computeRow, computeTotals, rowFromSource, storeComputed } from '../../utils/childRecordTotals.js'
import { formatMetricValue, normalizeMetricFormat } from '../../utils/formatMetric.js'

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
 * `config.computed` adds read-only columns worked out per row from a formula,
 * `config.totals` adds total rows under the table (a sum over the rows, or a
 * formula over the totals before it), and `config.addFrom` adds rows from
 * another schema's records: picked from a search, or found by a typed or
 * scanned code.
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
		CnSearchSelect,
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
		 * Optional `computed`: read-only columns, each `{ key, label, formula,
		 * format?, currency?, decimals?, store? }`; `store` writes the value into
		 * the row when the row changes. Optional `totals`: rows under the table,
		 * each `{ key, label, sum? | formula?, format?, currency?, decimals?,
		 * emphasis? }`. Optional `addFrom`: `{ schema, register?, map,
		 * titleField?, secondaryField?, label?, codeField?, codeLabel?,
		 * freeRows? }`, where `map` names per row key the source key to copy
		 * (`@id` for the source's id).
		 *
		 * @type {{schema: string, parentField: string, columns?: string[], computed?: object[], totals?: object[], addFrom?: object}}
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
		/**
		 * The totals changed: the value per total key.
		 *
		 * @event totals
		 * @type {{[key: string]: number|null}}
		 */
		'totals',
	],

	data() {
		return {
			loading: false,
			childSchema: null,
			total: 0,
			editing: null,
			sourceOptions: [],
			sourceLoading: false,
			code: '',
			addError: '',
			status: '',
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
			const computedKeys = this.computedColumns.map((c) => c.key)
			const plain = keys.filter((k) => k !== this.config.parentField && !computedKeys.includes(k)).map((key) => {
				const type = props[key]?.type || 'string'
				const inline = ['string', 'number', 'integer'].includes(type) && !props[key]?.enum && !props[key]?.$ref
				return { key, label: props[key]?.title || key, inline, numeric: type === 'number' || type === 'integer' }
			})
			const computed = this.computedColumns.map((c) => ({
				key: c.key,
				label: c.label || props[c.key]?.title || c.key,
				computed: true,
				format: normalizeMetricFormat(c) || { style: 'decimal', decimals: 2 },
			}))
			return [...plain, ...computed]
		},

		/** The computed columns as configured. */
		computedColumns() {
			return Array.isArray(this.config.computed) ? this.config.computed.filter((c) => c && c.key) : []
		},

		/** The totals per key. */
		totals() {
			return computeTotals(this.list, this.config.totals, this.computedColumns)
		},

		/** The total rows, each with its formatted text. */
		totalRows() {
			const totals = Array.isArray(this.config.totals) ? this.config.totals.filter((x) => x && x.key) : []
			return totals.map((x) => ({
				key: x.key,
				label: x.label || x.key,
				emphasis: !!x.emphasis,
				text: formatMetricValue(this.totals[x.key], normalizeMetricFormat(x) || { style: 'decimal', decimals: 2 }),
			}))
		},

		/** The add-from source, or null. */
		addFrom() {
			const source = this.config.addFrom
			return source && typeof source === 'object' && source.schema ? source : null
		},

		/** Whether a free, empty row can be added. */
		freeRows() {
			return !this.addFrom || this.addFrom.freeRows !== false
		},

		addFromLabel() {
			return this.addFrom?.label || t('nextcloud-vue', 'Add from a list')
		},

		codeLabel() {
			return this.addFrom?.codeLabel || t('nextcloud-vue', 'Scan or type a code')
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

		totals: {
			immediate: true,
			handler(totals) {
				if (Object.keys(totals).length > 0) {
					this.$emit('totals', totals)
				}
			},
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
			const next = this.list.map((r, i) => (i === index ? this.withComputed({ ...r, [col.key]: col.numeric && value !== '' ? Number(value) : value }) : r))
			this.$emit('update:modelValue', next)
		},

		/**
		 * The row with its stored computed columns written in.
		 *
		 * @param {object} row The row.
		 * @return {object} The row.
		 * @spec openspec/changes/child-records-totals/tasks.md#task-1
		 */
		withComputed(row) {
			return storeComputed(row, this.computedColumns)
		},

		/**
		 * The text of a computed cell.
		 *
		 * @param {object} row The row.
		 * @param {{key: string, format: object}} col The computed column.
		 * @return {string} The text.
		 * @spec openspec/changes/child-records-totals/tasks.md#task-1
		 */
		computedText(row, col) {
			return formatMetricValue(computeRow(row, this.computedColumns)[col.key], col.format)
		},

		/**
		 * The URL of the add-from source's objects.
		 *
		 * @param {URLSearchParams} params The query.
		 * @return {string} The URL.
		 * @spec openspec/changes/child-records-totals/tasks.md#task-3
		 */
		sourceUrl(params) {
			const register = this.addFrom.register || this.register
			return generateUrl(`${this.apiBase}/objects/${register}/${this.addFrom.schema}?${params.toString()}`)
		},

		/**
		 * Search the add-from source.
		 *
		 * @param {string} query The typed text.
		 * @spec openspec/changes/child-records-totals/tasks.md#task-3
		 */
		async searchSource(query) {
			if (!query) {
				this.sourceOptions = []
				return
			}
			this.sourceLoading = true
			try {
				const response = await axios.get(this.sourceUrl(new URLSearchParams({ _search: query, _limit: '20' })))
				const results = Array.isArray(response?.data?.results) ? response.data.results : []
				const titleField = this.addFrom.titleField || 'name'
				this.sourceOptions = results.map((source) => ({
					id: String(source.id ?? source.uuid),
					label: String(source[titleField] ?? source.id ?? ''),
					secondary: this.addFrom.secondaryField ? String(source[this.addFrom.secondaryField] ?? '') : '',
					source,
				}))
			} catch {
				this.sourceOptions = []
			}
			this.sourceLoading = false
		},

		/**
		 * A source record was picked: add a row from it.
		 *
		 * @param {string|null} id The picked option's id.
		 * @spec openspec/changes/child-records-totals/tasks.md#task-3
		 */
		addFromPicked(id) {
			const option = this.sourceOptions.find((o) => o.id === id)
			if (option) {
				this.addSourceRow(option.source)
			}
		},

		/**
		 * Find the source record with the typed or scanned code and add a row from it.
		 *
		 * @spec openspec/changes/child-records-totals/tasks.md#task-3
		 */
		async addByCode() {
			const code = String(this.code || '').trim()
			if (code === '') {
				return
			}
			this.addError = ''
			try {
				const response = await axios.get(this.sourceUrl(new URLSearchParams({ [this.addFrom.codeField]: code, _limit: '2' })))
				const results = Array.isArray(response?.data?.results) ? response.data.results : []
				if (results.length === 1) {
					this.addSourceRow(results[0])
					this.code = ''
				} else if (results.length === 0) {
					this.addError = t('nextcloud-vue', 'No record has the code {code}.', { code })
				} else {
					this.addError = t('nextcloud-vue', 'More than one record has the code {code}.', { code })
				}
			} catch {
				this.addError = t('nextcloud-vue', 'The code {code} could not be looked up.', { code })
			}
		},

		/**
		 * Append a row made from a source record.
		 *
		 * @param {object} source The source record.
		 * @spec openspec/changes/child-records-totals/tasks.md#task-3
		 */
		addSourceRow(source) {
			this.addError = ''
			const row = this.withComputed(rowFromSource(source, this.addFrom.map))
			this.$emit('update:modelValue', [...this.list, row])
			const name = source?.[this.addFrom.titleField || 'name'] ?? ''
			this.status = t('nextcloud-vue', 'Added {name}.', { name: String(name) })
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
			this.$emit('update:modelValue', this.list.map((r, i) => (i === index ? this.withComputed({ ...r, ...values }) : r)))
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

.cn-child-records-field__head {
	flex-wrap: wrap;
	gap: 8px;
}

.cn-child-records-field__adds,
.cn-child-records-field__code {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
}

.cn-child-records-field__pick {
	min-width: 240px;
}

.cn-child-records-field__table th.cn-child-records-field__num,
.cn-child-records-field__table td.cn-child-records-field__num {
	text-align: end;
	font-variant-numeric: tabular-nums;
}

.cn-child-records-field__table tfoot th,
.cn-child-records-field__table tfoot td {
	border-bottom: none;
}

.cn-child-records-field__table .cn-child-records-field__total-label {
	text-align: end;
	font-weight: normal;
}

.cn-child-records-field__total--emphasis th,
.cn-child-records-field__total--emphasis td {
	font-weight: 600;
	border-top: 1px solid var(--color-border);
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
