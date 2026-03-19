<template>
	<NcDialog
		:name="resolvedTitle"
		size="large"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null" class="cn-advanced-form-dialog__result">
			<NcNoteCard v-if="result.success" type="success">
				{{ resolvedSuccessText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase -->
		<div v-else class="cn-advanced-form-dialog__form">
			<!-- Full form override slot -->
			<slot
				v-if="$scopedSlots.form"
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
					v-if="$scopedSlots['register-schema-selection']"
					name="register-schema-selection"
					:proceed="proceedFromRegisterSchemaStep" />

				<!-- Main tabs -->
				<div v-else class="cn-advanced-form-dialog__tabs tabContainer">
					<BTabs v-model="activeTab" content-class="mt-3" justified>
						<!-- Properties tab -->
						<BTab v-if="showPropertiesTable" title="Properties">
							<slot
								name="tab-properties"
								:form-data="formData"
								:update-field="updateField"
								:object-properties="objectPropertiesForSlot"
								:selected-property="selectedProperty"
								:handle-row-click="onRowClick"
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
						</BTab>

						<!-- Metadata tab -->
						<BTab v-if="resolvedShowMetadataTab" title="Metadata">
							<slot name="tab-metadata" :item="item" :form-data="formData">
								<CnMetadataTab :item="item" :form-data="formData" />
							</slot>
						</BTab>

						<!-- Data (JSON) tab -->
						<BTab v-if="showJsonTab" title="Data">
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
						</BTab>
					</BTabs>
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
				type="primary"
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
import {
	NcDialog,
	NcButton,
	NcNoteCard,
	NcLoadingIcon,
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import { BTabs, BTab } from 'bootstrap-vue'
import { fieldsFromSchema } from '../../utils/schema.js'
import CnPropertiesTab from './CnPropertiesTab.vue'
import CnMetadataTab from './CnMetadataTab.vue'
import CnDataTab from './CnDataTab.vue'

/** Schema types for which we have built-in inline editing support in the properties table. */
const EDITABLE_SUPPORTED_TYPES = ['string', 'number', 'integer', 'boolean']

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
		BTabs,
		BTab,
		CnPropertiesTab,
		CnMetadataTab,
		CnDataTab,
	},

	props: {
		schema: { type: Object, default: null },
		item: { type: Object, default: null },
		dialogTitle: { type: String, default: '' },
		nameField: { type: String, default: 'title' },
		successText: { type: String, default: '' },
		cancelLabel: { type: String, default: 'Cancel' },
		closeLabel: { type: String, default: 'Close' },
		confirmLabel: { type: String, default: '' },
		excludeFields: { type: Array, default: () => [] },
		includeFields: { type: Array, default: null },
		fieldOverrides: { type: Object, default: () => ({}) },
		showPropertiesTable: { type: Boolean, default: true },
		showJsonTab: { type: Boolean, default: true },
		showMetadataTab: { type: Boolean, default: null },
		editablePropertyTypes: { type: Array, default: null },
		validationDisplay: { type: String, default: 'indicator', validator: (v) => ['indicator', 'none'].includes(v) },
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

		schemaTitle() {
			return (this.schema && this.schema.title) || 'Item'
		},

		currentSchema() {
			return this.schema
		},

		resolvedTitle() {
			if (this.dialogTitle) return this.dialogTitle
			return this.isCreateMode
				? `Create ${this.schemaTitle}`
				: `Edit ${this.schemaTitle}`
		},

		resolvedConfirmLabel() {
			if (this.confirmLabel) return this.confirmLabel
			return this.isCreateMode ? 'Create' : 'Save'
		},

		resolvedSuccessText() {
			if (this.successText) return this.successText
			return `${this.schemaTitle} saved successfully.`
		},

		resolvedShowMetadataTab() {
			if (this.showMetadataTab !== null) return this.showMetadataTab
			return !!this.item
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

	beforeDestroy() {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout)
			this.closeTimeout = null
		}
	},

	methods: {
		proceedFromRegisterSchemaStep() {
			// Placeholder for slot consumers
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
			this.jsonData = JSON.stringify(this.formData, null, 2)
			this.errors = {}
			this.selectedProperty = null
		},

		updateField(key, value) {
			this.$set(this.formData, key, value)
			if (this.errors[key]) this.$delete(this.errors, key)
		},

		onPropertyValueUpdate({ key, value }) {
			this.$set(this.formData, key, value)
			if (this.errors[key]) this.$delete(this.errors, key)
		},

		onRowClick(key, event) {
			// Forwarded for #tab-properties slot consumers — the sub-component handles it internally
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
</style>
