<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-page-tree__item">
		<div class="cn-page-tree__row">
			<span class="cn-page-tree__handle" :aria-label="t('nextcloud-vue', 'Drag to reorder or nest')">
				<DragVertical :size="18" />
			</span>

			<!-- Type icon (visual). -->
			<span class="cn-page-tree__icon" aria-hidden="true">
				<component :is="typeIconComponent" :size="20" />
			</span>

			<!-- Name: click to edit inline. -->
			<NcTextField v-if="editing === 'name'"
				ref="nameField"
				class="cn-page-tree__inline-field"
				:model-value="page.title || ''"
				:label="t('nextcloud-vue', 'Title')"
				:label-outside="true"
				@update:model-value="setTitle"
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
				:model-value="selectedType"
				:options="pageTypeOptions"
				:input-label="t('nextcloud-vue', 'Type')"
				label="label"
				:clearable="false"
				@update:model-value="onType"
				@close="stopEdit" />
			<button v-else
				type="button"
				class="cn-page-tree__type cn-page-tree__type--btn"
				@click="startEdit('type')">
				{{ typeLabel }}
			</button>

			<!-- Cog → inline settings panel (toggled, in-DOM so the dropdowns work). -->
			<NcButton type="tertiary"
				:aria-label="t('nextcloud-vue', 'Page settings')"
				:pressed="expanded"
				@click="expanded = !expanded">
				<template #icon>
					<Cog :size="18" />
				</template>
			</NcButton>
		</div>

		<!-- Settings panel. Inline (not a popover) so NcSelect's body-appended
		     dropdown clicks don't dismiss it. -->
		<div v-if="expanded" class="cn-page-tree__panel">
			<NcTextField class="cn-page-tree__panel-field"
				:model-value="page.title || ''"
				:label="t('nextcloud-vue', 'Title')"
				:label-visible="true"
				@update:model-value="setTitle" />

			<NcSelect class="cn-page-tree__panel-field"
				:model-value="selectedType"
				:options="pageTypeOptions"
				:input-label="t('nextcloud-vue', 'Type')"
				label="label"
				:clearable="false"
				@update:model-value="onType" />

			<NcTextField class="cn-page-tree__panel-field"
				:model-value="slugDraft"
				:label="t('nextcloud-vue', 'Slug (page id)')"
				:label-visible="true"
				:placeholder="page.id"
				@update:model-value="(v) => slugDraft = v"
				@keydown.enter="commitSlug"
				@blur="commitSlug" />

			<NcTextField class="cn-page-tree__panel-field"
				:model-value="page.route || ''"
				:label="t('nextcloud-vue', 'Route')"
				:label-visible="true"
				:placeholder="'/example'"
				@update:model-value="setRoute" />

			<template v-if="isDataPage">
				<NcNoteCard v-if="dataSourcesError"
					class="cn-page-tree__panel-field"
					type="error">
					{{ t('nextcloud-vue', 'Could not load registers and schemas.') }}
					<NcButton type="tertiary" @click="retryDataSources">
						{{ t('nextcloud-vue', 'Retry') }}
					</NcButton>
				</NcNoteCard>

				<NcSelect v-if="showPickers"
					class="cn-page-tree__panel-field"
					:model-value="selectedRegister"
					:options="registerOptions"
					:input-label="t('nextcloud-vue', 'Register')"
					label="label"
					:clearable="true"
					:loading="dataSourcesLoading"
					:placeholder="t('nextcloud-vue', 'Choose a register')"
					@update:model-value="setRegister" />
				<NcTextField v-else
					class="cn-page-tree__panel-field"
					:model-value="configValue('register')"
					:label="t('nextcloud-vue', 'Register')"
					:label-visible="true"
					@update:model-value="(v) => setConfig('register', v)" />

				<NcSelect v-if="showPickers"
					class="cn-page-tree__panel-field"
					:model-value="selectedSchema"
					:options="schemaOptions"
					:input-label="t('nextcloud-vue', 'Schema')"
					label="label"
					:clearable="true"
					:loading="dataSourcesLoading"
					:disabled="!configValue('register')"
					:placeholder="t('nextcloud-vue', 'Choose a schema')"
					@update:model-value="setSchema" />
				<NcTextField v-else
					class="cn-page-tree__panel-field"
					:model-value="configValue('schema')"
					:label="t('nextcloud-vue', 'Schema')"
					:label-visible="true"
					@update:model-value="(v) => setConfig('schema', v)" />

				<NcSelect v-if="page.type === 'index' && columnOptions.length"
					class="cn-page-tree__panel-field"
					:model-value="selectedColumns"
					:options="columnOptions"
					:input-label="t('nextcloud-vue', 'Columns')"
					label="label"
					:multiple="true"
					:close-on-select="false"
					:placeholder="t('nextcloud-vue', 'All properties')"
					@update:model-value="setColumns" />
				<NcTextField v-else-if="page.type === 'index'"
					class="cn-page-tree__panel-field"
					:model-value="columnsText"
					:label="t('nextcloud-vue', 'Columns (comma separated)')"
					:label-visible="true"
					:placeholder="'name, status'"
					@update:model-value="setColumnsText" />
			</template>

			<div class="cn-page-tree__panel-actions">
				<NcButton v-if="canAddChild" type="tertiary" @click="$emit('add-child')">
					<template #icon>
						<Plus :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Add sub-page') }}
				</NcButton>
				<NcButton type="tertiary" @click="$emit('remove')">
					<template #icon>
						<Delete :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Delete page') }}
				</NcButton>
			</div>
		</div>
	</div>
</template>

<script>
import { NcButton, NcTextField, NcSelect, NcNoteCard } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'
import ViewDashboardOutline from 'vue-material-design-icons/ViewDashboardOutline.vue'
import FormatListBulletedSquare from 'vue-material-design-icons/FormatListBulletedSquare.vue'
import TextBoxOutline from 'vue-material-design-icons/TextBoxOutline.vue'
import ShapeOutline from 'vue-material-design-icons/ShapeOutline.vue'

// The renderer's closed page-type enum (CnPageRenderer dispatches on these).
const PAGE_TYPES = [
	{ value: 'dashboard', label: 'Dashboard' },
	{ value: 'index', label: 'Index (list)' },
	{ value: 'detail', label: 'Detail' },
	{ value: 'custom', label: 'Custom' },
]

// Per-type MDI glyph (NC `icon-*` CSS classes don't all resolve in the runtime).
const TYPE_ICON_COMPONENTS = {
	dashboard: 'ViewDashboardOutline',
	index: 'FormatListBulletedSquare',
	detail: 'TextBoxOutline',
	custom: 'ShapeOutline',
}

/**
 * CnPageTreeRow — one editable page row for CnPageTreeNode (ADR-041).
 *
 * Renders a page as a compact row with a visible type icon and INLINE editing
 * (click the name to rename, click the type to re-type), plus a cog that toggles
 * an in-row settings panel carrying — for discoverability — Title and Type again,
 * the editable Slug (page id), Route and, for `index`/`detail` pages, the
 * OpenRegister Register / Schema / Columns data source, an Add-sub-page
 * affordance and Delete. The panel is rendered inline (not a floating popover) so
 * NcSelect's body-appended dropdown clicks don't dismiss it. Field edits mutate
 * the page object in place; slug renames and structural actions are emitted so
 * the parent can cascade references (menu links, child parents).
 */
export default {
	name: 'CnPageTreeRow',

	components: { NcButton, NcTextField, NcSelect, NcNoteCard, Cog, Plus, Delete, DragVertical, ViewDashboardOutline, FormatListBulletedSquare, TextBoxOutline, ShapeOutline },

	inject: {
		/** App registers/schemas for the data-source pickers; null → free text. */
		cnDataSources: { default: null },
		/**
		 * Live data-source holder from CnAppRoot (`{ value, loading, error,
		 * hasLoader }`). Preferred over the `cnDataSources` snapshot, which
		 * cannot change after boot. Null when the host predates it.
		 */
		cnDataSourcesState: { default: null },
		/** Re-fetch the data sources; used by the error notice's Retry. */
		cnRefreshDataSources: { default: null },
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
			// Whether the settings panel is open.
			expanded: false,
			// Pending slug edit, committed on blur/enter (renaming the id cascades).
			slugDraft: this.page.id,
		}
	},

	computed: {
		/** Closed page-type options for the Type dropdown. */
		pageTypeOptions() {
			return PAGE_TYPES
		},
		/** The MDI component name for the page's type glyph. */
		typeIconComponent() {
			return TYPE_ICON_COMPONENTS[this.page && this.page.type] || TYPE_ICON_COMPONENTS.custom
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
		/**
		 * The data sources actually in force: the live holder when CnAppRoot
		 * has a loader, else the static snapshot.
		 */
		effectiveDataSources() {
			const live = this.cnDataSourcesState && this.cnDataSourcesState.value
			return live || this.cnDataSources
		},
		/** Whether a refresh is currently in flight. */
		dataSourcesLoading() {
			return !!(this.cnDataSourcesState && this.cnDataSourcesState.loading)
		},
		/** The last refresh's failure, if any. */
		dataSourcesError() {
			return (this.cnDataSourcesState && this.cnDataSourcesState.error) || null
		},
		/** Whether app data sources (registers/schemas) were provided. */
		hasDataSources() {
			const ds = this.effectiveDataSources
			return !!(ds && Array.isArray(ds.registers) && ds.registers.length)
		},
		/**
		 * Whether to render dropdowns rather than free-text slug inputs. A
		 * configured loader counts even before its first fetch resolves, so
		 * the panel never flashes text fields and then swaps them for selects.
		 */
		showPickers() {
			if (this.hasDataSources || this.dataSourcesLoading) return true
			return !!(this.cnDataSourcesState && this.cnDataSourcesState.hasLoader)
		},
		/** Register dropdown options from the data sources. */
		registerOptions() {
			if (!this.hasDataSources) return []
			return this.effectiveDataSources.registers.map((r) => ({ value: r.value, label: r.label || r.value }))
		},
		/** Schema options for the chosen register. */
		schemaOptions() {
			if (!this.hasDataSources) return []
			const reg = this.effectiveDataSources.registers.find((r) => r.value === this.configValue('register'))
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

	watch: {
		// Keep the slug draft in sync if the id changes externally (e.g. a rename
		// elsewhere or the panel re-opening on a different page).
		'page.id'(id) {
			this.slugDraft = id
		},
	},

	methods: {
		t,
		/**
		 * Re-run the data-source fetch after a failure (the error notice's Retry).
		 * @return {void}
		 */
		retryDataSources() {
			if (typeof this.cnRefreshDataSources === 'function') this.cnRefreshDataSources()
		},
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
			this.page['title'] = value
		},
		/**
		 * Set the page route in place.
		 * @param {string} value The new route path.
		 * @return {void}
		 */
		setRoute(value) {
			this.page['route'] = value
		},
		/**
		 * Commit a slug (page id) rename. Emits `rename` so the parent can cascade
		 * references (menu links, child `parent`); a no-op when unchanged/empty.
		 * @return {void}
		 */
		commitSlug() {
			const next = String(this.slugDraft || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
			if (!next || next === this.page.id) {
				this.slugDraft = this.page.id
				return
			}
			this.$emit('rename', next)
		},
		/**
		 * Write the chosen type onto the page and leave inline edit mode.
		 * @param {{value: string}|null} option The selected type option.
		 * @return {void}
		 */
		onType(option) {
			this.page['type'] = option ? option.value : 'custom'
			this.stopEdit()
		},
		/**
		 * Ensure the page has a plain-object `config` and return it. An empty
		 * `config: {}` round-trips through PHP as `[]`; reset arrays too.
		 * @return {object}
		 */
		ensureConfig() {
			if (!this.page.config || typeof this.page.config !== 'object' || Array.isArray(this.page.config)) {
				this.page['config'] = {}
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
			if (value) config[key] = value
			else delete config[key]
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
			if (cols.length) config['columns'] = cols
			else delete config['columns']
		},
		/**
		 * Set the columns from a comma-separated string (free-text fallback).
		 * @param {string} text The comma-separated column keys.
		 * @return {void}
		 */
		setColumnsText(text) {
			const config = this.ensureConfig()
			const cols = String(text || '').split(',').map((s) => s.trim()).filter(Boolean)
			if (cols.length) config['columns'] = cols
			else delete config['columns']
		},
	},
}
</script>

<style scoped>
.cn-page-tree__item {
	display: flex;
	flex-direction: column;
}

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

.cn-page-tree__icon {
	display: inline-flex;
	align-items: center;
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
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

.cn-page-tree__panel {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 4px 0 8px 34px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-background-hover);
}

.cn-page-tree__panel-actions {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	border-top: 1px solid var(--color-border);
	padding-top: 8px;
}
</style>
