<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		@closing="$emit('close')">
		<div
			class="cn-transition-input"
			data-testid="cn-modal"
			data-testid-modal="cn-transition-input-dialog">
			<!-- A refusal keeps this dialog open with what was typed still in
			     it. Closing first and reporting behind it loses the work and
			     asks the person to retype it from memory. -->
			<p v-if="error"
				class="cn-transition-input__error"
				data-testid="cn-transition-input-error">
				{{ error }}
			</p>
			<div v-for="field in fields"
				:key="field.key"
				class="cn-transition-input__field"
				:class="{ 'cn-transition-input__field--refused': isRefused(field.key) }"
				:data-testid="`cn-transition-input-${field.key}`">
				<!-- An input that points at another record is picked, never typed. -->
				<div v-if="field.widget === 'reference'" class="cn-transition-input__reference">
					<label class="cn-transition-input__label">{{ requiredLabel(field) }}</label>
					<CnResourceSelect
						:register="field.referenceRegister"
						:schema="String(field.reference.schema)"
						:labelField="(field.picker && field.picker.labelField) || field.reference.labelField || 'name'"
						:filter="(field.picker && field.picker.filter) || {}"
						:exclude="excludedIds(field)"
						:allowCreate="false"
						:preload="true"
						:inputLabel="requiredLabel(field)"
						:modelValue="String(values[field.key] ?? '')"
						:data-testid="`cn-transition-input-picker-${field.key}`"
						@update:modelValue="setValue(field.key, $event)" />
				</div>

				<!-- An object input: its sub-properties, one field at a time. -->
				<fieldset v-else-if="field.widget === 'object'" class="cn-transition-input__object">
					<legend>{{ requiredLabel(field) }}</legend>
					<div v-for="sub in field.subFields"
						:key="sub.key"
						class="cn-transition-input__subfield"
						:data-testid="`cn-transition-input-${field.key}-${sub.key}`">
						<NcTextArea v-if="sub.widget === 'textarea'"
							:modelValue="String(subValue(field.key, sub.key) ?? '')"
							:label="subLabel(sub)"
							rows="3"
							@update:modelValue="setSubValue(field.key, sub.key, $event)" />
						<NcCheckboxRadioSwitch v-else-if="sub.widget === 'checkbox'"
							:modelValue="subValue(field.key, sub.key) === true"
							type="switch"
							@update:modelValue="setSubValue(field.key, sub.key, $event === true)">
							{{ subLabel(sub) }}
						</NcCheckboxRadioSwitch>
						<NcTextField v-else
							:modelValue="String(subValue(field.key, sub.key) ?? '')"
							:type="sub.widget === 'number' ? 'number' : 'text'"
							:label="subLabel(sub)"
							@update:modelValue="setSubValue(field.key, sub.key, $event)" />
						<p v-if="isSubRefused(field.key, sub.key)"
							class="cn-transition-input__field-error"
							:data-testid="`cn-transition-input-error-${field.key}.${sub.key}`">
							{{ t('nextcloud-vue', 'This value was not accepted.') }}
						</p>
					</div>
				</fieldset>

				<NcCheckboxRadioSwitch v-else-if="field.widget === 'checkbox'"
					:modelValue="values[field.key] === true"
					type="switch"
					@update:modelValue="setValue(field.key, $event === true)">
					{{ requiredLabel(field) }}
				</NcCheckboxRadioSwitch>

				<NcTextArea v-else-if="field.widget === 'textarea'"
					:modelValue="String(values[field.key] ?? '')"
					:label="requiredLabel(field)"
					:helperText="field.description || ''"
					rows="4"
					@update:modelValue="setValue(field.key, $event)" />

				<NcTextField v-else-if="field.widget === 'number'"
					:modelValue="String(values[field.key] ?? '')"
					type="number"
					:label="requiredLabel(field)"
					:helperText="field.description || ''"
					@update:modelValue="setValue(field.key, $event)" />

				<NcTextField v-else
					:modelValue="String(values[field.key] ?? '')"
					:label="requiredLabel(field)"
					:helperText="field.description || ''"
					@update:modelValue="setValue(field.key, $event)" />

				<p v-if="isRefused(field.key)"
					class="cn-transition-input__field-error"
					:data-testid="`cn-transition-input-error-${field.key}`">
					{{ refusalFor(field.key) }}
				</p>
			</div>

			<!-- A key the refusal names that this dialog never offered is not a
			     field anybody can correct here. Saying so beats saying nothing:
			     the request sent something the transition does not accept. -->
			<p v-for="key in unofferedRefusals"
				:key="key"
				class="cn-transition-input__field-error"
				:data-testid="`cn-transition-input-error-${key}`">
				{{ undeclaredMessage(key) }}
			</p>
		</div>

		<template #actions>
			<NcButton
				data-testid="cn-transition-input-cancel"
				@click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canConfirm"
				data-testid="cn-transition-input-confirm"
				@click="onConfirm">
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcTextArea, NcTextField } from '@nextcloud/vue'
import CnResourceSelect from '../components/CnResourceSelect/CnResourceSelect.vue'
import { fieldsFromSchema } from '../utils/schema.js'

/**
 * CnTransitionInputDialog — collects a lifecycle transition's declared
 * `inputs` before the transition is applied.
 *
 * A schema's `x-openregister-lifecycle.transitions.<action>` block may declare
 * `inputs: [{ field, required }]`; the transition endpoint then accepts
 * `{ action, data: { <field>: <value> } }`. This dialog renders one input per
 * declared field, disables the confirm button until every `required: true`
 * field is filled, and emits the collected values — the parent
 * (`CnLifecycleActions`) performs the actual POST. Cancel emits `close`
 * without any confirm, so no request is made.
 *
 * Field rendering resolves each declared field against the object's JSON
 * Schema via `fieldsFromSchema()` when a `schema` is given: the label comes
 * from the property `title`, booleans render as a switch, numbers as a number
 * field, and long text (`maxLength > 255` or a `textarea`/`markdown` format)
 * as a textarea. Anything else — including a field the schema does not
 * declare — falls back to a plain labelled text input. Deliberately minimal:
 * text, textarea, number and checkbox cover transition inputs; this is not a
 * form engine (use `CnFormDialog` for full object forms).
 *
 * Lives in its own file under `src/dialogs/` per the modal-isolation rule.
 *
 * ```vue
 * <CnTransitionInputDialog
 *   v-if="inputTransition"
 *   :transition="inputTransition"
 *   :schema="schema"
 *   @confirm="onInputConfirm"
 *   @close="inputTransition = null" />
 * ```
 */
export default {
	name: 'CnTransitionInputDialog',

	components: {
		CnResourceSelect,
		NcDialog,
		NcButton,
		NcTextField,
		NcTextArea,
		NcCheckboxRadioSwitch,
	},

	props: {
		/**
		 * The transition being applied. `inputs` is the declared input list from
		 * `x-openregister-lifecycle.transitions.<action>.inputs` (server-derived
		 * or config-declared); `label` doubles as dialog title + confirm label.
		 *
		 * @type {{action?: string, label?: string, inputs?: Array<{field: string, required?: boolean}>}}
		 */
		transition: {
			type: Object,
			required: true,
		},

		/**
		 * The object's JSON Schema (with `properties`), used to resolve each
		 * input's label, widget and helper text. Optional — undeclared fields
		 * render as plain text inputs labelled by their field name.
		 *
		 * @type {object|null}
		 */
		schema: {
			type: Object,
			default: null,
		},

		/**
		 * The record the transition runs on. Gives `picker.excludeSelf` its id
		 * to leave out, and the current value an object input is merged over.
		 *
		 * @type {object|null}
		 */
		currentObject: {
			type: Object,
			default: null,
		},

		/**
		 * Register slug the reference pickers look in when the schema property
		 * names none of its own.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * The sentence a refused transition answered with. Present means the
		 * dialog stayed open BECAUSE the attempt was refused, with everything
		 * typed still in it.
		 *
		 * @type {string}
		 */
		error: {
			type: String,
			default: '',
		},

		/**
		 * The input keys the refusal named (`fields` in the 400 body). Each one
		 * that this dialog offers is marked on its own field; each one it does
		 * not is reported as a key the transition does not accept.
		 *
		 * @type {string[]}
		 */
		fieldErrors: {
			type: Array,
			default: () => [],
		},

		/**
		 * Whether the parent is mid-POST. Keeps the confirm button from firing
		 * a second attempt while the first is in flight.
		 *
		 * @type {boolean}
		 */
		busy: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['confirm', 'close'],

	data() {
		return {
			/** @type {{[key: string]: unknown}} Collected input values, keyed by declared field name. */
			values: this.initialValues(),
		}
	},

	computed: {
		/** The declared inputs, normalised to `{ field, required }`. */
		inputs() {
			const declared = Array.isArray(this.transition.inputs) ? this.transition.inputs : []
			return declared
				.filter((input) => input && typeof input.field === 'string' && input.field !== '')
				.map((input) => ({
					field: input.field,
					required: input.required === true,
					picker: input.picker && typeof input.picker === 'object' ? input.picker : null,
					fields: Array.isArray(input.fields) ? input.fields.filter((f) => typeof f === 'string') : null,
				}))
		},

		/**
		 * One renderable field descriptor per declared input. Schema-declared
		 * fields come from `fieldsFromSchema()` (label from the property title,
		 * widget from the type/format); the widget is then clamped to the minimal
		 * set this dialog renders (text / textarea / number / checkbox). Fields
		 * the schema does not declare fall back to a plain text input.
		 */
		fields() {
			const keys = this.inputs.map((input) => input.field)
			const resolved = fieldsFromSchema(this.schema, { include: keys, includeReadOnly: true })
			return this.inputs.map((input) => {
				const field = resolved.find((f) => f.key === input.field)
				const prop = (this.schema && this.schema.properties && this.schema.properties[input.field]) || null
				if (prop && prop.type === 'object' && prop.properties && typeof prop.properties === 'object') {
					return this.objectField(input, prop)
				}
				if (!field) {
					return { key: input.field, label: input.field, description: '', widget: 'text', required: input.required }
				}
				if (field.reference && field.reference.multiple !== true) {
					const register = field.reference.register || this.register
					if (register !== '') {
						return { ...field, widget: 'reference', referenceRegister: register, picker: input.picker, required: input.required }
					}
				}
				return { ...field, widget: this.clampWidget(field.widget), required: input.required }
			})
		},

		/** Dialog title — the transition's label, with a generic fallback. */
		dialogTitle() {
			return this.transition.label || t('nextcloud-vue', 'Provide details')
		},

		/** Confirm button label — the transition's label per the contract. */
		confirmLabel() {
			return this.transition.label || t('nextcloud-vue', 'Confirm')
		},

		/** True when every `required: true` input holds a non-empty value. */
		canConfirm() {
			if (this.busy === true) {
				return false
			}
			return this.fields.every((field) => (field.widget === 'object'
				? field.subFields.every((sub) => !sub.required || this.isSubFilled(field.key, sub))
				: (!field.required || this.isFilled(field))))
		},

		/** The refused keys this dialog offers no field for. */
		unofferedRefusals() {
			const offered = this.fields.map((field) => field.key)
			return this.refusedKeys.filter((key) => !offered.includes(key))
		},

		/** The refusal's field keys, normalised to strings. */
		refusedKeys() {
			if (!Array.isArray(this.fieldErrors)) {
				return []
			}
			return this.fieldErrors.filter((key) => typeof key === 'string' && key !== '')
		},
	},

	methods: {
		// Exposed to the template for the static button labels — the same
		// `methods: { t }` pattern the other dialogs in this folder use.
		t,

		/**
		 * Whether the refusal named this field.
		 *
		 * @param {string} key The field key.
		 * @return {boolean}
		 */
		isRefused(key) {
			return this.refusedKeys.includes(key)
		},

		/**
		 * What to say beside a refused field.
		 *
		 * The KIND is decided here rather than read out of the refusal's
		 * sentence. A field this dialog offers and the person left empty is a
		 * missing required input; one it offers that carries a value was
		 * refused for what is in it. Parsing the server's prose to tell those
		 * apart would break the first time the sentence is reworded, and a
		 * reworded sentence is not a contract change.
		 *
		 * @param {string} key The field key.
		 * @return {string}
		 */
		refusalFor(key) {
			const field = this.fields.find((candidate) => candidate.key === key)
			if (field && !this.isFilled(field)) {
				return t('nextcloud-vue', 'This field is required.')
			}
			return t('nextcloud-vue', 'This value was not accepted.')
		},

		/**
		 * What to say about a refused key this dialog does not offer.
		 *
		 * @param {string} key The field key.
		 * @return {string}
		 */
		undeclaredMessage(key) {
			return t('nextcloud-vue', 'This action does not accept the field "{field}".', { field: key })
		},

		/**
		 * The descriptor of an object input: its sub-properties (narrowed to the
		 * input's `fields` when it names them), each with its own widget.
		 * A sub-field is required when the input names it in `fields` and the
		 * sub-schema lists it as required, or when the whole input is required
		 * and it is the only one asked.
		 *
		 * @param {object} input The normalised input.
		 * @param {object} prop The object property's schema.
		 * @return {object} The field descriptor.
		 */
		objectField(input, prop) {
			const subs = fieldsFromSchema(prop, { includeReadOnly: true, ...(input.fields ? { include: input.fields } : {}) })
			const required = Array.isArray(prop.required) ? prop.required : []
			const only = subs.length === 1
			return {
				key: input.field,
				label: prop.title || input.field,
				description: prop.description || '',
				widget: 'object',
				required: input.required,
				subFields: subs.map((sub) => ({
					...sub,
					widget: this.clampWidget(sub.widget),
					required: (input.fields ? required.includes(sub.key) : sub.required === true) || (input.required && only),
				})),
			}
		},

		/**
		 * Ids a reference picker must not offer: the current record, when the
		 * input's `picker.excludeSelf` says so.
		 *
		 * @param {object} field The reference field descriptor.
		 * @return {string[]} The ids to leave out.
		 */
		excludedIds(field) {
			if (!field.picker || field.picker.excludeSelf !== true || !this.currentObject) {
				return []
			}
			const self = this.currentObject
			return [self.id, self.uuid, self['@self'] && self['@self'].id].filter((id) => id !== undefined && id !== null).map(String)
		},

		/**
		 * Label of a sub-field, with the required marker.
		 *
		 * @param {object} sub The sub-field descriptor.
		 * @return {string}
		 */
		subLabel(sub) {
			return sub.required ? `${sub.label} *` : sub.label
		},

		/**
		 * A typed sub-value.
		 *
		 * @param {string} key The input key.
		 * @param {string} sub The sub-field key.
		 * @return {unknown}
		 */
		subValue(key, sub) {
			const group = this.values[key]
			return group && typeof group === 'object' ? group[sub] : undefined
		},

		/**
		 * Store one sub-value, keeping the rest of the object input's values.
		 *
		 * @param {string} key The input key.
		 * @param {string} sub The sub-field key.
		 * @param {unknown} value The new value.
		 */
		setSubValue(key, sub, value) {
			const group = this.values[key] && typeof this.values[key] === 'object' ? this.values[key] : {}
			this.setValue(key, { ...group, [sub]: value })
		},

		/**
		 * Whether a required sub-field holds a value.
		 *
		 * @param {string} key The input key.
		 * @param {object} sub The sub-field descriptor.
		 * @return {boolean}
		 */
		isSubFilled(key, sub) {
			const value = this.subValue(key, sub.key)
			return sub.widget === 'checkbox' ? value === true : String(value ?? '').trim() !== ''
		},

		/**
		 * Whether a refusal named `<input>.<sub>`.
		 *
		 * @param {string} key The input key.
		 * @param {string} sub The sub-field key.
		 * @return {boolean}
		 */
		isSubRefused(key, sub) {
			return this.refusedKeys.includes(`${key}.${sub}`)
		},

		/** Seed each declared input from its schema default (booleans start false). */
		initialValues() {
			const values = {}
			const declared = Array.isArray(this.transition?.inputs) ? this.transition.inputs : []
			const properties = (this.schema && this.schema.properties) || {}
			for (const input of declared) {
				if (!input || typeof input.field !== 'string' || input.field === '') {
					continue
				}
				const prop = properties[input.field] || {}
				if (prop.type === 'object' && prop.properties && typeof prop.properties === 'object') {
					// An object input starts from the record's present value, so
					// the sub-fields it asks for show what is there.
					const present = this.currentObject ? this.currentObject[input.field] : null
					values[input.field] = present && typeof present === 'object' ? { ...present } : {}
					continue
				}
				values[input.field] = prop.default !== undefined
					? prop.default
					: (prop.type === 'boolean' ? false : '')
			}
			return values
		},

		/**
		 * Clamp a `fieldsFromSchema()` widget to the minimal set this dialog
		 * renders. Anything richer (select, date, user picker, …) degrades to a
		 * plain text input rather than pulling a form engine into the dialog.
		 *
		 * @param {string} widget The resolved widget name.
		 * @return {'text'|'textarea'|'number'|'checkbox'}
		 */
		clampWidget(widget) {
			if (widget === 'checkbox' || widget === 'switch') {
				return 'checkbox'
			}
			if (widget === 'textarea') {
				return 'textarea'
			}
			if (widget === 'number') {
				return 'number'
			}
			return 'text'
		},

		/**
		 * The field's visible label, with a `*` marker on required inputs so the
		 * confirm-gating is visually explained.
		 *
		 * @param {object} field The field descriptor.
		 * @return {string}
		 */
		requiredLabel(field) {
			return field.required ? `${field.label} *` : field.label
		},

		/**
		 * Store one input's value.
		 *
		 * @param {string} key The declared field name.
		 * @param {unknown} value The new value.
		 */
		setValue(key, value) {
			this.values = { ...this.values, [key]: value }
		},

		/**
		 * Whether a required field counts as filled: a checked switch for
		 * booleans, a non-blank string otherwise.
		 *
		 * @param {object} field The field descriptor.
		 * @return {boolean}
		 */
		isFilled(field) {
			const value = this.values[field.key]
			if (field.widget === 'checkbox') {
				return value === true
			}
			return String(value ?? '').trim() !== ''
		},

		/**
		 * The object an object input sends: the record's current value with the
		 * asked sub-fields merged over it, so a sub-field that was not asked for
		 * keeps its value. A shown field left empty over an empty current value
		 * is not written. Never a dotted key.
		 *
		 * @param {object} field The object field descriptor.
		 * @return {object}
		 */
		mergedObject(field) {
			const present = this.currentObject ? this.currentObject[field.key] : null
			const base = present && typeof present === 'object' ? { ...present } : {}
			for (const sub of field.subFields) {
				let value = this.subValue(field.key, sub.key)
				const empty = sub.widget === 'checkbox' ? value === undefined : String(value ?? '').trim() === ''
				const had = base[sub.key]
				if (empty && (had === undefined || had === null || had === '')) {
					continue
				}
				if (sub.widget === 'number' && !empty && !Number.isNaN(Number(value))) {
					value = Number(value)
				}
				base[sub.key] = value
			}
			return base
		},

		/** Confirm: emit exactly the declared keys (numbers cast) and let the parent POST. */
		onConfirm() {
			if (!this.canConfirm) {
				return
			}
			const data = {}
			for (const field of this.fields) {
				if (field.widget === 'object') {
					data[field.key] = this.mergedObject(field)
					continue
				}
				let value = this.values[field.key]
				if (field.widget === 'number' && String(value ?? '').trim() !== '') {
					const parsed = Number(value)
					if (!Number.isNaN(parsed)) {
						value = parsed
					}
				}
				data[field.key] = value
			}
			/**
			 * @event confirm Emitted when the user confirms with all required
			 * inputs filled. Payload holds exactly the declared input keys; the
			 * parent POSTs `{ action, data }`.
			 * @type {{[key: string]: unknown}}
			 */
			this.$emit('confirm', data)
		},
	},
}
</script>

<style scoped>
.cn-transition-input {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-transition-input__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

.cn-transition-input__field-error {
	margin: 4px 0 0;
	font-size: 0.9em;
	color: var(--color-error-text, var(--color-error));
}

.cn-transition-input__object {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-transition-input__label {
	display: block;
	margin-bottom: 4px;
}

.cn-transition-input__field--refused {
	border-inline-start: 2px solid var(--color-error);
	padding-inline-start: 8px;
}
</style>
