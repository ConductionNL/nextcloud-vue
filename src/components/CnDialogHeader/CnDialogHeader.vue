<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-dialog-header" data-testid="cn-dialog-header">
		<div class="cn-dialog-header__text">
			<span v-if="eyebrow"
				class="cn-dialog-header__eyebrow"
				data-testid="cn-dialog-eyebrow">{{ eyebrow }}</span>
			<!--
				Presentational title. The dialog's accessible name comes from
				NcDialog's own (visually hidden in the board look) heading, which
				labels the modal, so the name is the title only: never the
				eyebrow or the subtitle. Repeating the heading here would make a
				screen reader announce the title twice.
			-->
			<div class="cn-dialog-header__title"
				aria-hidden="true"
				data-testid="cn-dialog-title">
				{{ title }}
			</div>
			<p v-if="subtitle"
				class="cn-dialog-header__subtitle"
				data-testid="cn-dialog-subtitle">
				{{ subtitle }}
			</p>
		</div>
		<NcButton class="cn-dialog-header__close"
			variant="tertiary"
			:aria-label="closeLabel"
			:disabled="noClose"
			data-testid="cn-dialog-close"
			@click="$emit('close')">
			<template #icon>
				<Close :size="20" />
			</template>
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'

/**
 * CnDialogHeader (internal) - the board dialog header: eyebrow, 20px title,
 * subtitle and a round 36px close button.
 *
 * The close button emits `close` and is disabled while `noClose` is set, so a
 * dialog that is loading cannot be dismissed (REQ-DG-015).
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-a-dialog-can-carry-an-eyebrow-and-a-subtitle
 */
export default {
	name: 'CnDialogHeader',

	components: { NcButton, Close },

	props: {
		/** Dialog title. */
		title: { type: String, default: '' },
		/** Context line above the title. */
		eyebrow: { type: String, default: '' },
		/** Sentence under the title. */
		subtitle: { type: String, default: '' },
		/** Disable the close button (a loading dialog). */
		noClose: { type: Boolean, default: false },
		/** Accessible name of the close button. */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
	},

	emits: ['close'],
}
</script>
