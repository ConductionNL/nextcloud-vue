<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-data-form">
		<h4 class="cn-data-form__section">
			{{ t('nextcloud-vue', 'Data widget') }}
		</h4>

		<NcTextField
			:value="title"
			:label="t('nextcloud-vue', 'Title')"
			placeholder="Data"
			@update:value="updateField('title', $event)" />

		<div class="cn-data-form__row2">
			<NcTextField
				:value="source.register"
				:label="t('nextcloud-vue', 'Register')"
				:placeholder="contextSource.register || 'pipelinq'"
				@update:value="updateSource('register', $event)" />
			<NcTextField
				:value="source.schema"
				:label="t('nextcloud-vue', 'Schema')"
				:placeholder="contextSource.schema || 'lead'"
				@update:value="updateSource('schema', $event)" />
		</div>

		<div class="cn-data-form__layout">
			<span class="cn-data-form__layout-label">{{ t('nextcloud-vue', 'Layout') }}</span>
			<div class="cn-data-form__presets" role="group" :aria-label="t('nextcloud-vue', 'Column layout')">
				<button
					v-for="preset in layoutPresets"
					:key="preset.value"
					type="button"
					class="cn-data-form__preset"
					:class="{ 'cn-data-form__preset--active': columns === preset.value }"
					:aria-pressed="columns === preset.value"
					@click="setColumns(preset.value)">
					{{ preset.label }}
				</button>
			</div>
			<NcTextField
				type="number"
				:value="String(columns)"
				:label="t('nextcloud-vue', 'Columns')"
				class="cn-data-form__columns"
				@update:value="updateField('columns', Number($event))" />
		</div>

		<h4 class="cn-data-form__section">
			{{ t('nextcloud-vue', 'Properties') }}
		</h4>

		<p v-if="!rows.length" class="cn-data-form__hint">
			{{ t('nextcloud-vue', 'Enter a register and schema to configure properties.') }}
		</p>
		<p v-else class="cn-data-form__hint">
			{{ t('nextcloud-vue', 'Drag a property by its handle to reorder. The order applies to both the widget and the edit form.') }}
		</p>

		<div
			v-for="(row, index) in rows"
			:key="row.key"
			class="cn-data-form__prop"
			:class="{ 'cn-data-form__prop--hidden': row.hidden, 'cn-data-form__prop--dragging': dragIndex === index }"
			draggable="true"
			@dragstart="onDragStart(index)"
			@dragover.prevent
			@drop="onDrop(index)"
			@dragend="dragIndex = null">
			<div class="cn-data-form__prop-head">
				<span class="cn-data-form__grip" :title="t('nextcloud-vue', 'Drag to reorder')" aria-hidden="true">⋮⋮</span>
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

	/**
	 * Fallback object context (provided by CnDetailPage as a reactive
	 * `{ objectId, object, register, schema }` ref). Used to resolve the
	 * register/schema when the widget being edited is the page's default Data
	 * widget, which inherits them from the page rather than storing them — so the
	 * property list still loads even though the form's own Register/Schema fields
	 * start empty.
	 */
	inject: {
		cnObjectContext: { default: null },
	},

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
			/** Index of the property row currently being dragged, or null. */
			dragIndex: null,
		}
	},

	computed: {
		/** Edit-widget type options ('auto' = derive from schema). */
		widgetOptions() { return WIDGET_OPTIONS },
		/** The inherited register/schema (shown as placeholders when not overridden). */
		contextSource() { return this.unwrapContext() },
		/** Quick column-layout presets (1 = stacked beneath each other). */
		layoutPresets() {
			return [
				{ value: 1, label: t('nextcloud-vue', 'Stacked') },
				{ value: 2, label: t('nextcloud-vue', '2 columns') },
				{ value: 3, label: t('nextcloud-vue', '3 columns') },
			]
		},
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
		 * Unwrap the injected object context (a Vue ref or plain object) to a
		 * plain `{ register, schema }`. Returns empties when no context is
		 * provided (e.g. a dashboard surface).
		 *
		 * @return {{register: string, schema: string}} the resolved context.
		 */
		unwrapContext() {
			const c = this.cnObjectContext
			const v = c && typeof c === 'object' && 'value' in c ? c.value : c
			return { register: (v && v.register) || '', schema: (v && v.schema) || '' }
		},
		/**
		 * Resolve the schema's property names and build editable rows, merging
		 * any persisted overrides onto each.
		 *
		 * @return {Promise<void>}
		 */
		async loadFields() {
			const ctx = this.unwrapContext()
			const register = this.source.register || ctx.register
			const schema = this.source.schema || ctx.schema
			const fields = await fetchSchemaProperties(register, schema)
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
		/**
		 * Set a top-level field and emit.
		 * @param field
		 * @param value
		 */
		updateField(field, value) { this[field] = value; this.emitChange() },
		/**
		 * Apply a column-layout preset (1 = stacked) and emit.
		 *
		 * @param {number} value The column count to set.
		 * @return {void}
		 */
		setColumns(value) { this.columns = value; this.emitChange() },
		/**
		 * Remember which row a drag started on.
		 *
		 * @param {number} index The row index being dragged.
		 * @return {void}
		 */
		onDragStart(index) { this.dragIndex = index },
		/**
		 * Reorder the property rows on drop: move the dragged row to the drop
		 * target, then stamp every row with a sequential `order` so the new order
		 * persists into the overrides map (applied to both the widget and the edit
		 * form). No-op when dropping a row onto itself.
		 *
		 * @param {number} index The drop-target row index.
		 * @return {void}
		 */
		onDrop(index) {
			const from = this.dragIndex
			this.dragIndex = null
			if (from === null || from === index) return
			const moved = this.rows.splice(from, 1)[0]
			this.rows.splice(index, 0, moved)
			this.rows.forEach((row, i) => { row.order = i })
			this.emitChange()
		},
		/**
		 * Set a source sub-field and emit.
		 * @param field
		 * @param value
		 */
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

.cn-data-form__layout {
	display: flex;
	align-items: flex-end;
	gap: 12px;
	flex-wrap: wrap;
}

.cn-data-form__layout-label {
	align-self: center;
	font-weight: 600;
}

.cn-data-form__presets {
	display: inline-flex;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	overflow: hidden;
}

.cn-data-form__preset {
	border: none;
	background: var(--color-main-background);
	color: var(--color-main-text);
	padding: 6px 12px;
	cursor: pointer;
	border-inline-start: 1px solid var(--color-border);
}

.cn-data-form__preset:first-child {
	border-inline-start: none;
}

.cn-data-form__preset--active {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	font-weight: 600;
}

.cn-data-form__columns {
	width: 90px;
	flex: 0 0 auto;
}

.cn-data-form__prop {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	padding: 8px 10px;
}

.cn-data-form__prop--hidden {
	opacity: 0.6;
}

.cn-data-form__prop--dragging {
	opacity: 0.4;
	border-style: dashed;
}

.cn-data-form__prop-head {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-data-form__grip {
	cursor: grab;
	color: var(--color-text-maxcontrast);
	letter-spacing: -2px;
	user-select: none;
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
