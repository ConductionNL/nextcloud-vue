<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="tr('Recompute the nomination')"
		width="confirm"
		:noClose="busy"
		data-testid="cn-retention-recompute-dialog"
		@closing="$emit('close')">
		<NcTextField
			:modelValue="reason"
			:label="tr('Why are you recomputing this?')"
			data-testid="cn-retention-reason"
			@update:modelValue="(value) => (reason = String(value ?? ''))" />
		<p class="cn-retention-recompute__muted">
			{{ recordedAgainst }}
		</p>
		<template #actions>
			<NcButton :disabled="busy" data-testid="cn-retention-recompute-cancel" @click="$emit('close')">
				{{ tr('Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="busy || reason.trim() === ''"
				data-testid="cn-retention-recompute"
				@click="$emit('confirm', reason.trim())">
				{{ tr('Recompute') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField } from '@nextcloud/vue'
import { CnDialog } from '../CnDialog/index.js'

/**
 * CnRetentionRecomputeDialog — asks why a record's archival nomination is
 * recomputed, the reason OpenRegister records with it. The retention widget
 * opens it from its card header (board DqZaakArchivering, "Nominatie
 * herberekenen") and posts the recompute itself.
 *
 * @event close The dialog is closed without recomputing.
 * @event confirm The person confirmed, with the reason (trimmed, never empty).
 * @spec openspec/changes/retention-recompute-header/specs/retention-recompute-header/spec.md#requirement-recomputing-the-nomination-starts-in-the-card-header-and-asks-for-a-reason
 */
export default {
	name: 'CnRetentionRecomputeDialog',

	components: { CnDialog, NcButton, NcTextField },

	inject: {
		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The user the recompute is recorded against. */
		user: { type: String, default: '' },
		/** Whether the recompute is being posted. */
		busy: { type: Boolean, default: false },
	},

	emits: ['close', 'confirm'],

	data() {
		return { reason: '' }
	},

	computed: {
		/**
		 * The line naming who the recompute is recorded against.
		 *
		 * @return {string} The line.
		 */
		recordedAgainst() {
			return t('nextcloud-vue', 'This is recorded against {user}.', { user: this.user })
		},
	},

	methods: {
		/**
		 * A library string in the reader's language.
		 *
		 * @param {string} key The English text.
		 * @return {string} The text.
		 */
		tr(key) {
			return t('nextcloud-vue', key)
		},
	},
}
</script>

<style scoped>
.cn-retention-recompute__muted {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}
</style>
