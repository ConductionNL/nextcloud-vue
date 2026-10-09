<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="name"
		:size="isBoard ? 'normal' : size"
		:noClose="noClose"
		:class="frameClass"
		:style="frameStyle"
		@closing="onClosing">
		<CnDialogHeader v-if="isBoard"
			:title="name"
			:eyebrow="eyebrow"
			:subtitle="subtitle"
			:noClose="noClose"
			@close="onClosing()" />
		<!-- @slot default The dialog body, below the board header. -->
		<slot />
		<template v-if="$slots.actions" #actions>
			<!-- @slot actions The dialog footer buttons. -->
			<slot name="actions" />
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog } from '@nextcloud/vue'
import CnDialogHeader from '../CnDialogHeader/CnDialogHeader.vue'
import { useLook } from '../../composables/useLook.js'
import { resolveDialogWidth } from '../../utils/dialogWidths.js'

/**
 * CnDialog (internal) - the one place where a `Cn*` dialog turns into the
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
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md
 *
 * @event closing Emitted when the dialog asks to close (close button, Escape, backdrop). Blocked while `noClose` is set.
 * @slot default The dialog body, below the board header.
 * @slot actions The dialog footer buttons.
 */
export default {
	name: 'CnDialog',

	components: { NcDialog, CnDialogHeader },

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
	},

	emits: ['closing'],

	setup(props) {
		const { isBoard, lookClass } = useLook(props)
		return { isBoard, lookClass }
	},

	computed: {
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
		/**
		 * Forward a close request.
		 *
		 * @param {unknown} [result] The NcDialog closing payload.
		 */
		onClosing(result) {
			/**
			 * @event closing Emitted when the dialog asks to close (close button, Escape, backdrop). Blocked while `noClose` is set.
			 */
			this.$emit('closing', result)
		},
	},
}
</script>
