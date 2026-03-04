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
				<div v-else class="cn-advanced-form-dialog__tabs">
					<div class="cn-advanced-form-dialog__tab-buttons">
						<button
							v-for="tab in visibleTabs"
							:key="tab.id"
							type="button"
							class="cn-advanced-form-dialog__tab-btn"
							:class="{ 'cn-advanced-form-dialog__tab-btn--active': activeTab === tab.id }"
							@click="activeTab = tab.id">
							{{ tab.label }}
						</button>
					</div>

					<div class="cn-advanced-form-dialog__tab-content">
						<!-- Properties tab -->
						<div v-show="activeTab === 'properties'" class="cn-advanced-form-dialog__tab-panel">
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
														<LockOutline
															v-if="!isPropertyEditable(key, formData[key] !== undefined ? formData[key] : value)"
															class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--lock"
															:size="16" />
														<span>{{ getPropertyDisplayName(key) }}</span>
													</div>
												</td>
												<td class="cn-advanced-form-dialog__table-col-expanded cn-advanced-form-dialog__value-cell">
													<div
														v-if="selectedProperty === key && isPropertyEditable(key, formData[key] !== undefined ? formData[key] : value)"
														class="cn-advanced-form-dialog__value-input-container"
														@click.stop>
														<NcCheckboxRadioSwitch
															v-if="getPropertyInputComponent(key) === 'NcCheckboxRadioSwitch'"
															:checked="formData[key] !== undefined ? formData[key] : value"
															type="switch"
															@update:checked="updatePropertyValue(key, $event)">
															{{ getPropertyDisplayName(key) }}
														</NcCheckboxRadioSwitch>
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
													<div v-else>
														<pre
															v-if="typeof (formData[key] !== undefined ? formData[key] : value) === 'object' && (formData[key] !== undefined ? formData[key] : value) !== null"
															class="cn-advanced-form-dialog__json-value">{{ formatValue(formData[key] !== undefined ? formData[key] : value) }}</pre>
														<span
															v-else-if="isValidDate(formData[key] !== undefined ? formData[key] : value)">{{
															new Date(formData[key] !== undefined ? formData[key] : value).toLocaleString()
														}}</span>
														<span v-else>{{
															formatValue(formData[key] !== undefined ? formData[key] : value, getSchemaProperty(key))
														}}</span>
													</div>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</slot>
						</div>

						<!-- Metadata tab -->
						<div v-show="activeTab === 'metadata'" class="cn-advanced-form-dialog__tab-panel">
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
						</div>

						<!-- Data (JSON) tab -->
						<div v-show="activeTab === 'data'" class="cn-advanced-form-dialog__tab-panel">
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
						</div>
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
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import CodeMirror from 'vue-codemirror6'
import { json as jsonLang, jsonParseLinter as jsonLinter } from '@codemirror/lang-json'
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

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcTextField,
		NcCheckboxRadioSwitch,
		Plus,
		ContentSaveOutline,
		LockOutline,
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
			activeTab: 'properties',
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

		visibleTabs() {
			const tabs = []
			if (this.showPropertiesTable) tabs.push({ id: 'properties', label: 'Properties' })
			if (this.resolvedShowMetadataTab) tabs.push({ id: 'metadata', label: 'Metadata' })
			if (this.showJsonTab) tabs.push({ id: 'data', label: 'Data' })
			return tabs
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
			const prop = this.schema?.properties?.[key]
			const existsInObject = this.item ? Object.prototype.hasOwnProperty.call(this.item, key) : false
			if (!prop) return 'cn-advanced-form-dialog__table-row--warning'
			if (!existsInObject) return 'cn-advanced-form-dialog__table-row--new'
			if (this.isValidPropertyValue(key, value, prop)) return 'cn-advanced-form-dialog__table-row--valid'
			return 'cn-advanced-form-dialog__table-row--invalid'
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

		getPropertyInputComponent(key) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return 'NcTextField'
			if (prop.type === 'boolean') return 'NcCheckboxRadioSwitch'
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
			if (this.activeTab === 'data' && !this.isValidJson(this.jsonData)) return

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

.cn-advanced-form-dialog__tab-buttons {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid var(--color-border);
}

.cn-advanced-form-dialog__tab-btn {
	padding: 8px 16px;
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 14px;
}

.cn-advanced-form-dialog__tab-btn:hover {
	color: var(--color-primary-element);
}

.cn-advanced-form-dialog__tab-btn--active {
	border-bottom-color: var(--color-primary-element);
	color: var(--color-primary-element);
}

.cn-advanced-form-dialog__tab-panel {
	min-height: 200px;
}

.cn-advanced-form-dialog__table-container {
	overflow-x: auto;
}

.cn-advanced-form-dialog__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-advanced-form-dialog__table-row {
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.cn-advanced-form-dialog__table-row:hover {
	background-color: var(--color-background-hover);
}

.cn-advanced-form-dialog__table-row--selected {
	background-color: var(--color-primary-light);
}

.cn-advanced-form-dialog__table-row--edited {
	background-color: var(--color-background-hover);
	border-left: 3px solid var(--color-success);
}

.cn-advanced-form-dialog__table-row--non-editable {
	background-color: var(--color-background-dark);
	cursor: not-allowed;
	opacity: 0.7;
}

.cn-advanced-form-dialog__table-row--valid {
	border-left: 4px solid var(--color-success);
}

.cn-advanced-form-dialog__table-row--invalid {
	background-color: var(--color-error-light);
	border-left: 4px solid var(--color-error);
}

.cn-advanced-form-dialog__table-row--warning {
	background-color: var(--color-warning-light);
	border-left: 4px solid var(--color-warning);
}

.cn-advanced-form-dialog__table-row--new {
	background-color: var(--color-primary-element-light);
	border-left: 4px solid var(--color-primary-element);
}

.cn-advanced-form-dialog__table-col-constrained {
	width: 200px;
	padding: 8px 12px;
	text-align: left;
	border-bottom: 1px solid var(--color-border);
}

.cn-advanced-form-dialog__table-col-expanded {
	padding: 8px 12px;
	text-align: left;
	border-bottom: 1px solid var(--color-border);
}

.cn-advanced-form-dialog__prop-cell-content {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-advanced-form-dialog__validation-icon--lock {
	color: var(--color-text-lighter);
}

.cn-advanced-form-dialog__value-input-container :deep(.text-field) {
	margin: 0;
	padding: 0;
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

.cn-advanced-form-dialog__format-btn {
	margin-top: 8px;
}

.cn-advanced-form-dialog__json-error {
	color: var(--color-error);
	font-size: 14px;
}
</style>
