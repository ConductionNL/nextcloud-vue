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
			:class="{ 'cn-form-dialog__form--two-column': columns === 2 }"
			data-testid="cn-modal"
			data-testid-modal="cn-form-dialog"
			data-testid-phase="form">
			<!-- Form-level error (e.g. server validation) — keeps the form visible so the user can fix the data -->
			<NcNoteCard v-if="formError" type="error" data-testid="cn-form-dialog-error">
				{{ formError }}
			</NcNoteCard>

			<!-- @slot form Replace the entire auto-generated form. -->
			<!-- @binding {object[]} fields The resolved, visible field definitions. -->
			<!-- @binding {object} form-data The live form values, keyed by field. -->
			<!-- @binding {object} errors The current validation errors, keyed by field. -->
			<!-- @binding {Function} update-field Write one field: `updateField(key, value)`. -->
			<slot
				v-if="$slots.form"
				name="form"
				:fields="resolvedFields"
				:form-data="formData"
				:errors="errors"
				:update-field="updateField" />

			<!-- Auto-generated form -->
			<template v-else>
				<!-- @slot before-fields Content above the first auto-generated field. Use it for introductory text or an input the schema does not describe. -->
				<slot name="before-fields" />

				<!-- `data-cn-field` is the only per-field identity this form
				     exposes to a test. Without it an assertion about a field can
				     only match on the label TEXT — which is the thing under test
				     the moment labels are translated, so the assertion passes by
				     construction in whichever language it was written in. -->
				<div
					v-for="field in visibleFields"
					:key="field.key"
					:data-cn-field="field.key"
					class="cn-form-dialog__field"
					:class="{ 'cn-form-dialog__field--wide': fieldSpansBothColumns(field) }">
					<!-- @slot field-{key} Replace one auto-generated field with your own control. -->
					<!-- @binding {object} field The field definition. -->
					<!-- @binding {*} value The field's current value. -->
					<!-- @binding {string} error The field's validation error, if any. -->
					<!-- @binding {Function} update-field Write the value: `updateField(key, value)`. -->
					<slot
						v-if="$slots['field-' + field.key]"
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

					<!-- referenceSemanticType (ADR-048): a field that declares a
					     canonical semantic-type URI whose provider schema is NOT
					     installed renders DISABLED with a mouse-over tooltip. When
					     a provider IS installed the field is transformed upstream
					     (applySemanticResolution → a `$ref` reference) so it flows
					     through the normal select branch below; only the
					     unresolved/loading case lands here. -->
					<div
						v-else-if="field.referenceSemanticType && !isSemanticResolved(field)"
						class="cn-form-dialog__semantic-unresolved"
						:title="semanticUnavailableText(field)">
						<NcTextField
							:label="field.label + (field.required ? ' *' : '')"
							:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
							:helper-text="isSemanticLoading(field) ? '' : semanticUnavailableText(field)"
							:disabled="true"
							:loading="isSemanticLoading(field)"
							:placeholder="field.description" />
					</div>

					<!-- Auto-generated field -->
					<template v-else>
						<!-- Text / Email / URL. The helper line lives outside the
						     input (rather than on `helper-text`) so an over-long
						     description can hang its info popover off it. -->
						<template v-if="field.widget === 'text' || field.widget === 'email' || field.widget === 'url'">
							<NcTextField
								:label="field.label + (field.required ? ' *' : '')"
								:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
								:error="!!errors[field.key]"
								:type="field.widget === 'email' ? 'email' : field.widget === 'url' ? 'url' : 'text'"
								:disabled="field.readOnly"
								:placeholder="field.description"
								@update:model-value="value => updateField(field.key, value)" />
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</template>

						<!-- Number -->
						<template v-else-if="field.widget === 'number'">
							<NcTextField
								:label="field.label + (field.required ? ' *' : '')"
								:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
								:error="!!errors[field.key]"
								type="number"
								:disabled="field.readOnly"
								:placeholder="field.description"
								@update:model-value="value => updateField(field.key, value !== '' ? Number(value) : null)" />
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</template>

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
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</div>

						<!-- Object reference with inline create (`x-allow-create`):
						     a select-OR-create picker over the referenced schema.
						     Checked before the plain select branch so create-enabled
						     references get CnResourceSelect; plain references keep the
						     read-only NcSelect below. -->
						<div
							v-else-if="isReferenceField(field) && field.allowCreate"
							class="cn-form-dialog__select-wrapper">
							<CnResourceSelect
								:input-id="'cn-form-' + field.key"
								:input-label="field.label + (field.required ? ' *' : '')"
								:register="referenceRegister(field)"
								:schema="field.reference.schema"
								:label-field="referenceLabelField(field)"
								:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
								:clearable="!field.required"
								@update:modelValue="value => onReferenceSelected(field, value)"
								@create="obj => onReferenceCreated(field, obj)" />
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</div>

						<!-- Enum toggle (`widget: "switch"` on a 2-value enum):
						     renders a switch mapping off→enum[0], on→last enum value. -->
						<NcCheckboxRadioSwitch
							v-else-if="field.widget === 'switch'"
							:model-value="isSwitchOn(field)"
							:disabled="field.readOnly"
							type="switch"
							@update:model-value="value => updateField(field.key, switchValueFor(field, value))">
							{{ field.label }}{{ field.required ? ' *' : '' }}
						</NcCheckboxRadioSwitch>

						<!-- Select (enum / $ref object reference / single Nextcloud user, supports async function).
						     A single Nextcloud-user field (`widget: "user"`) renders here too:
						     `:user-select="isUserField(field)"` flips this NcSelect into NC's native
						     user picker, and the async load/search/select machinery (getEffective*,
						     onAsyncSearch) resolves real users — mirroring how `user-multiselect`
						     shares the multiselect branch below. -->
						<div v-else-if="field.widget === 'select' || field.widget === 'user'" class="cn-form-dialog__select-wrapper">
							<NcSelect
								:input-id="'cn-form-' + field.key"
								:input-label="field.label + (field.required ? ' *' : '')"
								:options="getEffectiveOptions(field)"
								:model-value="getEffectiveSelectedOption(field)"
								:clearable="!field.required"
								:disabled="field.readOnly"
								:loading="isFieldLoading(field)"
								:filterable="!isAsyncEnum(field)"
								:user-select="isUserField(field)"
								@update:model-value="onEffectiveSelectChange(field, $event)"
								@search="isAsyncEnum(field) ? onAsyncSearch(field, $event) : undefined">
								<template
									v-if="$slots['field-' + field.key + '-option']"
									#option="optionProps">
									<!-- @slot field-{key}-option Render one dropdown option for a select, multiselect or tags field. -->
									<!-- @binding {object} option The option being rendered (`{ id, label }`). -->
									<slot :name="'field-' + field.key + '-option'" v-bind="optionProps" />
								</template>
								<template
									v-if="$slots['field-' + field.key + '-selected-option']"
									#selected-option="optionProps">
									<!-- @slot field-{key}-selected-option Render the chosen option of a select, multiselect or tags field. -->
									<!-- @binding {object} option The selected option (`{ id, label }`). -->
									<slot :name="'field-' + field.key + '-selected-option'" v-bind="optionProps" />
								</template>
							</NcSelect>
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</div>

						<!-- Multiselect (array enum items / $ref array / Nextcloud users, supports async function) -->
						<div v-else-if="field.widget === 'multiselect' || field.widget === 'user-multiselect'" class="cn-form-dialog__select-wrapper">
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
								@update:model-value="onEffectiveMultiSelectChange(field, $event)"
								@search="isAsyncItemsEnum(field) ? onAsyncSearch(field, $event) : undefined">
								<template
									v-if="$slots['field-' + field.key + '-option']"
									#option="optionProps">
									<slot :name="'field-' + field.key + '-option'" v-bind="optionProps" />
								</template>
								<template
									v-if="$slots['field-' + field.key + '-selected-option']"
									#selected-option="optionProps">
									<slot :name="'field-' + field.key + '-selected-option'" v-bind="optionProps" />
								</template>
							</NcSelect>
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
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
								@update:model-value="updateField(field.key, $event)"
								@search="isFieldAsync(field) ? onAsyncSearch(field, $event) : undefined">
								<template
									v-if="$slots['field-' + field.key + '-option']"
									#option="optionProps">
									<slot :name="'field-' + field.key + '-option'" v-bind="optionProps" />
								</template>
								<template
									v-if="$slots['field-' + field.key + '-selected-option']"
									#selected-option="optionProps">
									<slot :name="'field-' + field.key + '-selected-option'" v-bind="optionProps" />
								</template>
							</NcSelect>
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
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
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
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
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
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
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</div>

						<!-- Icon (widget: 'icon'): renders CnIconBrowser, forwarding the field's icon config.
						     `searchable` is gone — the browser always searches. -->
						<div v-else-if="field.widget === 'icon'" class="cn-form-dialog__icon-wrapper">
							<label :for="'cn-form-' + field.key" class="cn-form-dialog__label">
								{{ field.label }}{{ field.required ? ' *' : '' }}
							</label>
							<CnIconBrowser
								:value="formData[field.key] != null ? String(formData[field.key]) : null"
								:sources="field.iconSources || ['mdi']"
								:catalogues="field.catalogues || {}"
								:allow-custom-svg="!!field.allowCustomSvg"
								:clearable="!field.required"
								@input="value => updateField(field.key, value)" />
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</div>

						<!-- Fallback: text input -->
						<template v-else>
							<NcTextField
								:label="field.label + (field.required ? ' *' : '')"
								:model-value="formData[field.key] != null ? String(formData[field.key]) : ''"
								:error="!!errors[field.key]"
								:disabled="field.readOnly"
								:placeholder="field.description"
								@update:model-value="value => updateField(field.key, value)" />
							<CnFieldHelper
								:text="field.description"
								:more="field.descriptionLong"
								:error="errors[field.key]" />
						</template>
					</template>
				</div>

				<!-- The extra questions a chosen case type / product line asks
				     are fetched, so say they are coming. Silence here reads as
				     "this type has none", and the user submits an incomplete
				     form believing it was complete. -->
				<div v-if="dynamicLoading"
					class="cn-form-dialog__dynamic-loading"
					data-testid="cn-form-dialog-dynamic-loading">
					<NcLoadingIcon :size="20" />
					<span>{{ dynamicLoadingLabel }}</span>
				</div>

				<!-- @slot after-fields Content below the last auto-generated field. -->
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
import CnIconBrowser from '../CnIconBrowser/CnIconBrowser.vue'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import CnFieldHelper from '../CnFieldHelper/CnFieldHelper.vue'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { fieldsFromSchema } from '../../utils/schema.js'
import { searchNextcloudUsers, resolveNextcloudUser } from '../../utils/userAutocomplete.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { shouldShow } from '../../utils/fieldCondition.js'
import {
	extendsFormDeclarations,
	definitionQueryParams,
	prefillDeclarations,
	prefillValues,
	propertiesFromDefinitions,
	splitDynamicFormData,
	DYNAMIC_KEY_PREFIX,
} from '../../utils/dynamicProperties.js'
import { TENANT_CONTEXT_KEY } from '../../composables/useTenantContext.js'

/**
 * Widgets that take the full width of a two-column form.
 *
 * These are the multi-line ones: a textarea, the JSON editor and the code
 * editor are unusable in half a dialog. Every other widget in the template's
 * vocabulary (text, number, select, date, switch, checkbox and friends) is a
 * single line and pairs happily.
 *
 * @type {string[]}
 */
const WIDE_WIDGETS = ['textarea', 'json', 'code']

/**
 * OpenRegister semantic-type discovery endpoint (ADR-048). Resolves a
 * canonical semantic-type URI to the provider schema that implements it.
 * Returns HTTP 200 with `{ resolved, registerSlug, schemaSlug, appId }` even
 * when nothing implements the URI (`resolved: false`). The exact route path
 * is still being finalised on the OpenRegister side — this path is the small,
 * single point of truth; a 404 (route absent) degrades to `resolved: false`
 * (see `resolveSemanticReference`), never a crash.
 */
const SEMANTIC_RESOLVE_ENDPOINT = '/apps/openregister/api/schemas/resolve-by-implements'

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
 * ## Schema-driven pickers
 *
 * Three JSON-Schema property shapes auto-render richer widgets:
 *
 * - `{ format: 'user' }` → a Nextcloud-user picker (async-searches the core
 *   autocomplete endpoint; stores the chosen uid string).
 * - `{ format: 'uuid', $ref: '<schema>', 'x-allow-create': true }` → a single
 *   object reference that renders `CnResourceSelect` — pick an existing object
 *   OR create one inline from the typed term. Without `x-allow-create` a `$ref`
 *   stays a plain select of existing objects.
 * - `{ enum: ['no', 'yes'], widget: 'switch' }` → a toggle mapping off → the
 *   first enum value and on → the last enum value (keeps the stored value an
 *   enum string, so an enum-driven lifecycle is unaffected).
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
 * ## Nextcloud user references
 *
 * A schema property marked as a Nextcloud user renders as a searchable
 * dropdown of real Nextcloud users instead of a free-text box:
 *
 * - `{ type: 'string', referenceType: 'nextcloud-user' }` → single-select
 *   (`format: 'user'` / `'username'` also work as markers)
 * - `{ type: 'array', items: { referenceType: 'nextcloud-user' } }` → multi-select
 *
 * `fieldsFromSchema` tags the field as `field.userPicker = { multiple }`.
 * Users are loaded from the core autocomplete OCS endpoint (available to every
 * authenticated user), mapped to `{ label: <display name>, value: <uid> }`.
 * The value stored in formData is the UID string (single) or array of UIDs
 * (multiple) — never the display object. In edit mode the stored UID is
 * resolved to its display name so the current selection shows. Needs no
 * `register` prop. If the OCS call fails the picker fails soft (empty options;
 * the stored UID still shows).
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
 * ## Icon field
 *
 * - `widget: 'icon'` — Renders a `CnIconBrowser`. Optional field config forwards to
 *   the picker: `iconSources` (→ `sources`, default `['mdi']`), `catalogues`, and
 *   `allowCustomSvg`. (`searchable` is obsolete — the browser always searches.)
 *   formData holds the selected icon value (registry key, source value, URL, or
 *   raw SVG). The bundled NL-government sets are offered alongside the catalogues.
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
		CnIconBrowser,
		CnResourceSelect,
		CnFieldHelper,
		Plus,
		ContentSaveOutline,
	},

	inject: {
		_cnTenantContext: {
			from: TENANT_CONTEXT_KEY,
			default: null,
		},
		/**
		 * Consumer translation function, provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). Field
		 * labels/descriptions come from schema property titles, authored in
		 * English as the canonical source; the visible label is resolved
		 * through this function so it follows the user's language. Defaults to
		 * identity when used standalone (no CnAppRoot ancestor).
		 */
		cnTranslate: { default: () => (key) => key },
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

		/**
		 * Seed values for CREATE mode, keyed by field. Merged over the schema
		 * defaults when opening a new-item form. Use it to pre-link a child to
		 * its parent when adding from a detail page (e.g. `{ lead: '<uuid>' }`).
		 * @type {object}
		 */
		initialData: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Field keys rendered read-only (disabled) and immutable — typically the
		 * parent reference seeded via `initialData` so the user can't repoint a
		 * child away from the record it was created under.
		 * @type {string[]}
		 */
		lockedFields: {
			type: Array,
			default: () => [],
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

		/**
		 * How many columns the auto-generated fields flow into.
		 *
		 * `1` (the default) keeps every existing form exactly as it is. `2`
		 * pairs the fields into two columns, which is worth it once a form
		 * asks enough questions that the person has to scroll to see whether
		 * there are more. Pair it with `size="large"`, or the two columns are
		 * merely two narrow ones.
		 *
		 * A field whose widget needs the room (a textarea, a JSON editor)
		 * spans both columns regardless. Below 700px the layout collapses
		 * back to one column, so this is safe on a narrow screen.
		 */
		columns: {
			type: Number,
			default: 1,
			validator: (value) => value === 1 || value === 2,
		},

		/** Success message. Defaults to "Item saved successfully." */
		successText: {
			type: String,
			default: '',
		},

		/** Label for the cancel button */
		/**
		 * Text shown while the fields a chosen value brings with it are being
		 * fetched. The default is deliberately generic; a host that knows the
		 * domain can say what is actually loading ("Loading the questions for
		 * this case type.").
		 */
		dynamicLoadingLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading the fields this choice adds.'),
		},

		/** Label for the dismiss button while the form is still showing. */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Confirm button label. Defaults to "Create" or "Save". */
		confirmLabel: {
			type: String,
			default: '',
		},
	},

	emits: ['close', 'confirm'],

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
			/**
			 * Cross-app semantic-reference resolutions (ADR-048), keyed by the
			 * semantic-type URI: `{ [uri]: { status, resolved, registerSlug,
			 * schemaSlug, appId } }`. `status` is 'loading' | 'done'. Populated
			 * once per URI by `resolveSemanticReferences()` (called from
			 * `created()`), so the discovery endpoint is hit at most once per
			 * distinct URI, not per render.
			 */
			semanticResolutions: {},
			/** Field keys the user has actually edited this session (used to avoid re-validating untouched persisted server values) */
			touchedFields: {},
			/**
			 * Schema properties contributed by the record's own data rather
			 * than its schema — the extra questions a chosen case type (or
			 * product line, or segment) asks. Keyed by the same prefixed id
			 * the form data uses. Replaced wholesale whenever a driving value
			 * changes; `{}` while nothing is chosen. See utils/dynamicProperties.
			 */
			dynamicProperties: {},
			/** Prefixed keys among `dynamicProperties` that must be answered. */
			dynamicRequired: [],
			/**
			 * Which declaration each dynamic field came from, keyed by its
			 * prefixed key. A schema may declare more than one driving
			 * property, and their answers go to different value schemas — an
			 * answer that cannot name its own declaration would be written to
			 * all of them.
			 */
			dynamicOwners: {},
			/** Whether a definitions fetch is in flight (the fields are announced as loading rather than absent). */
			dynamicLoading: false,
			/**
			 * The driver signature the currently-loaded `dynamicProperties`
			 * belong to. A fetch that resolves after its driver already moved
			 * on is discarded against this, so a fast second pick cannot be
			 * overwritten by the first pick's slower response.
			 */
			dynamicToken: '',
			/**
			 * The prefill signature the most recent prefill ran for. A slower
			 * earlier fetch is discarded against this, the same way
			 * `dynamicToken` guards the definitions fetch.
			 */
			prefillToken: '',
		}
	},

	computed: {
		isCreateMode() {
			return !this.item
		},

		schemaTitle() {
			// Schema titles are authored in English as the canonical source, the
			// same as the property titles `fieldsFromSchema` translates — so the
			// heading of a Dutch form does not read "Edit Time entry".
			if (this.schema && this.schema.title) return this.cnTranslate(this.schema.title)
			return t('nextcloud-vue', 'Item')
		},

		resolvedTitle() {
			if (this.dialogTitle) return this.cnTranslate(this.dialogTitle)
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

		/**
		 * The schema's `x-openregister-extends-form` declarations — properties
		 * whose chosen value brings further fields with it.
		 *
		 * Empty for the overwhelming majority of schemas, which is what keeps
		 * the whole mechanism free: no declaration, no fetch, no watcher work.
		 *
		 * @return {Array<{key: string, config: object}>} The declarations.
		 */
		extendsDeclarations() {
			return this.fields ? [] : extendsFormDeclarations(this.schema)
		},

		/**
		 * A stable signature of every driving property's current value.
		 *
		 * Watched instead of the individual fields so one handler covers a
		 * schema with several declarations, and so re-selecting the same value
		 * does not re-fetch.
		 *
		 * @return {string} The signature ('' when nothing is chosen).
		 */
		dynamicDriverToken() {
			return this.extendsDeclarations
				.map(({ key }) => `${key}=${this.dynamicDriverValue(this.formData[key])}`)
				.join('&')
		},

		/**
		 * The schema's `x-openregister-prefill` declarations — properties
		 * whose chosen record answers OTHER fields of this same form.
		 *
		 * Create mode only. In edit mode a blank field is a decision someone
		 * already made about an existing record, and filling it because the
		 * case type has an opinion would rewrite that decision on open.
		 *
		 * @return {Array<{key: string, config: object}>} The declarations.
		 */
		prefillDecls() {
			if (this.fields || !this.isCreateMode) return []
			return prefillDeclarations(this.schema)
		},

		/**
		 * A stable signature of every prefilling property's current value.
		 *
		 * @return {string} The signature; changes drive a prefill.
		 */
		prefillDriverToken() {
			return this.prefillDecls
				.map(({ key }) => `${key}=${this.dynamicDriverValue(this.formData[key])}`)
				.join('&')
		},

		/**
		 * Fields derived from `dynamicProperties`, through the SAME engine the
		 * schema's own fields go through — so a definition gets its widget,
		 * enum labels, validation and description handling from one place
		 * rather than a parallel implementation that drifts.
		 *
		 * @return {object[]} The dynamic fields, ordered after the schema's own.
		 */
		dynamicFields() {
			if (Object.keys(this.dynamicProperties).length === 0) return []
			return fieldsFromSchema(
				{ properties: this.dynamicProperties, required: this.dynamicRequired },
				{ translate: this.cnTranslate },
			)
		},

		resolvedFields() {
			// Manual fields take priority
			const base = this.fields
				? this.fields
				: fieldsFromSchema(this.schema, {
					exclude: this.excludeFields,
					include: this.includeFields,
					overrides: this.fieldOverrides,
					translate: this.cnTranslate,
				}).concat(this.dynamicFields)

			// Render locked fields (parent references seeded via initialData) as
			// read-only so the disabled binding on every widget branch applies.
			if (!this.lockedFields.length) return base
			return base.map((field) => (
				this.lockedFields.includes(field.key)
					? { ...field, readOnly: true }
					: field
			))
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
				.map((field) => this.applySemanticResolution(field))
				.map((field) => this.degradeUnresolvableReference(field))
		},
	},

	watch: {
		/**
		 * Re-seed the form when the record changes — WITHOUT discarding
		 * edits the user has already made to the record now arriving.
		 *
		 * A host can bind `item` to a value that is not resolved yet:
		 * CnDetailPage binds it to `currentObject`, a read of the object
		 * store that is `null` until the page's own fetch lands. The dialog
		 * therefore opens over a record that has not arrived, renders every
		 * field blank (a null `item` is create mode), and re-seeds when the
		 * record shows up. Re-seeding wholesale at that point overwrites
		 * whatever was typed in between, so Save submits the PRISTINE record
		 * and the edit is lost with a 200 and no error anywhere.
		 *
		 * Seed from the record, then put the user's own values back on top:
		 * untouched fields take the record's value (a whole-object PUT must
		 * not blank them), touched fields keep what the user typed.
		 *
		 * @param {object|null} newItem The record now bound.
		 * @param {object|null} oldItem The record previously bound.
		 */
		item: {
			immediate: true,
			handler(newItem, oldItem) {
				// Scoped to the record the values were typed into. Swapping
				// the dialog to a DIFFERENT record starts from that record,
				// so an edit can never leak from one row onto another.
				const pending = this.isSameRecord(oldItem, newItem)
					? this.pendingUserEdits()
					: null
				this.initFormData(newItem)
				this.restoreUserEdits(pending)
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
		/**
		 * Load the fields a newly-chosen driving value brings with it.
		 *
		 * Immediate, because edit mode opens with the value already set and
		 * the stored answers are unreadable without their definitions.
		 *
		 * @param {string} token The new driver signature.
		 */
		dynamicDriverToken: {
			immediate: true,
			handler(token) {
				this.loadDynamicProperties(token)
			},
		},

		/**
		 * Prefill the fields the chosen record answers.
		 *
		 * NOT immediate, unlike the definitions watcher above. Immediate would
		 * fire once on open with an empty driver and, worse, would run against
		 * whatever `initialData` seeded — so a value a caller passed in
		 * deliberately could be treated as "empty enough" on the very first
		 * tick. Prefill is a response to a person choosing something.
		 *
		 * @param {string} token The new driver signature.
		 */
		prefillDriverToken(token) {
			this.applyPrefill(token)
		},

		visibleFields(newFields, oldFields) {
			if (!Array.isArray(oldFields)) return
			const newKeys = new Set(newFields.map((f) => f.key))
			for (const oldField of oldFields) {
				if (!newKeys.has(oldField.key) && Object.prototype.hasOwnProperty.call(this.formData, oldField.key)) {
					delete this.formData[oldField.key]
					if (Object.prototype.hasOwnProperty.call(this.errors, oldField.key)) {
						delete this.errors[oldField.key]
					}
					if (Object.prototype.hasOwnProperty.call(this.jsonErrors, oldField.key)) {
						delete this.jsonErrors[oldField.key]
					}
					if (Object.prototype.hasOwnProperty.call(this.jsonDrafts, oldField.key)) {
						delete this.jsonDrafts[oldField.key]
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
		// ADR-048: resolve any cross-app semantic-reference URIs once, up
		// front. Async — fields render disabled (loading) until each URI
		// resolves, then re-render as a picker (resolved) or disabled+tooltip
		// (unresolved).
		this.resolveSemanticReferences()
	},

	beforeUnmount() {
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

		/**
		 * Resolve every distinct cross-app semantic-reference URI (ADR-048)
		 * declared by the schema's fields against OpenRegister's discovery
		 * endpoint. Fires once per URI (deduped via `semanticResolutions`),
		 * kicked off from `created()`. Each entry moves 'loading' → 'done';
		 * while loading, the field renders disabled. Never throws.
		 *
		 * @return {void}
		 */
		resolveSemanticReferences() {
			const uris = new Set()
			for (const field of this.resolvedFields) {
				if (field && typeof field.referenceSemanticType === 'string' && field.referenceSemanticType !== '') {
					uris.add(field.referenceSemanticType)
				}
			}
			for (const uri of uris) {
				if (this.semanticResolutions[uri]) continue
				this.semanticResolutions[uri] = { status: 'loading', resolved: false }
				this.resolveSemanticReference(uri).then((result) => {
					this.semanticResolutions[uri] = { status: 'done', ...result }
					// Re-init async fields so a newly-resolved reference picker
					// starts fetching its options, and resolve any edit-mode
					// label for a value already stored on the field.
					if (result.resolved) {
						this.initAsyncFields()
						this.resolveInitialReferenceLabels()
					}
				})
			}
		},

		/**
		 * Call the OpenRegister discovery endpoint for one semantic-type URI.
		 * Degrades to `{ resolved: false }` on any error (including a 404 when
		 * the route isn't present yet) — never crashes the form.
		 *
		 * @param {string} uri The canonical semantic-type URI.
		 * @return {Promise<{resolved: boolean, registerSlug: string|null, schemaSlug: string|null, appId: string|null}>}
		 */
		async resolveSemanticReference(uri) {
			const empty = { resolved: false, registerSlug: null, schemaSlug: null, appId: null }
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(SEMANTIC_RESOLVE_ENDPOINT)
				const res = await axios.get(url, { params: { uri } })
				const data = (res && res.data) || {}
				if (data.resolved === true && data.registerSlug && data.schemaSlug) {
					return {
						resolved: true,
						registerSlug: String(data.registerSlug),
						schemaSlug: String(data.schemaSlug),
						appId: data.appId != null ? String(data.appId) : null,
					}
				}
				return empty
			} catch (err) {
				console.error(`CnFormDialog: semantic reference resolve failed for "${uri}":`, err)
				return empty
			}
		},

		/**
		 * Whether a semantic-reference field's URI has resolved to an
		 * installed provider schema. False while loading or when nothing
		 * implements the URI.
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {boolean}
		 */
		isSemanticResolved(field) {
			if (!field || !field.referenceSemanticType) return false
			const entry = this.semanticResolutions[field.referenceSemanticType]
			return !!(entry && entry.status === 'done' && entry.resolved)
		},

		/**
		 * Whether a semantic-reference field's URI is still being resolved.
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {boolean}
		 */
		isSemanticLoading(field) {
			if (!field || !field.referenceSemanticType) return false
			const entry = this.semanticResolutions[field.referenceSemanticType]
			return !entry || entry.status === 'loading'
		},

		/**
		 * Tooltip / helper copy for an unresolved semantic-reference field:
		 * "The {App} app that provides {Type} is not installed." `Type` is
		 * derived from the URI's last path segment; the app label from
		 * `referenceSemanticApp` (fallback: a generic "supporting app").
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {string}
		 */
		semanticUnavailableText(field) {
			const uri = (field && field.referenceSemanticType) || ''
			const segment = uri.split(/[/#]/).filter(Boolean).pop() || uri
			const typeLabel = segment || t('nextcloud-vue', 'this reference')
			const appLabel = (field && field.referenceSemanticApp)
				? field.referenceSemanticApp
				: t('nextcloud-vue', 'supporting app')
			return t('nextcloud-vue', 'The {appLabel} app that provides {typeLabel} is not installed.', { appLabel, typeLabel })
		},

		/**
		 * Transform a resolved cross-app semantic-reference field (ADR-048)
		 * into a normal `$ref` reference field so it flows through the
		 * existing searchable-object-picker machinery, but pointed at the
		 * PROVIDER'S register (cross-app — the provider lives in another
		 * app's register). Unresolved/loading fields and non-semantic fields
		 * are returned unchanged.
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {object} The (possibly transformed) field.
		 */
		applySemanticResolution(field) {
			if (!field || !field.referenceSemanticType) return field
			const entry = this.semanticResolutions[field.referenceSemanticType]
			if (!entry || entry.status !== 'done' || !entry.resolved) return field
			return {
				...field,
				widget: 'select',
				// Carry the provider register on the reference so the fetch
				// targets registerSlug (cross-app), not the form's own register.
				reference: { schema: entry.schemaSlug, multiple: false, register: entry.registerSlug },
			}
		},

		/**
		 * The id of a record, wherever it carries one. An OpenRegister
		 * object holds its id in `@self`, not only at the top level.
		 *
		 * @param {object|null} record The record to read.
		 * @return {string} The id, or '' when the record has none.
		 */
		recordId(record) {
			if (!record || typeof record !== 'object') return ''
			return String(record.id ?? record['@self']?.id ?? record.uuid ?? '')
		},

		/**
		 * Whether two `item` values are the same record, for the purpose of
		 * carrying pending edits across a re-seed.
		 *
		 * A record ARRIVING (null/id-less -> record) is the same record as
		 * far as the user is concerned: they are filling in the form that is
		 * already on screen. Two different ids are not.
		 *
		 * @param {object|null} oldItem The record previously bound.
		 * @param {object|null} newItem The record now bound.
		 * @return {boolean} True when edits may be carried over.
		 */
		isSameRecord(oldItem, newItem) {
			const oldId = this.recordId(oldItem)
			if (oldId === '') return true
			return oldId === this.recordId(newItem)
		},

		/**
		 * Snapshot the fields the user has edited by hand, so a record that
		 * arrives later can be merged UNDER them rather than over them.
		 *
		 * @return {object|null} The pending edits, or null when there are none.
		 */
		pendingUserEdits() {
			const keys = Object.keys(this.touchedFields || {})
			if (keys.length === 0) return null
			const edits = {}
			for (const key of keys) {
				if (Object.hasOwn(this.formData, key)) {
					edits[key] = this.formData[key]
				}
			}
			return Object.keys(edits).length > 0 ? edits : null
		},

		/**
		 * Re-apply edits captured by `pendingUserEdits()` after a re-seed,
		 * restoring their touched state with them.
		 *
		 * @param {object|null} edits The snapshot to re-apply.
		 * @return {void}
		 */
		restoreUserEdits(edits) {
			if (!edits) return
			for (const key of Object.keys(edits)) {
				this.formData[key] = edits[key]
				this.touchedFields[key] = true
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
					} else if (field.widget === 'tags' || field.widget === 'multiselect' || field.widget === 'user-multiselect') {
						data[field.key] = []
					} else if (field.widget === 'code') {
						data[field.key] = ''
					} else {
						data[field.key] = null
					}
				}
				// Seed create-mode values (parent pre-link from a detail page).
				for (const key of Object.keys(this.initialData || {})) {
					if (this.initialData[key] !== undefined) {
						data[key] = this.initialData[key]
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
			for (const field of this.resolvedFields.map((f) => this.applySemanticResolution(f))) {
				if (this.isReferenceField(field)) {
					const uuid = this.formData[field.key]
					if (uuid) this.resolveReferenceLabel(field, uuid)
				} else if (this.isReferenceArrayField(field)) {
					const uuids = this.formData[field.key]
					if (Array.isArray(uuids)) {
						for (const uuid of uuids) this.resolveReferenceLabel(field, uuid)
					}
				} else if (this.isUserField(field)) {
					const uid = this.formData[field.key]
					if (uid) this.resolveUserLabel(uid)
				} else if (this.isUserArrayField(field)) {
					const uids = this.formData[field.key]
					if (Array.isArray(uids)) {
						for (const uid of uids) this.resolveUserLabel(uid)
					}
				}
			}
		},

		/**
		 * Resolve a single user UID to its display name (edit mode) and cache it
		 * in `referenceLabels` so the select shows the name instead of the UID.
		 * No-op once the label is cached. Fails soft — `resolveNextcloudUser`
		 * falls back to the UID itself when the name can't be looked up.
		 *
		 * @param {string} uid The stored user UID.
		 */
		async resolveUserLabel(uid) {
			if (!uid || this.referenceLabels[uid]) return
			const option = await resolveNextcloudUser(uid)
			if (option && option.id) {
				this.referenceLabels = { ...this.referenceLabels, [option.id]: option.label || String(option.id) }
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
			this.formData.organisation = uuid
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
			this.formData[key] = value
			this.touchedFields[key] = true
			// Clear errors when a field is edited
			if (this.errors[key]) {
				delete this.errors[key]
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
					delete this.formData[field.key]
					if (this.errors[field.key]) {
						delete this.errors[field.key]
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
			this.jsonDrafts[field.key] = newString
			const trimmed = (newString || '').trim()
			if (!trimmed) {
				this.updateField(field.key, null)
				delete this.jsonErrors[field.key]
				return
			}
			try {
				const parsed = JSON.parse(trimmed)
				this.updateField(field.key, parsed)
				delete this.jsonErrors[field.key]
			} catch (e) {
				this.jsonErrors[field.key] = t('nextcloud-vue', 'Invalid JSON: {msg}', { msg: e.message })
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
				// Leave a value that ALREADY satisfies the schema format alone.
				//
				// This pass exists for OpenRegister's persisted shape
				// ('2026-10-15 14:30:00' — space-separated, no zone), which fails
				// the `date-time` format on save. A value that arrives as valid
				// RFC 3339 does not need it, and rewriting one CORRUPTS it:
				// dateValueFor() reads the wall-clock digits and DISCARDS the
				// offset (right for the local-time picker), then formatDateValue()
				// stamps the LOCAL offset back on. In Europe/Amsterdam a stored
				// '2026-10-15T14:30:00Z' came back as '2026-10-15T14:30:00+02:00'
				// — the same digits, two hours earlier, silently, on an edit that
				// never touched the field. It is schema-valid either way, so
				// nothing downstream objects (nextcloud-vue#835).
				if (this.isCanonicalDateValue(field.widget, raw)) continue
				const date = this.dateValueFor(field)
				if (date instanceof Date && !isNaN(date.getTime())) {
					this.formData[field.key] = this.formatDateValue(field.widget, date)
				}
			}
		},

		/**
		 * Whether a stored value is already in the shape this field submits.
		 *
		 * `date` wants a bare `YYYY-MM-DD`; `datetime` wants a full RFC 3339
		 * timestamp carrying a zone (`Z` or `±hh:mm`), which is what
		 * `formatDateValue` emits and what ajv-formats requires. Anything else
		 * — notably OpenRegister's space-separated persisted form — still gets
		 * normalised.
		 *
		 * @param {string} widget The field widget ('date' | 'datetime').
		 * @param {*} raw The stored value.
		 * @return {boolean} True when the value needs no rewrite.
		 */
		isCanonicalDateValue(widget, raw) {
			if (typeof raw !== 'string') return false
			if (widget === 'date') {
				return /^\d{4}-\d{2}-\d{2}$/.test(raw)
			}
			return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)
		},

		/**
		 * Display label for one enum value. The stored value (`id`) always stays
		 * the raw schema value — only what the user reads is translated, first
		 * through the field's `enumLabels` map when it has an entry, then through
		 * the host app's catalogue. A schema enum is a set of English source
		 * codes, so a Dutch session otherwise reads `submitted` in a form whose
		 * every other string is Dutch.
		 *
		 * @param {object} field The field descriptor.
		 * @param {*} val The raw enum value.
		 * @return {string} The label to render.
		 */
		enumOptionLabel(field, val) {
			const labels = field.enumLabels || {}
			return this.cnTranslate(labels[val] || String(val))
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
			const options = field.enum.map((val) => ({
				id: val,
				label: this.enumOptionLabel(field, val),
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
			return { id: val, label: this.enumOptionLabel(field, val) }
		},

		onSelectChange(key, option) {
			this.updateField(key, option ? option.id : null)
		},

		getArrayEnumOptions(field) {
			if (!field.items || !field.items.enum) return []
			return field.items.enum.map((val) => ({
				id: val,
				label: this.enumOptionLabel(field, val),
			}))
		},

		getSelectedArrayOptions(field) {
			const val = this.formData[field.key]
			if (!Array.isArray(val)) return []
			return val.map((v) => ({ id: v, label: this.enumOptionLabel(field, v) }))
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
			return !!(field && field.reference && !field.reference.multiple && this.referenceRegister(field))
		},

		/**
		 * The register a reference field fetches against: the reference's own
		 * `register` (cross-app semantic references, ADR-048) when present,
		 * otherwise the form's `register` prop.
		 *
		 * @param {object} field A resolved field descriptor.
		 * @return {string} The register slug, or '' when none is available.
		 */
		referenceRegister(field) {
			return (field && field.reference && field.reference.register) || this.register || ''
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
			if (field && field.reference && !this.referenceRegister(field)) {
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
			return !!(field && field.reference && field.reference.multiple && this.referenceRegister(field))
		},

		/**
		 * Whether a field is a single-value Nextcloud user reference — a
		 * property the schema marked with `referenceType: 'nextcloud-user'`
		 * (or `format: 'user'`/`'username'`). Renders as a searchable dropdown
		 * of real Nextcloud users (label = display name, value = UID). Needs no
		 * `register` (users come from the core autocomplete OCS endpoint).
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isUserField(field) {
			return !!(field && field.userPicker && !field.userPicker.multiple)
		},

		/**
		 * Whether a field is a multi-value Nextcloud user reference (an array
		 * of users) → a searchable multi-select of real Nextcloud users.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isUserArrayField(field) {
			return !!(field && field.userPicker && field.userPicker.multiple)
		},

		/**
		 * Check if a field has an async enum (function instead of static array).
		 * Object references (`$ref`) and Nextcloud user references are treated
		 * as async so they reuse the async-select load/search/loading machinery.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isAsyncEnum(field) {
			return typeof field.enum === 'function' || this.isReferenceField(field) || this.isUserField(field)
		},

		/**
		 * Check if an array field has an async items enum. Multi-value object
		 * references (`items.$ref`) and multi-value user references are treated
		 * as async multiselects.
		 *
		 * @param {object} field The field definition
		 * @return {boolean}
		 */
		isAsyncItemsEnum(field) {
			return !!(field.items && typeof field.items.enum === 'function') || this.isReferenceArrayField(field) || this.isUserArrayField(field)
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
		 * The object field CnResourceSelect uses as the option label and writes
		 * on inline create. Reads `field.reference.labelField` when the schema
		 * declares one, else defaults to `name`.
		 *
		 * @param {object} field A resolved reference field descriptor.
		 * @return {string} The label field name.
		 */
		referenceLabelField(field) {
			return (field && field.reference && field.reference.labelField) || 'name'
		},

		/**
		 * Cache the label of an object just created inline via CnResourceSelect,
		 * so any read-side that resolves the stored UUID shows its name. The
		 * value itself is set by CnResourceSelect's `update:modelValue`.
		 *
		 * @param {object} field The reference field.
		 * @param {object} obj   The freshly-created object (carries id + label field).
		 * @return {void}
		 */
		onReferenceCreated(field, obj) {
			if (obj && obj.id) {
				this.referenceLabels = { ...this.referenceLabels, [obj.id]: this.displayLabel(obj) }
			}
			// A freshly-created template carries its own fields — fill from it directly.
			this.applyTemplateFill(field, obj)
		},

		/**
		 * Handle selection of a create-capable (`CnResourceSelect`) reference:
		 * store the chosen UUID, then run any `fillFrom` template copy.
		 *
		 * @param {object}      field The reference field descriptor.
		 * @param {string|null} value The chosen object's UUID (or null on clear).
		 * @return {void}
		 */
		onReferenceSelected(field, value) {
			this.updateField(field.key, value || null)
			if (value) this.applyTemplateFill(field, value)
		},

		/**
		 * Copy template values off a selected/created reference object into the
		 * form, per the field's `fillFrom` map (`{ formKey: sourceKey }`). When
		 * `source` is an id, the object is fetched first. Overwrites existing
		 * values so re-selecting a template refreshes them; no-op without a map.
		 *
		 * @param {object}        field  The reference field carrying `fillFrom`.
		 * @param {object|string} source The selected object, or its UUID.
		 * @return {Promise<void>}
		 */
		async applyTemplateFill(field, source) {
			if (!field || !field.fillFrom || !source) return
			let obj = (typeof source === 'object') ? source : null
			if (!obj) {
				const register = this.referenceRegister(field)
				const store = this.getObjectStore()
				if (!register || !store || !field.reference) return
				try {
					const slug = store.createObjectTypeSlug(register, field.reference.schema)
					if (!store.objectTypeRegistry[slug]) {
						store.registerObjectType(slug, field.reference.schema, register)
					}
					obj = await store.fetchObject(slug, String(source))
				} catch (err) {
					console.error(`CnFormDialog: template fill fetch failed for "${field.key}":`, err)
					return
				}
			}
			if (!obj) return
			for (const formKey of Object.keys(field.fillFrom)) {
				const sourceKey = field.fillFrom[formKey]
				const value = obj[sourceKey]
				if (value !== undefined && value !== null) {
					this.updateField(formKey, value)
				}
			}
		},

		/**
		 * Whether an enum `widget:"switch"` field is currently "on" — i.e. its
		 * value equals the last enum value (off → first enum value).
		 *
		 * @param {object} field The switch field descriptor (carries `enum`).
		 * @return {boolean}
		 */
		isSwitchOn(field) {
			const values = Array.isArray(field.enum) ? field.enum : []
			if (values.length === 0) return !!this.formData[field.key]
			return this.formData[field.key] === values[values.length - 1]
		},

		/**
		 * Map a switch toggle to the field's enum value: on → last enum value,
		 * off → first enum value.
		 *
		 * @param {object}  field The switch field descriptor (carries `enum`).
		 * @param {boolean} on    The new switch state.
		 * @return {*} The enum value to store.
		 */
		switchValueFor(field, on) {
			const values = Array.isArray(field.enum) ? field.enum : []
			if (values.length === 0) return on
			return on ? values[values.length - 1] : values[0]
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

		/**
		 * The comparable form of a driving property's value.
		 *
		 * A `$ref` picker may hold either the bare UUID or the whole option
		 * object, depending on whether the user has just chosen it or it came
		 * back from the server. Both must produce the same signature, or
		 * merely opening an existing record would look like a change and
		 * refetch its definitions.
		 *
		 * @param {*} value The raw form value.
		 * @return {string} The value's identity, '' when unset.
		 */
		dynamicDriverValue(value) {
			if (value === null || value === undefined || value === '') return ''
			if (typeof value === 'object') return String(value.id || value.uuid || '')
			return String(value)
		},

		/**
		 * Fetch and install the extra fields the current driving values ask
		 * for. A driver that is unset clears them; a fetch that fails leaves
		 * them cleared rather than half-populated, because a form missing a
		 * required question it never showed is worse than one that shows none.
		 *
		 * @param {string} token The driver signature this load is for.
		 * @return {Promise<void>}
		 */
		async loadDynamicProperties(token) {
			this.dynamicToken = token
			const active = this.extendsDeclarations
				.filter(({ key }) => this.dynamicDriverValue(this.formData[key]) !== '')
			if (active.length === 0) {
				this.dynamicProperties = {}
				this.dynamicRequired = []
				this.dynamicOwners = {}
				this.dynamicLoading = false
				return
			}
			const store = this.getObjectStore()
			if (!store) return

			this.dynamicLoading = true
			const properties = {}
			const required = []
			const owners = {}
			try {
				for (const { key, config } of active) {
					const schemaSlug = config.definitions && config.definitions.schema
					// A definitions schema normally lives beside the object's own,
					// so the form's register is the default; `register` names
					// another app's when it does not (ADR-066).
					const register = (config.definitions && config.definitions.register) || this.register
					if (!schemaSlug || !register) continue
					const slug = store.createObjectTypeSlug(register, schemaSlug)
					if (!store.objectTypeRegistry[slug]) {
						store.registerObjectType(slug, schemaSlug, register)
					}
					const params = definitionQueryParams(
						config,
						this.dynamicDriverValue(this.formData[key]),
						this.formData,
					)
					const records = await store.fetchCollection(slug, params)
					// `orderFrom` keeps each declaration's block together and
					// after the schema's own fields, whose `order` values are
					// authored well below this.
					const mappedProps = propertiesFromDefinitions(
						Array.isArray(records) ? records : [],
						config,
						{ orderFrom: 1000 + Object.keys(properties).length },
					)
					Object.assign(properties, mappedProps.properties)
					required.push(...mappedProps.required)
					for (const propKey of Object.keys(mappedProps.properties)) owners[propKey] = key
				}
			} catch (err) {
				console.error('CnFormDialog: could not load the fields for this selection:', err)
			}
			// A slower earlier fetch must not overwrite a later selection's
			// fields; the signature it started under is the only way to tell.
			if (this.dynamicToken !== token) return
			this.dynamicProperties = properties
			this.dynamicRequired = required
			this.dynamicOwners = owners
			this.dynamicLoading = false
			this.seedDynamicDefaults(properties)
		},

		/**
		 * Whether a field takes the full width of a two-column form.
		 *
		 * A textarea or a JSON editor in a half-width column is worse than no
		 * columns at all, and a checkbox pair reads as one control rather than
		 * two. The list is deliberately about the WIDGET, not the field name,
		 * so it needs no per-app configuration to behave.
		 *
		 * @param {object} field The resolved field.
		 * @return {boolean} True when the field spans both columns.
		 */
		fieldSpansBothColumns(field) {
			if (this.columns !== 2 || !field) return false
			return WIDE_WIDGETS.includes(field.widget)
		},

		/**
		 * Copy what the chosen record already answers into the empty fields
		 * that ask the same question.
		 *
		 * Only empty targets are written. Someone who has typed a title before
		 * picking a case type keeps their title, and switching case type after
		 * that keeps it too: the field is no longer empty, so it is no longer
		 * a candidate. That is the whole rule, and it is what makes the
		 * feature safe to run on every change rather than only the first.
		 *
		 * A field the person deliberately cleared reads as empty and will be
		 * filled again by the next change of case type. That is the accepted
		 * cost of not tracking per-field provenance; the alternative is a
		 * dirty-flag per field, which is a great deal of state for a case that
		 * ends with the person clearing the field again.
		 *
		 * @param {string} token The prefill signature this run is for.
		 * @return {Promise<void>}
		 */
		async applyPrefill(token) {
			this.prefillToken = token
			const active = this.prefillDecls
				.filter(({ key }) => this.dynamicDriverValue(this.formData[key]) !== '')
			if (active.length === 0) return

			const store = this.getObjectStore()
			if (!store) return

			const resolved = {}
			try {
				for (const { key, config } of active) {
					// The declaration may name its own schema; otherwise the
					// picker's own `$ref` target is the record being chosen.
					const field = this.resolvedFields.find((f) => f.key === key)
					const schemaSlug = config.schema
						|| (field && field.reference && field.reference.schema)
					const register = config.register
						|| (field ? this.referenceRegister(field) : this.register)
					if (!schemaSlug || !register) continue

					const slug = store.createObjectTypeSlug(register, schemaSlug)
					if (!store.objectTypeRegistry[slug]) {
						store.registerObjectType(slug, schemaSlug, register)
					}
					const record = await store.fetchObject(
						slug,
						this.dynamicDriverValue(this.formData[key]),
					)
					Object.assign(resolved, prefillValues(record, config))
				}
			} catch (err) {
				// A prefill that fails leaves the person typing the values
				// themselves, which is exactly where they were before.
				console.error('CnFormDialog: could not prefill from this selection:', err)
				return
			}

			if (this.prefillToken !== token) return
			for (const [target, value] of Object.entries(resolved)) {
				const current = this.formData[target]
				const empty = current === null || current === undefined || current === ''
					|| (Array.isArray(current) && current.length === 0)
				if (empty) this.formData[target] = value
			}
		},

		/**
		 * Seed a newly-arrived dynamic field with its default, without
		 * touching one the user (or the record) already answered.
		 *
		 * @param {object} properties The installed dynamic properties.
		 */
		seedDynamicDefaults(properties) {
			for (const [key, prop] of Object.entries(properties)) {
				if (prop.default === undefined) continue
				if (this.formData[key] !== undefined && this.formData[key] !== null && this.formData[key] !== '') continue
				this.formData[key] = prop.default
			}
		},

		async fetchReferenceOptions(field, query) {
			const register = this.referenceRegister(field)
			if (!register || !field.reference || !field.reference.schema) return []
			const store = this.getObjectStore()
			if (!store) return []
			try {
				const params = { _limit: 100 }
				if (query) params._search = query
				// Declarative option scoping (`x-relation-filter`): narrow the
				// picker to objects that fit the form's CURRENT values — e.g. a
				// line item's `product` scoped to the chosen leadProduct. Mirrors
				// CnObjectDataWidget: values are token-resolved (@object.<field> /
				// @objectId) against the live form data; an entry whose token stays
				// unresolved is dropped (unfiltered beats an empty picker).
				const prop = (this.schema && this.schema.properties && this.schema.properties[field.key]) || null
				const rawFilter = prop && prop['x-relation-filter']
				if (rawFilter && typeof rawFilter === 'object') {
					const ctx = { objectId: this.formData.id, object: { ...this.formData } }
					const filter = resolveFilterTokens(rawFilter, ctx)
					for (const [fk, fv] of Object.entries(filter)) {
						if (typeof fv === 'string' && fv.charAt(0) === '@') continue
						if (fv && typeof fv === 'object') {
							for (const [op, ov] of Object.entries(fv)) params[`${fk}[${op}]`] = ov
						} else if (fv !== '' && fv !== null && fv !== undefined) {
							params[fk] = fv
						}
					}
				}
				const slug = store.createObjectTypeSlug(register, field.reference.schema)
				if (!store.objectTypeRegistry[slug]) {
					store.registerObjectType(slug, field.reference.schema, register)
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
			const register = this.referenceRegister(field)
			if (!uuid || this.referenceLabels[uuid] || !register || !field.reference) return
			const store = this.getObjectStore()
			if (!store) return
			try {
				const slug = store.createObjectTypeSlug(register, field.reference.schema)
				if (!store.objectTypeRegistry[slug]) {
					store.registerObjectType(slug, field.reference.schema, register)
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

			// Iterate the *transformed* fields so a resolved cross-app
			// semantic reference (now a `$ref` picker) gets async state too.
			const fields = this.resolvedFields.map((field) => this.applySemanticResolution(field))
			const newState = {}
			for (const field of fields) {
				if (this.isAsyncEnum(field) || this.isAsyncItemsEnum(field)) {
					newState[field.key] = { options: [], loading: false, searchTimeout: null }
				}
			}
			this.asyncState = newState

			// Trigger initial load for each async field
			this.$nextTick(() => {
				for (const field of fields) {
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

			state.loading = true

			try {
				let results
				if (this.isReferenceField(field) || this.isReferenceArrayField(field)) {
					// OpenRegister object reference — fetch the referenced objects.
					results = await this.fetchReferenceOptions(field, query)
				} else if (this.isUserField(field) || this.isUserArrayField(field)) {
					// Nextcloud user reference — search real users via the core
					// autocomplete OCS endpoint. Cache labels so the current
					// selection still displays its display name.
					results = await searchNextcloudUsers(query)
					const labels = {}
					for (const opt of results) {
						if (opt && opt.id) labels[opt.id] = opt.label || String(opt.id)
					}
					if (Object.keys(labels).length > 0) {
						this.referenceLabels = { ...this.referenceLabels, ...labels }
					}
				} else {
					const enumFn = typeof field.enum === 'function' ? field.enum : field.items.enum
					results = await enumFn(query)
				}
				state.options = Array.isArray(results) ? results : []
			} catch (err) {
				console.error(`CnFormDialog: async enum error for field "${field.key}":`, err)
				state.options = []
			} finally {
				state.loading = false
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
			if (this.isReferenceField(field) || this.isUserField(field)) {
				// Reference / user fields store the UUID/UID — resolve it to a
				// display option `{ id, label }` (label from the resolved-labels
				// cache, falling back to the id until it loads).
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
			if (this.isReferenceField(field) || this.isUserField(field)) {
				// Reference / user fields store the chosen id (UUID / UID),
				// not the full option. Cache its label so the selection displays.
				if (option && option.id) {
					this.referenceLabels = { ...this.referenceLabels, [option.id]: option.label || String(option.id) }
				}
				this.updateField(field.key, option ? option.id : null)
				// Reference options are label-only ({id,label}) — pass the id so
				// template pre-fill fetches the full object.
				if (option && option.id) this.applyTemplateFill(field, String(option.id))
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
			if (this.isReferenceArrayField(field) || this.isUserArrayField(field)) {
				// Reference / user arrays store an array of ids (UUIDs / UIDs) —
				// resolve each to a display option `{ id, label }`.
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
			if (this.isReferenceArrayField(field) || this.isUserArrayField(field)) {
				// Reference / user arrays store an array of ids (UUIDs / UIDs).
				// Cache labels so the chips still display the human names.
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
			// The object's own fields and the answers to its data-driven
			// questions go out separately: a value row references the parent,
			// so it cannot be written in the same call, and posting a dynamic
			// key to the parent schema would have OpenRegister drop it
			// silently — a 200, an object back, and the answer gone. A host
			// that ignores the second argument therefore still posts a clean
			// payload rather than losing declared fields to undeclared ones.
			const { base, answers: raw } = splitDynamicFormData(this.buildSubmitPayload())
			const answers = raw.map((answer) => ({
				...answer,
				declarationKey: this.dynamicOwners[DYNAMIC_KEY_PREFIX + answer.definitionId] || '',
			}))
			/**
			 * @event confirm Emitted when the user confirms the form.
			 * Payload: form data object. Includes `id` when editing. A second
			 * argument carries the data-driven answers (`{ answers, declarations }`)
			 * when the schema declares `x-openregister-extends-form`; it is
			 * `null` otherwise, which is every schema that declares nothing.
			 */
			this.$emit('confirm', base, answers.length > 0
				? { answers, declarations: this.extendsDeclarations }
				: null)
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
					/**
					 * @event close Emitted when the dialog should close: the user dismissed it, or a successful save auto-closed it.
					 */
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

/* Two-column layout. The grid lives on a wrapper that only exists when
   `columns` is 2, so a single-column form keeps its plain block flow and
   cannot be reflowed by a rule meant for the other mode.

   `min-width: 0` on the items is what stops a long select or a wide input
   from pushing its column past its share: a grid item's default `auto`
   minimum is its content, so without it one long option label widens the
   whole column and the two stop being equal. */
.cn-form-dialog__form--two-column {
	display: grid;
	grid-template-columns: 1fr 1fr;
	column-gap: 16px;
	align-items: start;
}

.cn-form-dialog__form--two-column > * {
	min-width: 0;
}

/* Anything that is not a field (the form-level error note, the slots above
   and below the fields) spans the full width, so a note card never sits in
   a half-width column beside an input. */
.cn-form-dialog__form--two-column > :not(.cn-form-dialog__field),
.cn-form-dialog__form--two-column > .cn-form-dialog__field--wide {
	grid-column: 1 / -1;
}

/* A narrow viewport gets the single column back. Two columns of roughly
   150px each are worse than one readable one. */
@media (max-width: 700px) {
	.cn-form-dialog__form--two-column {
		display: block;
	}
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

/* Cross-app semantic reference (ADR-048) whose provider isn't installed —
   rendered disabled; the wrapper carries the mouse-over tooltip. */
.cn-form-dialog__semantic-unresolved {
	cursor: not-allowed;
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

.cn-form-dialog__dynamic-loading {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
}
</style>
