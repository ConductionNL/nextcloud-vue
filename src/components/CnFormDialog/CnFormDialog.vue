<template>
	<NcDialog
		:name="resolvedTitle"
		:size="size"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null" class="cn-form-dialog__result">
			<NcNoteCard v-if="result.success" type="success">
				{{ resolvedSuccessText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase -->
		<div v-else class="cn-form-dialog__form">
			<!-- Full form override slot -->
			<slot
				v-if="$scopedSlots.form"
				name="form"
				:fields="resolvedFields"
				:form-data="formData"
				:errors="errors"
				:update-field="updateField" />

			<!-- Auto-generated form -->
			<template v-else>
				<slot name="before-fields" />

				<div
					v-for="field in resolvedFields"
					:key="field.key"
					class="cn-form-dialog__field">
					<!-- Per-field override slot -->
					<slot
						v-if="$scopedSlots['field-' + field.key]"
						:name="'field-' + field.key"
						:field="field"
						:value="formData[field.key]"
						:error="errors[field.key]"
						:update-field="updateField" />

					<!-- Auto-generated field -->
					<template v-else>
						<!-- Text / Email / URL -->
						<NcTextField
							v-if="field.widget === 'text' || field.widget === 'email' || field.widget === 'url'"
							:label="field.label + (field.required ? ' *' : '')"
							:value="formData[field.key] != null ? String(formData[field.key]) : ''"
							:helper-text="errors[field.key] || field.description"
							:error="!!errors[field.key]"
							:type="field.widget === 'email' ? 'email' : field.widget === 'url' ? 'url' : 'text'"
							:disabled="field.readOnly"
							:placeholder="field.description"
							@update:value="value => updateField(field.key, value)" />

						<!-- Number -->
						<NcTextField
							v-else-if="field.widget === 'number'"
							:label="field.label + (field.required ? ' *' : '')"
							:value="formData[field.key] != null ? String(formData[field.key]) : ''"
							:helper-text="errors[field.key] || field.description"
							:error="!!errors[field.key]"
							type="number"
							:disabled="field.readOnly"
							:placeholder="field.description"
							@update:value="value => updateField(field.key, value !== '' ? Number(value) : null)" />

						<!-- Textarea -->
						<div v-else-if="field.widget === 'textarea'" class="cn-form-dialog__textarea-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<textarea
								:id="'cn-form-' + field.key"
								class="cn-form-dialog__textarea"
								:value="formData[field.key] || ''"
								:disabled="field.readOnly"
								:placeholder="field.description"
								rows="4"
								@input="updateField(field.key, $event.target.value)" />
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- Select (enum, supports async function) -->
						<div v-else-if="field.widget === 'select'" class="cn-form-dialog__select-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:options="getEffectiveOptions(field)"
								:value="getEffectiveSelectedOption(field)"
								:clearable="!field.required"
								:disabled="field.readOnly"
								:loading="isFieldLoading(field)"
								:filterable="!isAsyncEnum(field)"
								@input="onEffectiveSelectChange(field, $event)"
								@search="isAsyncEnum(field) ? onAsyncSearch(field, $event) : undefined">
								<template
									v-if="$scopedSlots['field-' + field.key + '-option']"
									#option="optionProps">
									<slot :name="'field-' + field.key + '-option'" v-bind="optionProps" />
								</template>
								<template
									v-if="$scopedSlots['field-' + field.key + '-selected-option']"
									#selected-option="optionProps">
									<slot :name="'field-' + field.key + '-selected-option'" v-bind="optionProps" />
								</template>
							</NcSelect>
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- Multiselect (array with enum items, supports async function) -->
						<div v-else-if="field.widget === 'multiselect'" class="cn-form-dialog__select-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:options="getEffectiveArrayOptions(field)"
								:value="getEffectiveSelectedArrayOptions(field)"
								:multiple="true"
								:clearable="true"
								:disabled="field.readOnly"
								:loading="isFieldLoading(field)"
								:filterable="!isAsyncItemsEnum(field)"
								@input="onEffectiveMultiSelectChange(field, $event)"
								@search="isAsyncItemsEnum(field) ? onAsyncSearch(field, $event) : undefined">
								<template
									v-if="$scopedSlots['field-' + field.key + '-option']"
									#option="optionProps">
									<slot :name="'field-' + field.key + '-option'" v-bind="optionProps" />
								</template>
								<template
									v-if="$scopedSlots['field-' + field.key + '-selected-option']"
									#selected-option="optionProps">
									<slot :name="'field-' + field.key + '-selected-option'" v-bind="optionProps" />
								</template>
							</NcSelect>
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- Tags (array, freeform, supports async suggestions) -->
						<div v-else-if="field.widget === 'tags'" class="cn-form-dialog__select-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<!-- TODO: restore `:options` to `asyncState[field.key]?.options` once on Vue 3 (buble doesn't support optional chaining) -->
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:value="formData[field.key] || []"
								:options="isFieldAsync(field) ? ((asyncState[field.key] && asyncState[field.key].options) || []) : []"
								:multiple="true"
								:taggable="true"
								:clearable="true"
								:disabled="field.readOnly"
								:loading="isFieldLoading(field)"
								:filterable="!isFieldAsync(field)"
								@input="updateField(field.key, $event)"
								@search="isFieldAsync(field) ? onAsyncSearch(field, $event) : undefined">
								<template
									v-if="$scopedSlots['field-' + field.key + '-option']"
									#option="optionProps">
									<slot :name="'field-' + field.key + '-option'" v-bind="optionProps" />
								</template>
								<template
									v-if="$scopedSlots['field-' + field.key + '-selected-option']"
									#selected-option="optionProps">
									<slot :name="'field-' + field.key + '-selected-option'" v-bind="optionProps" />
								</template>
							</NcSelect>
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- Checkbox / Switch (boolean) -->
						<NcCheckboxRadioSwitch
							v-else-if="field.widget === 'checkbox'"
							:checked="!!formData[field.key]"
							:disabled="field.readOnly"
							type="switch"
							@update:checked="value => updateField(field.key, value)">
							{{ field.label }}{{ field.required ? ' *' : '' }}
						</NcCheckboxRadioSwitch>

						<!-- Date -->
						<NcTextField
							v-else-if="field.widget === 'date'"
							:label="field.label + (field.required ? ' *' : '')"
							:value="formData[field.key] || ''"
							:helper-text="errors[field.key] || field.description"
							:error="!!errors[field.key]"
							type="date"
							:disabled="field.readOnly"
							@update:value="value => updateField(field.key, value)" />

						<!-- Datetime -->
						<NcTextField
							v-else-if="field.widget === 'datetime'"
							:label="field.label + (field.required ? ' *' : '')"
							:value="formData[field.key] || ''"
							:helper-text="errors[field.key] || field.description"
							:error="!!errors[field.key]"
							type="datetime-local"
							:disabled="field.readOnly"
							@update:value="value => updateField(field.key, value)" />

						<!-- Fallback: text input -->
						<NcTextField
							v-else
							:label="field.label + (field.required ? ' *' : '')"
							:value="formData[field.key] != null ? String(formData[field.key]) : ''"
							:helper-text="errors[field.key] || field.description"
							:error="!!errors[field.key]"
							:disabled="field.readOnly"
							:placeholder="field.description"
							@update:value="value => updateField(field.key, value)" />
					</template>
				</div>

				<slot name="after-fields" />
			</template>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				type="primary"
				:disabled="loading || !requiredFieldsFilled"
				@click="executeConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<Plus v-else-if="isCreateMode" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ resolvedConfirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon, NcTextField, NcSelect, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import { fieldsFromSchema } from '../../utils/schema.js'

/**
 * CnFormDialog — Create/edit dialog with auto-generated form from schema.
 *
 * When `item` is null, operates in create mode. When `item` is provided,
 * operates in edit mode. Auto-generates form fields from schema using
 * `fieldsFromSchema()`, but supports slot overrides at three levels:
 *
 * - `#form` — Replace the entire form content
 * - `#field-{key}` — Replace a single auto-generated field
 * - `#field-{key}-option` — Customize dropdown option rendering for a select/multiselect/tags field
 * - `#field-{key}-selected-option` — Customize selected option display for a select/multiselect/tags field
 * - `#before-fields` / `#after-fields` — Inject content around fields
 *
 * ## Async select support
 *
 * Select, multiselect, and tags fields support async options by setting `field.enum`
 * (or `field.items.enum` for multiselect) to an async function instead of a static array:
 *
 * ```js
 * { key: 'org', widget: 'select', enum: async (query) => fetchOrgs(query) }
 * ```
 *
 * The function receives the search query and must return an array of option objects
 * (each must have a `label` property for default display). Options are loaded on mount
 * (with empty query) and on each search input (debounced, default 300ms, configurable
 * via `field.debounce`). Async selects store the full option object in formData.
 *
 * The dialog does NOT perform the save itself — it emits a `confirm` event
 * with the form data. The parent performs the actual API call and calls
 * `setResult()` via a ref.
 *
 * @event confirm Emitted when the user confirms the form. Payload: formData object (includes `id` in edit mode).
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 *
 * @example
 * <CnFormDialog
 *   v-if="showFormDialog"
 *   ref="formDialog"
 *   :schema="schema"
 *   :item="editItem"
 *   @confirm="onFormConfirm"
 *   @close="showFormDialog = false" />
 *
 * // In methods:
 * async onFormConfirm(formData) {
 *   try {
 *     if (formData.id) {
 *       await store.updateItem(formData.id, formData)
 *     } else {
 *       await store.createItem(formData)
 *     }
 *     this.$refs.formDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.formDialog.setResult({ error: e.message })
 *   }
 * }
 *
 * @example <caption>Async select with custom option rendering</caption>
 * <CnFormDialog :fields="[{
 *   key: 'organisation',
 *   widget: 'select',
 *   label: 'Organisation',
 *   required: true,
 *   enum: async (query) => {
 *     const results = await store.search(query)
 *     return results.map(o => ({ label: o.name, id: o.uuid, ...o }))
 *   },
 *   debounce: 500,
 * }]" @confirm="onConfirm">
 *   <template #field-organisation-option="{ name, description }">
 *     <strong>{{ name }}</strong>
 *     <p>{{ description }}</p>
 *   </template>
 *   <template #field-organisation-selected-option="{ name }">
 *     {{ name }}
 *   </template>
 * </CnFormDialog>
 */
export default {
	name: 'CnFormDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcTextField,
		NcSelect,
		NcCheckboxRadioSwitch,
		Plus,
		ContentSaveOutline,
	},

	props: {
		/** Schema for auto-generating fields. Either schema or fields must be provided. */
		schema: {
			type: Object,
			default: null,
		},
		/** Existing item for edit mode. Pass null for create mode. */
		item: {
			type: Object,
			default: null,
		},
		/** Dialog title. Defaults to "Create {schema.title}" or "Edit {schema.title}". */
		dialogTitle: {
			type: String,
			default: '',
		},
		/** Manual field definitions. Overrides schema-generated fields when provided. */
		fields: {
			type: Array,
			default: null,
		},
		/** Field keys to exclude from auto-generated form */
		excludeFields: {
			type: Array,
			default: () => [],
		},
		/** Field keys to include (whitelist mode) */
		includeFields: {
			type: Array,
			default: null,
		},
		/** Per-field overrides passed to fieldsFromSchema */
		fieldOverrides: {
			type: Object,
			default: () => ({}),
		},
		/** Which field is the "name" (used in result messages) */
		nameField: {
			type: String,
			default: 'title',
		},
		/** NcDialog size */
		size: {
			type: String,
			default: 'normal',
		},
		/** Success message. Defaults to "Item saved successfully." */
		successText: {
			type: String,
			default: '',
		},
		cancelLabel: { type: String, default: 'Cancel' },
		closeLabel: { type: String, default: 'Close' },
		/** Confirm button label. Defaults to "Create" or "Save". */
		confirmLabel: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			formData: {},
			errors: {},
			loading: false,
			result: null,
			closeTimeout: null,
			/** Per-field async state: { [fieldKey]: { options: [], loading: false, searchTimeout: null } } */
			asyncState: {},
		}
	},

	computed: {
		isCreateMode() {
			return !this.item
		},

		schemaTitle() {
			return (this.schema && this.schema.title) || 'Item'
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

		/** Whether all required fields have a non-empty value */
		requiredFieldsFilled() {
			return this.resolvedFields
				.filter((f) => f.required)
				.every((f) => {
					const val = this.formData[f.key]
					if (val === null || val === undefined || val === '') return false
					if (Array.isArray(val) && val.length === 0) return false
					return true
				})
		},

		resolvedFields() {
			// Manual fields take priority
			if (this.fields) return this.fields

			// Auto-generate from schema
			return fieldsFromSchema(this.schema, {
				exclude: this.excludeFields,
				include: this.includeFields,
				overrides: this.fieldOverrides,
			})
		},
	},

	watch: {
		item: {
			immediate: true,
			handler(newItem) {
				this.initFormData(newItem)
			},
		},
	},

	beforeDestroy() {
		for (const state of Object.values(this.asyncState)) {
			if (state.searchTimeout) clearTimeout(state.searchTimeout)
		}
		if (this.closeTimeout) clearTimeout(this.closeTimeout)
	},

	methods: {
		initFormData(item) {
			if (item) {
				// Edit mode: clone item data
				this.formData = JSON.parse(JSON.stringify(item))
			} else {
				// Create mode: initialize with field defaults
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
			this.errors = {}
			this.initAsyncFields()
		},

		updateField(key, value) {
			this.$set(this.formData, key, value)
			// Clear error when field is edited
			if (this.errors[key]) {
				this.$delete(this.errors, key)
			}
		},

		getEnumOptions(field) {
			if (!field.enum) return []
			const labels = field.enumLabels || {}
			return field.enum.map((val) => ({
				id: val,
				label: labels[val] || String(val),
			}))
		},

		getSelectedEnumOption(field) {
			const val = this.formData[field.key]
			if (val === null || val === undefined) return null
			const labels = field.enumLabels || {}
			return { id: val, label: labels[val] || String(val) }
		},

		onSelectChange(key, option) {
			this.updateField(key, option ? option.id : null)
		},

		getArrayEnumOptions(field) {
			if (!field.items || !field.items.enum) return []
			return field.items.enum.map((val) => ({
				id: val,
				label: String(val),
			}))
		},

		getSelectedArrayOptions(field) {
			const val = this.formData[field.key]
			if (!Array.isArray(val)) return []
			return val.map((v) => ({ id: v, label: String(v) }))
		},

		onMultiSelectChange(key, options) {
			this.updateField(key, (options || []).map((o) => o.id))
		},

		/**
		 * Check if a field has an async enum (function instead of static array).
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isAsyncEnum(field) {
			return typeof field.enum === 'function'
		},

		/**
		 * Check if an array field has an async items enum.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isAsyncItemsEnum(field) {
			return !!(field.items && typeof field.items.enum === 'function')
		},

		/**
		 * Initialize async state for all async fields and trigger initial load.
		 */
		initAsyncFields() {
			// Clean up existing timeouts
			for (const state of Object.values(this.asyncState)) {
				if (state.searchTimeout) clearTimeout(state.searchTimeout)
			}

			const newState = {}
			for (const field of this.resolvedFields) {
				if (this.isAsyncEnum(field) || this.isAsyncItemsEnum(field)) {
					newState[field.key] = { options: [], loading: false, searchTimeout: null }
				}
			}
			this.asyncState = newState

			// Trigger initial load for each async field
			this.$nextTick(() => {
				for (const field of this.resolvedFields) {
					if (this.isAsyncEnum(field) || this.isAsyncItemsEnum(field)) {
						this.loadAsyncOptions(field, '')
					}
				}
			})
		},

		/**
		 * Load async options for a field by calling its enum function.
		 *
		 * @param {object} field The field definition
		 * @param {string} query Search query
		 */
		async loadAsyncOptions(field, query) {
			const state = this.asyncState[field.key]
			if (!state) return

			this.$set(state, 'loading', true)

			try {
				const enumFn = this.isAsyncEnum(field) ? field.enum : field.items.enum
				const results = await enumFn(query)
				this.$set(state, 'options', Array.isArray(results) ? results : [])
			} catch (err) {
				console.error(`CnFormDialog: async enum error for field "${field.key}":`, err)
				this.$set(state, 'options', [])
			} finally {
				this.$set(state, 'loading', false)
			}
		},

		/**
		 * Handle search input on an async select with debounce.
		 *
		 * @param {object} field The field definition
		 * @param {string} query Search query
		 */
		onAsyncSearch(field, query) {
			const state = this.asyncState[field.key]
			if (!state) return

			if (state.searchTimeout) {
				clearTimeout(state.searchTimeout)
			}

			const debounceMs = field.debounce || 300

			state.searchTimeout = setTimeout(() => {
				this.loadAsyncOptions(field, query || '')
			}, debounceMs)
		},

		/**
		 * Get the effective options for a select field (async or static).
		 *
		 * @param {object} field The field definition
		 * @return {Array}
		 */
		getEffectiveOptions(field) {
			if (this.isAsyncEnum(field)) {
				// TODO: restore to `this.asyncState[field.key]?.options || []` once on Vue 3 (buble doesn't support optional chaining)
				return (this.asyncState[field.key] && this.asyncState[field.key].options) || []
			}
			return this.getEnumOptions(field)
		},

		/**
		 * Get the effective selected value for a select field (async or static).
		 *
		 * @param {object} field The field definition
		 * @return {object|null}
		 */
		getEffectiveSelectedOption(field) {
			if (this.isAsyncEnum(field)) {
				// For async fields, formData stores the full option object
				return this.formData[field.key] || null
			}
			return this.getSelectedEnumOption(field)
		},

		/**
		 * Handle select change for both async and static fields.
		 *
		 * @param {object} field The field definition
		 * @param {object|null} option The selected option
		 */
		onEffectiveSelectChange(field, option) {
			if (this.isAsyncEnum(field)) {
				// Store full option object for async selects
				this.updateField(field.key, option || null)
			} else {
				this.onSelectChange(field.key, option)
			}
		},

		/**
		 * Get effective options for a multiselect field (async or static).
		 *
		 * @param {object} field The field definition
		 * @return {Array}
		 */
		getEffectiveArrayOptions(field) {
			if (this.isAsyncItemsEnum(field)) {
				// TODO: restore to `this.asyncState[field.key]?.options || []` once on Vue 3 (buble doesn't support optional chaining)
				return (this.asyncState[field.key] && this.asyncState[field.key].options) || []
			}
			return this.getArrayEnumOptions(field)
		},

		/**
		 * Get effective selected values for a multiselect field (async or static).
		 *
		 * @param {object} field The field definition
		 * @return {Array}
		 */
		getEffectiveSelectedArrayOptions(field) {
			if (this.isAsyncItemsEnum(field)) {
				// For async fields, formData stores array of full option objects
				return this.formData[field.key] || []
			}
			return this.getSelectedArrayOptions(field)
		},

		/**
		 * Handle multiselect change for both async and static fields.
		 *
		 * @param {object} field The field definition
		 * @param {Array} options The selected options
		 */
		onEffectiveMultiSelectChange(field, options) {
			if (this.isAsyncItemsEnum(field)) {
				// Store full option objects for async multiselect
				this.updateField(field.key, options || [])
			} else {
				this.onMultiSelectChange(field.key, options)
			}
		},

		/**
		 * Whether a field's async options are currently loading.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isFieldLoading(field) {
			// TODO: restore to `this.asyncState[field.key]?.loading || false` once on Vue 3 (buble doesn't support optional chaining)
			return (this.asyncState[field.key] && this.asyncState[field.key].loading) || false
		},

		/**
		 * Whether a field has any async behavior (enum or items.enum is a function).
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isFieldAsync(field) {
			return this.isAsyncEnum(field) || this.isAsyncItemsEnum(field)
		},

		/**
		 * Run client-side validation on all form fields.
		 * Checks required, minLength, maxLength, pattern, minimum, maximum.
		 *
		 * @return {boolean} True if all fields pass validation
		 * @public
		 */
		validate() {
			const newErrors = {}
			for (const field of this.resolvedFields) {
				const value = this.formData[field.key]

				// Required check
				if (field.required) {
					if (value === null || value === undefined || value === '') {
						newErrors[field.key] = `${field.label} is required.`
						continue
					}
					if (Array.isArray(value) && value.length === 0) {
						newErrors[field.key] = `${field.label} is required.`
						continue
					}
				}

				// Skip further validation if empty and not required
				if (value === null || value === undefined || value === '') continue

				const v = field.validation || {}

				// String length checks
				if (typeof value === 'string') {
					if (v.minLength !== undefined && value.length < v.minLength) {
						newErrors[field.key] = `Minimum ${v.minLength} characters.`
					} else if (v.maxLength !== undefined && value.length > v.maxLength) {
						newErrors[field.key] = `Maximum ${v.maxLength} characters.`
					} else if (v.pattern !== undefined) {
						try {
							if (!new RegExp(v.pattern).test(value)) {
								newErrors[field.key] = 'Invalid format.'
							}
						// TODO: restore to `catch {` (optional catch binding) once on Vue 3 (buble doesn't support it)
						} catch (e) {
							// Ignore invalid regex patterns
						}
					}
				}

				// Number range checks
				if (typeof value === 'number') {
					if (v.minimum !== undefined && value < v.minimum) {
						newErrors[field.key] = `Minimum value is ${v.minimum}.`
					} else if (v.maximum !== undefined && value > v.maximum) {
						newErrors[field.key] = `Maximum value is ${v.maximum}.`
					}
				}
			}

			this.errors = newErrors
			return Object.keys(newErrors).length === 0
		},

		executeConfirm() {
			if (!this.validate()) return

			this.loading = true
			/**
			 * @event confirm Emitted when the user confirms the form.
			 * Payload: form data object. Includes `id` when editing.
			 */
			this.$emit('confirm', { ...this.formData })
		},

		/**
		 * Set the result of the save operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData
			if (resultData.success) {
				this.closeTimeout = setTimeout(() => {
					this.$emit('close')
				}, 2000)
			}
		},

		/**
		 * Set per-field validation errors from the server. Call this from
		 * the parent when the API returns validation errors.
		 *
		 * @param {object} fieldErrors Object keyed by field key with error messages
		 * @public
		 */
		setValidationErrors(fieldErrors) {
			this.loading = false
			this.errors = { ...this.errors, ...fieldErrors }
		},
	},
}
</script>

<style scoped>
.cn-form-dialog__form {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-form-dialog__field {
	margin-bottom: 8px;
}

.cn-form-dialog__textarea-wrapper,
.cn-form-dialog__select-wrapper {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-form-dialog__label {
	font-weight: 600;
	font-size: 0.9em;
	color: var(--color-main-text);
}

.cn-form-dialog__textarea {
	width: 100%;
	min-height: 80px;
	padding: 8px;
	border: 2px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-large);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
	font-family: inherit;
	font-size: inherit;
	resize: vertical;
}

.cn-form-dialog__textarea:focus {
	border-color: var(--color-primary-element);
	outline: none;
}

.cn-form-dialog__textarea:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.cn-form-dialog__helper {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-form-dialog__helper--error {
	color: var(--color-error);
}
</style>
