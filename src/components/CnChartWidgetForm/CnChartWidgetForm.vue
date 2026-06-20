<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-chart-widget-form">
		<!-- Presentation. -->
		<h4 class="cn-chart-widget-form__section">{{ t('nextcloud-vue', 'Chart') }}</h4>

		<div class="cn-chart-widget-form__row2">
			<NcSelect
				:value="chartKind"
				:options="chartKindOptions"
				:input-label="t('nextcloud-vue', 'Chart type')"
				:clearable="false"
				@input="updateField('chartKind', $event)" />
			<NcSelect
				:value="mode"
				:options="modeOptions"
				:input-label="t('nextcloud-vue', 'Breakdown')"
				:clearable="false"
				@input="updateField('mode', $event)">
				<template #option="{ label: id }">{{ modeLabel(id) }}</template>
				<template #selected-option="{ label: id }">{{ modeLabel(id) }}</template>
			</NcSelect>
		</div>

		<!-- Data source. -->
		<h4 class="cn-chart-widget-form__section">{{ t('nextcloud-vue', 'Data source') }}</h4>

		<div class="cn-chart-widget-form__row2">
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

		<!-- Time-series breakdown. -->
		<div v-if="mode === 'timeseries'" class="cn-chart-widget-form__row2">
			<CnFieldPicker
				:value="bucket.field"
				:label="t('nextcloud-vue', 'Date field')"
				:options="availableFields"
				placeholder="expectedCloseDate"
				@update="updateBucket('field', $event)" />
			<NcSelect
				:value="bucket.interval"
				:options="intervalOptions"
				:input-label="t('nextcloud-vue', 'Interval')"
				:clearable="false"
				@input="updateBucket('interval', $event)" />
		</div>

		<!-- Category breakdown. -->
		<div v-else class="cn-chart-widget-form__row2">
			<CnFieldPicker
				:value="group.field"
				:label="t('nextcloud-vue', 'Group by field')"
				:options="availableFields"
				placeholder="stage"
				@update="updateGroup('field', $event)" />
			<NcSelect
				:value="group.sort"
				:options="sortOptions"
				:input-label="t('nextcloud-vue', 'Sort')"
				:clearable="false"
				@input="updateGroup('sort', $event)" />
			<NcTextField
				:value="String(group.limit)"
				type="number"
				:label="t('nextcloud-vue', 'Top N')"
				@update:value="updateGroup('limit', Number($event) || 0)" />
		</div>

		<!-- Shared metric (both modes). -->
		<div class="cn-chart-widget-form__row2">
			<NcSelect
				:value="metric"
				:options="metricOptions"
				:input-label="t('nextcloud-vue', 'Aggregation')"
				:clearable="false"
				@input="updateField('metric', $event)" />
			<CnFieldPicker
				v-if="metric && metric !== 'count'"
				:value="metricField"
				:label="t('nextcloud-vue', 'Value field')"
				:options="availableFields"
				placeholder="value"
				@update="updateField('metricField', $event)" />
		</div>

		<CnFilterRowsEditor :value="filterRows" :fields="availableFields" @input="onFilterRows" />

		<p v-if="mode === 'timeseries'" class="cn-chart-widget-form__hint">
			{{ t('nextcloud-vue', 'The time range follows the dashboard date chip.') }}
		</p>
	</div>
</template>

<script>
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnFilterRowsEditor from '../CnFilterRowsEditor/CnFilterRowsEditor.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import { rowsToFilter, filterToRows } from '../CnFilterRowsEditor/filterRows.js'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'

const DEFAULT_CONTENT = Object.freeze({
	chartKind: 'area',
	dataSource: {
		register: '',
		schema: '',
		filter: {},
		bucket: { field: '', interval: 'month', metric: 'count', metricField: '' },
	},
})

/**
 * CnChartWidgetForm — the config sub-form for a `chart` widget.
 *
 * Edits the chart type and the OpenRegister data source in one of two
 * breakdowns: **Over time** (a time-bucket `dataSource.bucket` — date field +
 * interval, range from the dashboard date chip) or **By category** (a
 * `dataSource.groupBy` — group field + sort + top-N). Both share the
 * aggregation metric, value field, and operator filters. Emits `update:content`
 * with `{ chartKind, dataSource }`; `validate()` requires register + schema +
 * the relevant breakdown field, plus a value field for non-count metrics. Used
 * by both `CnAddWidgetModal` and the cog `CnWidgetStyleEditorModal`.
 */
export default {
	name: 'CnChartWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		CnFilterRowsEditor,
		CnFieldPicker,
	},

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
		const ds = initial.dataSource || {}
		const bucket = ds.bucket || {}
		const group = ds.groupBy || {}
		const isCategory = !!ds.groupBy
		const filter = ds.filter && typeof ds.filter === 'object' ? ds.filter : {}
		return {
			chartKind: initial.chartKind ?? DEFAULT_CONTENT.chartKind,
			mode: isCategory ? 'category' : 'timeseries',
			source: { register: ds.register ?? '', schema: ds.schema ?? '' },
			// Shared metric — read from whichever breakdown the saved source used.
			metric: (isCategory ? group.metric : bucket.metric) ?? 'count',
			metricField: (isCategory ? group.metricField : bucket.metricField) ?? '',
			bucket: { field: bucket.field ?? '', interval: bucket.interval ?? 'month' },
			group: { field: group.field ?? '', sort: group.sort ?? 'desc', limit: Number.isFinite(group.limit) ? group.limit : 8 },
			filterRows: filterToRows(filter),
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
		/** Chart-type options understood by CnChartWidget / ApexCharts. */
		chartKindOptions() {
			return ['area', 'line', 'bar', 'pie', 'donut']
		},
		/** Breakdown mode ids. */
		modeOptions() {
			return ['timeseries', 'category']
		},
		/** Time-bucket interval options (normalised case-insensitively downstream). */
		intervalOptions() {
			return ['day', 'week', 'month', 'quarter', 'year']
		},
		/** Aggregation metric options. */
		metricOptions() {
			return ['count', 'sum', 'avg', 'min', 'max']
		},
		/** Group sort options. */
		sortOptions() {
			return ['desc', 'asc']
		},
		/** The assembled content blob from the current field values. */
		assembledContent() {
			const ds = {
				register: this.source.register,
				schema: this.source.schema,
				filter: rowsToFilter(this.filterRows),
			}
			if (this.mode === 'category') {
				ds.groupBy = {
					field: this.group.field,
					metric: this.metric,
					metricField: this.metricField,
					sort: this.group.sort,
					limit: this.group.limit,
				}
			} else {
				ds.bucket = {
					field: this.bucket.field,
					interval: this.bucket.interval,
					metric: this.metric,
					metricField: this.metricField,
				}
			}
			return { chartKind: this.chartKind, dataSource: ds }
		},
	},

	methods: {
		t,

		/** Resolve the schema's field names for the dropdowns. */
		async loadFields() {
			this.availableFields = await fetchSchemaProperties(this.source.register, this.source.schema)
		},

		/** Human label for a breakdown mode. */
		modeLabel(id) {
			return id === 'category' ? t('nextcloud-vue', 'By category') : t('nextcloud-vue', 'Over time')
		},

		/** Set a top-level field and emit. */
		updateField(field, value) {
			this[field] = value
			this.emitChange()
		},

		/** Set a source sub-field and emit. */
		updateSource(field, value) {
			this.$set(this.source, field, value)
			this.emitChange()
		},

		/** Set a bucket sub-field and emit. */
		updateBucket(field, value) {
			this.$set(this.bucket, field, value)
			this.emitChange()
		},

		/** Set a group sub-field and emit. */
		updateGroup(field, value) {
			this.$set(this.group, field, value)
			this.emitChange()
		},

		/** Receive updated filter rows from the shared editor. */
		onFilterRows(rows) {
			this.filterRows = rows
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
			if (this.mode === 'category' && (!this.group.field || this.group.field.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A group-by field is required'))
			}
			if (this.mode === 'timeseries' && (!this.bucket.field || this.bucket.field.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A date field is required'))
			}
			if (this.metric !== 'count' && (!this.metricField || this.metricField.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A value field is required for sum / avg / min / max'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-chart-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-chart-widget-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-chart-widget-form__hint {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-chart-widget-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-chart-widget-form__row2 > * {
	flex: 1;
	min-width: 0;
}
</style>
