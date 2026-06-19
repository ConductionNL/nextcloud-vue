<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-gauge-form">
		<h4 class="cn-gauge-form__section">{{ t('nextcloud-vue', 'Value') }}</h4>

		<NcTextField
			:value="label"
			:label="t('nextcloud-vue', 'Label')"
			placeholder="Pipeline coverage"
			@update:value="updateField('label', $event)" />

		<div class="cn-gauge-form__row2">
			<NcTextField
				:value="source.register"
				:label="t('nextcloud-vue', 'Register')"
				placeholder="pipelinq"
				@update:value="updateSource('register', $event)" />
			<NcTextField
				:value="source.schema"
				:label="t('nextcloud-vue', 'Schema')"
				placeholder="lead"
				@update:value="updateSource('schema', $event)" />
		</div>

		<div class="cn-gauge-form__row2">
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

		<CnFilterRowsEditor :value="filterRows" :fields="availableFields" @input="onFilterRows" />

		<h4 class="cn-gauge-form__section">{{ t('nextcloud-vue', 'Target') }}</h4>

		<div class="cn-gauge-form__row2">
			<NcSelect
				:value="targetKind"
				:options="targetKindOptions"
				:input-label="t('nextcloud-vue', 'Target type')"
				:clearable="false"
				@input="updateField('targetKind', $event)" />
			<NcTextField
				v-if="targetKind === 'static'"
				type="number"
				:value="String(targetValue)"
				:label="t('nextcloud-vue', 'Target value')"
				placeholder="500000"
				@update:value="updateField('targetValue', Number($event))" />
		</div>

		<div v-if="targetKind === 'aggregate'" class="cn-gauge-form__row2">
			<NcSelect
				:value="targetMetric"
				:options="metricOptions"
				:input-label="t('nextcloud-vue', 'Target aggregation')"
				:clearable="false"
				@input="updateField('targetMetric', $event)" />
			<CnFieldPicker
				v-if="targetMetric !== 'count'"
				:value="targetField"
				:label="t('nextcloud-vue', 'Target field')"
				:options="availableFields"
				placeholder="value"
				@update="updateField('targetField', $event)" />
		</div>

		<h4 class="cn-gauge-form__section">{{ t('nextcloud-vue', 'Thresholds & format') }}</h4>

		<div class="cn-gauge-form__row2">
			<NcTextField
				type="number"
				:value="String(warn)"
				:label="t('nextcloud-vue', 'Warning at %')"
				@update:value="updateField('warn', Number($event))" />
			<NcTextField
				type="number"
				:value="String(danger)"
				:label="t('nextcloud-vue', 'Danger at %')"
				@update:value="updateField('danger', Number($event))" />
		</div>

		<div class="cn-gauge-form__row2">
			<NcCheckboxRadioSwitch
				:checked="invert"
				type="switch"
				@update:checked="updateField('invert', $event)">
				{{ t('nextcloud-vue', 'Low is bad (invert colours)') }}
			</NcCheckboxRadioSwitch>
			<NcSelect
				:value="formatStyle"
				:options="formatOptions"
				:input-label="t('nextcloud-vue', 'Number format')"
				:clearable="false"
				@input="updateField('formatStyle', $event)" />
		</div>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import { rowsToFilter, filterToRows } from '../CnFilterRowsEditor/filterRows.js'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'

const DEFAULT_CONTENT = Object.freeze({
	label: '',
	format: { style: 'number', currency: 'EUR', decimals: 0 },
	source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
	target: { kind: 'static', value: 100, metric: 'count', field: '', filter: {} },
	thresholds: { warn: 80, danger: 100, invert: false },
})

/**
 * CnGaugeWidgetForm — the config sub-form for a `gauge` widget (a
 * progress-to-target utilization bar). Edits the value source (register /
 * schema / aggregation / field / filter), the target (a static number or a
 * second aggregate), the warning / danger threshold percentages (with an invert
 * toggle for "low is bad"), and the number format. Emits `update:content` with
 * `{ label, format, source, target, thresholds }`; `validate()` requires
 * register + schema. Used by `CnAddWidgetModal` + the cog editor.
 */
export default {
	name: 'CnGaugeWidgetForm',

	components: { NcTextField, NcSelect, NcCheckboxRadioSwitch, CnFilterRowsEditor, CnFieldPicker },

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
		const tgt = initial.target || {}
		const th = initial.thresholds || {}
		const fmt = initial.format || {}
		return {
			label: initial.label ?? '',
			formatStyle: fmt.style ?? 'number',
			decimals: Number.isFinite(fmt.decimals) ? fmt.decimals : 0,
			currency: fmt.currency ?? 'EUR',
			source: { register: src.register ?? '', schema: src.schema ?? '' },
			metric: src.metric ?? 'count',
			field: src.field ?? '',
			filterRows: filterToRows(src.filter || {}),
			targetKind: tgt.kind ?? 'static',
			targetValue: Number.isFinite(tgt.value) ? tgt.value : 100,
			targetMetric: tgt.metric ?? 'count',
			targetField: tgt.field ?? '',
			warn: Number.isFinite(th.warn) ? th.warn : 80,
			danger: Number.isFinite(th.danger) ? th.danger : 100,
			invert: th.invert ?? false,
			availableFields: [],
		}
	},

	watch: {
		'source.register': 'loadFields',
		'source.schema': 'loadFields',
	},

	mounted() {
		this.loadFields()
	},

	computed: {
		/** Aggregation metric options. */
		metricOptions() { return ['count', 'sum', 'avg', 'min', 'max'] },
		/** Target kinds: a fixed number or a second aggregate. */
		targetKindOptions() { return ['static', 'aggregate'] },
		/** Number-format styles. */
		formatOptions() { return ['number', 'currency', 'percent'] },
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				label: this.label,
				format: { style: this.formatStyle, currency: this.currency, decimals: this.decimals },
				source: {
					register: this.source.register,
					schema: this.source.schema,
					metric: this.metric,
					field: this.field,
					filter: rowsToFilter(this.filterRows),
				},
				target: {
					kind: this.targetKind,
					value: this.targetValue,
					metric: this.targetMetric,
					field: this.targetField,
					filter: rowsToFilter(this.filterRows),
				},
				thresholds: { warn: this.warn, danger: this.danger, invert: this.invert },
			}
		},
	},

	methods: {
		t,
		/** Resolve the schema's field names for the dropdowns. */
		async loadFields() {
			this.availableFields = await fetchSchemaProperties(this.source.register, this.source.schema)
		},
		/** Set a top-level field and emit. */
		updateField(field, value) { this[field] = value; this.emitChange() },
		/** Set a source sub-field and emit. */
		updateSource(field, value) { this.$set(this.source, field, value); this.emitChange() },
		/** Receive updated filter rows. */
		onFilterRows(rows) { this.filterRows = rows; this.emitChange() },
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
			return errors
		},
	},
}
</script>

<style scoped>
.cn-gauge-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-gauge-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-gauge-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-gauge-form__row2 > * {
	flex: 1;
	min-width: 0;
}
</style>
