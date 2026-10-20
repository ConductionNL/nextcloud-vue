<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="awaitingRequest || error || truncated" class="cn-endpoint-notice">
		<div v-if="awaitingRequest" class="cn-endpoint-notice__request" data-testid="cn-endpoint-notice-request">
			<p v-if="requestHint" class="cn-endpoint-notice__hint">
				{{ requestHint }}
			</p>
			<NcButton
				variant="primary"
				:disabled="requestDisabled"
				data-testid="cn-endpoint-request"
				@click="$emit('request')">
				{{ requestLabel || t('nextcloud-vue', 'Show') }}
			</NcButton>
		</div>
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
import { NcButton, NcNoteCard } from '@nextcloud/vue'

/**
 * CnEndpointNotice: what an endpoint-fed widget shows instead of, or beside,
 * its data when the read did not answer in full.
 *
 * - A refusal (401/403) shows the server's own sentence as a warning, so the
 *   reader learns why rather than seeing an empty widget.
 * - A failure shows the server's message as an error.
 * - A `truncated` answer shows an info note: the figures are short.
 *
 * - A source with `loadOn: 'request'` that has not been asked yet shows a
 *   button (`requestLabel`, default "Show"), with an optional `requestHint`
 *   above it; pressing it emits `request`.
 *
 * Bind it to the `error`, `refused`, `truncated` and `awaitingRequest` refs of
 * `useEndpointSource`, and `@request` to its `request()`. It renders nothing
 * when all four are empty.
 */
export default {
	name: 'CnEndpointNotice',

	components: { NcButton, NcNoteCard },

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

		/** Whether the source waits for the reader to ask (`loadOn: 'request'`). */
		awaitingRequest: {
			type: Boolean,
			default: false,
		},

		/** The button that asks, already translated (default "Show"). */
		requestLabel: {
			type: String,
			default: '',
		},

		/** A sentence above the button, already translated. */
		requestHint: {
			type: String,
			default: '',
		},

		/** Whether the button is disabled, such as while a required token is unset. */
		requestDisabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['request'],

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

.cn-endpoint-notice__request {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	padding: 8px 0;
}

.cn-endpoint-notice__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
