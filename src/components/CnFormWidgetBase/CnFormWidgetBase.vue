<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -
  - CnFormWidgetBase — the abstract form-shaped dashboard widget.
  -
  - It owns the SHAPE of a form widget: a stack of labelled fields, a
  - right-aligned action row, and one inline error line. It owns no domain
  - logic at all — no schema, no endpoint, no save. A concrete form widget
  - declares its `fields`, holds its own `model`, and does its own submitting;
  - what it gets back is a rendering identical to every other form widget's.
  -
  - Extracted from CnInteractionFormWidget, whose rendering is the reference
  - (see src/css/form-widget.css). The markup and the CSS values are that
  - widget's, unchanged — `e2e/interaction-form-widget.e2e.js` screenshots the
  - result to prove the extraction is invisible.
-->
<template>
	<div class="cn-form-widget" :class="blockClass">
		<div
			v-for="field in visibleFields"
			:key="field.key"
			class="cn-form-widget__field"
			:class="blockClass ? blockClass + '__field' : ''"
			:data-testid="'cn-form-widget-field-' + field.key">
			<!-- @slot field-{key} Replace one field's control entirely, keeping
			     the base's field wrapper, label spacing and stack rhythm.
			     Scope: `{ field, value, update }`. -->
			<slot
				:name="'field-' + field.key"
				:field="field"
				:value="valueOf(field)"
				:update="(v) => onUpdate(field, v)">
				<NcSelect
					v-if="field.type === 'select'"
					:model-value="selectedOption(field)"
					:options="field.options || []"
					:input-label="field.label"
					:label="field.optionLabel || 'label'"
					:clearable="field.clearable === true"
					:disabled="field.disabled === true"
					@update:model-value="(o) => onUpdate(field, o ? o[field.optionValue || 'value'] : '')" />

				<!-- The textarea is the one control with no NC component behind
				     it, so the base draws its own label — hence __label, which
				     the NC components supply themselves via `input-label`. -->
				<template v-else-if="field.type === 'textarea'">
					<label
						class="cn-form-widget__label"
						:class="blockClass ? blockClass + '__label' : ''"
						:for="fieldId(field)">
						{{ field.label }}
					</label>
					<textarea
						:id="fieldId(field)"
						class="cn-form-widget__textarea"
						:class="blockClass ? blockClass + '__textarea' : ''"
						:rows="field.rows || 4"
						:value="valueOf(field)"
						:disabled="field.disabled === true"
						@input="onUpdate(field, $event.target.value)" />
				</template>

				<NcTextField
					v-else
					:model-value="valueOf(field)"
					:label="field.label"
					:type="field.inputType || 'text'"
					:error="Boolean(errorFor(field))"
					:helper-text="errorFor(field)"
					:disabled="field.disabled === true"
					@update:model-value="(v) => onUpdate(field, v)" />
			</slot>
		</div>

		<div class="cn-form-widget__actions" :class="blockClass ? blockClass + '__actions' : ''">
			<!-- @slot actions Replace the submit row entirely (e.g. to add a
			     secondary button beside the primary one). -->
			<slot name="actions">
				<NcButton
					variant="primary"
					data-testid="cn-form-widget-submit"
					:disabled="submitting || !canSubmit"
					@click="onSubmit">
					{{ submitting ? submittingLabel : submitLabel }}
				</NcButton>
			</slot>
		</div>

		<p
			v-if="errorMessage"
			class="cn-form-widget__error"
			:class="blockClass ? blockClass + '__error' : ''"
			data-testid="cn-form-widget-error">
			{{ errorMessage }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import { nextUid } from '../../utils/uid.js'
import '../../css/form-widget.css'

/**
 * CnFormWidgetBase — the abstract form-widget primitive.
 *
 * Renders a stack of labelled fields, a right-aligned submit row and one
 * inline error line — the shape every form-shaped dashboard widget has.
 * Concrete form widgets supply the field descriptors and keep their own
 * model and submit logic, so they differ in what they DO and never in how
 * they look.
 *
 * ```vue
 * <CnFormWidgetBase
 *   block-class="cn-my-form-widget"
 *   :fields="fields"
 *   :model="form"
 *   :errors="{ subject: subjectError }"
 *   :can-submit="canSave"
 *   :submitting="saving"
 *   :submit-label="t('myapp', 'Save')"
 *   :error-message="errorMessage"
 *   @update:field="({ key, value }) => (form[key] = value)"
 *   @submit="onSave">
 *   <template #field-client="{ value, update }">
 *     <CnResourceSelect :model-value="value" @update:modelValue="update" />
 *   </template>
 * </CnFormWidgetBase>
 * ```
 *
 * Field descriptors are `{ key, label, type }` plus per-type extras:
 * - `select` — `options` (`[{ value, label }]`), `clearable`, `optionValue`,
 *   `optionLabel`
 * - `textarea` — `rows`
 * - `text` (the default) — `inputType`
 * - any type — `visible: false` to omit it, `disabled: true` to freeze it
 *
 * Any field can be replaced wholesale through the `field-<key>` slot while
 * keeping the base's wrapper and spacing — that is how a widget mounts a
 * control the base does not know about (a resource picker, a date range).
 */
export default {
	name: 'CnFormWidgetBase',

	components: { NcButton, NcSelect, NcTextField },

	props: {
		/**
		 * Extra BEM block prefix mirrored onto every element alongside the
		 * canonical `cn-form-widget*` classes (e.g. `cn-interaction-form-widget`
		 * also emits `cn-interaction-form-widget__field`). Exists so a widget
		 * that had its own class names before the extraction keeps them, and
		 * app CSS targeting those names keeps matching.
		 *
		 * @type {string}
		 */
		blockClass: {
			type: String,
			default: '',
		},
		/**
		 * Field descriptors, in render order. See the component description
		 * for the shape.
		 *
		 * @type {Array<{key: string, label?: string, type?: string, options?: Array, rows?: number, visible?: boolean, disabled?: boolean}>}
		 */
		fields: {
			type: Array,
			default: () => [],
		},
		/**
		 * The form values, keyed by field key. Read-only here: the base emits
		 * `update:field` and the host owns the mutation.
		 *
		 * @type {object}
		 */
		model: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Per-field validation messages, keyed by field key. A non-empty entry
		 * puts its field into the error state and shows the text as helper
		 * text.
		 *
		 * @type {object}
		 */
		errors: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the submit button is enabled (before `submitting`). */
		canSubmit: {
			type: Boolean,
			default: true,
		},
		/** Whether a submit is in flight — disables the button and swaps its label. */
		submitting: {
			type: Boolean,
			default: false,
		},
		/** Pre-translated submit button label. */
		submitLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Save'),
		},
		/** Pre-translated label shown while `submitting`. */
		submittingLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Saving…'),
		},
		/** Form-level error message, shown as one line below the actions. */
		errorMessage: {
			type: String,
			default: '',
		},
	},

	emits: ['update:field', 'submit'],

	data() {
		// In `data()` so it is fixed for the instance's lifetime — the value is
		// referenced by a `<label for>`, which breaks if the id changes between
		// renders (same reasoning as CnPagination's uid).
		return { uid: nextUid() }
	},

	computed: {
		/**
		 * The fields actually rendered — `visible: false` omits one without
		 * the host having to rebuild the array.
		 *
		 * @return {Array<object>}
		 */
		visibleFields() {
			return (this.fields || []).filter((f) => f && f.key && f.visible !== false)
		},
	},

	methods: {
		/**
		 * The current value for a field.
		 *
		 * @param {object} field Field descriptor.
		 * @return {*} The model value, or '' when unset.
		 */
		valueOf(field) {
			const v = (this.model || {})[field.key]
			return v === undefined || v === null ? '' : v
		},

		/**
		 * The validation message for a field, if any.
		 *
		 * @param {object} field Field descriptor.
		 * @return {string}
		 */
		errorFor(field) {
			return (this.errors || {})[field.key] || ''
		},

		/**
		 * A stable DOM id for a field's control, used to pair the base's own
		 * `<label for>` with the textarea.
		 *
		 * @param {object} field Field descriptor.
		 * @return {string}
		 */
		fieldId(field) {
			return `cn-form-widget-${this.uid}-${field.key}`
		},

		/**
		 * The option object matching a select field's current value, for
		 * NcSelect's object-shaped model.
		 *
		 * @param {object} field Field descriptor.
		 * @return {object|null}
		 */
		selectedOption(field) {
			const valueKey = field.optionValue || 'value'
			const current = this.valueOf(field)
			return (field.options || []).find((o) => o && o[valueKey] === current) || null
		},

		/**
		 * Submit-button click. Routed through a method rather than an inline
		 * `$emit` in the template so the event carries a docblock the
		 * styleguide can read.
		 *
		 * @return {void}
		 */
		onSubmit() {
			/**
			 * @event submit The user asked to submit the form. Carries no
			 * payload — the host owns the model, so it already has the values.
			 * Only reachable while the button is enabled, i.e. while neither
			 * `submitting` nor `!canSubmit` holds.
			 * @type {void}
			 */
			this.$emit('submit')
		},

		/**
		 * Report a field edit upward. The base never mutates `model` — the
		 * host owns its own state, which is what lets a concrete widget do
		 * something on change (stream the value into a workspace context, say)
		 * rather than only store it.
		 *
		 * @param {object} field Field descriptor.
		 * @param {*} value The new value.
		 * @return {void}
		 */
		onUpdate(field, value) {
			/**
			 * @event update:field A field's value changed.
			 * @type {{ key: string, value: * }}
			 */
			this.$emit('update:field', { key: field.key, value })
		},
	},
}
</script>
