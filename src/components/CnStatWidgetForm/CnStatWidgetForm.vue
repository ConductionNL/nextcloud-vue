<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-stat-widget-form">
		<!-- Data source. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Data source') }}
		</h4>

		<div class="cn-stat-widget-form__row2">
			<CnRegisterSchemaSelect
				:register="source.register"
				:schema="source.schema"
				@update:register="updateSource('register', $event)"
				@update:schema="updateSource('schema', $event)" />
		</div>

		<NcSelect
			:value="kind"
			:options="kindOptions"
			:input-label="t('nextcloud-vue', 'Source type')"
			:clearable="false"
			@input="updateField('kind', $event)">
			<template #option="{ label: id }">
				{{ kindLabel(id) }}
			</template>
			<template #selected-option="{ label: id }">
				{{ kindLabel(id) }}
			</template>
		</NcSelect>

		<!-- Aggregate / Ratio share metric + field. Weighted uses field × weight. -->
		<div v-if="kind !== 'weighted'" class="cn-stat-widget-form__row2">
			<NcSelect
				:value="metric"
				:options="metricOptions"
				:input-label="t('nextcloud-vue', 'Aggregation')"
				:clearable="false"
				@input="updateField('metric', $event)" />
			<CnFieldPicker
				v-if="metric && metric !== 'count'"
				:value="field"
				:label="t('nextcloud-vue', 'Field')"
				:options="availableFields"
				placeholder="value"
				@update="updateField('field', $event)" />
		</div>
		<div v-else class="cn-stat-widget-form__row2">
			<CnFieldPicker
				:value="weighted.field"
				:label="t('nextcloud-vue', 'Field')"
				:options="availableFields"
				placeholder="value"
				@update="updateWeighted('field', $event)" />
			<CnFieldPicker
				:value="weighted.weightField"
				:label="t('nextcloud-vue', 'Weight field')"
				:options="availableFields"
				placeholder="probability"
				@update="updateWeighted('weightField', $event)" />
			<NcTextField
				:value="String(weighted.divisor)"
				type="number"
				:label="t('nextcloud-vue', 'Weight divisor')"
				placeholder="100"
				@update:value="updateWeighted('divisor', Number($event) || 1)" />
		</div>

		<!-- Aggregate + Weighted use one filter; Ratio + Computed use two parts. -->
		<template v-if="kind === 'ratio' || kind === 'computed'">
			<NcTextField
				v-if="kind === 'computed'"
				:value="formula"
				:label="t('nextcloud-vue', 'Formula (A, B)')"
				placeholder="A/B*100"
				@update:value="updateField('formula', $event)" />
			<label class="cn-stat-widget-form__sublabel">{{ kind === 'computed' ? t('nextcloud-vue', 'Part A') : t('nextcloud-vue', 'Numerator (the part)') }}</label>
			<CnFilterRowsEditor :value="numeratorRows" :fields="availableFields" @input="onRows('numeratorRows', $event)" />
			<label class="cn-stat-widget-form__sublabel">{{ kind === 'computed' ? t('nextcloud-vue', 'Part B') : t('nextcloud-vue', 'Denominator (the whole)') }}</label>
			<CnFilterRowsEditor :value="denominatorRows" :fields="availableFields" @input="onRows('denominatorRows', $event)" />
		</template>
		<CnFilterRowsEditor v-else
			:value="filterRows"
			:fields="availableFields"
			@input="onRows('filterRows', $event)" />

		<!-- Presentation. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Display') }}
		</h4>

		<NcTextField
			:value="label"
			:label="t('nextcloud-vue', 'Label')"
			placeholder="Revenue"
			@update:value="updateField('label', $event)" />

		<NcSelect
			:value="icon"
			:options="iconOptions"
			:input-label="t('nextcloud-vue', 'Icon')"
			@input="updateField('icon', $event)" />

		<NcTextField
			:value="caption"
			:label="t('nextcloud-vue', 'Caption (optional)')"
			:placeholder="t('nextcloud-vue', 'vs previous period')"
			@update:value="updateField('caption', $event)" />

		<div class="cn-stat-widget-form__row2">
			<label class="cn-stat-widget-form__color-label">
				{{ t('nextcloud-vue', 'Value color') }}
				<input
					type="color"
					:value="valueColor || '#0082c9'"
					class="cn-stat-widget-form__color"
					@input="updateField('valueColor', $event.target.value)">
			</label>
			<label class="cn-stat-widget-form__color-label">
				{{ t('nextcloud-vue', 'Icon color') }}
				<input
					type="color"
					:value="iconColor || valueColor || '#0082c9'"
					class="cn-stat-widget-form__color"
					@input="updateField('iconColor', $event.target.value)">
			</label>
		</div>

		<!-- Number format. -->
		<h4 class="cn-stat-widget-form__section">
			{{ t('nextcloud-vue', 'Format') }}
		</h4>

		<div class="cn-stat-widget-form__row2">
			<NcSelect
				:value="format.style"
				:options="styleOptions"
				:input-label="t('nextcloud-vue', 'Style')"
				:clearable="false"
				@input="updateFormat('style', $event)" />
			<NcTextField
				v-if="format.style === 'currency'"
				:value="format.currency"
				:label="t('nextcloud-vue', 'Currency')"
				placeholder="EUR"
				@update:value="updateFormat('currency', $event)" />
			<NcTextField
				:value="String(format.decimals)"
				type="number"
				:label="t('nextcloud-vue', 'Decimals')"
				@update:value="updateFormat('decimals', Number($event) || 0)" />
		</div>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import CnRegisterSchemaSelect from '../CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue'
import { rowsToFilter, filterToRows } from '../CnFilterRowsEditor/filterRows.js'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'
import { DASHBOARD_ICONS } from '../CnWidgetGrid/widgetIcons.js'

const DEFAULT_CONTENT = Object.freeze({
	label: '',
	icon: 'Cash',
	iconColor: '',
	valueColor: '#0082c9',
	caption: '',
	format: { style: 'number', currency: 'EUR', decimals: 0 },
	source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
})

/**
 * CnStatWidgetForm — the config sub-form for a `stat` widget (KPI tile).
 *
 * Edits the presentation (label / icon / value + icon colour / caption / number
 * format) and one of three data SOURCE kinds: **Aggregate** (count/sum/avg/min/
 * max with operator filters), **Ratio** (numerator ÷ denominator × 100 — e.g. a
 * win-rate), or **Weighted** (Σ field × weight ÷ divisor — e.g. a probability-
 * weighted forecast). Emits `update:content` on every change; `validate()`
 * requires a register + schema, a field for non-count metrics, and the weight
 * field for the weighted kind. Used by both `CnAddWidgetModal` and the cog
 * `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnStatWidgetForm',

	components: { NcTextField, NcSelect, CnFilterRowsEditor, CnFieldPicker, CnRegisterSchemaSelect },

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
		const fmt = initial.format || {}
		const src = initial.source || {}
		return {
			label: initial.label ?? DEFAULT_CONTENT.label,
			icon: initial.icon ?? DEFAULT_CONTENT.icon,
			iconColor: initial.iconColor ?? DEFAULT_CONTENT.iconColor,
			valueColor: initial.valueColor ?? DEFAULT_CONTENT.valueColor,
			caption: initial.caption ?? DEFAULT_CONTENT.caption,
			format: {
				style: fmt.style ?? DEFAULT_CONTENT.format.style,
				currency: fmt.currency ?? DEFAULT_CONTENT.format.currency,
				decimals: Number.isFinite(fmt.decimals) ? fmt.decimals : 0,
			},
			kind: src.kind || 'aggregate',
			source: { register: src.register ?? '', schema: src.schema ?? '' },
			metric: src.metric ?? 'count',
			field: src.field ?? '',
			weighted: {
				field: src.field ?? '',
				weightField: src.weightField ?? '',
				divisor: Number.isFinite(src.divisor) ? src.divisor : 100,
			},
			filterRows: filterToRows(src.filter || {}),
			numeratorRows: filterToRows((src.numerator && src.numerator.filter) || (src.parts && src.parts.A && src.parts.A.filter) || {}),
			denominatorRows: filterToRows((src.denominator && src.denominator.filter) || (src.parts && src.parts.B && src.parts.B.filter) || {}),
			formula: src.formula ?? 'A/B*100',
			availableFields: [],
		}
	},

	computed: {
		/** Source-kind options. */
		kindOptions() {
			return ['aggregate', 'ratio', 'computed', 'weighted']
		},
		/** Aggregation metric options. */
		metricOptions() {
			return ['count', 'sum', 'avg', 'min', 'max']
		},
		/** Number-format style options. */
		styleOptions() {
			return ['number', 'currency', 'percent']
		},
		/** Icon name options from the shared catalog. */
		iconOptions() {
			return Object.keys(DASHBOARD_ICONS)
		},
		/** The assembled content blob from the current field values. */
		assembledContent() {
			const base = { register: this.source.register, schema: this.source.schema }
			let source
			if (this.kind === 'ratio') {
				source = {
					...base,
					kind: 'ratio',
					metric: this.metric,
					field: this.field,
					numerator: { filter: rowsToFilter(this.numeratorRows) },
					denominator: { filter: rowsToFilter(this.denominatorRows) },
				}
			} else if (this.kind === 'computed') {
				source = {
					...base,
					kind: 'computed',
					formula: this.formula,
					parts: {
						A: { metric: this.metric, field: this.field, filter: rowsToFilter(this.numeratorRows) },
						B: { metric: this.metric, field: this.field, filter: rowsToFilter(this.denominatorRows) },
					},
				}
			} else if (this.kind === 'weighted') {
				source = {
					...base,
					kind: 'weighted',
					field: this.weighted.field,
					weightField: this.weighted.weightField,
					divisor: this.weighted.divisor,
					filter: rowsToFilter(this.filterRows),
				}
			} else {
				source = { ...base, metric: this.metric, field: this.field, filter: rowsToFilter(this.filterRows) }
			}
			return {
				label: this.label,
				icon: this.icon,
				iconColor: this.iconColor,
				valueColor: this.valueColor,
				caption: this.caption,
				format: { ...this.format },
				source,
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
		 * Human label for a source kind.
		 * @param id
		 */
		kindLabel(id) {
			if (id === 'ratio') return t('nextcloud-vue', 'Ratio (%)')
			if (id === 'computed') return t('nextcloud-vue', 'Formula')
			if (id === 'weighted') return t('nextcloud-vue', 'Weighted sum')
			return t('nextcloud-vue', 'Aggregate')
		},

		/**
		 * Set a top-level field and emit.
		 * @param field
		 * @param value
		 */
		updateField(field, value) {
			this[field] = value
			this.emitChange()
		},

		/**
		 * Set a format sub-field and emit.
		 * @param field
		 * @param value
		 */
		updateFormat(field, value) {
			this.$set(this.format, field, value)
			this.emitChange()
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
		 * Set a weighted sub-field and emit.
		 * @param field
		 * @param value
		 */
		updateWeighted(field, value) {
			this.$set(this.weighted, field, value)
			this.emitChange()
		},

		/**
		 * Receive updated filter rows from a shared editor (by data key).
		 * @param key
		 * @param rows
		 */
		onRows(key, rows) {
			this[key] = rows
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
			const errors = []
			if (!this.source.register || !this.source.schema) {
				errors.push(t('nextcloud-vue', 'A register and schema are required'))
			}
			if (this.kind === 'weighted') {
				if (!this.weighted.field || !this.weighted.weightField) {
					errors.push(t('nextcloud-vue', 'A field and weight field are required'))
				}
			} else if (this.metric !== 'count' && (!this.field || this.field.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A field is required for sum / avg / min / max'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-stat-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-stat-widget-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-stat-widget-form__sublabel {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-stat-widget-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-stat-widget-form__row2 > * {
	flex: 1;
	min-width: 0;
}

.cn-stat-widget-form__color-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 14px;
}

.cn-stat-widget-form__color {
	width: 48px;
	height: 32px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}
</style>
