<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:no-close="loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null"
			class="cn-confirm__result"
			data-testid="cn-modal"
			data-testid-modal="cn-confirm-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Confirm phase -->
		<div v-else
			class="cn-confirm__confirm"
			data-testid="cn-modal"
			data-testid-modal="cn-confirm-dialog"
			data-testid-phase="confirm">
			<NcNoteCard :type="variant === 'error' ? 'warning' : 'info'">
				{{ message }}
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				:variant="variant"
				:disabled="loading"
				data-testid="cn-confirm-dialog-confirm"
				@click="executeConfirm">
				<template #icon>
					<!--
						`name` is REQUIRED for accessibility, not decoration.
						NcLoadingIcon always renders `role="img"`, and without a
						`name` it emits `aria-label=""` — a role="img" with no
						accessible name, which fails WCAG 1.1.1 / 4.1.2 (axe
						`role-img-alt`). The spinner is also the ONLY thing that
						announces the in-flight state here: the button is
						`:disabled` while loading and its visible text does not
						change, so a screen-reader user otherwise gets no signal
						that the confirm is running.
					-->
					<NcLoadingIcon
						v-if="loading"
						:size="20"
						:name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon } from '@nextcloud/vue'

/**
 * CnConfirmDialog — generic, verb-agnostic confirmation dialog.
 *
 * Two-phase UI (confirm → result), same pattern as `CnDeleteDialog` but
 * with no delete-specific copy or store coupling: the dialog does NOT
 * perform the confirmed operation itself — it emits a `confirm` event and
 * the parent performs the actual call, then reports back via `setResult()`
 * on a ref. Used by `CnWidgetObjectTable` to confirm-gate declarative
 * `object-op` actions (delete always; patch/create on `confirm: true`),
 * and reusable for any confirm→do→report flow.
 *
 * Destructive operations pass `variant="error"` so the primary button and
 * note-card styling read as destructive.
 *
 * ```vue
 * <CnConfirmDialog
 *   v-if="showConfirm"
 *   ref="confirmDialog"
 *   :dialog-title="t('myapp', 'Accept request')"
 *   :message="t('myapp', 'Accept this request?')"
 *   @confirm="onConfirm"
 *   @close="showConfirm = false" />
 * ```
 *
 * // In methods:
 * async onConfirm() {
 *   const ok = await doTheThing()
 *   this.$refs.confirmDialog.setResult(ok ? { success: true } : { error: 'It failed' })
 * }
 */
export default {
	name: 'CnConfirmDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
	},

	props: {
		/** Dialog title shown in the NcDialog header. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Confirm action'),
		},
		/** Confirmation question shown in the confirm phase's note card. */
		message: {
			type: String,
			default: () => t('nextcloud-vue', 'Are you sure you want to continue?'),
		},
		/**
		 * Visual variant of the primary confirm button. Use `error` for
		 * destructive operations (delete) — the confirm-phase note card then
		 * renders as a warning instead of an info note.
		 */
		variant: {
			type: String,
			default: 'primary',
			validator: (v) => ['primary', 'error', 'warning', 'success'].includes(v),
		},
		/** Label of the primary button that fires the `confirm` event. */
		confirmLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Confirm'),
		},
		/** Label of the cancel button (visible during the confirm phase). */
		cancelLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Cancel'),
		},
		/** Label of the close button (visible during the result phase). */
		closeLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Close'),
		},
		/** Success message shown in the result phase after `setResult({ success: true })`. */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Done.'),
		},
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			/** True between the confirm click and the parent's setResult() call. */
			loading: false,
			/** @type {{ success?: boolean, error?: string }|null} Result phase payload (null = confirm phase). */
			result: null,
			/** Auto-close timer handle for the success result phase. */
			closeTimeout: null,
		}
	},

	beforeUnmount() {
		if (this.closeTimeout) clearTimeout(this.closeTimeout)
	},

	methods: {
		// Exposed to the template for the loading spinner's accessible name —
		// the same `methods: { t }` pattern the other dialogs in this folder
		// use (e.g. CnEditPagesModal). The prop defaults above call `t()`
		// directly at module scope, which the template cannot do.
		t,
		/**
		 * Primary-button click: enter the loading state and hand control to
		 * the parent, which performs the confirmed operation.
		 */
		executeConfirm() {
			this.loading = true
			/**
			 * @event confirm Emitted when the user confirms. The parent performs
			 * the actual operation and reports back via `setResult()`.
			 */
			this.$emit('confirm')
		},

		/**
		 * Report the confirmed operation's outcome. Call this from the parent
		 * after the operation completes; flips the dialog into its result
		 * phase. A success auto-closes after 2 seconds.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData The outcome to display.
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData
			if (resultData && resultData.success) {
				this.closeTimeout = setTimeout(() => {
					/**
					 * @event close Emitted when the dialog should close (cancel,
					 * close button, or auto-close 2s after a success result).
					 */
					this.$emit('close')
				}, 2000)
			}
		},
	},
}
</script>

<style scoped>
.cn-confirm__confirm {
	padding: 4px 0;
}
</style>
