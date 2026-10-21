<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  What the person does with one AI suggestion: use it, adapt it, or reject it.
  Using it copies it to the clipboard. Emits `decide` with
  `{ userAction, actualValue? }` for the oversight trail.
-->
<template>
	<div class="cn-ai-suggestion-decision" :data-testid="testid">
		<p v-if="decided"
			class="cn-ai-suggestion-decision__done"
			role="status"
			:data-testid="`${testid}-done`">
			{{ decided }}
		</p>
		<template v-else>
			<template v-if="editing">
				<label :for="`${testid}-draft`">
					{{ t('nextcloud-vue', 'Your version') }}
				</label>
				<textarea :id="`${testid}-draft`"
					v-model="draft"
					rows="4"
					:data-testid="`${testid}-draft`" />
			</template>
			<div class="cn-ai-suggestion-decision__actions">
				<NcButton v-if="editing"
					variant="primary"
					:data-testid="`${testid}-use-adapted`"
					@click="decide('modified')">
					{{ t('nextcloud-vue', 'Use my version') }}
				</NcButton>
				<template v-else>
					<NcButton variant="primary"
						:data-testid="`${testid}-use`"
						@click="decide('accepted')">
						{{ t('nextcloud-vue', 'Use this') }}
					</NcButton>
					<NcButton :data-testid="`${testid}-adapt`" @click="startEditing">
						{{ t('nextcloud-vue', 'Adapt') }}
					</NcButton>
				</template>
				<NcButton variant="tertiary"
					:data-testid="`${testid}-reject`"
					@click="decide('rejected')">
					{{ t('nextcloud-vue', 'Reject') }}
				</NcButton>
			</div>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'

export default {
	name: 'CnAiSuggestionDecision',
	components: { NcButton },

	props: {
		/** The suggestion text. */
		text: { type: String, required: true },
		/** Test id prefix, also the base of the draft field id. */
		testid: { type: String, default: 'cn-ai-suggestion-decision' },
	},

	emits: ['decide'],

	data() {
		return { editing: false, draft: '', decided: '' }
	},

	watch: {
		text() {
			this.editing = false
			this.draft = ''
			this.decided = ''
		},
	},

	methods: {
		t,

		startEditing() {
			this.draft = this.text
			this.editing = true
		},

		/**
		 * Report the decision, and copy a used suggestion to the clipboard.
		 *
		 * @param {string} userAction accepted, modified or rejected.
		 * @return {Promise<void>}
		 */
		async decide(userAction) {
			const used = userAction === 'modified' ? this.draft : this.text
			this.$emit('decide', { userAction, actualValue: userAction === 'modified' ? this.draft : undefined })
			this.decided = {
				accepted: t('nextcloud-vue', 'Used. Copied to your clipboard.'),
				modified: t('nextcloud-vue', 'Your version is used. Copied to your clipboard.'),
				rejected: t('nextcloud-vue', 'Rejected.'),
			}[userAction]
			if (userAction === 'rejected') {
				return
			}
			try {
				await navigator.clipboard.writeText(used)
			} catch {
				this.decided = userAction === 'modified' ? t('nextcloud-vue', 'Your version is used.') : t('nextcloud-vue', 'Used.')
			}
		},
	},
}
</script>

<style scoped>
.cn-ai-suggestion-decision {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-top: 8px;
}

.cn-ai-suggestion-decision__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-ai-suggestion-decision__done {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}
</style>
