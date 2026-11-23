<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="name"
		:size="isBoard ? 'normal' : size"
		:noClose="noClose || loading"
		:class="frameClass"
		:style="frameStyle"
		@closing="onClosing">
		<!-- @slot Replaces the board header (board look), or adds content above the body (Nextcloud look, under the NcDialog title). -->
		<slot v-if="$slots.header" name="header" />
		<CnDialogHeader v-else-if="isBoard && !headless"
			:title="name"
			:eyebrow="eyebrow"
			:subtitle="subtitle"
			:noClose="noClose || loading"
			@close="onClosing()" />
		<div v-for="place in noticeBlocks('top')" :key="place" class="cn-dialog__notices cn-dialog__notices--top">
			<NcNoteCard v-for="card in stateCards"
				:key="card.type"
				:type="card.type"
				class="cn-dialog__state"
				:class="[`cn-dialog__state--${card.type}`]"
				:data-testid="`cn-dialog-${card.type}`">
				<p>{{ card.text }}</p>
			</NcNoteCard>
			<!-- @slot Replaces the drawn `notices` (R1), under the header or, with `noticesPlacement: 'bottom'`, above the footer. -->
			<slot name="notice">
				<CnCardNotices :notices="notices" @noticeAction="onNoticeAction" @noticeDismiss="onNoticeDismiss" />
			</slot>
		</div>
		<!-- @slot The dialog body, below the board header. Hidden after `success` unless `keepBodyOnSuccess` is set. -->
		<slot v-if="showBody" />
		<div v-for="place in noticeBlocks('bottom')" :key="place" class="cn-dialog__notices cn-dialog__notices--bottom">
			<NcNoteCard v-for="card in stateCards"
				:key="card.type"
				:type="card.type"
				class="cn-dialog__state"
				:class="[`cn-dialog__state--${card.type}`]"
				:data-testid="`cn-dialog-${card.type}`">
				<p>{{ card.text }}</p>
			</NcNoteCard>
			<slot name="notice">
				<CnCardNotices :notices="notices" @noticeAction="onNoticeAction" @noticeDismiss="onNoticeDismiss" />
			</slot>
		</div>
		<template v-if="$slots.footer" #actions>
			<!-- @slot Replaces the whole footer: the `actions` slot and the built-in close and primary buttons. -->
			<slot name="footer" />
		</template>
		<template v-else-if="builtinButtons.length" #actions>
			<slot name="actions" />
			<NcButton v-if="showClose"
				:disabled="loading"
				data-testid="cn-dialog-close"
				@click="onClose">
				{{ closeButtonLabel }}
			</NcButton>
			<NcButton v-if="showPrimary"
				:variant="primaryVariant"
				:disabled="loading || primaryDisabled"
				data-testid="cn-dialog-primary"
				@click="onPrimary">
				<template v-if="loading || primaryIcon" #icon>
					<NcLoadingIcon v-if="loading" :size="20" :name="t('nextcloud-vue', 'Loading …')" />
					<CnIcon v-else :name="primaryIcon" :size="20" />
				</template>
				{{ primaryLabel }}
			</NcButton>
		</template>
		<template v-else-if="$slots.actions" #actions>
			<!-- @slot The dialog footer buttons, drawn before the built-in close and primary buttons. -->
			<slot name="actions" />
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnCardNotices from '../CnCardNotices/CnCardNotices.vue'
import CnDialogHeader from '../CnDialogHeader/CnDialogHeader.vue'
import { useLook } from '../../composables/useLook.js'
import { resolveDialogWidth } from '../../utils/dialogWidths.js'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnDialog - the one place where a `Cn*` dialog turns into the
 * board dialog (screens-dialog-parity).
 *
 * In the Nextcloud look it is `NcDialog` with the caller's `size`, unchanged.
 * In the board look it passes `size="normal"`, puts `cn-look-board` and
 * `cn-dialog-board` on the teleported container (a class on CnAppRoot cannot
 * reach it), sets `--cn-dialog-width` from the width role, and renders the
 * board header (eyebrow, title, subtitle, round close button) above the
 * default slot. The NcDialog heading stays in the DOM, visually hidden, as the
 * dialog's accessible name.
 *
 * Other attributes (`open`, `data-testid`, listeners such as `update:open`)
 * fall through to NcDialog.
 *
 * It is also the shell for a hand-built dialog, so the dialog does not redraw
 * the same state cards and footer. All of this is opt-in; without these props
 * the dialog renders as before.
 *
 * - `loading` disables the footer buttons, draws a loading icon on the primary
 *   button and blocks closing.
 * - `error` draws an error note card in the notice block (see `noticesPlacement`).
 * - `success` draws a success note card (the string, or `successText`), hides
 *   the body (unless `keepBodyOnSuccess`), hides the primary button and turns
 *   the cancel button into a close button.
 * - `showClose` draws the built-in cancel/close button (`close` event);
 *   `primaryLabel` draws the primary button (`primary` event).
 * - The `header` slot replaces the header, the `footer` slot the whole footer.
 *
 * ```vue
 * <CnDialog
 *   :name="t('myapp', 'Lock object')"
 *   :loading="loading"
 *   :error="error"
 *   :success="success"
 *   :success-text="t('myapp', 'Object locked')"
 *   show-close
 *   :primary-label="t('myapp', 'Lock')"
 *   primary-icon="LockOutline"
 *   @primary="lock"
 *   @close="close"
 *   @closing="close">
 *   <NcTextField v-model="process" :label="t('myapp', 'Process name')" />
 * </CnDialog>
 * ```
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md
 *
 * @event closing Emitted when the dialog asks to close (close button, Escape, backdrop). Blocked while `noClose` or `loading` is set.
 * @event close Emitted when the built-in cancel/close footer button is clicked.
 * @event primary Emitted when the built-in primary footer button is clicked while it is enabled.
 * @slot default The dialog body, below the board header.
 * @slot header Replaces the board header, or adds content above the body in the Nextcloud look.
 * @slot actions The dialog footer buttons, before the built-in ones.
 * @slot footer Replaces the whole footer.
 */
export default {
	name: 'CnDialog',

	components: { NcButton, NcDialog, NcLoadingIcon, NcNoteCard, CnCardNotices, CnDialogHeader, CnIcon },

	props: {
		/** Dialog title; also the accessible name. */
		name: { type: String, required: true },
		/** NcDialog size, used in the Nextcloud look only. */
		size: { type: String, default: 'small' },
		/** Block closing while an operation runs. */
		noClose: { type: Boolean, default: false },
		/** The look; unset follows the injected `cnLook`. */
		look: { type: String, default: undefined },
		/** Width role in the board look (`confirm`, `form`, `wizard`). */
		width: { type: String, default: '' },
		/** The component's own default width role. */
		defaultWidth: { type: String, default: 'form' },
		/** Context line above the title (board look). */
		eyebrow: { type: String, default: '' },
		/** Sentence under the title (board look). */
		subtitle: { type: String, default: '' },
		/**
		 * Leave out the board header: the body draws its own title and close
		 * button (CnUserSettingsDialog). `name` stays the accessible name.
		 */
		headless: { type: Boolean, default: false },
		/**
		 * The dialog's state banners (R1): each a `notice` content
		 * (`{ variant, role?, layout?, title?, text, actions?, dismissible? }`),
		 * such as the refusal a save answered.
		 *
		 * @type {Array<object>}
		 */
		notices: { type: Array, default: () => [] },
		/** Where the notices go: `top` (under the header) or `bottom` (above the footer buttons). */
		noticesPlacement: { type: String, default: 'top' },
		/**
		 * An operation is in flight: disables the footer buttons, draws a
		 * loading icon on the primary button and blocks closing.
		 */
		loading: { type: Boolean, default: false },
		/** Error message drawn in an error note card with the notices (see `noticesPlacement`). Empty draws none. */
		error: { type: String, default: '' },
		/**
		 * The operation succeeded. `true` draws `successText`, a string draws
		 * itself. Hides the body (see `keepBodyOnSuccess`) and the primary
		 * button, and the cancel button reads `closeLabel`.
		 *
		 * @type {boolean|string}
		 */
		success: { type: [Boolean, String], default: false },
		/** Success message used when `success` is `true`. Empty falls back to "Done.". */
		successText: { type: String, default: '' },
		/** Keep the body visible after `success`. */
		keepBodyOnSuccess: { type: Boolean, default: false },
		/** Draw the built-in cancel/close footer button, which emits `close`. */
		showClose: { type: Boolean, default: false },
		/** Label of the built-in cancel button before success. Empty falls back to "Cancel". */
		cancelLabel: { type: String, default: '' },
		/** Label of the built-in close button after success. Empty falls back to "Close". */
		closeLabel: { type: String, default: '' },
		/** Label of the built-in primary footer button, which emits `primary`. Empty draws no primary button. */
		primaryLabel: { type: String, default: '' },
		/** Variant of the built-in primary button. Use `error` for a destructive action. */
		primaryVariant: {
			type: String,
			default: 'primary',
			validator: (v) => ['primary', 'secondary', 'tertiary', 'error', 'warning', 'success'].includes(v),
		},

		/** A CnIcon name drawn on the primary button when it is not loading. Empty draws none. */
		primaryIcon: { type: String, default: '' },
		/** Disable the primary button, e.g. while the form is incomplete. */
		primaryDisabled: { type: Boolean, default: false },
	},

	emits: ['closing', 'close', 'primary', 'notice-action', 'notice-dismiss'],

	setup(props) {
		const { isBoard, lookClass } = useLook(props)
		return { isBoard, lookClass }
	},

	computed: {
		/** @return {boolean} Whether the `notices` prop holds any. */
		hasNotices() {
			return Array.isArray(this.notices) && this.notices.length > 0
		},

		/** @return {string} The success note card text, or '' for none. */
		successMessage() {
			if (typeof this.success === 'string') {
				return this.success
			}
			return this.success ? (this.successText || t('nextcloud-vue', 'Done.')) : ''
		},

		/**
		 * The state note cards to draw, inside the notice block (so they follow
		 * `noticesPlacement`). A list rather than `v-if`, so a dialog without
		 * state renders no placeholder and keeps its markup.
		 *
		 * @return {Array<{type: string, text: string}>}
		 */
		stateCards() {
			const cards = []
			if (this.successMessage) {
				cards.push({ type: 'success', text: this.successMessage })
			}
			if (this.error) {
				cards.push({ type: 'error', text: this.error })
			}
			return cards
		},

		/** @return {string[]} The built-in footer buttons to draw: `close` and/or `primary`. */
		builtinButtons() {
			const buttons = []
			if (this.showClose) {
				buttons.push('close')
			}
			if (this.showPrimary) {
				buttons.push('primary')
			}
			return buttons
		},

		/** @return {boolean} Whether the default slot is drawn. */
		showBody() {
			return !this.successMessage || this.keepBodyOnSuccess
		},

		/** @return {boolean} Whether the primary button is drawn. */
		showPrimary() {
			return this.primaryLabel !== '' && !this.successMessage
		},

		/** @return {string} The built-in cancel/close button label. */
		closeButtonLabel() {
			return this.successMessage
				? (this.closeLabel || t('nextcloud-vue', 'Close'))
				: (this.cancelLabel || t('nextcloud-vue', 'Cancel'))
		},

		resolvedWidth() {
			return resolveDialogWidth(this.width, this.defaultWidth)
		},

		frameClass() {
			return this.isBoard
				? [this.lookClass, 'cn-dialog-board', `cn-dialog-board--${this.resolvedWidth.role}`]
				: null
		},

		frameStyle() {
			return this.isBoard ? { '--cn-dialog-width': `${this.resolvedWidth.px}px` } : null
		},
	},

	methods: {
		t,

		/**
		 * The notice block to draw at one place: one entry when the notices go
		 * there, else none. A list rather than `v-if`, so a dialog without
		 * notices renders no placeholder and keeps its markup.
		 *
		 * @param {string} place `top` or `bottom`.
		 * @return {string[]} `[place]` or `[]`.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top
		 */
		noticeBlocks(place) {
			const at = this.noticesPlacement === 'bottom' ? 'bottom' : 'top'
			return at === place && (this.$slots.notice || this.hasNotices || this.stateCards.length > 0) ? [place] : []
		},

		/**
		 * Forward a close request.
		 *
		 * @param {unknown} [result] The NcDialog closing payload.
		 */
		onClosing(result) {
			/**
			 * @event closing Emitted when the dialog asks to close (close button, Escape, backdrop). Blocked while `noClose` or `loading` is set.
			 */
			this.$emit('closing', result)
		},

		/**
		 * Forward a notice's action button.
		 *
		 * @param {object} entry The clicked action.
		 * @param {object} notice The notice it belongs to.
		 */
		onNoticeAction(entry, notice) {
			/**
			 * @event notice-action Emitted when a notice's action button is clicked, with `(entry, notice)`.
			 */
			this.$emit('notice-action', entry, notice)
		},

		/**
		 * Forward a dismissed notice.
		 *
		 * @param {object} notice The dismissed notice.
		 */
		onNoticeDismiss(notice) {
			/**
			 * @event notice-dismiss Emitted when a dismissible notice is closed, with the notice.
			 */
			this.$emit('notice-dismiss', notice)
		},

		/** Forward a click on the built-in cancel/close button. */
		onClose() {
			/**
			 * @event close Emitted when the built-in cancel/close footer button is clicked.
			 */
			this.$emit('close')
		},

		/** Forward a click on the built-in primary button while it is enabled. */
		onPrimary() {
			if (this.loading || this.primaryDisabled) {
				return
			}
			/**
			 * @event primary Emitted when the built-in primary footer button is clicked while it is enabled.
			 */
			this.$emit('primary')
		},
	},
}
</script>
