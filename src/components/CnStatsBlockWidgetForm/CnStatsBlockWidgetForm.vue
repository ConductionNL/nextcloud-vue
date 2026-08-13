<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-stats-block-form">
		<h4 class="cn-stats-block-form__section">
			{{ t('nextcloud-vue', 'Data source') }}
		</h4>

		<NcTextField
			:model-value="title"
			:label="t('nextcloud-vue', 'Title')"
			placeholder="Sources"
			@update:model-value="updateField('title', $event)" />

		<div class="cn-stats-block-form__row2">
			<CnRegisterSchemaSelect
				:register="source.register"
				:schema="source.schema"
				@update:register="updateSource('register', $event)"
				@update:schema="updateSource('schema', $event)" />
		</div>

		<div class="cn-stats-block-form__row2">
			<NcSelect
				:model-value="metric"
				:options="metricOptions"
				:input-label="t('nextcloud-vue', 'Aggregation')"
				:clearable="false"
				@update:model-value="updateField('metric', $event)" />
			<CnFieldPicker
				v-if="metric !== 'count'"
				:value="field"
				:label="t('nextcloud-vue', 'Field')"
				:options="availableFields"
				placeholder="value"
				@update="updateField('field', $event)" />
		</div>

		<CnFilterRowsEditor :value="filterRows" :fields="availableFields" @input="onFilterRows" />

		<h4 class="cn-stats-block-form__section">
			{{ t('nextcloud-vue', 'Display') }}
		</h4>

		<div class="cn-stats-block-form__row2">
			<NcTextField
				:model-value="countLabel"
				:label="t('nextcloud-vue', 'Count label')"
				placeholder="sources"
				@update:model-value="updateField('countLabel', $event)" />
			<NcSelect
				:model-value="variant"
				:options="variantOptions"
				:input-label="t('nextcloud-vue', 'Color')"
				:clearable="false"
				@update:model-value="updateField('variant', $event)" />
		</div>

		<CnIconBrowser
			:value="iconClass || null"
			:label="t('nextcloud-vue', 'Icon')"
			clearable
			@input="updateField('iconClass', $event || '')" />
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
import CnIconBrowser from '../CnIconBrowser/CnIconBrowser.vue'

const DEFAULT_CONTENT = Object.freeze({
	title: '',
	props: { countLabel: '', variant: 'default', iconClass: '' },
	dataSource: { register: '', schema: '', metric: 'count', field: '', filter: {} },
})

/**
 * CnStatsBlockWidgetForm — the config sub-form for a `stats-block` widget (a
 * single-count KPI card). Edits the OpenRegister data source (register / schema
 * / aggregation / field / operator filters) and the card presentation (title,
 * count label, colour variant, icon). Emits `update:content` with
 * `{ title, props, dataSource }`; `validate()` requires register + schema, and
 * a field for non-count metrics. Used by `CnAddWidgetModal` + the cog editor.
 */
export default {
	name: 'CnStatsBlockWidgetForm',

	components: { NcTextField, NcSelect, CnFilterRowsEditor, CnFieldPicker, CnRegisterSchemaSelect, CnIconBrowser },

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
		const props = initial.props || {}
		const ds = initial.dataSource || {}
		return {
			title: initial.title ?? '',
			countLabel: props.countLabel ?? '',
			variant: props.variant ?? 'default',
			iconClass: props.iconClass ?? '',
			source: { register: ds.register ?? '', schema: ds.schema ?? '' },
			metric: ds.metric ?? (ds.aggregate === 'count' ? 'count' : 'count'),
			field: ds.field ?? '',
			filterRows: filterToRows(ds.filter || {}),
			availableFields: [],
		}
	},

	computed: {
		/** Aggregation metric options. */
		metricOptions() { return ['count', 'sum', 'avg', 'min', 'max'] },
		/** Card colour variants (CnStatsBlock). */
		variantOptions() { return ['default', 'primary', 'success', 'warning', 'error'] },
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				title: this.title,
				props: { countLabel: this.countLabel, variant: this.variant, iconClass: this.iconClass },
				dataSource: {
					register: this.source.register,
					schema: this.source.schema,
					metric: this.metric,
					field: this.field,
					filter: rowsToFilter(this.filterRows),
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
		 *
		 * @param {'title'|'countLabel'|'variant'|'iconClass'|'metric'|'field'} field The data key to write.
		 * @param {string} value The new value for that key.
		 * @return {void}
		 */
		updateField(field, value) { this[field] = value; this.emitChange() },
		/**
		 * Set a source sub-field and emit.
		 *
		 * @param {'register'|'schema'} field The `source` sub-key to write.
		 * @param {string} value The chosen register or schema slug.
		 * @return {void}
		 */
		updateSource(field, value) { this.source[field] = value; this.emitChange() },
		/**
		 * Receive updated filter rows.
		 *
		 * @param {Array<{key: string, op: string, value: string}>} rows The editor's
		 *   full row list, serialised by `rowsToFilter()` into `dataSource.filter`.
		 * @return {void}
		 */
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
			if (this.metric !== 'count' && (!this.field || this.field.trim() === '')) {
				errors.push(t('nextcloud-vue', 'A field is required for sum / avg / min / max'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-stats-block-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-stats-block-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-stats-block-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-stats-block-form__row2 > * {
	flex: 1;
	min-width: 0;
}
</style>
