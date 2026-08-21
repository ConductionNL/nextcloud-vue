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
			<div v-for="field in fields"
				:key="field.key"
				class="cn-transition-input__field"
				:data-testid="`cn-transition-input-${field.key}`">
				<NcCheckboxRadioSwitch v-if="field.widget === 'checkbox'"
					:model-value="values[field.key] === true"
					type="switch"
					@update:model-value="setValue(field.key, $event === true)">
					{{ requiredLabel(field) }}
				</NcCheckboxRadioSwitch>

				<NcTextArea v-else-if="field.widget === 'textarea'"
					:model-value="String(values[field.key] ?? '')"
					:label="requiredLabel(field)"
					:helper-text="field.description || ''"
					rows="4"
					@update:model-value="setValue(field.key, $event)" />

				<NcTextField v-else-if="field.widget === 'number'"
					:model-value="String(values[field.key] ?? '')"
					type="number"
					:label="requiredLabel(field)"
					:helper-text="field.description || ''"
					@update:model-value="setValue(field.key, $event)" />

				<NcTextField v-else
					:model-value="String(values[field.key] ?? '')"
					:label="requiredLabel(field)"
					:helper-text="field.description || ''"
					@update:model-value="setValue(field.key, $event)" />
			</div>
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
import { NcDialog, NcButton, NcTextField, NcTextArea, NcCheckboxRadioSwitch } from '@nextcloud/vue'
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
		 * @type {object|null}
		 */
		schema: {
			type: Object,
			default: null,
		},
	},

	emits: ['confirm', 'close'],

	data() {
		return {
			/** @type {{[key: string]: *}} Collected input values, keyed by declared field name. */
			values: this.initialValues(),
		}
	},

	computed: {
		/** The declared inputs, normalised to `{ field, required }`. */
		inputs() {
			const declared = Array.isArray(this.transition.inputs) ? this.transition.inputs : []
			return declared
				.filter((input) => input && typeof input.field === 'string' && input.field !== '')
				.map((input) => ({ field: input.field, required: input.required === true }))
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
				if (!field) {
					return { key: input.field, label: input.field, description: '', widget: 'text', required: input.required }
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
			return this.fields.every((field) => !field.required || this.isFilled(field))
		},
	},

	methods: {
		// Exposed to the template for the static button labels — the same
		// `methods: { t }` pattern the other dialogs in this folder use.
		t,

		/** Seed each declared input from its schema default (booleans start false). */
		initialValues() {
			const values = {}
			const declared = Array.isArray(this.transition?.inputs) ? this.transition.inputs : []
			const properties = (this.schema && this.schema.properties) || {}
			for (const input of declared) {
				if (!input || typeof input.field !== 'string' || input.field === '') continue
				const prop = properties[input.field] || {}
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
			if (widget === 'checkbox' || widget === 'switch') return 'checkbox'
			if (widget === 'textarea') return 'textarea'
			if (widget === 'number') return 'number'
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
		 * @param {*} value The new value.
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
			if (field.widget === 'checkbox') return value === true
			return String(value ?? '').trim() !== ''
		},

		/** Confirm: emit exactly the declared keys (numbers cast) and let the parent POST. */
		onConfirm() {
			if (!this.canConfirm) return
			const data = {}
			for (const field of this.fields) {
				let value = this.values[field.key]
				if (field.widget === 'number' && String(value ?? '').trim() !== '') {
					const parsed = Number(value)
					if (!Number.isNaN(parsed)) value = parsed
				}
				data[field.key] = value
			}
			/**
			 * @event confirm Emitted when the user confirms with all required
			 * inputs filled. Payload holds exactly the declared input keys; the
			 * parent POSTs `{ action, data }`.
			 * @type {{[key: string]: *}}
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
</style>
