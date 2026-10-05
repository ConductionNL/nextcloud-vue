<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-stacked-bar-form">
		<div class="cn-stacked-bar-form__row2">
			<CnRegisterSchemaSelect
				:register="source.register"
				:schema="source.schema"
				@update:register="updateSource('register', $event)"
				@update:schema="updateSource('schema', $event)" />
		</div>

		<CnFieldPicker
			:value="groupBy"
			:label="t('nextcloud-vue', 'Field to group by')"
			:options="availableFields"
			placeholder="status"
			@update="updateField('groupBy', $event)" />

		<CnFilterRowsEditor :value="filterRows" :fields="availableFields" @input="onFilterRows" />

		<NcTextField
			:modelValue="orderText"
			:label="t('nextcloud-vue', 'Order of the segments (values, comma separated)')"
			placeholder="received, in_progress, decision"
			@update:modelValue="updateField('orderText', $event)" />

		<NcTextField
			:modelValue="emptyText"
			:label="t('nextcloud-vue', 'Text when there is nothing to count')"
			@update:modelValue="updateField('emptyText', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField } from '@nextcloud/vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'
import { filterToRows, rowsToFilter } from '../CnFilterRowsEditor/filterRows.js'

/**
 * CnStackedBarWidgetForm is the settings form of a `stacked-bar` widget. It
 * edits the source (register, schema, filter), the field the records are
 * grouped by, the order of the segments and the empty text. Static `segments`
 * and the `labels` map are written in the manifest and pass through
 * untouched. Emits `update:content` on every change; `validate()` asks for a
 * register, a schema and a group field unless the widget has static segments.
 */
export default {
	name: 'CnStackedBarWidgetForm',

	components: { NcTextField, CnFieldPicker, CnFilterRowsEditor, CnRegisterSchemaSelect },

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`), or null.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: { type: Object, default: null },
		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: { type: Object, default: () => ({}) },
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
		const src = initial.source || {}
		return {
			initial,
			source: { register: src.register ?? '', schema: src.schema ?? '' },
			groupBy: src.groupBy ?? '',
			filterRows: filterToRows(src.filter || {}),
			orderText: Array.isArray(initial.order) ? initial.order.join(', ') : '',
			emptyText: initial.emptyText ?? '',
			availableFields: [],
		}
	},

	computed: {
		/**
		 * The assembled content blob. Keys the form does not edit (static
		 * segments, labels) are carried over from the initial content.
		 *
		 * @return {object}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		assembledContent() {
			return {
				...this.initial,
				source: {
					register: this.source.register,
					schema: this.source.schema,
					groupBy: this.groupBy,
					filter: rowsToFilter(this.filterRows),
				},

				order: this.orderText.split(',').map((key) => key.trim()).filter((key) => key !== ''),
				emptyText: this.emptyText,
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

		/**
		 * Load the schema's field names for the picker.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		async loadFields() {
			this.availableFields = await fetchSchemaProperties(this.source.register, this.source.schema)
		},

		/**
		 * Set one field and emit the assembled content.
		 *
		 * @param {string} field The data key to write.
		 * @param {string} value The new value.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set the register or the schema and emit.
		 *
		 * @param {'register'|'schema'} field The source key to write.
		 * @param {string} value The chosen slug.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		updateSource(field, value) {
			this.source[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Take the filter editor's rows and emit.
		 *
		 * @param {Array<{key: string, op: string, value: string}>} rows The rows.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		onFilterRows(rows) {
			this.filterRows = rows
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} The validation errors.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-stacked-bar-widget
		 */
		validate() {
			const hasStatic = Array.isArray(this.initial.segments) && this.initial.segments.length > 0
			if (hasStatic && !this.source.register && !this.source.schema) {
				return []
			}
			const errors = []
			if (!this.source.register || !this.source.schema) {
				errors.push(t('nextcloud-vue', 'A register and schema are required'))
			}
			if (!this.groupBy) {
				errors.push(t('nextcloud-vue', 'A field to group by is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-stacked-bar-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-stacked-bar-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-stacked-bar-form__row2 > * {
	flex: 1;
	min-width: 0;
}
</style>
