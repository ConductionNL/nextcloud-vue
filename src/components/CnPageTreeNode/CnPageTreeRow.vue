<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-page-tree__row">
		<span class="cn-page-tree__handle" :aria-label="t('nextcloud-vue', 'Drag to reorder or nest')" title="">
			<DragVertical :size="18" />
		</span>

		<!-- Icon doubles as the type switcher (a page's glyph is type-derived). -->
		<button class="cn-page-tree__icon-btn"
			type="button"
			:aria-label="t('nextcloud-vue', 'Change type')"
			@click="startEdit('type')">
			<span class="cn-page-tree__icon" :class="typeIcon" aria-hidden="true" />
		</button>

		<!-- Name: click to edit inline. -->
		<NcTextField v-if="editing === 'name'"
			ref="nameField"
			class="cn-page-tree__inline-field"
			:value="page.title || ''"
			:label="t('nextcloud-vue', 'Title')"
			:label-outside="true"
			@update:value="setTitle"
			@keydown.enter="stopEdit"
			@blur="stopEdit" />
		<button v-else
			type="button"
			class="cn-page-tree__label cn-page-tree__label--btn"
			:title="page.route || ''"
			@click="startEdit('name')">
			{{ page.title || page.id || t('nextcloud-vue', '(untitled)') }}
		</button>

		<!-- Type: click to change inline. -->
		<NcSelect v-if="editing === 'type'"
			class="cn-page-tree__inline-select"
			:value="selectedType"
			:options="pageTypeOptions"
			:input-label="t('nextcloud-vue', 'Type')"
			label="label"
			:clearable="false"
			@input="onType"
			@close="stopEdit" />
		<button v-else
			type="button"
			class="cn-page-tree__type cn-page-tree__type--btn"
			@click="startEdit('type')">
			{{ typeLabel }}
		</button>

		<!-- Cog → config popover (route + data source + add-sub-page + delete). -->
		<NcPopover :shown.sync="popoverOpen" :focus-trap="false">
			<template #trigger="{ attrs }">
				<NcButton v-bind="attrs"
					type="tertiary"
					:aria-label="t('nextcloud-vue', 'Page settings')">
					<template #icon>
						<Cog :size="18" />
					</template>
				</NcButton>
			</template>
			<div class="cn-page-tree__config">
				<NcTextField class="cn-page-tree__config-field"
					:value="page.route || ''"
					:label="t('nextcloud-vue', 'Route')"
					:label-visible="true"
					:placeholder="'/example'"
					@update:value="(v) => setRoute(v)" />

				<template v-if="isDataPage">
					<NcSelect v-if="hasDataSources"
						class="cn-page-tree__config-field"
						:value="selectedRegister"
						:options="registerOptions"
						:input-label="t('nextcloud-vue', 'Register')"
						label="label"
						:clearable="true"
						:placeholder="t('nextcloud-vue', 'Choose a register')"
						@input="setRegister" />
					<NcTextField v-else
						class="cn-page-tree__config-field"
						:value="configValue('register')"
						:label="t('nextcloud-vue', 'Register')"
						:label-visible="true"
						@update:value="(v) => setConfig('register', v)" />

					<NcSelect v-if="hasDataSources"
						class="cn-page-tree__config-field"
						:value="selectedSchema"
						:options="schemaOptions"
						:input-label="t('nextcloud-vue', 'Schema')"
						label="label"
						:clearable="true"
						:disabled="!configValue('register')"
						:placeholder="t('nextcloud-vue', 'Choose a schema')"
						@input="setSchema" />
					<NcTextField v-else
						class="cn-page-tree__config-field"
						:value="configValue('schema')"
						:label="t('nextcloud-vue', 'Schema')"
						:label-visible="true"
						@update:value="(v) => setConfig('schema', v)" />

					<NcSelect v-if="page.type === 'index' && columnOptions.length"
						class="cn-page-tree__config-field"
						:value="selectedColumns"
						:options="columnOptions"
						:input-label="t('nextcloud-vue', 'Columns')"
						label="label"
						:multiple="true"
						:close-on-select="false"
						:placeholder="t('nextcloud-vue', 'All properties')"
						@input="setColumns" />
					<NcTextField v-else-if="page.type === 'index'"
						class="cn-page-tree__config-field"
						:value="columnsText"
						:label="t('nextcloud-vue', 'Columns (comma separated)')"
						:label-visible="true"
						:placeholder="'name, status'"
						@update:value="setColumnsText" />
				</template>

				<span class="cn-page-tree__config-id">{{ page.id }}</span>

				<div class="cn-page-tree__config-actions">
					<NcButton v-if="canAddChild"
						type="tertiary"
						@click="$emit('add-child')">
						<template #icon>
							<Plus :size="18" />
						</template>
						{{ t('nextcloud-vue', 'Add sub-page') }}
					</NcButton>
					<NcButton type="tertiary"
						@click="$emit('remove')">
						<template #icon>
							<Delete :size="18" />
						</template>
						{{ t('nextcloud-vue', 'Delete page') }}
					</NcButton>
				</div>
			</div>
		</NcPopover>
	</div>
</template>

<script>
import { NcButton, NcTextField, NcSelect, NcPopover } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'

// The renderer's closed page-type enum (CnPageRenderer dispatches on these).
const PAGE_TYPES = [
	{ value: 'dashboard', label: 'Dashboard' },
	{ value: 'index', label: 'Index (list)' },
	{ value: 'detail', label: 'Detail' },
	{ value: 'custom', label: 'Custom' },
]

const TYPE_ICONS = {
	dashboard: 'icon-dashboard',
	index: 'icon-toggle-filelist',
	detail: 'icon-details',
	custom: 'icon-settings',
}

/**
 * CnPageTreeRow — one editable page row for CnPageTreeNode (ADR-041).
 *
 * Renders a single page as a compact row with INLINE editing — click the name
 * to rename, click the type (or icon) to re-type — and a cog that opens a
 * settings popover carrying the page's Route plus, for `index`/`detail` pages,
 * the OpenRegister Register / Schema / Columns data source, an Add-sub-page
 * affordance and Delete. Nesting/ordering is done by dragging the row (handled
 * by the parent CnPageTreeNode), so there is no Parent dropdown. The page object
 * is mutated IN PLACE (it is the working manifest's, by reference) so
 * `diffManifest` captures every field change; structural actions are emitted.
 */
export default {
	name: 'CnPageTreeRow',

	components: { NcButton, NcTextField, NcSelect, NcPopover, Cog, Plus, Delete, DragVertical },

	inject: {
		/** App registers/schemas for the data-source pickers; null → free text. */
		cnDataSources: { default: null },
	},

	props: {
		/**
		 * The page object (an element of the working manifest's `pages[]`),
		 * mutated in place.
		 *
		 * @type {object}
		 */
		page: {
			type: Object,
			required: true,
		},
		/** Whether this row may gain a sub-page (top level only). */
		canAddChild: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			// Which field is in inline-edit mode: null | 'name' | 'type'.
			editing: null,
			// Whether the settings popover is open.
			popoverOpen: false,
		}
	},

	computed: {
		/** Closed page-type options for the Type dropdown. */
		pageTypeOptions() {
			return PAGE_TYPES
		},
		/** The `icon-*` glyph class for the page's type. */
		typeIcon() {
			return TYPE_ICONS[this.page && this.page.type] || TYPE_ICONS.custom
		},
		/** Human label for the page's type. */
		typeLabel() {
			const opt = PAGE_TYPES.find((o) => o.value === (this.page && this.page.type))
			return opt ? opt.label : (this.page && this.page.type) || 'custom'
		},
		/** The page's type as a dropdown option (synthetic fallback for unknown values). */
		selectedType() {
			const type = (this.page && this.page.type) || 'custom'
			return PAGE_TYPES.find((o) => o.value === type) || { value: type, label: type }
		},
		/** Whether this page renders OpenRegister data (needs register/schema). */
		isDataPage() {
			return this.page && (this.page.type === 'index' || this.page.type === 'detail')
		},
		/** Whether app data sources (registers/schemas) were provided. */
		hasDataSources() {
			return !!(this.cnDataSources && Array.isArray(this.cnDataSources.registers) && this.cnDataSources.registers.length)
		},
		/** Register dropdown options from the data sources. */
		registerOptions() {
			if (!this.hasDataSources) return []
			return this.cnDataSources.registers.map((r) => ({ value: r.value, label: r.label || r.value }))
		},
		/** Schema options for the chosen register. */
		schemaOptions() {
			if (!this.hasDataSources) return []
			const reg = this.cnDataSources.registers.find((r) => r.value === this.configValue('register'))
			const schemas = (reg && Array.isArray(reg.schemas)) ? reg.schemas : []
			return schemas.map((s) => ({ value: s.value, label: s.label || s.value, columns: s.columns || [] }))
		},
		/** The chosen register as an option. */
		selectedRegister() {
			const slug = this.configValue('register')
			if (!slug) return null
			return this.registerOptions.find((o) => o.value === slug) || { value: slug, label: slug }
		},
		/** The chosen schema as an option. */
		selectedSchema() {
			const slug = this.configValue('schema')
			if (!slug) return null
			return this.schemaOptions.find((o) => o.value === slug) || { value: slug, label: slug }
		},
		/** Selectable column options (the chosen schema's property keys). */
		columnOptions() {
			const schema = this.schemaOptions.find((o) => o.value === this.configValue('schema'))
			const cols = (schema && Array.isArray(schema.columns)) ? schema.columns : []
			return cols.map((c) => ({ value: c, label: c }))
		},
		/** The page's columns as dropdown options. */
		selectedColumns() {
			const cols = (this.page && this.page.config && Array.isArray(this.page.config.columns)) ? this.page.config.columns : []
			return cols.map((c) => ({ value: c, label: c }))
		},
		/** The columns as a comma-separated string (free-text fallback). */
		columnsText() {
			const cols = (this.page && this.page.config && Array.isArray(this.page.config.columns)) ? this.page.config.columns : []
			return cols.join(', ')
		},
	},

	methods: {
		t,
		/**
		 * Enter inline-edit mode for a field, focusing it on next tick.
		 * @param {string} field 'name' | 'type'.
		 * @return {void}
		 */
		startEdit(field) {
			this.editing = field
			if (field === 'name') {
				this.$nextTick(() => {
					const el = this.$refs.nameField && this.$refs.nameField.$el && this.$refs.nameField.$el.querySelector('input')
					if (el) el.focus()
				})
			}
		},
		/** Leave inline-edit mode. */
		stopEdit() {
			this.editing = null
		},
		/**
		 * Write the page title in place.
		 * @param {string} value The new title.
		 * @return {void}
		 */
		setTitle(value) {
			this.$set(this.page, 'title', value)
		},
		/**
		 * Set the page route in place (deletes when cleared is not desired — a
		 * page always needs a route, so empty is allowed but unusual).
		 * @param {string} value The new route path.
		 * @return {void}
		 */
		setRoute(value) {
			this.$set(this.page, 'route', value)
		},
		/**
		 * Write the chosen type onto the page and leave edit mode.
		 * @param {{value: string}|null} option The selected type option.
		 * @return {void}
		 */
		onType(option) {
			this.$set(this.page, 'type', option ? option.value : 'custom')
			this.stopEdit()
		},
		/**
		 * Ensure the page has a plain-object `config` and return it. An empty
		 * `config: {}` round-trips through PHP as `[]`; reset arrays too so data
		 * writes are not silently dropped by JSON.stringify.
		 * @return {object}
		 */
		ensureConfig() {
			if (!this.page.config || typeof this.page.config !== 'object' || Array.isArray(this.page.config)) {
				this.$set(this.page, 'config', {})
			}
			return this.page.config
		},
		/**
		 * Read a `config` field (empty string when unset).
		 * @param {string} key The config key.
		 * @return {string}
		 */
		configValue(key) {
			return (this.page && this.page.config && this.page.config[key]) || ''
		},
		/**
		 * Write a `config` field in place (deletes the key when cleared).
		 * @param {string} key The config key.
		 * @param {string} value The value (falsy removes the key).
		 * @return {void}
		 */
		setConfig(key, value) {
			const config = this.ensureConfig()
			if (value) this.$set(config, key, value)
			else this.$delete(config, key)
		},
		/**
		 * Set the register; clears schema + columns (they are register-scoped).
		 * @param {{value: string}|null} option The selected register option.
		 * @return {void}
		 */
		setRegister(option) {
			this.setConfig('register', option ? option.value : '')
			this.setConfig('schema', '')
			this.setConfig('columns', '')
		},
		/**
		 * Set the schema; clears columns (column keys are schema-specific).
		 * @param {{value: string}|null} option The selected schema option.
		 * @return {void}
		 */
		setSchema(option) {
			this.setConfig('schema', option ? option.value : '')
			this.setConfig('columns', '')
		},
		/**
		 * Set the columns from the selected dropdown options.
		 * @param {Array<{value: string}>} options The selected column options.
		 * @return {void}
		 */
		setColumns(options) {
			const config = this.ensureConfig()
			const cols = (options || []).map((o) => o.value)
			if (cols.length) this.$set(config, 'columns', cols)
			else this.$delete(config, 'columns')
		},
		/**
		 * Set the columns from a comma-separated string (free-text fallback).
		 * @param {string} text The comma-separated column keys.
		 * @return {void}
		 */
		setColumnsText(text) {
			const config = this.ensureConfig()
			const cols = String(text || '').split(',').map((s) => s.trim()).filter(Boolean)
			if (cols.length) this.$set(config, 'columns', cols)
			else this.$delete(config, 'columns')
		},
	},
}
</script>

<style scoped>
.cn-page-tree__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 6px;
	border-radius: var(--border-radius);
}

.cn-page-tree__row:hover {
	background: var(--color-background-hover);
}

.cn-page-tree__handle {
	display: inline-flex;
	align-items: center;
	cursor: grab;
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-page-tree__icon-btn {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	flex-shrink: 0;
}

.cn-page-tree__icon {
	display: inline-block;
	width: 20px;
	height: 20px;
	background-size: 16px;
	background-position: center;
	background-repeat: no-repeat;
	opacity: 0.7;
}

.cn-page-tree__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}

.cn-page-tree__label--btn {
	background: none;
	border: none;
	text-align: left;
	cursor: text;
	font: inherit;
	color: inherit;
	padding: 4px;
	border-radius: var(--border-radius);
}

.cn-page-tree__label--btn:hover {
	background: var(--color-background-dark);
}

.cn-page-tree__type {
	flex-shrink: 0;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-page-tree__type--btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px 6px;
	border-radius: var(--border-radius);
}

.cn-page-tree__type--btn:hover {
	background: var(--color-background-dark);
}

.cn-page-tree__inline-field {
	flex: 1 1 auto;
}

.cn-page-tree__inline-select {
	min-width: 160px;
	flex-shrink: 0;
}

.cn-page-tree__config {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px;
	min-width: 260px;
}

.cn-page-tree__config-id {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-page-tree__config-actions {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	border-top: 1px solid var(--color-border);
	padding-top: 8px;
}
</style>
