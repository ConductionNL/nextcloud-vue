<!--
  CnTalkRoomCreate — inline-create dialog for a fresh NC Talk
  conversation room linked to the parent OR object.

  Form fields:
    - Name        (NcTextField, required)
    - Description (NcTextArea, optional)
    - Type        (NcSelect — Group/Public; one2one excluded)

  On submit, emits `create` with `{ name, description, type }`.
  The parent (CnTalkTab) is responsible for POSTing to
  `/api/objects/{register}/{schema}/{id}/talk/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnTalkRoomCreate/`.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-talk-room-create"
		@closing="onClose">
		<form class="cn-talk-room-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-talk-room-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="name"
				:label="t('nextcloud-vue', 'Room name')"
				:maxlength="200"
				required />

			<NcTextArea
				v-model="description"
				:label="t('nextcloud-vue', 'Description')"
				:maxlength="2000"
				:rows="3" />

			<NcSelect
				v-model="selectedType"
				:label="t('nextcloud-vue', 'Type')"
				:input-label="t('nextcloud-vue', 'Type')"
				:options="typeOptions"
				:clearable="false"
				required />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create room') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnTalkRoomCreate — inline-create dialog. Emits `create` with the
 * form payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'

export default {
	name: 'CnTalkRoomCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextArea, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new Talk room') },
	},

	emits: ['close', 'create'],

	data() {
		// Type 2 = group, 3 = public — one2one (1) is excluded per
		// Tier-2 contract since it can't be linked meaningfully.
		const groupOption = { id: 2, label: t('nextcloud-vue', 'Group (invite-only)') }
		return {
			error: '',
			name: '',
			description: '',
			selectedType: groupOption,
			typeOptions: [
				groupOption,
				{ id: 3, label: t('nextcloud-vue', 'Public (link-shareable)') },
			],
		}
	},

	computed: {
		canSubmit() {
			return Boolean(this.name.trim() && this.selectedType)
		},
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ name, description, type }`.
			 */
			this.$emit('create', {
				name: this.name.trim(),
				description: this.description.trim(),
				type: this.selectedType.id,
			})
		},
	},
}
</script>

<style scoped>
.cn-talk-room-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-talk-room-create__error {
	margin: 4px 0;
}
</style>
