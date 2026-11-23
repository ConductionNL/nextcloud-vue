// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { normalizeLook } from '../composables/useLook.js'

/**
 * The props every `Cn*` dialog shares for the board look
 * (screens-dialog-parity). Spread them into a dialog's `props`:
 *
 * ```js
 * props: { ...dialogBoardProps, item: { ... } }
 * ```
 *
 * The dialog hands them to `CnDialog` (`:look`, `:width`, `:eyebrow`,
 * `:subtitle`, plus its own `default-width`). `look` has no default of its
 * own: unset, the dialog uses the injected `cnLook`, else the Nextcloud look.
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md
 */
export const dialogBoardProps = {
	/**
	 * The look this dialog is drawn in: `board` or `nextcloud`. Unset, it
	 * follows the app (`cnLook` from CnAppRoot).
	 */
	look: { type: String, default: undefined },
	/**
	 * Width role in the board look: `confirm` (560), `form` (640) or `wizard`
	 * (720). Unset, the component's own default applies. Ignored in the
	 * Nextcloud look, where `size` applies.
	 */
	width: {
		type: String,
		default: '',
		validator: (value) => value === '' || ['confirm', 'form', 'wizard'].includes(value),
	},
	/** Context line above the title (board look only). */
	eyebrow: { type: String, default: '' },
	/** Sentence under the title (board look only). */
	subtitle: { type: String, default: '' },
}

/**
 * Mixin for a dialog whose markup (not only its style) changes in the board
 * look: it exposes `isBoardLook` from the dialog's `look` prop or the injected
 * `cnLook`.
 */
export const dialogBoardMixin = {
	inject: {
		cnLook: { default: 'nextcloud' },
	},
	props: { ...dialogBoardProps },
	computed: {
		/**
		 * Whether this dialog is drawn in the board look.
		 *
		 * @return {boolean} True in the board look.
		 */
		isBoardLook() {
			const injected = this.cnLook && typeof this.cnLook === 'object' && 'value' in this.cnLook
				? this.cnLook.value
				: this.cnLook
			return normalizeLook(this.look || injected) === 'board'
		},
	},
}
