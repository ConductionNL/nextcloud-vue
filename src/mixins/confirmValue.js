// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { translate as t } from '@nextcloud/l10n'

/**
 * Type-to-confirm for a destructive dialog (screens-dialog-parity). With a
 * non-empty `confirmValue` the dialog shows a field and keeps its destructive
 * button disabled until the field holds exactly that value. Without it the
 * dialog behaves as before. Holds in both looks.
 *
 * The dialog's own `confirmLabel` prop is the button label, so the field's
 * label is `confirmFieldLabel`.
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-type-to-confirm-keeps-the-button-off-until-it-matches
 */
export const confirmValueMixin = {
	props: {
		/** Value the user must type before the destructive button enables. Empty: no field. */
		confirmValue: { type: String, default: '' },
		/** Label of the type-to-confirm field. */
		confirmFieldLabel: { type: String, default: () => t('nextcloud-vue', 'Type to confirm') },
	},

	data() {
		return { typedConfirmValue: '' }
	},

	computed: {
		/**
		 * Whether the destructive action is allowed by type-to-confirm.
		 *
		 * @return {boolean} True without a `confirmValue`, or on an exact match.
		 */
		confirmValueMatches() {
			return this.confirmValue === '' || this.typedConfirmValue === this.confirmValue
		},

		/**
		 * Whether type-to-confirm is holding the destructive button back.
		 *
		 * @return {boolean} True while a value is required and not yet typed.
		 */
		confirmValuePending() {
			return !this.confirmValueMatches
		},
	},
}
