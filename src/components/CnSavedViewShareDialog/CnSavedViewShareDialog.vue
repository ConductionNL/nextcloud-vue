<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="form"
		:eyebrow="boardEyebrow"
		:subtitle="boardSubtitle"
		:name="resolvedTitle"
		size="small"
		:noClose="loading"
		@closing="onClose">
		<div class="cn-share-view" data-testid="cn-modal" data-testid-modal="cn-saved-view-share-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<p v-if="!isBoardLook" class="cn-share-view__intro">
				{{ t('nextcloud-vue', 'Whoever gets the view sees it under Shared with me. It is yours and stays yours.') }}
			</p>
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
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import CnSavedViewShareFields from '../CnSavedViewShareFields/CnSavedViewShareFields.vue'
import { dialogBoardMixin } from '../../mixins/dialogBoard.js'
import { normalizeSharedWith } from '../../utils/savedViewHelpers.js'

/**
 * CnSavedViewShareDialog — change who a saved view is shared with. Opened by
 * `CnIndexPage` from the Share entry of an own view in `CnSavedViewsControl`.
 * Emits `confirm(sharedWith)`; the parent saves and either closes the dialog
 * or reports a failure through `setError()`, which keeps the form open.
 */
export default {
	name: 'CnSavedViewShareDialog',

	components: { CnDialog, CnSavedViewShareFields, NcButton, NcLoadingIcon, NcNoteCard },

	mixins: [dialogBoardMixin],

	props: {
		/** The view being shared (its `sharedWith` seeds the fields). */
		view: {
			type: Object,
			default: () => ({}),
		},

		/** Dialog title; empty reads "Share view: {name}". */
		dialogTitle: {
			type: String,
			default: '',
		},
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			sharedWith: normalizeSharedWith(this.view && this.view.sharedWith),
			loading: false,
			error: '',
		}
	},

	computed: {
		/**
		 * The line above the title: the given eyebrow, else "Saved view" in
		 * the board look (DqFilterBewerken, DqFilterDelen).
		 *
		 * @return {string} The eyebrow.
		 */
		boardEyebrow() {
			return this.eyebrow || (this.isBoardLook ? t('nextcloud-vue', 'Saved view') : '')
		},

		/**
		 * The sentence under the title in the board look; the Nextcloud look
		 * keeps it as the first line of the body.
		 *
		 * @return {string} The subtitle.
		 */
		boardSubtitle() {
			return this.subtitle || (this.isBoardLook ? t('nextcloud-vue', 'Whoever gets the view sees it under Shared with me. It is yours and stays yours.') : '')
		},

		/** @return {string} The title: `dialogTitle`, else "Share view: {name}". */
		resolvedTitle() {
			return this.dialogTitle || t('nextcloud-vue', 'Share view: {name}', { name: (this.view && this.view.name) || '' })
		},
	},

	methods: {
		t,

		onConfirm() {
			this.loading = true
			this.error = ''
			/**
			 * @event confirm Save clicked. Payload: the audience, `[{ group, mode }]` and `[{ user, mode }]` (`[]` to stop sharing).
			 * @type {Array<{group?: string, user?: string, mode: string}>}
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
.cn-share-view__intro {
	margin: 0;
}

.cn-share-view {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block: 8px;
}
</style>
