<!--
  CnTimeTrackerCreate — inline-create dialog for a fresh NC TimeManager
  client linked to the parent OR object.

  Form fields:
    - Client name (NcTextField, required)

  On submit, emits `create` with `{ name }`. The parent (CnTimeTrackerTab)
  POSTs to `/api/objects/{register}/{schema}/{id}/time-tracker/new`, which
  creates the TimeManager client and links it.

  Note: the leaf slug is `time-tracker` (with a hyphen); the underlying NC
  app id is `timemanager` (no hyphen). Only clients can be created inline —
  tasks + time entries are created from the TimeManager UI.

  ADR-004: lives in its own .vue file under
  `src/components/CnTimeTrackerCreate/` (NcDialog-based; matches the
  collectives/photos/poll/talk/deck create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-time-tracker-create"
		@closing="$emit('close')">
		<form class="cn-time-tracker-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-time-tracker-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="name"
				:label="t('nextcloud-vue', 'Client name')"
				:maxlength="255"
				required />
		</form>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create client') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnTimeTrackerCreate — inline-create dialog. Emits `create` with the form
 * payload `{ name }`; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcTextField } from '@nextcloud/vue'

export default {
	name: 'CnTimeTrackerCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcTextField },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new client') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			name: '',
		}
	},

	computed: {
		canSubmit() {
			return this.name.trim() !== ''
		},
	},

	methods: {
		t,

		submit() {
			if (!this.canSubmit) {
				return
			}
			this.$emit('create', { name: this.name.trim() })
		},
	},
}
</script>

<style scoped>
.cn-time-tracker-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-time-tracker-create__error {
	margin: 4px 0;
}
</style>
