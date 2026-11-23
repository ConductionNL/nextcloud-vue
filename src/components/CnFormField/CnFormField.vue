<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-form-field__head" data-testid="cn-form-field-head">
		<label class="cn-form-field__label"
			:for="controlId"
			data-testid="cn-form-field-label">{{ text }}<span v-if="optional"
				class="cn-form-field__optional"
				data-testid="cn-form-field-optional"> ({{ optionalLabel }})</span></label>
		<p v-if="error"
			:id="errorId"
			class="cn-form-field__error"
			data-testid="cn-form-field-error">
			<AlertCircleOutline :size="20" aria-hidden="true" />
			<span class="cn-form-field__error-text"><span class="cn-form-field__sr">{{ errorPrefix }} </span>{{ error }}</span>
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'

/**
 * CnFormField (internal) - the head of a board look form field: the label
 * above the control (14px/600, "(optional)" in grey after it) and, when the
 * field failed validation, the error between the label and the control with an
 * icon and a visually hidden "Error:" prefix.
 *
 * It renders the label and the error only. The control and the hint stay where
 * the form already draws them, so the DOM order is label, error, control, hint.
 * Required fields carry no mark; the word "optional" comes from the
 * translatable `optionalLabel`.
 *
 * @spec openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md#requirement-the-label-sits-above-the-input
 */
export default {
	name: 'CnFormField',

	components: { AlertCircleOutline },

	props: {
		/** Id of the control the label points at (`for`). */
		controlId: { type: String, required: true },
		/** Label text. */
		text: { type: String, default: '' },
		/** Show "(optional)" after the label. */
		optional: { type: Boolean, default: false },
		/** The word shown between the brackets. */
		optionalLabel: { type: String, default: () => t('nextcloud-vue', 'optional') },
		/** Validation error shown between the label and the control. */
		error: { type: String, default: '' },
		/** Id of the error element, for the control's `aria-describedby`. */
		errorId: { type: String, default: undefined },
		/** Visually hidden prefix read before the error. */
		errorPrefix: { type: String, default: () => t('nextcloud-vue', 'Error:') },
	},
}
</script>
