<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="title || t('nextcloud-vue', 'Are you sure?')"
		size="small"
		@closing="$emit('close', false)">
		<NcNoteCard :type="variant === 'error' ? 'warning' : 'info'">
			{{ message }}
		</NcNoteCard>
		<template #actions>
			<NcButton data-testid="cn-write-confirm-cancel" @click="$emit('close', false)">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				:variant="variant === 'error' ? 'error' : 'primary'"
				data-testid="cn-write-confirm-ok"
				@click="$emit('close', true)">
				{{ confirmLabel || t('nextcloud-vue', 'Confirm') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard } from '@nextcloud/vue'

/**
 * CnWriteConfirmDialog — the small yes/no asked before a destructive write
 * (a danger or final-state transition). Single phase: it closes with `true`
 * on Confirm and `false` on Cancel or dismiss, so it works both mounted in a
 * template and spawned by `useWriteFeedback().confirm()`. Internal.
 */
export default {
	name: 'CnWriteConfirmDialog',

	components: { NcButton, NcDialog, NcNoteCard },

	props: {
		/** The question. */
		message: {
			type: String,
			default: '',
		},

		/** Dialog title; defaults to "Are you sure?". */
		title: {
			type: String,
			default: '',
		},

		/** Confirm button label; defaults to "Confirm". */
		confirmLabel: {
			type: String,
			default: '',
		},

		/** `error` for a destructive step. */
		variant: {
			type: String,
			default: 'primary',
		},
	},

	emits: [
		/**
		 * The dialog is done. Payload: `true` when confirmed, `false` otherwise.
		 *
		 * @event close
		 * @type {boolean}
		 */
		'close',
	],

	methods: { t },
}
</script>
