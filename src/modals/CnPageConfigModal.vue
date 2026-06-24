<!--
  CnPageConfigModal — edit ONE page's full config in place (ADR-041 / ADR-004).

  Opened from an index page's edit-mode config cog (CnPageRenderer wires it to
  the current page). Edits the working manifest's `page` + `page.config` directly
  — Display (title/type/route/show-title/default view/view toggle), Data source
  (register/schema/columns) and the index Actions toggles (add, per-row + mass
  actions, selection) — across three tabs, then persists on Done via the shared
  manifest editor. Isolated NcModal file per ADR-004; every NcSelect carries an
  inputLabel. Booleans default true in CnIndexPage, so a toggle stores `false`
  when switched off and removes the key when on (keeps config minimal).
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-page-config">
			<h2 class="cn-page-config__title">
				{{ t('nextcloud-vue', 'Page configuration') }}
			</h2>

			<div class="cn-page-config__tabs">
				<NcButton v-for="tab in tabs"
					:key="tab.id"
					:type="activeTab === tab.id ? 'primary' : 'tertiary'"
					@click="activeTab = tab.id">
					{{ tab.label }}
				</NcButton>
			</div>

			<!-- Display -->
			<div v-show="activeTab === 'display'" class="cn-page-config__section">
				<NcTextField :value="page.title || ''"
					:label="t('nextcloud-vue', 'Title')"
					:label-visible="true"
					@update:value="(v) => $set(page, 'title', v)" />
				<NcSelect class="cn-page-config__field"
					:value="selectedType"
					:options="pageTypeOptions"
					:input-label="t('nextcloud-vue', 'Type')"
					label="label"
					:clearable="false"
					@input="setType" />
				<NcTextField :value="page.route || ''"
					:label="t('nextcloud-vue', 'Route')"
					:label-visible="true"
					:placeholder="'/example'"
					@update:value="(v) => $set(page, 'route', v)" />
				<NcCheckboxRadioSwitch :checked="boolVal('showTitle')" type="switch" @update:checked="(c) => setBool('showTitle', c)">
					{{ t('nextcloud-vue', 'Show page title') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch :checked="boolVal('showViewToggle')" type="switch" @update:checked="(c) => setBool('showViewToggle', c)">
					{{ t('nextcloud-vue', 'Show Cards / Table toggle') }}
				</NcCheckboxRadioSwitch>
				<NcSelect class="cn-page-config__field"
					:value="selectedViewMode"
					:options="viewModeOptions"
					:input-label="t('nextcloud-vue', 'Default view')"
					label="label"
					:clearable="false"
					@input="setViewMode" />
				<NcCheckboxRadioSwitch :checked="boolVal('filterMenu')" type="switch" @update:checked="(c) => setBool('filterMenu', c)">
					{{ t('nextcloud-vue', 'Show table filter menu') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch :checked="boolVal('columnMenu')" type="switch" @update:checked="(c) => setBool('columnMenu', c)">
					{{ t('nextcloud-vue', 'Show column (show/hide) menu') }}
				</NcCheckboxRadioSwitch>

				<!-- Columns to show (index data pages). Each entry can later carry a
				     formatter/widget transform; today this picks which schema
				     properties become columns. Requires a schema (Data source tab). -->
				<template v-if="isDataPage">
					<NcSelect v-if="columnOptions.length"
						class="cn-page-config__field"
						:value="selectedColumns"
						:options="columnOptions"
						:input-label="t('nextcloud-vue', 'Columns shown')"
						label="label"
						:multiple="true"
						:close-on-select="false"
						:placeholder="t('nextcloud-vue', 'All properties')"
						@input="setColumns" />
					<NcTextField v-else
						:value="columnsText"
						:label="t('nextcloud-vue', 'Columns (comma separated)')"
						:label-visible="true"
						:placeholder="'name, status'"
						@update:value="setColumnsText" />
				</template>
			</div>

			<!-- Data source -->
			<div v-show="activeTab === 'data'" class="cn-page-config__section">
				<template v-if="isDataPage">
					<NcSelect v-if="hasDataSources"
						class="cn-page-config__field"
						:value="selectedRegister"
						:options="registerOptions"
						:input-label="t('nextcloud-vue', 'Register')"
						label="label"
						:clearable="true"
						:placeholder="t('nextcloud-vue', 'Choose a register')"
						@input="setRegister" />
					<NcTextField v-else
						:value="configValue('register')"
						:label="t('nextcloud-vue', 'Register')"
						:label-visible="true"
						@update:value="(v) => setConfig('register', v)" />

					<NcSelect v-if="hasDataSources"
						class="cn-page-config__field"
						:value="selectedSchema"
						:options="schemaOptions"
						:input-label="t('nextcloud-vue', 'Schema')"
						label="label"
						:clearable="true"
						:disabled="!configValue('register')"
						:placeholder="t('nextcloud-vue', 'Choose a schema')"
						@input="setSchema" />
					<NcTextField v-else
						:value="configValue('schema')"
						:label="t('nextcloud-vue', 'Schema')"
						:label-visible="true"
						@update:value="(v) => setConfig('schema', v)" />
				</template>
				<p v-else class="cn-page-config__hint">
					{{ t('nextcloud-vue', 'Set the type to Index or Detail to configure a data source.') }}
				</p>
			</div>

			<!-- Actions -->
			<div v-show="activeTab === 'actions'" class="cn-page-config__section">
				<NcCheckboxRadioSwitch v-for="toggle in actionToggles"
					:key="toggle.key"
					:checked="boolVal(toggle.key)"
					type="switch"
					@update:checked="(c) => setBool(toggle.key, c)">
					{{ toggle.label }}
				</NcCheckboxRadioSwitch>
			</div>

			<div class="cn-page-config__footer">
				<span class="cn-page-config__id">{{ page.id }}</span>
				<NcButton type="primary" :disabled="saving" @click="onDone">
					<template v-if="saving" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

const PAGE_TYPES = [
	{ value: 'dashboard', label: 'Dashboard' },
	{ value: 'index', label: 'Index (list)' },
	{ value: 'detail', label: 'Detail' },
	{ value: 'custom', label: 'Custom' },
]

const VIEW_MODES = [
	{ value: 'table', label: 'Table' },
	{ value: 'cards', label: 'Cards' },
]

// Per-key CnIndexPage boolean defaults, so a toggle reflects the true effective
// state and only stores a value that DIFFERS from the default (minimal config).
// showTitle / filterMenu / columnMenu default false; the rest default true.
const BOOL_DEFAULTS = {
	showTitle: false,
	showViewToggle: true,
	filterMenu: false,
	columnMenu: false,
	showAdd: true,
	showViewAction: true,
	showEditAction: true,
	showCopyAction: true,
	showDeleteAction: true,
	selectable: true,
	showMassDelete: true,
	showMassCopy: true,
	showMassExport: true,
	showMassImport: true,
	showFormDialog: true,
}

// CnIndexPage action toggles (all default true) — stored as `false` when off.
const ACTION_TOGGLES = [
	{ key: 'showAdd', label: 'Show Add button' },
	{ key: 'showViewAction', label: 'Show row View action' },
	{ key: 'showEditAction', label: 'Show row Edit action' },
	{ key: 'showCopyAction', label: 'Show row Copy action' },
	{ key: 'showDeleteAction', label: 'Show row Delete action' },
	{ key: 'selectable', label: 'Allow selection (mass actions)' },
	{ key: 'showMassDelete', label: 'Mass delete' },
	{ key: 'showMassCopy', label: 'Mass copy' },
	{ key: 'showMassExport', label: 'Mass export' },
	{ key: 'showMassImport', label: 'Mass import' },
	{ key: 'showFormDialog', label: 'Built-in create/edit form' },
]

/**
 * CnPageConfigModal — comprehensive single-page config editor (see file header).
 */
export default {
	name: 'CnPageConfigModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcLoadingIcon },

	mixins: [manifestModalDoneMixin],

	inject: {
		/** App registers/schemas for the data-source pickers; null → free text. */
		cnDataSources: { default: null },
	},

	props: {
		/**
		 * The page object (the working manifest's page), mutated in place.
		 *
		 * @type {object}
		 */
		page: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			// Active config tab: 'display' | 'data' | 'actions'.
			activeTab: 'display',
		}
	},

	computed: {
		/** The three config tabs. */
		tabs() {
			return [
				{ id: 'display', label: t('nextcloud-vue', 'Display') },
				{ id: 'data', label: t('nextcloud-vue', 'Data source') },
				{ id: 'actions', label: t('nextcloud-vue', 'Actions') },
			]
		},
		/** Closed page-type options. */
		pageTypeOptions() {
			return PAGE_TYPES
		},
		/** Default-view options. */
		viewModeOptions() {
			return VIEW_MODES
		},
		/** Index action toggles. */
		actionToggles() {
			return ACTION_TOGGLES.map((a) => ({ key: a.key, label: t('nextcloud-vue', a.label) }))
		},
		/** The page's type as an option. */
		selectedType() {
			const type = (this.page && this.page.type) || 'custom'
			return PAGE_TYPES.find((o) => o.value === type) || { value: type, label: type }
		},
		/** The default view as an option. */
		selectedViewMode() {
			const v = this.configValue('viewMode') || 'table'
			return VIEW_MODES.find((o) => o.value === v) || { value: v, label: v }
		},
		/** Whether this page renders OpenRegister data. */
		isDataPage() {
			return this.page && (this.page.type === 'index' || this.page.type === 'detail')
		},
		/** Whether app data sources were provided. */
		hasDataSources() {
			return !!(this.cnDataSources && Array.isArray(this.cnDataSources.registers) && this.cnDataSources.registers.length)
		},
		/** Register options. */
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
		/** Chosen register option. */
		selectedRegister() {
			const slug = this.configValue('register')
			if (!slug) return null
			return this.registerOptions.find((o) => o.value === slug) || { value: slug, label: slug }
		},
		/** Chosen schema option. */
		selectedSchema() {
			const slug = this.configValue('schema')
			if (!slug) return null
			return this.schemaOptions.find((o) => o.value === slug) || { value: slug, label: slug }
		},
		/** Column options (chosen schema's properties). */
		columnOptions() {
			const schema = this.schemaOptions.find((o) => o.value === this.configValue('schema'))
			const cols = (schema && Array.isArray(schema.columns)) ? schema.columns : []
			return cols.map((c) => ({ value: c, label: c }))
		},
		/** Page columns as options. */
		selectedColumns() {
			const cols = (this.page && this.page.config && Array.isArray(this.page.config.columns)) ? this.page.config.columns : []
			return cols.map((c) => ({ value: c, label: c }))
		},
		/** Page columns as comma string. */
		columnsText() {
			const cols = (this.page && this.page.config && Array.isArray(this.page.config.columns)) ? this.page.config.columns : []
			return cols.join(', ')
		},
	},

	methods: {
		t,
		/**
		 * Ensure the page has a plain-object config (resets a PHP-corrupted array).
		 * @return {object}
		 */
		ensureConfig() {
			if (!this.page.config || typeof this.page.config !== 'object' || Array.isArray(this.page.config)) {
				this.$set(this.page, 'config', {})
			}
			return this.page.config
		},
		/**
		 * Read a config value (empty string when unset).
		 * @param {string} key The config key.
		 * @return {*}
		 */
		configValue(key) {
			return (this.page && this.page.config && this.page.config[key]) || ''
		},
		/**
		 * Write a config field in place (deletes when falsy/empty).
		 * @param {string} key The config key.
		 * @param {string} value The value.
		 * @return {void}
		 */
		setConfig(key, value) {
			const config = this.ensureConfig()
			if (value) this.$set(config, key, value)
			else this.$delete(config, key)
		},
		/**
		 * Effective value of a boolean toggle: the stored value when set, else the
		 * key's CnIndexPage default (NOT all default-true — e.g. showTitle is false).
		 * @param {string} key The config key.
		 * @return {boolean}
		 */
		boolVal(key) {
			const cfg = (this.page && this.page.config) || {}
			if (Object.prototype.hasOwnProperty.call(cfg, key)) return !!cfg[key]
			return BOOL_DEFAULTS[key] === true
		},
		/**
		 * Set a boolean toggle: store the value when it differs from the key's
		 * default, drop the key when it equals the default (keeps config minimal,
		 * and correct for keys that default false like showTitle).
		 * @param {string} key The config key.
		 * @param {boolean} checked The new state.
		 * @return {void}
		 */
		setBool(key, checked) {
			const config = this.ensureConfig()
			if (checked === (BOOL_DEFAULTS[key] === true)) this.$delete(config, key)
			else this.$set(config, key, checked)
		},
		/**
		 * Set the page type in place.
		 * @param {{value: string}|null} option The type option.
		 * @return {void}
		 */
		setType(option) {
			this.$set(this.page, 'type', option ? option.value : 'custom')
		},
		/**
		 * Set the default view mode (drops the key when it equals the 'table' default).
		 * @param {{value: string}|null} option The view-mode option.
		 * @return {void}
		 */
		setViewMode(option) {
			const config = this.ensureConfig()
			const v = option ? option.value : 'table'
			if (v && v !== 'table') this.$set(config, 'viewMode', v)
			else this.$delete(config, 'viewMode')
		},
		/**
		 * Set the register; clears schema + columns.
		 * @param {{value: string}|null} option The register option.
		 * @return {void}
		 */
		setRegister(option) {
			this.setConfig('register', option ? option.value : '')
			this.setConfig('schema', '')
			this.setConfig('columns', '')
		},
		/**
		 * Set the schema; clears columns.
		 * @param {{value: string}|null} option The schema option.
		 * @return {void}
		 */
		setSchema(option) {
			this.setConfig('schema', option ? option.value : '')
			this.setConfig('columns', '')
		},
		/**
		 * Set columns from selected options.
		 * @param {Array<{value: string}>} options The column options.
		 * @return {void}
		 */
		setColumns(options) {
			const config = this.ensureConfig()
			const cols = (options || []).map((o) => o.value)
			if (cols.length) this.$set(config, 'columns', cols)
			else this.$delete(config, 'columns')
		},
		/**
		 * Set columns from a comma-separated string.
		 * @param {string} text The column keys.
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
.cn-page-config {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-page-config__title {
	margin: 0;
}

.cn-page-config__tabs {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid var(--color-border);
	padding-bottom: 8px;
}

.cn-page-config__section {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-height: 220px;
}

.cn-page-config__field {
	min-width: 200px;
}

.cn-page-config__hint {
	color: var(--color-text-maxcontrast);
}

.cn-page-config__footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
}

.cn-page-config__id {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
