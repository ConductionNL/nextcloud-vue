<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="error || truncated" class="cn-endpoint-notice">
		<NcNoteCard
			v-if="error"
			:type="refused ? 'warning' : 'error'"
			:data-testid="refused ? 'cn-endpoint-notice-refused' : 'cn-endpoint-notice-error'">
			{{ errorText }}
		</NcNoteCard>
		<NcNoteCard
			v-else-if="truncated"
			type="info"
			data-testid="cn-endpoint-notice-truncated">
			{{ truncatedText || t('nextcloud-vue', 'Not every record could be read, so these figures may be incomplete.') }}
		</NcNoteCard>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcNoteCard } from '@nextcloud/vue'

/**
 * CnEndpointNotice: what an endpoint-fed widget shows instead of, or beside,
 * its data when the read did not answer in full.
 *
 * - A refusal (401/403) shows the server's own sentence as a warning, so the
 *   reader learns why rather than seeing an empty widget.
 * - A failure shows the server's message as an error.
 * - A `truncated` answer shows an info note: the figures are short.
 *
 * Bind it to the `error`, `refused` and `truncated` refs of
 * `useEndpointSource`. It renders nothing when all three are empty.
 */
export default {
	name: 'CnEndpointNotice',

	components: { NcNoteCard },

	props: {
		/**
		 * The read's error message ('' when it succeeded). For a refusal this
		 * is the server's sentence.
		 */
		error: {
			type: String,
			default: '',
		},

		/** Whether the read was refused (401/403) rather than failing. */
		refused: {
			type: Boolean,
			default: false,
		},

		/** Whether the answer declared itself truncated. */
		truncated: {
			type: Boolean,
			default: false,
		},

		/** Overrides the default truncation sentence. */
		truncatedText: {
			type: String,
			default: '',
		},
	},

	computed: {
		/**
		 * The error sentence. A bare transport message ("error") is replaced
		 * by a readable one, since it tells the reader nothing.
		 *
		 * @return {string}
		 */
		errorText() {
			if (!this.error || this.error === 'error') {
				return t('nextcloud-vue', 'Could not load these records')
			}
			return this.error
		},
	},

	methods: { t },
}
</script>

<style scoped>
.cn-endpoint-notice {
	padding: 0 var(--default-grid-baseline, 4px);
}
</style>
