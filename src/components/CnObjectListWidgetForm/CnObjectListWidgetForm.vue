<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-list-form">
		<!-- Data source. -->
		<h4 class="cn-object-list-form__section">
			{{ t('nextcloud-vue', 'Data source') }}
		</h4>

		<div class="cn-object-list-form__row2">
			<CnRegisterSchemaSelect
				:register="source.register"
				:schema="source.schema"
				@update:register="updateSource('register', $event)"
				@update:schema="updateSource('schema', $event)" />
		</div>

		<div class="cn-object-list-form__row2">
			<CnFieldPicker
				:value="sort.field"
				:label="t('nextcloud-vue', 'Sort by')"
				:options="availableFields"
				placeholder="expectedCloseDate"
				@update="updateSort('field', $event)" />
			<NcSelect
				:model-value="sort.dir"
				:options="dirOptions"
				:input-label="t('nextcloud-vue', 'Direction')"
				:clearable="false"
				@update:model-value="updateSort('dir', $event)" />
			<NcTextField
				:model-value="String(limit)"
				type="number"
				:label="t('nextcloud-vue', 'Max rows')"
				@update:model-value="updateLimit($event)" />
		</div>

		<!-- Filters with operators. -->
		<CnFilterRowsEditor :value="filterRows" :fields="availableFields" @input="onFilterRows" />

		<!-- Columns. -->
		<h4 class="cn-object-list-form__section">
			{{ t('nextcloud-vue', 'Columns') }}
		</h4>
		<div
			v-for="(col, i) in columns"
			:key="i"
			class="cn-object-list-form__row2 cn-object-list-form__col-row">
			<CnFieldPicker
				:value="col.key"
				:label="t('nextcloud-vue', 'Property')"
				:options="availableFields"
				placeholder="title"
				@update="updateColumn(i, 'key', $event)" />
			<NcTextField
				:model-value="col.label"
				:label="t('nextcloud-vue', 'Header')"
				placeholder="Deal"
				@update:model-value="updateColumn(i, 'label', $event)" />
			<NcButton
				type="tertiary"
				:aria-label="t('nextcloud-vue', 'Remove column')"
				@click="removeColumn(i)">
				<template #icon>
					<Close :size="18" />
				</template>
			</NcButton>
		</div>
		<NcButton type="tertiary" @click="addColumn">
			<template #icon>
				<Plus :size="18" />
			</template>
			{{ t('nextcloud-vue', 'Add column') }}
		</NcButton>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import { rowsToFilter, filterToRows } from '../CnFilterRowsEditor/filterRows.js'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'

const DEFAULT_CONTENT = Object.freeze({
	register: '',
	schema: '',
	filter: {},
	sort: { field: '', dir: 'asc' },
	limit: 5,
	columns: [{ key: 'title', label: 'Title' }],
})

/**
 * CnObjectListWidgetForm — the config sub-form for an `object-list` widget.
 *
 * Edits the OpenRegister data source (register / schema), the sort field +
 * direction, the row limit, the operator-aware equality/range filters, and the
 * displayed columns. Emits `update:content` with the assembled blob on every
 * change; `validate()` requires a register + schema. Used by both
 * `CnAddWidgetModal` and the cog `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnObjectListWidgetForm',

	components: { NcTextField, NcSelect, NcButton, Plus, Close, CnFilterRowsEditor, CnFieldPicker, CnRegisterSchemaSelect },

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`),
		 * or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			source: {
				register: initial.register ?? '',
				schema: initial.schema ?? '',
			},
			sort: {
				field: initial.sort?.field ?? '',
				dir: initial.sort?.dir ?? 'asc',
			},
			limit: Number.isFinite(initial.limit) ? initial.limit : 5,
			columns: Array.isArray(initial.columns) && initial.columns.length
				? initial.columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : { key: c.key, label: c.label || c.key }))
				: [{ key: 'title', label: 'Title' }],
			filterRows: filterToRows(initial.filter || {}),
			availableFields: [],
		}
	},

	computed: {
		/** Sort-direction options. */
		dirOptions() {
			return ['asc', 'desc']
		},
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				register: this.source.register,
				schema: this.source.schema,
				filter: rowsToFilter(this.filterRows),
				sort: { field: this.sort.field, dir: this.sort.dir },
				limit: this.limit,
				columns: this.columns.filter((c) => c.key && c.key.trim() !== ''),
			}
		},
	},

	watch: {
		'source.register': 'loadFields',
		'source.schema': 'loadFields',
	},

	mounted() {
		this.loadFields()
	},

	methods: {
		t,

		/** Resolve the schema's field names for the dropdowns. */
		async loadFields() {
			this.availableFields = await fetchSchemaProperties(this.source.register, this.source.schema)
		},

		/**
		 * Set a source sub-field and emit.
		 * @param field
		 * @param value
		 */
		updateSource(field, value) {
			this.$set(this.source, field, value)
			this.emitChange()
		},

		/**
		 * Set a sort sub-field and emit.
		 * @param field
		 * @param value
		 */
		updateSort(field, value) {
			this.$set(this.sort, field, value)
			this.emitChange()
		},

		/**
		 * Set the limit and emit.
		 * @param value
		 */
		updateLimit(value) {
			this.limit = Number(value) || 5
			this.emitChange()
		},

		/**
		 * Receive updated filter rows from the shared editor.
		 * @param rows
		 */
		onFilterRows(rows) {
			this.filterRows = rows
			this.emitChange()
		},

		/** Add a blank column. */
		addColumn() {
			this.columns.push({ key: '', label: '' })
		},

		/**
		 * Remove a column by index.
		 * @param i
		 */
		removeColumn(i) {
			this.columns.splice(i, 1)
			this.emitChange()
		},

		/**
		 * Update one cell of a column and emit.
		 * @param i
		 * @param cell
		 * @param value
		 */
		updateColumn(i, cell, value) {
			this.$set(this.columns[i], cell, value)
			this.emitChange()
		},

		/** Emit the assembled content. */
		emitChange() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			if (!this.source.register || !this.source.schema) {
				return [t('nextcloud-vue', 'A register and schema are required')]
			}
			return []
		},
	},
}
</script>

<style scoped>
.cn-object-list-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-object-list-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-object-list-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-object-list-form__row2 > * {
	flex: 1;
	min-width: 0;
}

.cn-object-list-form__col-row :deep(.button-vue) {
	flex: 0 0 auto;
}
</style>
