<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<!--
  CnTaskDelegateDialog: hand the viewer's own open task to a colleague, with
  the mandate relied on (OpenRegister `POST /api/flow-tasks/{uuid}/delegate`).

  The engine records the original performer as `onBehalfOf` and the mandate
  on the task, and refuses an empty delegate or mandate; this dialog asks for
  both before it sends, and shows a refusal in the server's own words without
  closing. Opened from CnTasksWidget's row menu when `content.delegate` is set.
-->
<template>
	<NcDialog
		:name="tr('Hand to a colleague')"
		size="normal"
		data-testid="cn-task-delegate-dialog"
		@closing="$emit('close')">
		<p class="cn-task-delegate__intro">
			{{ tr('{title} goes to the colleague you choose. You stay named as the one they act on behalf of.').replace('{title}', title) }}
		</p>
		<NcSelect
			v-model="colleague"
			:options="options"
			:inputLabel="tr('Colleague')"
			:filterable="false"
			:loading="searching"
			label="label"
			data-testid="cn-task-delegate-colleague"
			@search="search" />
		<NcTextArea
			v-model="mandate"
			class="cn-task-delegate__mandate"
			:label="tr('Mandate')"
			:helperText="tr('The authority this hand-over relies on, for example a standing mandate or your manager\'s instruction.')"
			resize="vertical"
			data-testid="cn-task-delegate-mandate" />
		<p
			v-if="error"
			class="cn-task-delegate__error"
			role="alert"
			data-testid="cn-task-delegate-error">
			{{ error }}
		</p>
		<template #actions>
			<NcButton data-testid="cn-task-delegate-cancel" @click="$emit('close')">
				{{ tr('Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!ready || sending"
				data-testid="cn-task-delegate-submit"
				@click="submit">
				{{ tr('Hand over') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcDialog, NcSelect, NcTextArea } from '@nextcloud/vue'
import { searchNextcloudUsers } from '../../utils/userAutocomplete.js'

/** OpenRegister's task store (the same endpoint CnTasksWidget reads). */
const FLOW_TASKS_URL = '/apps/openregister/api/flow-tasks'

export default {
	name: 'CnTaskDelegateDialog',

	components: { NcButton, NcDialog, NcSelect, NcTextArea },

	props: {
		/** The task row to hand over (needs its `uuid`). */
		task: { type: Object, required: true },
		/** The task's display title, for the intro line. */
		title: { type: String, default: '' },
	},

	emits: ['close', 'delegated'],

	data() {
		return {
			colleague: null,
			mandate: '',
			options: [],
			searching: false,
			sending: false,
			error: '',
		}
	},

	computed: {
		/**
		 * Both a colleague and a non-blank mandate: the engine refuses either
		 * missing, so the button waits for both.
		 *
		 * @return {boolean}
		 */
		ready() {
			return Boolean(this.colleague && this.colleague.id) && this.mandate.trim() !== ''
		},
	},

	methods: {
		/**
		 * Translate a library string.
		 *
		 * @param {string} key The English source string.
		 * @return {string}
		 */
		tr(key) {
			return t('nextcloud-vue', key)
		},

		/**
		 * Search colleagues by name, leaving out the viewer: a task cannot be
		 * handed to the one who holds it.
		 *
		 * @param {string} query The typed name.
		 * @return {Promise<void>}
		 */
		async search(query) {
			this.searching = true
			this.options = await searchNextcloudUsers(query, { includeCurrentUser: false })
			this.searching = false
		},

		/**
		 * Hand the task over. A refusal stays in the dialog in the server's
		 * words; success emits `delegated` with the engine's task.
		 *
		 * @return {Promise<void>}
		 */
		async submit() {
			if (!this.ready || this.sending) {
				return
			}
			this.sending = true
			this.error = ''
			const uuid = encodeURIComponent(String(this.task.uuid || ''))
			try {
				const response = await axios.post(generateUrl(`${FLOW_TASKS_URL}/${uuid}/delegate`), {
					delegate: this.colleague.id,
					mandate: this.mandate.trim(),
				})
				this.$emit('delegated', { task: response?.data?.task || response?.data || null, delegate: this.colleague })
			} catch (error) {
				const data = error?.response?.data
				const message = data?.error || data?.message
				this.error = typeof message === 'string' && message !== '' ? message : this.tr('The hand-over was refused')
			}
			this.sending = false
		},
	},
}
</script>

<style scoped>
.cn-task-delegate__intro {
	margin-bottom: calc(var(--default-grid-baseline) * 3);
}

.cn-task-delegate__mandate {
	margin-top: calc(var(--default-grid-baseline) * 3);
}

.cn-task-delegate__error {
	margin-top: calc(var(--default-grid-baseline) * 2);
	color: var(--color-error-text);
}
</style>
