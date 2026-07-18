<template>
	<NcDialog
		:name="resolvedTitle"
		size="large"
		:no-close="loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null"
			class="cn-advanced-form-dialog__result"
			data-testid="cn-modal"
			data-testid-modal="cn-advanced-form-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ resolvedSuccessText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase -->
		<div v-else
			class="cn-advanced-form-dialog__form"
			data-testid="cn-modal"
			data-testid-modal="cn-advanced-form-dialog"
			data-testid-phase="form">
			<!-- Full form override slot -->
			<slot
				v-if="$slots.form"
				name="form"
				:form-data="formData"
				:update-field="updateField"
				:object-properties="objectPropertiesForSlot"
				:json-data="jsonData"
				:update-json="updateJsonFromExternal"
				:is-valid-json="isValidJson(jsonData)" />

			<!-- Default content -->
			<template v-else>
				<!-- Register/schema selection step (optional slot) -->
				<slot
					v-if="$slots['register-schema-selection']"
					name="register-schema-selection" />

				<!-- Main tabs — hand-rolled to drop the bootstrap-vue → bootstrap@4 → jquery
				     missing-peer chain. Same UX as the legacy BTabs justified/v-model layout. -->
				<div v-else class="cn-advanced-form-dialog__tabs tabContainer">
					<ul class="cn-advanced-form-dialog__tab-nav" role="tablist">
						<li
							v-for="(tab, idx) in resolvedTabs"
							:key="tab.key"
							role="presentation"
							class="cn-advanced-form-dialog__tab-nav-item">
							<button
								type="button"
								role="tab"
								:aria-selected="activeTab === idx"
								:disabled="tab.disabled"
								:class="['cn-advanced-form-dialog__tab-button', { 'is-active': activeTab === idx }]"
								@click="activeTab = idx">
								{{ tab.title }}
							</button>
						</li>
					</ul>

					<!-- Properties tab — disabled when the active schema has no
					     properties to render (a bare JSON blob is still
					     editable via the Data tab). -->
					<div
						v-if="showPropertiesTable"
						v-show="activeTab === tabIndex('properties')"
						role="tabpanel"
						class="cn-advanced-form-dialog__tab-content">
						<slot
							name="tab-properties"
							:form-data="formData"
							:update-field="updateField"
							:object-properties="objectPropertiesForSlot"
							:selected-property="selectedProperty"
							:get-property-display-name="getPropertyDisplayName"
							:get-property-validation-class="getPropertyValidationClass"
							:is-property-editable="isPropertyEditable"
							:validation-display="validationDisplay">
							<CnPropertiesTab
								ref="propertiesTab"
								:schema="schema"
								:item="item"
								:form-data="formData"
								:selected-property="selectedProperty"
								:editable-types="editableTypes"
								:validation-display="validationDisplay"
								:exclude-fields="excludeFields"
								:include-fields="includeFields"
								@update:property-value="onPropertyValueUpdate"
								@update:selected-property="selectedProperty = $event" />
						</slot>
					</div>

					<!-- Metadata tab -->
					<div
						v-if="resolvedShowMetadataTab"
						v-show="activeTab === tabIndex('metadata')"
						role="tabpanel"
						class="cn-advanced-form-dialog__tab-content">
						<slot name="tab-metadata" :item="item" :form-data="formData">
							<CnMetadataTab :item="item" :form-data="formData" />
						</slot>
					</div>

					<!-- Data (JSON) tab -->
					<div
						v-if="showJsonTab"
						v-show="activeTab === tabIndex('data')"
						role="tabpanel"
						class="cn-advanced-form-dialog__tab-content">
						<slot
							name="tab-data"
							:json-data="jsonData"
							:update-json="updateJsonFromExternal"
							:is-valid="isValidJson(jsonData)"
							:format-json="formatJSON">
							<CnDataTab
								:value="jsonData"
								:dark="jsonEditorDark"
								@update:value="jsonData = $event"
								@format="onFormatResult" />
						</slot>
					</div>
				</div>
			</template>
		</div>

		<template #actions>
			<slot name="actions-left" />
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="primary"
				:disabled="loading"
				@click="executeConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<Plus v-else-if="isCreateMode" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ resolvedConfirmLabel }}
			</NcButton>
			<slot name="actions-right" />
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcDialog,
	NcButton,
	NcNoteCard,
	NcLoadingIcon,
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import { fieldsFromSchema } from '../../utils/schema.js'
import CnPropertiesTab from './CnPropertiesTab.vue'
import CnMetadataTab from './CnMetadataTab.vue'
import CnDataTab from './CnDataTab.vue'
import { TENANT_CONTEXT_KEY } from '../../composables/useTenantContext.js'

/** Schema types for which we have built-in inline editing support in the properties table. */
const EDITABLE_SUPPORTED_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object']

/**
 * CnAdvancedFormDialog — Create/edit dialog with properties table (click-to-edit), JSON tab, and optional store integration.
 *
 * When `item` is null, operates in create mode. When `item` is provided, operates in edit mode.
 * Provides a richer UX than CnFormDialog: properties table with inline editing, Data (JSON) tab with CodeMirror,
 * optional Metadata tab. Editable property types are determined by coded-in support; optional editablePropertyTypes
 * prop can restrict or extend. Dialog size is fixed to large.
 *
 * @event confirm Emitted when the user confirms. Payload: formData object.
 * @event close Emitted when the dialog should be closed.
 */
export default {
	name: 'CnAdvancedFormDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		Plus,
		ContentSaveOutline,
		CnPropertiesTab,
		CnMetadataTab,
		CnDataTab,
	},

	inject: {
		_cnTenantContext: {
			from: TENANT_CONTEXT_KEY,
			default: null,
		},
	},

	props: {
		/** JSON Schema definition for the object */
		schema: { type: Object, default: null },
		/** The object instance being created or edited */
		item: { type: Object, default: null },
		/** Dialog title; falls back to schema.title when empty */
		dialogTitle: { type: String, default: '' },
		/** Schema property used as the item name in the title */
		nameField: { type: String, default: 'title' },
		/** Message shown after a successful operation */
		successText: { type: String, default: '' },
		/** Label for the cancel button */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the confirm / primary action button */
		confirmLabel: { type: String, default: '' },
		/** Field keys to hide from the form */
		excludeFields: { type: Array, default: () => [] },
		/** When set, only these field keys are shown */
		includeFields: { type: Array, default: null },
		/** Per-field schema overrides keyed by field name */
		fieldOverrides: { type: Object, default: () => ({}) },
		/** Whether to render the Properties tab */
		showPropertiesTable: { type: Boolean, default: true },
		/** Whether to render the Data (JSON) tab */
		showJsonTab: { type: Boolean, default: true },
		/** Whether to render the Metadata tab (auto-detected when null) */
		showMetadataTab: { type: Boolean, default: null },
		/** JSON Schema types allowed for inline editing */
		editablePropertyTypes: { type: Array, default: null },
		/** How to display validation results: "indicator" or "none" */
		validationDisplay: { type: String, default: 'indicator', validator: (v) => ['indicator', 'none'].includes(v) },
		/** Enable dark mode for the JSON editor */
		jsonEditorDark: { type: Boolean, default: false },
	},

	data() {
		return {
			formData: {},
			jsonData: '',
			activeTab: 0,
			selectedProperty: null,
			errors: {},
			loading: false,
			result: null,
			closeTimeout: null,
			isInternalUpdate: false,
		}
	},

	computed: {
		isCreateMode() {
			return !this.item
		},

		/**
		 * Visible-tab descriptors, computed from the show* flags so the
		 * hand-rolled tab nav can render the right buttons + the right
		 * activeTab index maps to the right panel. Order matters and
		 * mirrors the legacy BTabs declaration order: properties → metadata → data.
		 *
		 * @return {Array<{ key: string, title: string, disabled: boolean }>}
		 */
		resolvedTabs() {
			const tabs = []
			if (this.showPropertiesTable) {
				tabs.push({
					key: 'properties',
					title: t('nextcloud-vue', 'Properties'),
					disabled: !this.hasSchemaProperties,
				})
			}
			if (this.resolvedShowMetadataTab) {
				tabs.push({ key: 'metadata', title: t('nextcloud-vue', 'Metadata'), disabled: false })
			}
			if (this.showJsonTab) {
				tabs.push({ key: 'data', title: t('nextcloud-vue', 'Data'), disabled: false })
			}
			return tabs
		},

		schemaTitle() {
			return (this.schema && this.schema.title) || t('nextcloud-vue', 'Item')
		},

		currentSchema() {
			return this.schema
		},

		resolvedTitle() {
			if (this.dialogTitle) return this.dialogTitle
			return this.isCreateMode
				? t('nextcloud-vue', 'Create {title}', { title: this.schemaTitle })
				: t('nextcloud-vue', 'Edit {title}', { title: this.schemaTitle })
		},

		resolvedConfirmLabel() {
			if (this.confirmLabel) return this.confirmLabel
			return this.isCreateMode ? t('nextcloud-vue', 'Create') : t('nextcloud-vue', 'Save')
		},

		resolvedSuccessText() {
			if (this.successText) return this.successText
			return t('nextcloud-vue', '{title} saved successfully.', { title: this.schemaTitle })
		},

		resolvedShowMetadataTab() {
			if (this.showMetadataTab !== null) return this.showMetadataTab
			return !!this.item
		},

		/**
		 * True when the active schema declares at least one (non-metadata)
		 * property the Properties tab can render. Used to disable the tab
		 * when there's nothing for it to show — the Data tab still works.
		 */
		hasSchemaProperties() {
			const props = this.schema?.properties || {}
			const exclude = this.excludeFields || []
			const include = this.includeFields
			for (const key of Object.keys(props)) {
				if (key === '@self' || key === 'id') continue
				if (exclude.includes(key)) continue
				if (include && !include.includes(key)) continue
				return true
			}
			return false
		},

		resolvedFields() {
			return fieldsFromSchema(this.schema, {
				exclude: this.excludeFields,
				include: this.includeFields,
				overrides: this.fieldOverrides,
				includeReadOnly: true,
			})
		},

		/** objectProperties exposed to the #form and #tab-properties slot consumers */
		objectPropertiesForSlot() {
			const schemaProps = this.schema?.properties || {}
			const obj = this.item || {}
			const exclude = this.excludeFields || []
			const include = this.includeFields
			const filterKey = (k) => {
				if (k === '@self' || k === 'id') return false
				if (exclude.includes(k)) return false
				if (include && !include.includes(k)) return false
				return true
			}
			const existing = Object.entries(obj).filter(([k]) => filterKey(k))
			const missing = []
			for (const [key, prop] of Object.entries(schemaProps)) {
				if (!filterKey(key)) continue
				if (!Object.prototype.hasOwnProperty.call(obj, key)) {
					let def
					switch (prop.type) {
					case 'string': def = prop.const ?? ''; break
					case 'number':
					case 'integer': def = 0; break
					case 'boolean': def = false; break
					case 'array': def = []; break
					case 'object': def = {}; break
					default: def = ''
					}
					missing.push([key, def])
				}
			}
			return [...existing, ...missing]
		},

		dataTabIndex() {
			let index = 0
			if (this.showPropertiesTable) index++
			if (this.resolvedShowMetadataTab) index++
			return index
		},

		isDataTabActive() {
			return this.showJsonTab && this.activeTab === this.dataTabIndex
		},

		editableTypes() {
			if (this.editablePropertyTypes && this.editablePropertyTypes.length > 0) {
				return this.editablePropertyTypes
			}
			return EDITABLE_SUPPORTED_TYPES
		},
	},

	watch: {
		item: {
			immediate: true,
			handler(newItem) {
				this.initFormData(newItem)
			},
		},
		hasSchemaProperties: {
			immediate: true,
			handler(hasProps) {
				// When the Properties tab is disabled, skip past it so we
				// don't land on a non-interactive tab on first render.
				if (!hasProps && this.activeTab === 0 && this.showPropertiesTable) {
					this.activeTab = this.resolvedShowMetadataTab ? 1 : (this.showJsonTab ? 1 : 0)
				}
			},
		},
		jsonData(newVal) {
			if (!this.isInternalUpdate && this.isValidJson(newVal)) {
				this.updateFormFromJson()
			}
		},
		formData: {
			handler() {
				if (!this.isInternalUpdate) {
					this.updateJsonFromForm()
				}
			},
			deep: true,
		},
	},

	beforeUnmount() {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout)
			this.closeTimeout = null
		}
	},

	methods: {
		/**
		 * Find the activeTab index for a tab key. Used by the v-show panel
		 * gating so a hidden tab (e.g. metadata off) doesn't desync the
		 * tab-nav indexes from the panels.
		 *
		 * @param {string} key Tab key — 'properties' | 'metadata' | 'data'.
		 * @return {number} Index in resolvedTabs, or -1 when not visible.
		 */
		tabIndex(key) {
			return this.resolvedTabs.findIndex((t) => t.key === key)
		},

		initFormData(item) {
			if (item) {
				this.formData = JSON.parse(JSON.stringify(item))
			} else {
				const data = {}
				for (const field of this.resolvedFields) {
					if (field.default !== null && field.default !== undefined) {
						data[field.key] = field.default
					} else if (field.widget === 'checkbox') {
						data[field.key] = false
					} else if (field.widget === 'tags' || field.widget === 'multiselect') {
						data[field.key] = []
					} else {
						data[field.key] = null
					}
				}
				this.formData = data
			}
			// Multi-tenancy auto-fill (multi-tenancy-context REQ-MT-4) —
			// stamp the active organisation when the schema declares it
			// and the form does not already carry a value.
			this._autofillTenant()
			this.jsonData = JSON.stringify(this.formData, null, 2)
			this.errors = {}
			this.selectedProperty = null
		},

		/**
		 * Auto-fill the `organisation` field with the active tenant UUID
		 * when the schema declares such a field and no value is already
		 * set (explicit `item` data wins).
		 */
		_autofillTenant() {
			const ctx = this._cnTenantContext
			if (!ctx) return
			const uuid = ctx.activeOrganisationUuid && ctx.activeOrganisationUuid.value
			if (!uuid) return
			const hasOrgField = this.resolvedFields.some((f) => f.key === 'organisation')
			if (!hasOrgField) return
			const current = this.formData.organisation
			if (current !== null && current !== undefined && current !== '') return
			this.$set(this.formData, 'organisation', uuid)
		},

		updateField(key, value) {
			this.$set(this.formData, key, value)
			if (this.errors[key]) this.$delete(this.errors, key)
		},

		onPropertyValueUpdate({ key, value }) {
			this.$set(this.formData, key, value)
			if (this.errors[key]) this.$delete(this.errors, key)
		},

		/**
		 * Proxy for slot consumers: exposes isPropertyEditable from the tab sub-component.
		 * @param {string} key - Property key
		 * @param {*} value - Current property value
		 */
		isPropertyEditable(key, value) {
			const tab = this.$refs.propertiesTab
			if (tab) return tab.isPropertyEditable(key, value)
			return true
		},

		/**
		 * Proxy for slot consumers.
		 * @param {string} key - Property key
		 */
		getPropertyDisplayName(key) {
			const tab = this.$refs.propertiesTab
			if (tab) return tab.getPropertyDisplayName(key)
			return key
		},

		/**
		 * Proxy for slot consumers.
		 * @param {string} key - Property key
		 * @param {*} value - Current property value
		 */
		getPropertyValidationClass(key, value) {
			const tab = this.$refs.propertiesTab
			if (tab) return tab.getPropertyValidationClass(key, value)
			return ''
		},

		updateFormFromJson() {
			if (this.isInternalUpdate) return
			try {
				this.isInternalUpdate = true
				this.formData = JSON.parse(this.jsonData)
			} catch {
				// Keep previous formData
			} finally {
				this.$nextTick(() => { this.isInternalUpdate = false })
			}
		},

		updateJsonFromForm() {
			if (this.isInternalUpdate) return
			try {
				this.isInternalUpdate = true
				this.jsonData = JSON.stringify(this.formData, null, 2)
			} catch {
				// Ignore
			} finally {
				this.$nextTick(() => { this.isInternalUpdate = false })
			}
		},

		updateJsonFromExternal(newJson) {
			this.jsonData = newJson
			if (this.isValidJson(newJson)) this.updateFormFromJson()
		},

		isValidJson(str) {
			if (!str || !str.trim()) return false
			try {
				JSON.parse(str)
				return true
			} catch {
				return false
			}
		},

		formatJSON() {
			try {
				if (this.jsonData) {
					const parsed = JSON.parse(this.jsonData)
					this.jsonData = JSON.stringify(parsed, null, 2)
					if (!this.isInternalUpdate) {
						this.isInternalUpdate = true
						this.formData = parsed
						this.$nextTick(() => { this.isInternalUpdate = false })
					}
				}
			} catch {
				// Keep invalid JSON as-is
			}
		},

		onFormatResult(parsed) {
			if (!this.isInternalUpdate) {
				this.isInternalUpdate = true
				this.formData = parsed
				this.$nextTick(() => { this.isInternalUpdate = false })
			}
		},

		validate() {
			const newErrors = {}
			for (const field of this.resolvedFields) {
				const value = this.formData[field.key]
				if (field.required && (value == null || value === '')) {
					newErrors[field.key] = `${field.label} is required.`
				}
			}
			this.errors = newErrors
			return Object.keys(newErrors).length === 0
		},

		executeConfirm() {
			if (!this.validate()) return
			if (this.isDataTabActive && !this.isValidJson(this.jsonData)) return
			this.$emit('confirm', JSON.parse(JSON.stringify(this.formData)))
		},

		setResult(resultData) {
			this.loading = false
			this.result = resultData
			if (resultData?.success) {
				this.closeTimeout = setTimeout(() => this.$emit('close'), 2000)
			}
		},
	},
}
</script>

<style scoped>
.cn-advanced-form-dialog__form {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-advanced-form-dialog__tabs {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* Bootstrap-Vue tab styling to match ViewObject */
.tabContainer {
	margin-top: 20px;
}

.tabContainer > * ul > li {
  display: flex;
  flex: 1;
}

.tabContainer > * ul > li:hover {
  background-color: var(--color-background-hover);
}

.tabContainer > * ul > li > a {
  flex: 1;
  text-align: center;
}

.tabContainer > * ul > li > .active {
  background: transparent !important;
  color: var(--color-main-text) !important;
  border-bottom: var(--default-grid-baseline) solid var(--color-primary-element) !important;
}

.tabContainer > * ul[role="tablist"] {
  display: flex;
  margin: 10px 8px 0 8px;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}

.tabContainer > * ul[role="tablist"] > * a[role="tab"] {
  padding-inline-start: 10px;
  padding-inline-end: 10px;
  padding-block-start: 10px;
  padding-block-end: 10px;
}

.tabContainer > * div[role="tabpanel"] {
  margin-block-start: var(--OR-margin-10);
}

:deep(.nav-tabs) {
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 15px;
	display: flex;
}

:deep(.nav-tabs .nav-item) {
	display: flex;
	flex: 1;
}

:deep(.nav-tabs .nav-link) {
	flex: 1;
	text-align: center;
	border: none;
	border-bottom: 2px solid transparent;
	color: var(--color-text-maxcontrast);
	padding: 8px 16px;
}

:deep(.nav-tabs .nav-link.active) {
	color: var(--color-main-text);
	border-bottom: 2px solid var(--color-primary);
	background-color: transparent;
}

:deep(.nav-tabs .nav-link:hover) {
	border-bottom: 2px solid var(--color-border);
}

:deep(.tab-content) {
	padding: 16px;
	background-color: var(--color-main-background);
}

/* Hand-rolled tab nav — replaces bootstrap-vue's BTabs/BTab. */
.cn-advanced-form-dialog__tab-nav {
	display: flex;
	gap: 0;
	list-style: none;
	padding: 0;
	margin: 0 0 16px;
	border-bottom: 1px solid var(--color-border);
}

.cn-advanced-form-dialog__tab-nav-item {
	flex: 1 1 0;
}

.cn-advanced-form-dialog__tab-button {
	width: 100%;
	padding: 10px 14px;
	background: transparent;
	border: 0;
	border-bottom: 2px solid transparent;
	color: var(--color-text-maxcontrast);
	font: inherit;
	cursor: pointer;
}

.cn-advanced-form-dialog__tab-button:hover:not(:disabled) {
	border-bottom-color: var(--color-border);
	color: var(--color-main-text);
}

.cn-advanced-form-dialog__tab-button.is-active {
	color: var(--color-main-text);
	border-bottom-color: var(--color-primary);
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-advanced-form-dialog__tab-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.cn-advanced-form-dialog__tab-content {
	padding: 16px 0;
}
</style>
