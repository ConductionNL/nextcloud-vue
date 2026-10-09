/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useWriteFeedback — one voice for "your write landed", "it failed" and "are
 * you sure", over `@nextcloud/dialogs` toasts and the confirm dialog.
 *
 * @spec openspec/changes/write-feedback-toast-and-undo/tasks.md#task-1
 */
import { showError, showSuccess, showUndo } from '@nextcloud/dialogs'

/** How long an Undo stays on offer after a write, in milliseconds. */
export const UNDO_WINDOW_MS = 10000

/**
 * The feedback functions.
 *
 * @return {{ success: (message: string, options?: {undo?: () => (void|Promise<void>), timeout?: number}) => void, error: (message: string) => void, confirm: (message: string, options?: {title?: string, confirmLabel?: string, variant?: string}) => Promise<boolean> }} The helper.
 */
export function useWriteFeedback() {
	return {
		/**
		 * Say a write landed. With `undo`, the toast carries an Undo button for
		 * ten seconds that runs the callback once.
		 *
		 * @param {string} message What happened.
		 * @param {object} [options] Options.
		 * @param {() => (void|Promise<void>)} [options.undo] Reverses the write; omit when it cannot be reversed.
		 * @param {number} [options.timeout] Milliseconds the Undo stays (default ten seconds).
		 */
		success(message, { undo, timeout = UNDO_WINDOW_MS } = {}) {
			if (typeof undo !== 'function') {
				showSuccess(message)
				return
			}
			let used = false
			showUndo(message, () => {
				if (used) {
					return
				}
				used = true
				undo()
			}, { timeout })
		},

		/**
		 * Say a write failed.
		 *
		 * @param {string} message The server's message, or ours.
		 */
		error(message) {
			showError(message)
		},

		/**
		 * Ask before a destructive step.
		 *
		 * @param {string} message The question.
		 * @param {object} [options] Options.
		 * @param {string} [options.title] Dialog title.
		 * @param {string} [options.confirmLabel] Confirm button label.
		 * @param {string} [options.variant] `error` for a destructive step.
		 * @return {Promise<boolean>} True when confirmed, false on cancel.
		 */
		async confirm(message, options = {}) {
			const [{ spawnDialog }, { default: CnWriteConfirmDialog }] = await Promise.all([
				import('@nextcloud/vue/functions/dialog'),
				import('../dialogs/CnWriteConfirmDialog.vue'),
			])
			return new Promise((resolve) => {
				spawnDialog(CnWriteConfirmDialog, { message, ...options }, (ok) => resolve(ok === true))
			})
		},
	}
}
