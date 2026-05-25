<!--
  CnBookmarkCreate — inline-create dialog for a fresh NC Bookmarks
  bookmark linked to the parent OR object.

  Form fields:
    - Title       (NcTextField, required)
    - URL         (NcTextField, required, validated as http/https)
    - Description (NcTextArea, optional)
    - Tags        (NcTextField, comma-separated → string[])

  On submit, emits `create` with
  `{ title, url, description, tags: [string] }`. The parent
  (CnBookmarksTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/bookmarks/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnBookmarkCreate/` (NcDialog-based; matches the poll/
  contact picker pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-bookmark-create"
		@closing="onClose">
		<form class="cn-bookmark-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-bookmark-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Title')"
				:maxlength="512"
				required />

			<NcTextField
				v-model="url"
				:label="t('nextcloud-vue', 'URL')"
				placeholder="https://"
				:error="urlTouched && !urlValid"
				:helper-text="urlTouched && !urlValid ? t('nextcloud-vue', 'Enter a valid http(s) URL.') : ''"
				required
				@blur="urlTouched = true" />

			<NcTextArea
				v-model="description"
				:label="t('nextcloud-vue', 'Description')"
				:maxlength="4000"
				:rows="3" />

			<NcTextField
				v-model="tagsInput"
				:label="t('nextcloud-vue', 'Tags')"
				:placeholder="t('nextcloud-vue', 'Comma-separated, e.g. reference, vendor')" />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create bookmark') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnBookmarkCreate — inline-create dialog. Emits `create` with the form
 * payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcTextArea, NcTextField } from '@nextcloud/vue'

export default {
	name: 'CnBookmarkCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcTextArea, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new bookmark') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			title: '',
			url: '',
			description: '',
			tagsInput: '',
			urlTouched: false,
		}
	},

	computed: {
		/**
		 * Whether the URL parses as an absolute http/https URL.
		 *
		 * @return {boolean}
		 */
		urlValid() {
			const value = this.url.trim()
			if (value === '') {
				return false
			}
			try {
				const parsed = new URL(value)
				return parsed.protocol === 'http:' || parsed.protocol === 'https:'
			} catch (e) {
				return false
			}
		},

		canSubmit() {
			return this.title.trim() !== '' && this.urlValid
		},

		/**
		 * Parsed tags array from the comma-separated input.
		 *
		 * @return {string[]}
		 */
		parsedTags() {
			return this.tagsInput
				.split(',')
				.map((tag) => tag.trim())
				.filter((tag) => tag !== '')
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
			this.urlTouched = true
			if (!this.canSubmit) {
				return
			}
			const payload = {
				title: this.title.trim(),
				url: this.url.trim(),
				description: this.description.trim(),
				tags: this.parsedTags,
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ title, url, description, tags }`.
			 */
			this.$emit('create', payload)
		},
	},
}
</script>

<style scoped>
.cn-bookmark-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-bookmark-create__error {
	margin: 4px 0;
}
</style>
