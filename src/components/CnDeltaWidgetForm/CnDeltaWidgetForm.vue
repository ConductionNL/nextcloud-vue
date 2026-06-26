<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-delta-form">
		<h4 class="cn-delta-form__section">
			{{ t('nextcloud-vue', 'Data source') }}
		</h4>

		<NcTextField
			:value="label"
			:label="t('nextcloud-vue', 'Label')"
			placeholder="Revenue (MTD)"
			@update:value="updateField('label', $event)" />

		<div class="cn-delta-form__row2">
			<CnRegisterSchemaSelect
				:register="source.register"
				:schema="source.schema"
				@update:register="updateSource('register', $event)"
				@update:schema="updateSource('schema', $event)" />
		</div>

		<div class="cn-delta-form__row2">
			<NcSelect
				:value="metric"
				:options="metricOptions"
				:input-label="t('nextcloud-vue', 'Aggregation')"
				:clearable="false"
				@input="updateField('metric', $event)" />
			<CnFieldPicker
				v-if="metric !== 'count'"
				:value="field"
				:label="t('nextcloud-vue', 'Field')"
				:options="availableFields"
				placeholder="value"
				@update="updateField('field', $event)" />
		</div>

		<h4 class="cn-delta-form__section">
			{{ t('nextcloud-vue', 'Current period') }}
		</h4>
		<CnFilterRowsEditor :value="currentRows" :fields="availableFields" @input="onCurrentRows" />

		<h4 class="cn-delta-form__section">
			{{ t('nextcloud-vue', 'Previous period') }}
		</h4>
		<CnFilterRowsEditor :value="previousRows" :fields="availableFields" @input="onPreviousRows" />

		<h4 class="cn-delta-form__section">
			{{ t('nextcloud-vue', 'Display') }}
		</h4>

		<div class="cn-delta-form__row2">
			<NcSelect
				:value="goodDirection"
				:options="directionOptions"
				:input-label="t('nextcloud-vue', 'Good direction')"
				:clearable="false"
				@input="updateField('goodDirection', $event)" />
			<NcSelect
				:value="formatStyle"
				:options="formatOptions"
				:input-label="t('nextcloud-vue', 'Number format')"
				:clearable="false"
				@input="updateField('formatStyle', $event)" />
		</div>

		<div class="cn-delta-form__row2">
			<NcTextField
				type="number"
				:value="String(decimals)"
				:label="t('nextcloud-vue', 'Decimals')"
				@update:value="updateField('decimals', Number($event))" />
			<CnFieldPicker
				:value="icon"
				:label="t('nextcloud-vue', 'Icon')"
				:options="iconOptions"
				placeholder="Cash"
				@update="updateField('icon', $event)" />
		</div>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import { rowsToFilter, filterToRows } from '../CnFilterRowsEditor/filterRows.js'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'
import { DASHBOARD_ICONS } from '../CnWidgetGrid/widgetIcons.js'

const DEFAULT_CONTENT = Object.freeze({
	label: '',
	icon: 'Cash',
	format: { style: 'number', currency: 'EUR', decimals: 0 },
	source: { register: '', schema: '', metric: 'count', field: '', goodDirection: 'up', current: { filter: {} }, previous: { filter: {} } },
})

/**
 * CnDeltaWidgetForm — the config sub-form for a `delta` widget (a
 * period-over-period comparison KPI). Edits the shared OpenRegister source
 * (register / schema / aggregation / field), the current- and previous-period
 * filters (each supporting relative tokens like `@monthStart`), and the
 * presentation (good direction, number format, icon). Emits `update:content`
 * with `{ label, icon, format, source }`; `validate()` requires register +
 * schema (and a field for non-count metrics). Used by `CnAddWidgetModal` + the
 * cog editor.
 */
export default {
	name: 'CnDeltaWidgetForm',

	components: { NcTextField, NcSelect, CnFilterRowsEditor, CnFieldPicker },

	props: {
		/** The placement being edited (pre-fills from `editingWidget.content`), or null. @type {{content: object}|null} */
		editingWidget: { type: Object, default: null },
		/** Initial content values when not editing (registry defaults). @type {object} */
		value: { type: Object, default: () => ({ ...DEFAULT_CONTENT }) },
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		const src = initial.source || {}
		const fmt = initial.format || {}
		return {
			label: initial.label ?? '',
			icon: initial.icon ?? 'Cash',
			formatStyle: fmt.style ?? 'number',
			decimals: Number.isFinite(fmt.decimals) ? fmt.decimals : 0,
			currency: fmt.currency ?? 'EUR',
			source: { register: src.register ?? '', schema: src.schema ?? '' },
			metric: src.metric ?? 'count',
			field: src.field ?? '',
			goodDirection: src.goodDirection ?? 'up',
			currentRows: filterToRows((src.current && src.current.filter) || {}),
			previousRows: filterToRows((src.previous && src.previous.filter) || {}),
			availableFields: [],
		}
	},

	computed: {
		/** Aggregation metric options. */
		metricOptions() { return ['count', 'sum', 'avg', 'min', 'max'] },
		/** Which direction of change is "good" (green). */
		directionOptions() { return ['up', 'down'] },
		/** Number-format styles. */
		formatOptions() { return ['number', 'currency', 'percent'] },
		/** Icon name options from the shared catalog. */
		iconOptions() { return Object.keys(DASHBOARD_ICONS) },
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				label: this.label,
				icon: this.icon,
				format: { style: this.formatStyle, currency: this.currency, decimals: this.decimals },
				source: {
					register: this.source.register,
					schema: this.source.schema,
					metric: this.metric,
					field: this.field,
					goodDirection: this.goodDirection,
					current: { filter: rowsToFilter(this.currentRows) },
					previous: { filter: rowsToFilter(this.previousRows) },
				},
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
		 * Set a top-level field and emit.
		 * @param field
		 * @param value
		 */
		updateField(field, value) { this[field] = value; this.emitChange() },
		/**
		 * Set a source sub-field and emit.
		 * @param field
		 * @param value
		 */
		updateSource(field, value) { this.$set(this.source, field, value); this.emitChange() },
		/**
		 * Receive updated current-period filter rows.
		 * @param rows
		 */
		onCurrentRows(rows) { this.currentRows = rows; this.emitChange() },
		/**
		 * Receive updated previous-period filter rows.
		 * @param rows
		 */
		onPreviousRows(rows) { this.previousRows = rows; this.emitChange() },
		/** Emit the assembled content. */
		emitChange() { this.$emit('update:content', this.assembledContent) },
		/**
		 * Validate the form; an empty array means valid.
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			if (!this.source.register || !this.source.schema) {
				errors.push(t('nextcloud-vue', 'A register and schema are required'))
			}
			if (this.metric !== 'count' && (!this.field || this.field.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A field is required for sum / avg / min / max'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-delta-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-delta-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-delta-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-delta-form__row2 > * {
	flex: 1;
	min-width: 0;
}
</style>
