<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-data-form">
		<h4 class="cn-data-form__section">{{ t('nextcloud-vue', 'Data widget') }}</h4>

		<NcTextField
			:value="title"
			:label="t('nextcloud-vue', 'Title')"
			placeholder="Data"
			@update:value="updateField('title', $event)" />

		<div class="cn-data-form__row2">
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

		<NcTextField
			type="number"
			:value="String(columns)"
			:label="t('nextcloud-vue', 'Grid columns')"
			@update:value="updateField('columns', Number($event))" />

		<h4 class="cn-data-form__section">{{ t('nextcloud-vue', 'Properties') }}</h4>

		<p v-if="!rows.length" class="cn-data-form__hint">
			{{ t('nextcloud-vue', 'Enter a register and schema to configure properties.') }}
		</p>

		<div
			v-for="row in rows"
			:key="row.key"
			class="cn-data-form__prop"
			:class="{ 'cn-data-form__prop--hidden': row.hidden }">
			<div class="cn-data-form__prop-head">
				<NcCheckboxRadioSwitch
					:checked="!row.hidden"
					type="switch"
					@update:checked="setRow(row.key, 'hidden', !$event)">
					<span class="cn-data-form__prop-name">{{ row.key }}</span>
				</NcCheckboxRadioSwitch>
			</div>

			<div v-if="!row.hidden" class="cn-data-form__prop-body">
				<NcTextField
					:value="row.label"
					:label="t('nextcloud-vue', 'Label')"
					:placeholder="row.key"
					@update:value="setRow(row.key, 'label', $event)" />
				<NcTextField
					type="number"
					:value="row.order === null ? '' : String(row.order)"
					:label="t('nextcloud-vue', 'Order')"
					@update:value="setRow(row.key, 'order', $event === '' ? null : Number($event))" />
				<NcTextField
					type="number"
					:value="String(row.gridColumn)"
					:label="t('nextcloud-vue', 'Span')"
					@update:value="setRow(row.key, 'gridColumn', Number($event))" />
				<NcSelect
					:value="row.widget"
					:options="widgetOptions"
					:input-label="t('nextcloud-vue', 'Editor')"
					:clearable="false"
					@input="setRow(row.key, 'widget', $event)" />
				<NcCheckboxRadioSwitch
					:checked="row.editable"
					type="switch"
					@update:checked="setRow(row.key, 'editable', $event)">
					{{ t('nextcloud-vue', 'Editable') }}
				</NcCheckboxRadioSwitch>
			</div>
		</div>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { fetchSchemaProperties } from '../../utils/fetchSchemaProperties.js'

const DEFAULT_CONTENT = Object.freeze({
	title: '',
	register: '',
	schema: '',
	columns: 3,
	overrides: {},
})

const WIDGET_OPTIONS = ['auto', 'text', 'textarea', 'number', 'select', 'multiselect', 'tags', 'checkbox', 'date', 'datetime', 'email', 'url']

/**
 * CnObjectDataWidgetForm — the config sub-form for a `data` widget
 * (`CnObjectDataWidget`). Edits the widget title, grid column count, and a
 * per-property override map: visibility, display order, grid span, edit-widget
 * type, label, and editability — discovered from the register/schema. Emits
 * `update:content` with `{ title, register, schema, columns, overrides }`,
 * where `overrides` contains only the non-default entries. Used by
 * `CnAddWidgetModal` + the cog editor; the resolved overrides are forwarded to
 * `CnObjectDataWidget`'s `overrides` prop on detail pages.
 */
export default {
	name: 'CnObjectDataWidgetForm',

	components: { NcTextField, NcSelect, NcCheckboxRadioSwitch },

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
		return {
			title: initial.title ?? '',
			columns: Number.isFinite(initial.columns) ? initial.columns : 3,
			source: { register: initial.register ?? '', schema: initial.schema ?? '' },
			overrides: { ...(initial.overrides || {}) },
			rows: [],
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
		/** Edit-widget type options ('auto' = derive from schema). */
		widgetOptions() { return WIDGET_OPTIONS },
		/** The assembled content blob from the current field values. */
		assembledContent() {
			return {
				title: this.title,
				register: this.source.register,
				schema: this.source.schema,
				columns: this.columns,
				overrides: this.buildOverrides(),
			}
		},
	},

	methods: {
		t,
		/**
		 * Resolve the schema's property names and build editable rows, merging
		 * any persisted overrides onto each.
		 *
		 * @return {Promise<void>}
		 */
		async loadFields() {
			const fields = await fetchSchemaProperties(this.source.register, this.source.schema)
			this.rows = fields.map((key) => {
				const o = this.overrides[key] || {}
				return {
					key,
					hidden: o.hidden === true,
					label: o.label ?? '',
					order: typeof o.order === 'number' ? o.order : null,
					gridColumn: Number.isFinite(o.gridColumn) ? o.gridColumn : 1,
					widget: o.widget || 'auto',
					editable: o.editable !== false,
				}
			})
		},
		/** Set a top-level field and emit. */
		updateField(field, value) { this[field] = value; this.emitChange() },
		/** Set a source sub-field and emit. */
		updateSource(field, value) { this.$set(this.source, field, value); this.emitChange() },
		/**
		 * Mutate one property row and re-emit.
		 *
		 * @param {string} key The property name.
		 * @param {string} field The row field to set.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		setRow(key, field, value) {
			const row = this.rows.find((r) => r.key === key)
			if (!row) return
			this.$set(row, field, value)
			this.emitChange()
		},
		/**
		 * Collapse the rows into a minimal overrides map — only non-default
		 * fields are persisted so the stored config stays small.
		 *
		 * @return {object} The overrides map keyed by property name.
		 */
		buildOverrides() {
			const out = {}
			for (const row of this.rows) {
				const o = {}
				if (row.hidden) o.hidden = true
				if (row.label && row.label.trim() !== '') o.label = row.label
				if (typeof row.order === 'number') o.order = row.order
				if (Number.isFinite(row.gridColumn) && row.gridColumn !== 1) o.gridColumn = row.gridColumn
				if (row.widget && row.widget !== 'auto') o.widget = row.widget
				if (row.editable === false) o.editable = false
				if (Object.keys(o).length) out[row.key] = o
			}
			return out
		},
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
.cn-data-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-data-form__section {
	margin: 8px 0 0;
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color-text-maxcontrast);
}

.cn-data-form__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-data-form__row2 {
	display: flex;
	gap: 12px;
	align-items: flex-end;
}

.cn-data-form__row2 > * {
	flex: 1;
	min-width: 0;
}

.cn-data-form__prop {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	padding: 8px 10px;
}

.cn-data-form__prop--hidden {
	opacity: 0.6;
}

.cn-data-form__prop-name {
	font-weight: 600;
}

.cn-data-form__prop-body {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr 1.5fr;
	gap: 10px;
	align-items: center;
	margin-top: 8px;
}
</style>
