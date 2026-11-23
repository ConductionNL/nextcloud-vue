<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-week-strip-form">
		<div class="cn-week-strip-form__row2">
			<CnRegisterSchemaSelect
				:register="source.register"
				:schema="source.schema"
				@update:register="updateSource('register', $event)"
				@update:schema="updateSource('schema', $event)" />
		</div>

		<div class="cn-week-strip-form__row2">
			<CnFieldPicker
				:value="dateField"
				:label="t('nextcloud-vue', 'Date field')"
				:options="availableFields"
				placeholder="deadline"
				@update="updateField('dateField', $event)" />
			<CnFieldPicker
				:value="titleField"
				:label="t('nextcloud-vue', 'Title field')"
				:options="availableFields"
				placeholder="title"
				@update="updateField('titleField', $event)" />
		</div>

		<NcTextField
			:modelValue="metaFieldsText"
			:label="t('nextcloud-vue', 'Extra fields under the title (comma separated)')"
			placeholder="identifier, type"
			@update:modelValue="updateField('metaFieldsText', $event)" />

		<CnFilterRowsEditor :value="filterRows" :fields="availableFields" @input="onFilterRows" />

		<div class="cn-week-strip-form__row2">
			<NcSelect
				:modelValue="days"
				:options="dayOptions"
				:inputLabel="t('nextcloud-vue', 'Days shown')"
				:clearable="false"
				@update:modelValue="updateField('days', $event)" />
			<NcTextField
				:modelValue="itemRoute"
				:label="t('nextcloud-vue', 'Page an item opens (page id, optional)')"
				@update:modelValue="updateField('itemRoute', $event)" />
		</div>

		<NcTextField
			:modelValue="emptyText"
			:label="t('nextcloud-vue', 'Text for a day without items')"
			@update:modelValue="updateField('emptyText', $event)" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect, NcTextField } from '@nextcloud/vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'
import { filterToRows, rowsToFilter } from '../CnFilterRowsEditor/filterRows.js'

/**
 * CnWeekStripWidgetForm is the settings form of a `week-strip` widget. It
 * edits the source (register, schema, filter), the date field the items are
 * bucketed by, what each item shows, how many days render and the text of an
 * empty day. Static `items` and the `lateWhen` rule are written in the
 * manifest and pass through untouched. Emits `update:content` on every
 * change; `validate()` asks for a register, a schema and a date field unless
 * the widget has static items.
 */
export default {
	name: 'CnWeekStripWidgetForm',

	components: { NcSelect, NcTextField, CnFieldPicker, CnFilterRowsEditor, CnRegisterSchemaSelect },

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
			limit: src.limit,
			filterRows: filterToRows(src.filter || {}),
			dateField: initial.dateField ?? '',
			titleField: initial.titleField ?? '',
			metaFieldsText: Array.isArray(initial.metaFields) ? initial.metaFields.join(', ') : '',
			days: Number(initial.days) === 7 ? 7 : 5,
			itemRoute: initial.itemRoute ?? '',
			emptyText: initial.emptyText ?? '',
			availableFields: [],
		}
	},

	computed: {
		/**
		 * The day counts on offer: working days or the whole week.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		dayOptions() {
			return [5, 7]
		},

		/**
		 * The assembled content blob. Keys the form does not edit (static
		 * items, the late rule) are carried over from the initial content.
		 *
		 * @return {object}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		assembledContent() {
			const source = {
				register: this.source.register,
				schema: this.source.schema,
				filter: rowsToFilter(this.filterRows),
			}
			if (this.limit !== undefined) {
				source.limit = this.limit
			}
			return {
				...this.initial,
				source,
				dateField: this.dateField,
				titleField: this.titleField,
				metaFields: this.metaFieldsText.split(',').map((field) => field.trim()).filter((field) => field !== ''),
				days: this.days,
				itemRoute: this.itemRoute,
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
		 * Load the schema's field names for the pickers.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		async loadFields() {
			this.availableFields = await fetchSchemaProperties(this.source.register, this.source.schema)
		},

		/**
		 * Set one field and emit the assembled content.
		 *
		 * @param {string} field The data key to write.
		 * @param {string|number} value The new value.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
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
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
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
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		onFilterRows(rows) {
			this.filterRows = rows
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} The validation errors.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		validate() {
			const hasStaticItems = Array.isArray(this.initial.items) && this.initial.items.length > 0
			if (hasStaticItems && !this.source.register && !this.source.schema) {
				return []
			}
			const errors = []
			if (!this.source.register || !this.source.schema) {
				errors.push(t('nextcloud-vue', 'A register and schema are required'))
			}
			if (!this.dateField) {
				errors.push(t('nextcloud-vue', 'A date field is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-week-strip-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-week-strip-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-week-strip-form__row2 > * {
	flex: 1;
	min-width: 0;
}
</style>
