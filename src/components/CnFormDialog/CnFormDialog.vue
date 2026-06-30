<template>
	<NcDialog
		:name="resolvedTitle"
		:size="size"
		:no-close="loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null"
			class="cn-form-dialog__result"
			data-testid="cn-modal"
			data-testid-modal="cn-form-dialog"
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
			class="cn-form-dialog__form"
			data-testid="cn-modal"
			data-testid-modal="cn-form-dialog"
			data-testid-phase="form">
			<!-- Form-level error (e.g. server validation) — keeps the form visible so the user can fix the data -->
			<NcNoteCard v-if="formError" type="error" data-testid="cn-form-dialog-error">
				{{ formError }}
			</NcNoteCard>

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
					v-for="field in visibleFields"
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

					<!-- referenceType (AD-18): render the integration's
					     single-entity widget instead of a plain input. -->
					<component
						:is="resolveReferenceWidget(field)"
						v-else-if="resolveReferenceWidget(field)"
						v-bind="referenceWidgetProps(field)"
						@input="value => updateField(field.key, value)" />

					<!-- Auto-generated field -->
					<template v-else>
						<!-- Text / Email / URL -->
						<NcTextField
							v-if="field.widget === 'text' || field.widget === 'email' || field.widget === 'url'"
							:label="field.label + (field.required ? ' *' : '')"
							:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
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
							:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
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
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:input-label="field.label + (field.required ? ' *' : '')"
								:options="getEffectiveOptions(field)"
								:model-value="getEffectiveSelectedOption(field)"
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
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:input-label="field.label + (field.required ? ' *' : '')"
								:options="getEffectiveArrayOptions(field)"
								:model-value="getEffectiveSelectedArrayOptions(field)"
								:multiple="true"
								:keep-open="true"
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
							<!-- TODO: restore `:options` to `asyncState[field.key]?.options` once on Vue 3 (buble doesn't support optional chaining) -->
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:input-label="field.label + (field.required ? ' *' : '')"
								:model-value="formData[field.key] || []"
								:options="isFieldAsync(field) ? ((asyncState[field.key] && asyncState[field.key].options) || []) : []"
								:multiple="true"
								:keep-open="true"
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
							:model-value="!!formData[field.key]"
							:disabled="field.readOnly"
							type="switch"
							@update:model-value="value => updateField(field.key, value)">
							{{ field.label }}{{ field.required ? ' *' : '' }}
						</NcCheckboxRadioSwitch>

						<!-- Date / Datetime (NcTextField's type validator rejects
						     'date'/'datetime-local', so use NcDateTimePickerNative) -->
						<div
							v-else-if="field.widget === 'date' || field.widget === 'datetime'"
							class="cn-form-dialog__select-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<NcDateTimePickerNative
								:id="'cn-form-' + field.key"
								:type="field.widget === 'datetime' ? 'datetime-local' : 'date'"
								:label="field.label"
								:hide-label="true"
								:model-value="dateValueFor(field)"
								:disabled="field.readOnly"
								@update:model-value="date => onDateFieldInput(field, date)" />
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- JSON (type: 'object'|'array'|... with widget: 'json'): parses on input, stores parsed value in formData -->
						<div v-else-if="field.widget === 'json'" class="cn-form-dialog__json-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<CnJsonViewer
								:value="jsonStringFor(field)"
								language="json"
								:read-only="field.readOnly"
								:error-text="jsonErrors[field.key] || ''"
								@update:value="value => onJsonFieldInput(field, value)" />
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- Code (freeform editor, stored as raw string; optional `field.language` chooses highlighting) -->
						<div v-else-if="field.widget === 'code'" class="cn-form-dialog__json-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<CnJsonViewer
								:value="formData[field.key] != null ? String(formData[field.key]) : ''"
								:language="field.language || 'auto'"
								:read-only="field.readOnly"
								@update:value="value => updateField(field.key, value)" />
							<span
								v-if="errors[field.key] || field.description"
								class="cn-form-dialog__helper"
								:class="{ 'cn-form-dialog__helper--error': errors[field.key] }">
								{{ errors[field.key] || field.description }}
							</span>
						</div>

						<!-- Fallback: text input -->
						<NcTextField
							v-else
							:label="field.label + (field.required ? ' *' : '')"
							:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
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
				variant="primary"
				:disabled="loading || !requiredFieldsFilled || !jsonFieldsValid"
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDateTimePickerNative, NcDialog, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnJsonViewer from '../CnJsonViewer/CnJsonViewer.vue'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { fieldsFromSchema } from '../../utils/schema.js'
import { shouldShow } from '../../utils/fieldCondition.js'
import { TENANT_CONTEXT_KEY } from '../../composables/useTenantContext.js'

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
 * ## OpenRegister object references (`$ref`)
 *
 * A schema property that is an object reference renders as a searchable
 * dropdown of the referenced objects instead of a free-text UUID box:
 *
 * - `{ type: 'string', format: 'uuid', $ref: '<schema-slug>' }` → single-select
 * - `{ type: 'array', items: { $ref: '<schema-slug>' } }` → multi-select
 *
 * `fieldsFromSchema` records the reference on the field as
 * `field.reference = { schema, multiple }`. Pass the `register` prop so the
 * dialog can fetch the referenced objects (`GET /api/objects/{register}/{schema}`)
 * — each is mapped to `{ label: <human name>, value: <uuid> }`. The chosen
 * value stored in formData is the UUID (single) or array of UUIDs (multiple),
 * NOT the full object. In edit mode the stored UUID is resolved to its label
 * so the current selection displays. When `register` is empty the field falls
 * back to a plain text input.
 *
 * ## JSON / code fields
 *
 * Two widgets render a CnJsonViewer-powered editor:
 *
 * - `widget: 'json'` — Parses on input. formData holds the parsed value (object,
 *   array, number, string, boolean, or `null` for empty). Invalid JSON displays an
 *   inline error and blocks the confirm button until fixed. Pair with `type: 'object'`
 *   (or any type) to opt a property out of the default object-filter in `fieldsFromSchema`.
 * - `widget: 'code'` — Stores the raw string. Optional `field.language` chooses
 *   syntax highlighting (`'json'|'xml'|'html'|'text'|'auto'`, default `'auto'`).
 *
 * The dialog does NOT perform the save itself — it emits a `confirm` event
 * with the form data. The parent performs the actual API call and calls
 * `setResult()` via a ref.
 *
 * @event confirm Emitted when the user confirms the form. Payload: formData object (includes `id` in edit mode).
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 *
 * ```vue
 * <CnFormDialog
 *   v-if="showFormDialog"
 *   ref="formDialog"
 *   :schema="schema"
 *   :item="editItem"
 *   @confirm="onFormConfirm"
 *   @close="showFormDialog = false" />
 * ```
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
 * <caption>Async select with custom option rendering</caption>
 * ```vue
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
 * ```
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
		NcDateTimePickerNative,
		NcCheckboxRadioSwitch,
		CnJsonViewer,
		Plus,
		ContentSaveOutline,
	},

	inject: {
		_cnTenantContext: {
			from: TENANT_CONTEXT_KEY,
			default: null,
		},
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

		/**
		 * Register slug to resolve OpenRegister object references against.
		 *
		 * A schema property that is an object reference (`$ref: '<schema-slug>'`,
		 * or `items.$ref` for an array) renders as a searchable dropdown of the
		 * referenced objects (label = human name, value = UUID) instead of a
		 * free-text UUID box. The `$ref` value is the referenced *schema* slug;
		 * this prop supplies the *register* the objects live in. When empty,
		 * reference fields fall back to a plain text input (no fetch attempted).
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
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

		/**
		 * Object context forwarded to integration single-entity
		 * widgets rendered for fields that declare a `referenceType`
		 * (AD-18): `{ register, schema, objectId }`. Optional.
		 *
		 * @type {object|null}
		 */
		referenceContext: {
			type: Object,
			default: null,
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

		/** Label for the cancel button */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Confirm button label. Defaults to "Create" or "Save". */
		confirmLabel: {
			type: String,
			default: '',
		},
	},

	setup() {
		// Pluggable integration registry — used to resolve fields that
		// declare `referenceType: '<integration-id>'` (AD-18) to the
		// integration's single-entity widget. Cheap when no such
		// fields exist.
		const { resolveWidget, getById } = useIntegrationRegistry()
		return {
			resolveRegistryWidget: resolveWidget,
			getRegistryIntegration: getById,
		}
	},

	data() {
		return {
			formData: {},
			errors: {},
			loading: false,
			result: null,
			/** Form-level error message (e.g. a server validation failure) shown above the fields without leaving the form phase. */
			formError: null,
			closeTimeout: null,
			/** Per-field async state: { [fieldKey]: { options: [], loading: false, searchTimeout: null } } */
			asyncState: {},
			/** Per-field editor string for `json` widgets (preserves input between keystrokes even while invalid) */
			jsonDrafts: {},
			/** Per-field parse-error messages for `json` widgets (blocks confirm) */
			jsonErrors: {},
			/**
			 * Resolved labels for `$ref` object-reference values, keyed by UUID:
			 * `{ [uuid]: '<human label>' }`. Populated as reference options load
			 * and when an edit-mode UUID is resolved by id, so the select shows
			 * the human name for the currently-stored UUID(s). The stored value
			 * itself always remains the UUID — this is display-only.
			 */
			referenceLabels: {},
			/** Field keys the user has actually edited this session (used to avoid re-validating untouched persisted server values) */
			touchedFields: {},
		}
	},

	computed: {
		isCreateMode() {
			return !this.item
		},

		schemaTitle() {
			return (this.schema && this.schema.title) || t('nextcloud-vue', 'Item')
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

		/** Whether all required fields have a non-empty value (hidden fields are skipped) */
		requiredFieldsFilled() {
			return this.visibleFields
				.filter((f) => f.required)
				.every((f) => {
					const val = this.formData[f.key]
					if (val === null || val === undefined || val === '') return false
					if (Array.isArray(val) && val.length === 0) return false
					return true
				})
		},

		/** Whether every `json` widget currently parses successfully */
		jsonFieldsValid() {
			return Object.keys(this.jsonErrors).every((k) => !this.jsonErrors[k])
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

		/**
		 * Fields filtered through their per-field `condition` / `visibleWhen`
		 * descriptor. Fields without a condition are always visible.
		 *
		 * The template iterates this computed instead of `resolvedFields`,
		 * so hidden fields don't render at all. A watcher (below) clears
		 * the form-data value for any field that transitions from visible
		 * to hidden, so stale state is never submitted.
		 *
		 * @return {object[]} The visible subset of `resolvedFields`.
		 */
		visibleFields() {
			return this.resolvedFields
				.filter((field) => shouldShow(field, this.formData))
				.map((field) => this.degradeUnresolvableReference(field))
		},
	},

	watch: {
		item: {
			immediate: true,
			handler(newItem) {
				this.initFormData(newItem)
			},
		},

		/**
		 * When a field transitions from visible to hidden, clear its
		 * form-data value so a stale (now-irrelevant) value isn't
		 * carried into the submitted payload. We diff key lists rather
		 * than mutating during the computed itself.
		 *
		 * @param {object[]} newFields The new visible field set.
		 * @param {object[]} oldFields The previous visible field set.
		 */
		visibleFields(newFields, oldFields) {
			if (!Array.isArray(oldFields)) return
			const newKeys = new Set(newFields.map((f) => f.key))
			for (const oldField of oldFields) {
				if (!newKeys.has(oldField.key) && Object.prototype.hasOwnProperty.call(this.formData, oldField.key)) {
					this.$delete(this.formData, oldField.key)
					if (Object.prototype.hasOwnProperty.call(this.errors, oldField.key)) {
						this.$delete(this.errors, oldField.key)
					}
					if (Object.prototype.hasOwnProperty.call(this.jsonErrors, oldField.key)) {
						this.$delete(this.jsonErrors, oldField.key)
					}
					if (Object.prototype.hasOwnProperty.call(this.jsonDrafts, oldField.key)) {
						this.$delete(this.jsonDrafts, oldField.key)
					}
				}
			}
		},
	},

	created() {
		// Non-reactive cache of built enum option lists, keyed by field key.
		// Kept off `data` so Vue doesn't make the option objects reactive —
		// stable identity is what lets NcSelect recognise the selected option.
		this._enumOptionCache = {}
	},

	beforeDestroy() {
		for (const state of Object.values(this.asyncState)) {
			if (state.searchTimeout) clearTimeout(state.searchTimeout)
		}
		if (this.closeTimeout) clearTimeout(this.closeTimeout)
	},

	methods: {
		/**
		 * Resolve a field's reference integration widget, if any.
		 * Returns the integration's single-entity widget component
		 * (AD-19 fallback to its main `widget`) when the field
		 * declares a `referenceType` that maps to a registered
		 * integration; null otherwise.
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {object|null} Vue component, or null.
		 */
		resolveReferenceWidget(field) {
			if (!field || typeof field.referenceType !== 'string' || field.referenceType === '') {
				return null
			}
			if (typeof this.getRegistryIntegration === 'function' && this.getRegistryIntegration(field.referenceType) === null) {
				return null
			}
			return this.resolveRegistryWidget(field.referenceType, 'single-entity')
		},

		/**
		 * Props passed to a reference integration widget: the current
		 * value, the rendering surface, and the object context (from
		 * the `referenceContext` prop).
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {object} Props object for the widget component.
		 */
		referenceWidgetProps(field) {
			return {
				surface: 'single-entity',
				value: this.formData[field.key],
				field,
				...(this.referenceContext || {}),
			}
		},

		initFormData(item) {
			if (item) {
				// Edit mode: clone item data, then normalise persisted
				// date/datetime values so an untouched field re-submits a
				// schema-valid value (the backend stores date-times
				// space-separated without a timezone, which would otherwise
				// fail the schema's `date-time` format on save).
				this.formData = JSON.parse(JSON.stringify(item))
				this.normalizePersistedDates()
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
					} else if (field.widget === 'code') {
						data[field.key] = ''
					} else {
						data[field.key] = null
					}
				}
				this.formData = data
			}
			// Multi-tenancy auto-fill (multi-tenancy-context REQ-MT-4).
			// When the schema declares an `organisation` field and the
			// active form data does NOT already carry a value for it,
			// stamp the active organisation UUID from the shared
			// tenant context. Explicit values in `item` win — they are
			// already in `formData` at this point so the guard below
			// is correct on both create and edit paths.
			this._autofillTenant()
			this.errors = {}
			this.formError = null
			this.jsonDrafts = {}
			this.jsonErrors = {}
			this.touchedFields = {}
			this.referenceLabels = {}
			this.initAsyncFields()
			this.resolveInitialReferenceLabels()
		},

		/**
		 * For each reference field that already holds a UUID (edit mode),
		 * resolve its label so the select shows the current selection's human
		 * name. Runs after the options load; `resolveReferenceLabel` is a no-op
		 * once the label is cached (so it doesn't re-fetch what the options
		 * load already populated).
		 */
		resolveInitialReferenceLabels() {
			for (const field of this.resolvedFields) {
				if (this.isReferenceField(field)) {
					const uuid = this.formData[field.key]
					if (uuid) this.resolveReferenceLabel(field, uuid)
				} else if (this.isReferenceArrayField(field)) {
					const uuids = this.formData[field.key]
					if (Array.isArray(uuids)) {
						for (const uuid of uuids) this.resolveReferenceLabel(field, uuid)
					}
				}
			}
		},

		/**
		 * Auto-fill the `organisation` field with the active tenant UUID
		 * when the schema declares such a field and no value is already
		 * set (explicit `item` data wins).
		 *
		 * Spec: multi-tenancy-context REQ-MT-4.
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

		/**
		 * Evaluate a field's conditional-visibility predicate (#327).
		 *
		 * A field is visible when it has no `condition`/`visibleWhen`, or when
		 * its predicate evaluates true against the current `formData`. The
		 * predicate references another field via `field` and one of the
		 * supported operators: `equals`, `notEquals`, `in`, `notIn`,
		 * `truthy`, `falsy`. An unrecognised predicate keeps the field visible
		 * and logs a warning (fail-open — better to show a field than hide it
		 * by accident).
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {boolean} Whether the field should be shown.
		 */
		fieldVisible(field) {
			const condition = field.condition || field.visibleWhen
			if (!condition || typeof condition !== 'object') return true

			const target = this.formData[condition.field]

			if (Object.hasOwn(condition, 'equals')) {
				return target === condition.equals
			}
			if (Object.hasOwn(condition, 'notEquals')) {
				return target !== condition.notEquals
			}
			if (Object.hasOwn(condition, 'in')) {
				return Array.isArray(condition.in) && condition.in.includes(target)
			}
			if (Object.hasOwn(condition, 'notIn')) {
				return !(Array.isArray(condition.notIn) && condition.notIn.includes(target))
			}
			if (Object.hasOwn(condition, 'truthy')) {
				return condition.truthy ? !!target : !target
			}
			if (Object.hasOwn(condition, 'falsy')) {
				return condition.falsy ? !target : !!target
			}

			// eslint-disable-next-line no-console
			console.warn(
				`[CnFormDialog] Field "${field.key}" has a condition with no recognised predicate; keeping it visible.`,
				condition,
			)
			return true
		},

		updateField(key, value) {
			this.$set(this.formData, key, value)
			this.$set(this.touchedFields, key, true)
			// Clear errors when a field is edited
			if (this.errors[key]) {
				this.$delete(this.errors, key)
			}
			this.formError = null
			// A field change may flip the visibility of conditional fields.
			// Drop the form-data of any field that just became hidden so a
			// stale value isn't submitted (#327).
			this.pruneHiddenFields()
		},

		/**
		 * Remove `formData` (and any error) for fields that are currently
		 * hidden by their conditional-visibility predicate (#327).
		 */
		pruneHiddenFields() {
			for (const field of this.resolvedFields) {
				if (!this.fieldVisible(field) && Object.hasOwn(this.formData, field.key)) {
					this.$delete(this.formData, field.key)
					if (this.errors[field.key]) {
						this.$delete(this.errors, field.key)
					}
				}
			}
		},

		/**
		 * Resolve the string shown in the CnJsonViewer for a `json`-widget field.
		 * Prefers the unparsed draft (so invalid typing isn't clobbered), falling
		 * back to a pretty-printed stringification of the parsed value in formData.
		 *
		 * @param {object} field Field definition.
		 * @return {string} JSON string for the editor.
		 */
		jsonStringFor(field) {
			if (Object.hasOwn(this.jsonDrafts, field.key)) {
				return this.jsonDrafts[field.key]
			}
			const value = this.formData[field.key]
			if (value === null || value === undefined) return ''
			try {
				return JSON.stringify(value, null, 2)
			} catch {
				return String(value)
			}
		},

		/**
		 * Handle input in a `json`-widget CnJsonViewer. Parses on the fly:
		 * on success, the parsed value lands in formData and any previous error
		 * is cleared; on failure, formData keeps its last-known-good value and
		 * `jsonErrors[key]` is set, which surfaces inline and disables confirm.
		 *
		 * @param {object} field Field definition.
		 * @param {string} newString Current editor content.
		 */
		onJsonFieldInput(field, newString) {
			this.$set(this.jsonDrafts, field.key, newString)
			const trimmed = (newString || '').trim()
			if (!trimmed) {
				this.updateField(field.key, null)
				this.$delete(this.jsonErrors, field.key)
				return
			}
			try {
				const parsed = JSON.parse(trimmed)
				this.updateField(field.key, parsed)
				this.$delete(this.jsonErrors, field.key)
			} catch (e) {
				this.$set(this.jsonErrors, field.key, t('nextcloud-vue', 'Invalid JSON: {msg}', { msg: e.message }))
			}
		},

		/**
		 * Parse a date/datetime field's stored string into a Date for
		 * NcDateTimePickerNative (which operates in local time). Returns
		 * null for empty/unparseable values.
		 *
		 * @param {object} field The field definition
		 * @return {Date|null}
		 */
		dateValueFor(field) {
			const raw = this.formData[field.key]
			if (!raw) return null
			// Accept both ISO ('2026-10-15T14:30:00Z') and OpenRegister's
			// space-separated persisted form ('2026-10-15 14:30:00'); the
			// optional trailing 'Z'/offset is ignored for the local-time picker.
			const parts = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
			if (parts) {
				return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4] || 0), Number(parts[5] || 0))
			}
			const fallback = new Date(raw)
			return isNaN(fallback.getTime()) ? null : fallback
		},

		/**
		 * Serialise a Date into the canonical string a date/datetime field
		 * stores and submits: 'YYYY-MM-DD' for `date`, and a full RFC 3339
		 * 'YYYY-MM-DDTHH:mm:ss±hh:mm' (local-offset, lossless) for `datetime`.
		 *
		 * The datetime form includes seconds and a timezone offset so it
		 * satisfies the JSON-Schema `date-time` format (ajv-formats requires
		 * an offset) — the backend would otherwise reject a bare
		 * 'YYYY-MM-DDTHH:mm' value on save.
		 *
		 * @param {string} widget The field widget ('date' | 'datetime').
		 * @param {Date} date A valid Date instance.
		 * @return {string} The serialised value.
		 */
		formatDateValue(widget, date) {
			const yyyy = String(date.getFullYear()).padStart(4, '0')
			const MM = String(date.getMonth() + 1).padStart(2, '0')
			const dd = String(date.getDate()).padStart(2, '0')
			if (widget !== 'datetime') {
				return `${yyyy}-${MM}-${dd}`
			}
			const hh = String(date.getHours()).padStart(2, '0')
			const mm = String(date.getMinutes()).padStart(2, '0')
			const ss = String(date.getSeconds()).padStart(2, '0')
			// Local timezone offset as ±hh:mm (getTimezoneOffset is minutes
			// behind UTC, so the sign is inverted).
			const offMin = -date.getTimezoneOffset()
			const sign = offMin >= 0 ? '+' : '-'
			const offAbs = Math.abs(offMin)
			const offH = String(Math.floor(offAbs / 60)).padStart(2, '0')
			const offM = String(offAbs % 60).padStart(2, '0')
			return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`
		},

		/**
		 * Convert the Date emitted by NcDateTimePickerNative back to the
		 * stored string format (see `formatDateValue`). Stores null when cleared.
		 *
		 * @param {object} field The field definition
		 * @param {Date|null} date The chosen date
		 */
		onDateFieldInput(field, date) {
			if (!(date instanceof Date) || isNaN(date.getTime())) {
				this.updateField(field.key, null)
				return
			}
			this.updateField(field.key, this.formatDateValue(field.widget, date))
		},

		/**
		 * Rewrite any persisted date/datetime field value in formData into
		 * the canonical, schema-valid string produced by `formatDateValue`.
		 * Runs once on edit-open so a field the user never touches still
		 * re-submits a value the schema's `date`/`date-time` format accepts.
		 * Leaves empty/unparseable values untouched.
		 */
		normalizePersistedDates() {
			for (const field of this.resolvedFields) {
				if (field.widget !== 'date' && field.widget !== 'datetime') continue
				const raw = this.formData[field.key]
				if (raw === null || raw === undefined || raw === '') continue
				const date = this.dateValueFor(field)
				if (date instanceof Date && !isNaN(date.getTime())) {
					this.$set(this.formData, field.key, this.formatDateValue(field.widget, date))
				}
			}
		},

		getEnumOptions(field) {
			if (!field.enum) return []
			// Cache the built option list per field so the same option object
			// references are reused across renders. NcSelect/vue-select match
			// the selected model against options by identity — returning fresh
			// objects each call left the selection unrecognised (the headless
			// "chip renders but value never commits" defect).
			const cached = this._enumOptionCache[field.key]
			if (cached && cached.enum === field.enum && cached.enumLabels === (field.enumLabels || null)) {
				return cached.options
			}
			const labels = field.enumLabels || {}
			const options = field.enum.map((val) => ({
				id: val,
				label: labels[val] || String(val),
			}))
			this._enumOptionCache[field.key] = { enum: field.enum, enumLabels: field.enumLabels || null, options }
			return options
		},

		getSelectedEnumOption(field) {
			const val = this.formData[field.key]
			if (val === null || val === undefined) return null
			// Return the SAME option object reference from the field's option
			// list so NcSelect/vue-select recognises it as selected (it matches
			// the model against options by identity). Returning a fresh
			// `{ id, label }` each render left the model unrecognised, which —
			// under headless Chromium — could drop the committed value and keep
			// the submit button disabled. Fall back to a constructed option for
			// values not present in the list.
			const options = this.getEnumOptions(field)
			const match = options.find((o) => o.id === val)
			if (match) return match
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
		 * Whether a field is a single-value OpenRegister object reference
		 * (`$ref`) we can resolve — i.e. it carries a `reference` descriptor,
		 * is not multi-value, and a `register` is available to fetch against.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isReferenceField(field) {
			return !!(field && field.reference && !field.reference.multiple && this.register)
		},

		/**
		 * Degrade a reference field whose reference can't be resolved (no
		 * `register` available) to a plain text input so it remains editable
		 * instead of rendering an empty, optionless dropdown. Non-reference
		 * fields and resolvable references are returned unchanged.
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {object} The (possibly downgraded) field.
		 */
		degradeUnresolvableReference(field) {
			if (field && field.reference && !this.register) {
				return { ...field, widget: 'text', reference: null }
			}
			return field
		},

		/**
		 * Whether a field is a multi-value OpenRegister object reference
		 * (`items.$ref`) we can resolve.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isReferenceArrayField(field) {
			return !!(field && field.reference && field.reference.multiple && this.register)
		},

		/**
		 * Check if a field has an async enum (function instead of static array).
		 * Object references (`$ref`) are treated as async so they reuse the
		 * async-select load/search/loading machinery.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isAsyncEnum(field) {
			return typeof field.enum === 'function' || this.isReferenceField(field)
		},

		/**
		 * Check if an array field has an async items enum. Multi-value object
		 * references (`items.$ref`) are treated as async multiselects.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isAsyncItemsEnum(field) {
			return !!(field.items && typeof field.items.enum === 'function') || this.isReferenceArrayField(field)
		},

		/**
		 * Resolve a human-readable label for an OpenRegister object, falling
		 * back through the common name fields to the UUID.
		 *
		 * @param {object} obj An OpenRegister object.
		 * @return {string} The display label.
		 */
		displayLabel(obj) {
			if (!obj || typeof obj !== 'object') return String(obj)
			return obj.title
				|| obj.name
				|| obj.naam
				|| obj.label
				|| obj.identifier
				|| (obj['@self'] && obj['@self'].name)
				|| obj.id
				|| ''
		},

		/**
		 * Fetch the options for a `$ref` reference field: the objects of the
		 * referenced schema in the form's register, mapped to
		 * `{ id: <uuid>, label: <human name> }`. Server-filters by the search
		 * term when present. Resolved labels are cached in `referenceLabels`
		 * so the select can display the current selection's name. Fails soft
		 * (returns `[]`) when no register is set or the fetch errors.
		 *
		 * @param {object} field The field definition (must carry `field.reference`).
		 * @param {string} query The NcSelect search term.
		 * @return {Promise<Array<{id: string, label: string}>>}
		 */
		/**
		 * Lazily resolve the generic OpenRegister object store. Acquired on
		 * demand (not in `setup()`) so mounting CnFormDialog without an active
		 * Pinia — e.g. forms with no reference fields, or unit tests — never
		 * fails. Returns null when no Pinia is available.
		 *
		 * @return {object|null} The object store, or null.
		 */
		getObjectStore() {
			if (this._objectStore) return this._objectStore
			try {
				this._objectStore = useObjectStore()
				return this._objectStore
			} catch {
				return null
			}
		},

		async fetchReferenceOptions(field, query) {
			if (!this.register || !field.reference || !field.reference.schema) return []
			const store = this.getObjectStore()
			if (!store) return []
			try {
				const params = { _limit: 100 }
				if (query) params._search = query
				const slug = store.createObjectTypeSlug(this.register, field.reference.schema)
				if (!store.objectTypeRegistry[slug]) {
					store.registerObjectType(slug, field.reference.schema, this.register)
				}
				const results = await store.fetchCollection(slug, params)
				const list = Array.isArray(results) ? results : []
				const labels = {}
				const options = list
					.filter((obj) => obj && obj.id)
					.map((obj) => {
						const label = this.displayLabel(obj)
						labels[obj.id] = label
						return { id: obj.id, label }
					})
				if (Object.keys(labels).length > 0) {
					this.referenceLabels = { ...this.referenceLabels, ...labels }
				}
				return options
			} catch (err) {
				console.error(`CnFormDialog: reference fetch failed for field "${field.key}":`, err)
				return []
			}
		},

		/**
		 * Resolve a single reference UUID to its `{ id, label }` option,
		 * fetching the object by id when its label isn't cached yet (edit mode).
		 *
		 * @param {object} field The field definition.
		 * @param {string} uuid The stored UUID.
		 */
		async resolveReferenceLabel(field, uuid) {
			if (!uuid || this.referenceLabels[uuid] || !this.register || !field.reference) return
			const store = this.getObjectStore()
			if (!store) return
			try {
				const slug = store.createObjectTypeSlug(this.register, field.reference.schema)
				if (!store.objectTypeRegistry[slug]) {
					store.registerObjectType(slug, field.reference.schema, this.register)
				}
				const obj = await store.fetchObject(slug, uuid)
				if (obj && obj.id) {
					this.referenceLabels = { ...this.referenceLabels, [obj.id]: this.displayLabel(obj) }
				}
			} catch (err) {
				console.error(`CnFormDialog: reference label resolve failed for "${uuid}":`, err)
			}
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
				let results
				if (this.isReferenceField(field) || this.isReferenceArrayField(field)) {
					// OpenRegister object reference — fetch the referenced objects.
					results = await this.fetchReferenceOptions(field, query)
				} else {
					const enumFn = typeof field.enum === 'function' ? field.enum : field.items.enum
					results = await enumFn(query)
				}
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
			if (this.isReferenceField(field)) {
				// Reference fields store the UUID — resolve it to a display
				// option `{ id, label }` (label from the resolved-labels cache,
				// falling back to the UUID until it loads).
				const uuid = this.formData[field.key]
				if (uuid === null || uuid === undefined || uuid === '') return null
				return { id: uuid, label: this.referenceLabels[uuid] || String(uuid) }
			}
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
			if (this.isReferenceField(field)) {
				// Reference fields store the chosen object's UUID, not the
				// full option. Cache its label so the selection still displays.
				if (option && option.id) {
					this.referenceLabels = { ...this.referenceLabels, [option.id]: option.label || String(option.id) }
				}
				this.updateField(field.key, option ? option.id : null)
			} else if (this.isAsyncEnum(field)) {
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
			if (this.isReferenceArrayField(field)) {
				// Reference arrays store an array of UUIDs — resolve each to a
				// display option `{ id, label }`.
				const uuids = this.formData[field.key]
				if (!Array.isArray(uuids)) return []
				return uuids.map((uuid) => ({ id: uuid, label: this.referenceLabels[uuid] || String(uuid) }))
			}
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
			if (this.isReferenceArrayField(field)) {
				// Reference arrays store an array of UUIDs. Cache labels so the
				// chips still display the human names.
				const list = options || []
				const labels = {}
				for (const o of list) {
					if (o && o.id) labels[o.id] = o.label || String(o.id)
				}
				if (Object.keys(labels).length > 0) {
					this.referenceLabels = { ...this.referenceLabels, ...labels }
				}
				this.updateField(field.key, list.map((o) => o.id))
			} else if (this.isAsyncItemsEnum(field)) {
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
			for (const field of this.visibleFields) {
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

				// Whether the user actually edited this field this session.
				// Persisted server values that the user never touched are
				// trusted as-is — re-running format/pattern checks against
				// them would block editing an unrelated field (e.g. a stored
				// uuid relation or a normalised date-time).
				const touched = !!this.touchedFields[field.key]

				// String length / pattern checks. minLength/maxLength only
				// apply when they are real numbers — an explicit `null`
				// (or undefined) means "no limit", not a zero cap.
				if (typeof value === 'string') {
					if (typeof v.minLength === 'number' && value.length < v.minLength) {
						newErrors[field.key] = `Minimum ${v.minLength} characters.`
					} else if (typeof v.maxLength === 'number' && value.length > v.maxLength) {
						newErrors[field.key] = `Maximum ${v.maxLength} characters.`
					} else if (v.pattern !== undefined && v.pattern !== null && touched) {
						try {
							if (!new RegExp(v.pattern).test(value)) {
								newErrors[field.key] = 'Invalid format.'
							}
						// TODO: restore to `catch {` (optional catch binding) once on Vue 3 (buble doesn't support it)
						} catch (_e) {
							// Ignore invalid regex patterns
						}
					}
				}

				// Number range checks (numeric bounds only)
				if (typeof value === 'number') {
					if (typeof v.minimum === 'number' && value < v.minimum) {
						newErrors[field.key] = `Minimum value is ${v.minimum}.`
					} else if (typeof v.maximum === 'number' && value > v.maximum) {
						newErrors[field.key] = `Maximum value is ${v.maximum}.`
					}
				}
			}

			this.errors = newErrors
			return Object.keys(newErrors).length === 0
		},

		executeConfirm() {
			if (!this.validate()) return
			if (!this.jsonFieldsValid) return

			this.formError = null
			this.loading = true
			/**
			 * @event confirm Emitted when the user confirms the form.
			 * Payload: form data object. Includes `id` when editing.
			 */
			this.$emit('confirm', this.buildSubmitPayload())
		},

		/**
		 * Build the payload emitted on confirm. A shallow clone of formData
		 * with one normalisation: an empty-string value on a field that
		 * carries a `format` or `pattern` constraint is coerced to `null`.
		 * An empty string is not a valid `uuid` / `email` / `date-time` etc.,
		 * so re-submitting a persisted-but-blank constrained field as `''`
		 * would trip the backend's format validator; `null` (no value) does
		 * not. Plain unconstrained string fields are left as-is.
		 *
		 * @return {object} The payload to emit.
		 */
		buildSubmitPayload() {
			const payload = { ...this.formData }
			for (const field of this.resolvedFields) {
				if (payload[field.key] !== '') continue
				const v = field.validation || {}
				const hasFormatConstraint = !!field.format
					|| (v.pattern !== undefined && v.pattern !== null)
				if (hasFormatConstraint) {
					payload[field.key] = null
				}
			}
			return payload
		},

		/**
		 * Set the result of the save operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData - Result data to pass to the dialog
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
		 * Set validation errors from the server WITHOUT leaving the form phase,
		 * so the user can correct the data. Call this from the parent (instead
		 * of `setResult`) when the API returns a validation error.
		 *
		 * @param {object} [fieldErrors] Object keyed by field key with per-field error messages
		 * @param {string} [message] Form-level message shown in an error note above the fields
		 * @public
		 */
		setValidationErrors(fieldErrors = {}, message = null) {
			this.loading = false
			this.result = null
			this.errors = { ...this.errors, ...fieldErrors }
			this.formError = message
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
.cn-form-dialog__select-wrapper,
.cn-form-dialog__json-wrapper {
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
