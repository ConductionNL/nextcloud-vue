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
				:object-properties="objectProperties"
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
								:object-properties="objectProperties"
								:selected-property="selectedProperty"
								:handle-row-click="handleRowClick"
								:get-property-display-name="getPropertyDisplayName"
								:get-property-validation-class="getPropertyValidationClass"
								:is-property-editable="isPropertyEditable"
								:validation-display="validationDisplay">
								<div class="cn-advanced-form-dialog__table-container">
									<table class="cn-advanced-form-dialog__table">
										<thead>
											<tr class="cn-advanced-form-dialog__table-row">
												<th class="cn-advanced-form-dialog__table-col-constrained">
													Property
												</th>
												<th class="cn-advanced-form-dialog__table-col-expanded">
													Value
												</th>
											</tr>
										</thead>
										<tbody>
											<tr
												v-for="([key, value]) in objectProperties"
												:key="key"
												class="cn-advanced-form-dialog__table-row"
												:class="{
													'cn-advanced-form-dialog__table-row--selected': selectedProperty === key,
													'cn-advanced-form-dialog__table-row--edited': formData[key] !== undefined,
													'cn-advanced-form-dialog__table-row--non-editable': !isPropertyEditable(key, formData[key] !== undefined ? formData[key] : value),
													[getPropertyValidationClass(key, value)]: validationDisplay === 'indicator',
												}"
												@click="handleRowClick(key, $event)">
												<td class="cn-advanced-form-dialog__table-col-constrained cn-advanced-form-dialog__prop-cell">
													<div class="cn-advanced-form-dialog__prop-cell-content">
														<AlertCircle
															v-if="validationDisplay === 'indicator' && getPropertyValidationState(key, formData[key] !== undefined ? formData[key] : value) === 'invalid'"
															class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--error"
															:size="16"
															:title="getPropertyErrorMessage(key, formData[key] !== undefined ? formData[key] : value)" />
														<Alert
															v-else-if="validationDisplay === 'indicator' && getPropertyValidationState(key, formData[key] !== undefined ? formData[key] : value) === 'warning'"
															class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--warning"
															:size="16"
															:title="getPropertyWarningMessage(key, formData[key] !== undefined ? formData[key] : value)" />
														<Plus
															v-else-if="validationDisplay === 'indicator' && getPropertyValidationState(key, formData[key] !== undefined ? formData[key] : value) === 'new'"
															class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--new"
															:size="16"
															:title="getPropertyNewMessage(key)" />
														<LockOutline
															v-else-if="!isPropertyEditable(key, formData[key] !== undefined ? formData[key] : value)"
															class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--lock"
															:size="16"
															:title="getEditabilityWarning(key, formData[key] !== undefined ? formData[key] : value) || ''" />
														<span :title="getPropertyTooltip(key)">{{ getPropertyDisplayName(key) }}</span>
													</div>
												</td>
												<td class="cn-advanced-form-dialog__table-col-expanded cn-advanced-form-dialog__value-cell">
													<div
														v-if="isPropertyEditable(key, formData[key] !== undefined ? formData[key] : value) && (getPropertyInputComponent(key) === 'NcCheckboxRadioSwitch' || selectedProperty === key)"
														class="cn-advanced-form-dialog__value-input-container"
														@click.stop>
														<div
															v-if="getPropertyInputComponent(key) === 'NcCheckboxRadioSwitch'"
															class="cn-advanced-form-dialog__boolean-input-row">
															<NcCheckboxRadioSwitch
																:checked="formData[key] !== undefined ? formData[key] : value"
																type="switch"
																class="cn-advanced-form-dialog__boolean-input-row__input"
																@update:checked="updatePropertyValue(key, $event)">
																{{ getPropertyDisplayName(key) }}
															</NcCheckboxRadioSwitch>
															<InformationOutline
																v-if="schema && schema.properties && schema.properties[key] && schema.properties[key].description"
																v-tooltip="schema.properties[key].description"
																class="cn-advanced-form-dialog__info-icon"
																:size="16" />
														</div>
														<NcDateTimePickerNative
															v-else-if="getPropertyInputComponent(key) === 'NcDateTimePickerNative'"
															:value="formData[key] !== undefined ? formData[key] : value"
															:type="getPropertyInputType(key)"
															:label="getPropertyDisplayName(key)"
															@update:value="updatePropertyValue(key, $event)" />
														<NcTextField
															v-else
															:ref="'propertyValueInput-' + key"
															:value="getStringValue(formData[key] !== undefined ? formData[key] : value)"
															:type="getPropertyInputType(key)"
															:placeholder="getPropertyDisplayName(key)"
															:min="getPropertyMinimum(key)"
															:max="getPropertyMaximum(key)"
															:step="getPropertyStep(key)"
															@update:value="updatePropertyValue(key, $event)" />
													</div>
													<div
														v-else
														:title="getPropertyEditabilityWarning(key, formData[key] !== undefined ? formData[key] : value)">
														<pre
															v-if="typeof (formData[key] !== undefined ? formData[key] : value) === 'object' && (formData[key] !== undefined ? formData[key] : value) !== null"
															class="cn-advanced-form-dialog__json-value">{{ formatValue(formData[key] !== undefined ? formData[key] : value) }}</pre>
														<span
															v-else-if="getPropertyInputComponent(key) === 'NcDateTimePickerNative' && isValidDate(formData[key] !== undefined ? formData[key] : value)">{{
															new Date(formData[key] !== undefined ? formData[key] : value).toLocaleString()
														}}</span>
														<span v-else>{{ getDisplayValue(key, formData[key] !== undefined ? formData[key] : value) }}</span>
													</div>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</slot>
						</BTab>

						<!-- Metadata tab -->
						<BTab v-if="resolvedShowMetadataTab" title="Metadata">
							<slot
								name="tab-metadata"
								:item="item"
								:form-data="formData">
								<div class="cn-advanced-form-dialog__table-container">
									<table class="cn-advanced-form-dialog__table">
										<thead>
											<tr class="cn-advanced-form-dialog__table-row">
												<th class="cn-advanced-form-dialog__table-col-constrained">
													Metadata
												</th>
												<th class="cn-advanced-form-dialog__table-col-expanded">
													Value
												</th>
											</tr>
										</thead>
										<tbody>
											<tr class="cn-advanced-form-dialog__table-row">
												<td class="cn-advanced-form-dialog__table-col-constrained">
													ID
												</td>
												<td class="cn-advanced-form-dialog__table-col-expanded">
													{{ metadataId }}
												</td>
											</tr>
											<tr class="cn-advanced-form-dialog__table-row">
												<td class="cn-advanced-form-dialog__table-col-constrained">
													Created
												</td>
												<td class="cn-advanced-form-dialog__table-col-expanded">
													{{ metadataCreated }}
												</td>
											</tr>
											<tr class="cn-advanced-form-dialog__table-row">
												<td class="cn-advanced-form-dialog__table-col-constrained">
													Updated
												</td>
												<td class="cn-advanced-form-dialog__table-col-expanded">
													{{ metadataUpdated }}
												</td>
											</tr>
										</tbody>
									</table>
								</div>
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
								<div class="cn-advanced-form-dialog__json-editor">
									<div :class="['cn-advanced-form-dialog__codemirror-container', jsonEditorDark ? 'cn-advanced-form-dialog__codemirror-container--dark' : 'cn-advanced-form-dialog__codemirror-container--light']">
										<CodeMirror
											v-model="jsonData"
											:basic="true"
											placeholder="{ &quot;key&quot;: &quot;value&quot; }"
											:dark="jsonEditorDark"
											:linter="jsonLinterExtension"
											:lang="jsonLangExtension"
											:extensions="[jsonLangExtension]"
											:tab-size="2"
											style="height: 400px" />
										<NcButton
											class="cn-advanced-form-dialog__format-btn"
											type="secondary"
											size="small"
											@click="formatJSON">
											Format JSON
										</NcButton>
									</div>
									<span v-if="!isValidJson(jsonData)" class="cn-advanced-form-dialog__json-error">
										Invalid JSON format
									</span>
								</div>
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
	NcTextField,
	NcCheckboxRadioSwitch,
	NcDateTimePickerNative,
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import AlertCircle from 'vue-material-design-icons/AlertCircle.vue'
import Alert from 'vue-material-design-icons/Alert.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import CodeMirror from 'vue-codemirror6'
import { json as jsonLang, jsonParseLinter as jsonLinter } from '@codemirror/lang-json'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip.js'
import { BTabs, BTab } from 'bootstrap-vue'
import { fieldsFromSchema, formatValue } from '../../utils/schema.js'

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

	directives: { tooltip: Tooltip },

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcTextField,
		NcCheckboxRadioSwitch,
		NcDateTimePickerNative,
		Plus,
		ContentSaveOutline,
		LockOutline,
		AlertCircle,
		Alert,
		InformationOutline,
		BTabs,
		BTab,
		CodeMirror,
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
		store: { type: Object, default: null },
		objectType: { type: String, default: '' },
		beforeSave: { type: Function, default: null },
		afterSave: { type: Function, default: null },
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
			jsonLangExtension: jsonLang(),
			jsonLinterExtension: jsonLinter(),
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

		objectProperties() {
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

		metadataId() {
			const o = this.formData['@self'] || this.item?.['@self']
			return o?.id ?? this.formData.id ?? this.item?.id ?? '—'
		},

		metadataCreated() {
			const o = this.formData['@self'] || this.item?.['@self']
			const v = o?.created
			return v ? new Date(v).toLocaleString() : '—'
		},

		metadataUpdated() {
			const o = this.formData['@self'] || this.item?.['@self']
			const v = o?.updated
			return v ? new Date(v).toLocaleString() : '—'
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

		updatePropertyValue(key, newVal) {
			const prop = this.schema?.properties?.[key]
			let converted = newVal
			if (prop) {
				switch (prop.type) {
				case 'number':
					converted = newVal === '' ? null : parseFloat(newVal)
					if (Number.isNaN(converted)) converted = null
					break
				case 'integer':
					converted = newVal === '' ? null : parseInt(newVal, 10)
					if (Number.isNaN(converted)) converted = null
					break
				case 'boolean':
					converted = Boolean(newVal)
					break
				default:
					converted = newVal
				}
			}
			this.$set(this.formData, key, converted)
		},

		isPropertyEditable(key, value) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return true
			if (prop.const !== undefined) return false
			if (prop.immutable && value != null && value !== '') return false
			const type = prop.type || 'string'
			return this.editableTypes.includes(type)
		},

		getPropertyValidationClass(key, value) {
			const state = this.getPropertyValidationState(key, value)
			switch (state) {
			case 'invalid':
				return 'cn-advanced-form-dialog__table-row--invalid'
			case 'warning':
				return 'cn-advanced-form-dialog__table-row--warning'
			case 'new':
				return 'cn-advanced-form-dialog__table-row--new'
			case 'valid':
				return 'cn-advanced-form-dialog__table-row--valid'
			default:
				return ''
			}
		},

		/**
		 * Get the validation state of a property.
		 * @param {string} key - The key of the property.
		 * @param {*} value - The value of the property.
		 * @return {'invalid' | 'warning' | 'new' | 'valid'} The validation state of the property.
		 * @description The validation state is one of:
		 * - 'invalid' - The property value is invalid.
		 * - 'warning' - The property value is valid but has a warning.
		 * - 'new' - The property value is new.
		 * - 'valid' - The property value is valid.
		 */
		getPropertyValidationState(key, value) {
			const prop = this.schema?.properties?.[key]
			const existsInObject = this.item ? Object.prototype.hasOwnProperty.call(this.item, key) : false
			if (!prop) return 'warning'
			if (!existsInObject) return 'new'
			if (this.isValidPropertyValue(key, value, prop)) return 'valid'
			return 'invalid'
		},

		isValidPropertyValue(key, value, schemaProperty) {
			if (value === null || value === undefined || value === '') {
				const required = (this.schema?.required || []).includes(key) || schemaProperty?.required
				return !required
			}
			const type = schemaProperty?.type || 'string'
			switch (type) {
			case 'string':
				if (typeof value !== 'string') return false
				if (schemaProperty?.format === 'date-time' && !this.isValidDate(value)) return false
				if (schemaProperty?.const && value !== schemaProperty.const) return false
				return true
			case 'number':
				return typeof value === 'number' && !Number.isNaN(value)
			case 'boolean':
				return typeof value === 'boolean'
			case 'array':
				return Array.isArray(value)
			case 'object':
				return typeof value === 'object' && value !== null && !Array.isArray(value)
			default:
				return true
			}
		},

		getPropertyDisplayName(key) {
			return (this.schema && this.schema.properties && this.schema.properties[key] && this.schema.properties[key].title) || key
		},

		getSchemaProperty(key) {
			return (this.schema && this.schema.properties && this.schema.properties[key]) || {}
		},

		getPropertyTooltip(key) {
			const schemaProperty = this.schema?.properties?.[key]

			if (schemaProperty?.description) {
				if (schemaProperty.title && schemaProperty.title !== key) {
					return `${schemaProperty.title}: ${schemaProperty.description}`
				}
				return schemaProperty.description
			}

			return `Property: ${key}`
		},

		getPropertyInputComponent(key) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return 'NcTextField'
			if (prop.type === 'boolean') return 'NcCheckboxRadioSwitch'
			if (prop.type === 'string' && ['date', 'time', 'date-time'].includes(prop.format)) {
				return 'NcDateTimePickerNative'
			}
			return 'NcTextField'
		},

		getPropertyInputType(key) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return 'text'
			const fmt = prop.format || ''
			if (prop.type === 'string') {
				if (fmt === 'date') return 'date'
				if (fmt === 'time') return 'time'
				if (fmt === 'date-time') return 'datetime-local'
				if (fmt === 'email') return 'email'
				if (fmt === 'url' || fmt === 'uri') return 'url'
			}
			if (prop.type === 'number' || prop.type === 'integer') return 'number'
			return 'text'
		},

		getPropertyMinimum(key) {
			return this.schema?.properties?.[key]?.minimum
		},

		getPropertyMaximum(key) {
			return this.schema?.properties?.[key]?.maximum
		},

		getPropertyStep(key) {
			const prop = this.schema?.properties?.[key]
			if (prop?.type === 'integer') return '1'
			if (prop?.type === 'number') return 'any'
			return undefined
		},

		getStringValue(v) {
			if (v == null) return ''
			if (typeof v === 'string') return v
			if (typeof v === 'object') return JSON.stringify(v)
			return String(v)
		},

		getDisplayValue(key, value) {
			const schemaProperty = this.schema?.properties?.[key]

			if (schemaProperty?.const !== undefined) {
				return schemaProperty.const
			}

			if (value === null || value === undefined || value === '') {
				return '—'
			}

			return formatValue(value, schemaProperty || {})
		},

		getPropertyErrorMessage(key, value) {
			const schemaProperty = this.schema?.properties?.[key]

			if (!schemaProperty) {
				return `Property '${key}' is not defined in the current schema. This property exists in the object but is not part of the schema definition.`
			}

			const isRequired = (this.schema?.required || []).includes(key) || schemaProperty.required
			if ((value === null || value === undefined || value === '') && isRequired) {
				return `Required property '${key}' is missing or empty.`
			}

			const expectedType = schemaProperty.type
			const actualType = Array.isArray(value) ? 'array' : typeof value

			if (expectedType && expectedType !== actualType) {
				return `Property '${key}' should be ${expectedType} but is ${actualType}.`
			}

			if (schemaProperty.format === 'date-time' && !this.isValidDate(value)) {
				return `Property '${key}' should be a valid date-time value.`
			}

			if (schemaProperty.const && value !== schemaProperty.const) {
				return `Property '${key}' should be '${schemaProperty.const}' but is '${value}'.`
			}

			return `Property '${key}' has an invalid value.`
		},

		getPropertyWarningMessage(key, value) {
			return `Property '${key}' exists in the object but is not defined in the current schema. This might happen when property names are changed in the schema. Current value: '${value}'.`
		},

		getPropertyNewMessage(key) {
			return `Property '${key}' is defined in the schema but doesn't have a value yet. Click to add a value.`
		},

		getPropertyEditabilityWarning(key, value) {
			if (!this.isPropertyEditable(key, value)) {
				return 'This property cannot be edited in the Properties tab. Use the Data tab to modify it.'
			}
			return null
		},

		getEditabilityWarning(key, value) {
			const schemaProperty = this.schema?.properties?.[key]

			if (schemaProperty?.const !== undefined) {
				return `This property is constant and must always be '${schemaProperty.const}'. Const properties cannot be modified to maintain data integrity.`
			}

			if (schemaProperty?.immutable && (value !== null && value !== undefined && value !== '')) {
				return `This property is immutable and cannot be changed once it has a value. Current value: '${value}'. Immutable properties preserve data consistency.`
			}

			if (!this.isPropertyEditable(key, value)) {
				return this.getPropertyEditabilityWarning(key, value)
			}
			return null
		},

		handleRowClick(key, event) {
			if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.cn-advanced-form-dialog__value-input-container')) return
			const value = this.formData[key] !== undefined ? this.formData[key] : this.objectProperties.find(([k]) => k === key)?.[1]
			if (!this.isPropertyEditable(key, value)) return
			const prop = this.schema?.properties?.[key]
			if (prop && !this.editableTypes.includes(prop.type || 'string')) return
			this.selectedProperty = key
			this.$nextTick(() => {
				const ref = this.$refs['propertyValueInput-' + key]
				const input = ref && (Array.isArray(ref) ? ref[0] : ref)
				if (input && input.$el) {
					const el = input.$el.querySelector('input')
					if (el) {
						el.focus()
						el.select()
					}
				}
			})
		},

		formatValue(val, property) {
			return formatValue(val, property || {})
		},

		isValidDate(v) {
			if (!v) return false
			const d = new Date(v)
			return d instanceof Date && !Number.isNaN(d.getTime())
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

		async executeConfirm() {
			if (!this.validate()) return
			if (this.isDataTabActive && !this.isValidJson(this.jsonData)) return

			let payload = { ...this.formData }
			if (this.beforeSave) {
				payload = await Promise.resolve(this.beforeSave(payload))
			}

			if (this.store && this.objectType) {
				this.loading = true
				try {
					const saved = await this.store.saveObject(this.objectType, payload)
					if (saved) {
						this.formData = saved
						if (this.afterSave) this.afterSave(saved)
						this.setResult({ success: true })
					} else {
						const err = this.store.getError?.(this.objectType)
						this.setResult({ error: (err && err.message) || 'Save failed' })
					}
				} catch (e) {
					this.setResult({ error: e?.message || 'Save failed' })
				} finally {
					this.loading = false
				}
			} else {
				this.$emit('confirm', payload)
			}
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

.cn-advanced-form-dialog__tab-panel {
	min-height: 200px;
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

.cn-advanced-form-dialog__table-container {
	background: var(--color-main-background);
	border-radius: var(--border-radius);
	overflow: hidden;
	box-shadow: 0 2px 4px var(--color-box-shadow);
	border: 1px solid var(--color-border);
	margin-bottom: calc(5 * var(--default-grid-baseline));
}

.cn-advanced-form-dialog__table {
	width: 100%;
	border-collapse: collapse;
	background-color: var(--color-main-background);
}

.cn-advanced-form-dialog__table th,
.cn-advanced-form-dialog__table td {
	padding: calc(3 * var(--default-grid-baseline));
	text-align: left;
	border-bottom: 1px solid var(--color-border);
	vertical-align: middle;
}

.cn-advanced-form-dialog__table th {
	background: var(--color-background-dark);
	font-weight: 500;
	color: var(--color-text-maxcontrast);
}

.cn-advanced-form-dialog__table-row {
	cursor: pointer;
	transition: background-color 0.2s ease;
	background-color: var(--color-main-background);
}

.cn-advanced-form-dialog__table-row:hover {
	background-color: var(--color-background-hover);
}

/* Active/selected row: light blue; ensure it wins over validation state classes */
.cn-advanced-form-dialog__table-row.cn-advanced-form-dialog__table-row--selected,
.cn-advanced-form-dialog__table-row--selected:hover {
	background-color: var(--color-primary-light);
	box-shadow: inset 3px 0 0 0 var(--color-primary);
}

.cn-advanced-form-dialog__table-row--edited {
	background-color: var(--color-success-light);
	box-shadow: inset 3px 0 0 0 var(--color-success);
}

.cn-advanced-form-dialog__table-row--non-editable {
	background-color: var(--color-background-dark);
	cursor: not-allowed;
	opacity: 0.7;
}

.cn-advanced-form-dialog__table-row--non-editable * {
	cursor: not-allowed !important;
}

.cn-advanced-form-dialog__table-row--valid {
	box-shadow: inset 3px 0 0 0 var(--color-success);
}

.cn-advanced-form-dialog__table-row--invalid {
	background-color: var(--color-error-light);
	box-shadow: inset 3px 0 0 0 var(--color-error);
}

.cn-advanced-form-dialog__table-row--warning {
	background-color: var(--color-warning-light);
	box-shadow: inset 3px 0 0 0 var(--color-warning);
}

.cn-advanced-form-dialog__table-row--new {
	box-shadow: inset 3px 0 0 0 var(--color-primary-element);
}

.cn-advanced-form-dialog__table-col-constrained {
	width: 150px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-advanced-form-dialog__table-col-expanded {
	width: auto;
	min-width: 200px;
}

.cn-advanced-form-dialog__prop-cell {
	width: 30%;
	font-weight: 600;
	box-shadow: inset 3px 0 0 0 var(--color-primary);
}

.cn-advanced-form-dialog__value-cell {
	width: 70%;
	word-break: break-word;
	border-radius: 4px;
}

.cn-advanced-form-dialog__prop-cell-content {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-advanced-form-dialog__validation-icon {
	flex-shrink: 0;
}

.cn-advanced-form-dialog__validation-icon--error {
	color: var(--color-error);
}

.cn-advanced-form-dialog__validation-icon--warning {
	color: var(--color-warning);
}

.cn-advanced-form-dialog__validation-icon--lock {
	color: var(--color-text-lighter);
}

.cn-advanced-form-dialog__validation-icon--new {
	color: var(--color-primary-element);
}

.cn-advanced-form-dialog__value-input-container :deep(.text-field) {
	margin: 0;
	padding: 0;
}

.cn-advanced-form-dialog__boolean-input-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

/* patch extreme size in field */
.cn-advanced-form-dialog__boolean-input-row__input > span {
	padding-left: 0;
	padding-block: 0;
}
.cn-advanced-form-dialog__boolean-input-row__input > input {
	margin: 0;
}

.cn-advanced-form-dialog__info-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	cursor: help;
}

.cn-advanced-form-dialog__json-value {
	max-height: 200px;
	overflow-y: auto;
	white-space: pre-wrap;
	font-family: monospace;
	font-size: 12px;
	background: var(--color-background-dark);
	padding: 8px;
	border-radius: 4px;
	margin: 0;
}

.cn-advanced-form-dialog__json-editor {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-advanced-form-dialog__codemirror-container {
	margin-top: 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	position: relative;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-editor) {
	height: 100%;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-scroller) {
	overflow: auto;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-content) {
	border-radius: 0 !important;
	border: none !important;
}

.cn-advanced-form-dialog__codemirror-container :deep(.cm-editor) {
	outline: none !important;
}

.cn-advanced-form-dialog__codemirror-container--light > .vue-codemirror {
	border: 1px dotted silver;
}

.cn-advanced-form-dialog__codemirror-container--dark > .vue-codemirror {
	border: 1px dotted grey;
}

/* value text color */
/* string */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼe) {
	color: #448c27;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼe) {
	color: #88c379;
}

/* boolean */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼc) {
	color: #221199;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼc) {
	color: #8d64f7;
}

/* null */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼb) {
	color: #770088;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼb) {
	color: #be55cd;
}

/* number */
.cn-advanced-form-dialog__codemirror-container--light :deep(.ͼd) {
	color: #d19a66;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.ͼd) {
	color: #9d6c3a;
}

/* text cursor */
.cn-advanced-form-dialog__codemirror-container :deep(.cm-content) * {
	cursor: text !important;
}

/* selection color */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line)::selection,
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line) ::selection {
	background-color: #d7eaff !important;
	color: black;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line)::selection,
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line) ::selection {
	background-color: #8fb3e6 !important;
	color: black;
}

/* string selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼe)::selection {
	color: #2d770f;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼe)::selection {
	color: #104e0c;
}

/* boolean selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼc)::selection {
	color: #221199;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼc)::selection {
	color: #4026af;
}

/* null selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼb)::selection {
	color: #770088;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼb)::selection {
	color: #770088;
}

/* number selection */
.cn-advanced-form-dialog__codemirror-container--light :deep(.cm-line .ͼd)::selection {
	color: #8c5c2c;
}
.cn-advanced-form-dialog__codemirror-container--dark :deep(.cm-line .ͼd)::selection {
	color: #623907;
}

.cn-advanced-form-dialog__format-btn {
	margin-top: 8px;
}

.cn-advanced-form-dialog__json-error {
	color: var(--color-error);
	font-size: 14px;
}
</style>
