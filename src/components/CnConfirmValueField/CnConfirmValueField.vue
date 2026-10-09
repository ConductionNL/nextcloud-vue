<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-dialog__confirm-field" data-testid="cn-confirm-value-field">
		<label class="cn-dialog__confirm-label" :for="inputId">{{ label }}</label>
		<input :id="inputId"
			class="cn-dialog__confirm-input"
			type="text"
			autocomplete="off"
			spellcheck="false"
			:value="modelValue"
			:aria-describedby="hintId"
			data-testid="cn-confirm-value-input"
			@input="onInput">
		<span :id="hintId" class="cn-dialog__confirm-hint" data-testid="cn-confirm-value-hint">
			{{ hintBefore }}<code>{{ value }}</code>{{ hintAfter }}
		</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { splitAroundPlaceholder } from '../../utils/dialogSentence.js'

let uid = 0

/**
 * CnConfirmValueField (internal) - the labelled text field of type-to-confirm,
 * with a hint that names the value to type.
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-type-to-confirm-keeps-the-button-off-until-it-matches
 *
 * @event update:modelValue Emitted with the typed text on every input.
 */
export default {
	name: 'CnConfirmValueField',

	props: {
		/** What the user typed. */
		modelValue: { type: String, default: '' },
		/** The value to type. */
		value: { type: String, required: true },
		/** Label of the field. */
		label: { type: String, default: () => t('nextcloud-vue', 'Type to confirm') },
	},

	emits: ['update:modelValue'],

	data() {
		uid += 1
		return { inputId: `cn-confirm-value-${uid}` }
	},

	computed: {
		hintId() {
			return `${this.inputId}-hint`
		},

		hintParts() {
			return splitAroundPlaceholder(t('nextcloud-vue', 'Type {value} to enable the button.'), 'value')
		},

		hintBefore() {
			return this.hintParts[0]
		},

		hintAfter() {
			return this.hintParts[1]
		},
	},

	methods: {
		/**
		 * Forward the typed text.
		 *
		 * @param {Event} event The input event.
		 */
		onInput(event) {
			/**
			 * @event update:modelValue Emitted with the typed text on every input.
			 */
			this.$emit('update:modelValue', event.target.value)
		},
	},
}
</script>
