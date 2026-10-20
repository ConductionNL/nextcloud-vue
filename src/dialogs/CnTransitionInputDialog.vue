<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="form"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:name="dialogTitle"
		size="normal"
		@closing="$emit('close')">
		<div
			class="cn-transition-input"
			:aria-busy="busy ? 'true' : null"
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
			<CnTransitionInputFields
				:inputs="transition.inputs || []"
				:modelValue="values"
				:schema="schema"
				:currentObject="currentObject"
				:register="register"
				:context="context"
				:fieldErrors="fieldErrors"
				:disabled="busy"
				:columns="transition.columns === 2 ? 2 : 1"
				:summary="transition.summary || null"
				:notice="transition.notice || null"
				@update:modelValue="values = $event" />
		</div>

		<template #actions>
			<NcButton
				data-testid="cn-transition-input-cancel"
				@click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<!-- Busy while the parent's POST runs: a transition can take
			     seconds, and a confirm button that only greys out reads as one
			     that did nothing. -->
			<NcButton
				variant="primary"
				:disabled="!canConfirm"
				:aria-busy="busy ? 'true' : null"
				data-testid="cn-transition-input-confirm"
				@click="onConfirm">
				<template v-if="busy" #icon>
					<NcLoadingIcon :size="20" data-testid="cn-transition-input-busy" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import CnDialog from '../components/CnDialog/CnDialog.vue'
import CnTransitionInputFields from '../components/CnTransitionInputFields/CnTransitionInputFields.vue'
import { dialogBoardMixin } from '../mixins/dialogBoard.js'
import {
	initialInputValues,
	inputFieldsComplete,
	resolveInputFields,
	submittedValue,
} from '../utils/transitionInputs.js'

/**
 * CnTransitionInputDialog — collects a lifecycle transition's declared
 * `inputs` before the transition is applied.
 *
 * A schema's `x-openregister-lifecycle.transitions.<action>` block may declare
 * `inputs: [{ field, required }]`; the transition endpoint then accepts
 * `{ action, data: { <field>: <value> } }`. This dialog renders one input per
 * declared field, disables the confirm button until every shown
 * `required: true` field is filled, and emits the collected values — the
 * parent (`CnLifecycleActions`) performs the actual POST. Cancel emits `close`
 * without any confirm, so no request is made.
 *
 * The inputs are drawn by `CnTransitionInputFields`, which a host can also
 * use on its own to open an act's inputs in place. Field rendering resolves
 * each declared field against the object's JSON Schema via
 * `fieldsFromSchema()` when a `schema` is given: the label comes from the
 * property `title`, booleans render as a switch, numbers as a number field,
 * and long text (`maxLength > 255` or a `textarea`/`markdown` format) as a
 * textarea. Anything else — including a field the schema does not declare —
 * falls back to a plain labelled text input.
 *
 * An input may also say how it is asked for, which matters when the choices
 * depend on the record rather than on its schema: `label` names the field,
 * `options: [{ value, label }]` or `optionsSource` (a path into `context`)
 * turn it into a picker, and `widget` names `text`, `textarea`, `number`,
 * `date` or `template` outright. `other`, `helperFrom`, `preview` and
 * `default` are described in `utils/transitionInputs.js`. The transition may
 * carry `columns`, `summary` and `notice` for the layout around the inputs.
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
		CnDialog,
		CnTransitionInputFields,
		NcButton,
		NcLoadingIcon,
	},

	mixins: [dialogBoardMixin],

	props: {
		/**
		 * The transition being applied. `inputs` is the declared input list from
		 * `x-openregister-lifecycle.transitions.<action>.inputs` (server-derived
		 * or config-declared); `label` doubles as dialog title + confirm label.
		 * `columns`, `summary` and `notice` lay out the inputs (see
		 * `CnTransitionInputFields`).
		 *
		 * An input may carry a `label` for its field and `options` to pick
		 * from, each `{ value, label }`; the picker shows the label and sends
		 * the value.
		 *
		 * @type {{action?: string, label?: string, columns?: number, summary?: object, notice?: object, inputs?: Array<{field: string, required?: boolean, label?: string, widget?: string, options?: Array<{value: string, label?: string}>, optionsSource?: string}>}}
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
		 * What an input's `optionsSource` and the summary paths read.
		 *
		 * @type {object}
		 */
		context: {
			type: Object,
			default: () => ({}),
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
			values: initialInputValues(this.transition?.inputs, this.schema, this.currentObject),
		}
	},

	computed: {
		/** One field descriptor per declared input (see `resolveInputFields`). */
		fields() {
			return resolveInputFields(this.transition.inputs, {
				schema: this.schema,
				register: this.register,
				context: this.context,
				values: this.values,
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

		/** True when every shown `required: true` input holds a value. */
		canConfirm() {
			return this.busy !== true && inputFieldsComplete(this.fields, this.values)
		},
	},

	methods: {
		t,

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
		 * A typed sub-value of an object input.
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

		/** Confirm: emit the asked keys (numbers cast, "Other" as '') and let the parent POST. */
		onConfirm() {
			if (!this.canConfirm) {
				return
			}
			const data = {}
			for (const field of this.fields) {
				if (field.hidden || field.widget === 'template') {
					continue
				}
				if (field.widget === 'object') {
					data[field.key] = this.mergedObject(field)
					continue
				}
				let value = submittedValue(this.values[field.key])
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
			 * inputs filled. Payload holds the declared input keys that were
			 * asked; the parent POSTs `{ action, data }`.
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
</style>
