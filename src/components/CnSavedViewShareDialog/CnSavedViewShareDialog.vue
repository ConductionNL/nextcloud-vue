<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:noClose="loading"
		@closing="onClose">
		<div class="cn-share-view" data-testid="cn-modal" data-testid-modal="cn-saved-view-share-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<CnSavedViewShareFields v-model="sharedWith" />
		</div>
		<template #actions>
			<NcButton :disabled="loading" @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="loading"
				data-testid="cn-saved-view-share-confirm"
				@click="onConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" :name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ t('nextcloud-vue', 'Save sharing') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnSavedViewShareFields from '../CnSavedViewShareFields/CnSavedViewShareFields.vue'

/**
 * CnSavedViewShareDialog — change who a saved view is shared with. Opened by
 * `CnIndexPage` from the Share entry of an own view in `CnSavedViewsControl`.
 * Emits `confirm(sharedWith)`; the parent saves and either closes the dialog
 * or reports a failure through `setError()`, which keeps the form open.
 */
export default {
	name: 'CnSavedViewShareDialog',

	components: { CnSavedViewShareFields, NcButton, NcDialog, NcLoadingIcon, NcNoteCard },

	props: {
		/** The view being shared (its `sharedWith` seeds the fields). */
		view: {
			type: Object,
			default: () => ({}),
		},

		/** Dialog title. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Share view'),
		},
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			sharedWith: Array.isArray(this.view && this.view.sharedWith) ? this.view.sharedWith.map((e) => ({ group: e.group, mode: e.mode === 'write' ? 'write' : 'read' })) : [],
			loading: false,
			error: '',
		}
	},

	methods: {
		t,

		onConfirm() {
			this.loading = true
			this.error = ''
			/**
			 * @event confirm Save clicked. Payload: the audience, `[{ group, mode }]` (`[]` to stop sharing).
			 * @type {Array<{group: string, mode: string}>}
			 */
			this.$emit('confirm', this.sharedWith)
		},

		onClose() {
			/** @event close Dialog dismissed. */
			this.$emit('close')
		},

		/**
		 * Parent-callable (via ref): show the server's message and re-enable the form.
		 *
		 * @param {string} message The message.
		 * @public
		 */
		setError(message) {
			this.loading = false
			this.error = message || t('nextcloud-vue', 'Failed to save sharing')
		},
	},
}
</script>

<style scoped>
.cn-share-view {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block: 8px;
}
</style>
