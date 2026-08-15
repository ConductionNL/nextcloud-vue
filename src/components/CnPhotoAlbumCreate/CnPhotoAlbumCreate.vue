<!--
  CnPhotoAlbumCreate — inline-create dialog for a fresh NC Photos album
  linked to the parent OR object.

  Form fields:
    - Name (NcTextField, required)

  On submit, emits `create` with `{ name }`. The parent (CnPhotosTab)
  POSTs to `/api/objects/{register}/{schema}/{id}/photos/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnPhotoAlbumCreate/` (NcDialog-based; matches the
  poll/talk/deck create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-photo-album-create"
		@closing="onClose">
		<form class="cn-photo-album-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-photo-album-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="name"
				:label="t('nextcloud-vue', 'Album name')"
				:maxlength="255"
				required />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create album') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnPhotoAlbumCreate — inline-create dialog. Emits `create` with the
 * form payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcTextField } from '@nextcloud/vue'

export default {
	name: 'CnPhotoAlbumCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new album') },
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
			 * @event create Emitted when the user confirms creation. Payload: `{ name }`.
			 */
			this.$emit('create', { name: this.name.trim() })
		},
	},
}
</script>

<style scoped>
.cn-photo-album-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-photo-album-create__error {
	margin: 4px 0;
}
</style>
