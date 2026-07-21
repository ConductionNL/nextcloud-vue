<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:no-close="loading"
		@closing="onClose">
		<div
			class="cn-save-view"
			data-testid="cn-modal"
			data-testid-modal="cn-save-view-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				:value="name"
				:label="t('nextcloud-vue', 'View name')"
				:label-visible="true"
				:placeholder="t('nextcloud-vue', 'My view')"
				data-testid="cn-save-view-name-input"
				@update:value="(v) => name = v" />

			<NcCheckboxRadioSwitch
				:checked="isPublic"
				data-testid="cn-save-view-public-toggle"
				@update:checked="(v) => isPublic = v">
				{{ t('nextcloud-vue', 'Share with other users (public)') }}
			</NcCheckboxRadioSwitch>
		</div>

		<template #actions>
			<NcButton :disabled="loading" @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="loading || !name.trim()"
				data-testid="cn-save-view-confirm"
				@click="onConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Save view') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon, NcTextField, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'

/**
 * CnSaveViewDialog — small "Save current view…" dialog (saved-views-ui).
 *
 * Single-phase: collects a view name (+ optional public toggle) and emits
 * `@confirm({ name, isPublic })`. The PARENT owns persistence (POST to
 * OpenRegister's views API): on success it closes the dialog; on failure
 * it calls `setError(message)` on this dialog's ref so the user can retry
 * without losing their input.
 *
 * A full NcDialog with a regular NcTextField is used deliberately instead
 * of an NcActionInput add-action — NcActionInput's submit/input event
 * wiring is a recurring footgun and a dialog gives room for the public
 * toggle.
 *
 * @event {{ name: string, isPublic: boolean }} confirm — Save clicked with a non-empty name.
 * @event {void} close — Dialog dismissed.
 */
export default {
	name: 'CnSaveViewDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcTextField,
		NcCheckboxRadioSwitch,
		ContentSaveOutline,
	},

	props: {
		/** Dialog title shown in the NcDialog header. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Save current view'),
		},
	},

	data() {
		return {
			/** The view name being typed. */
			name: '',
			/** Whether the view is saved as public (shared). */
			isPublic: false,
			/** True between confirm and the parent's close/setError. */
			loading: false,
			/** Error message from the parent's failed save, shown in a note card. */
			error: '',
		}
	},

	methods: {
		t,

		/**
		 * Save-button click: emit the confirm intent; the parent persists
		 * and either closes the dialog or reports back via `setError()`.
		 */
		onConfirm() {
			if (!this.name.trim()) return
			this.loading = true
			this.error = ''
			/**
			 * @event confirm Save clicked with a non-empty (trimmed) name.
			 * @type {object}
			 */
			this.$emit('confirm', { name: this.name.trim(), isPublic: this.isPublic })
		},

		/**
		 * Cancel-button click / dialog dismissal.
		 */
		onClose() {
			/**
			 * @event close Dialog dismissed.
			 */
			this.$emit('close')
		},

		/**
		 * Parent-callable (via ref): surface a save failure and re-enable
		 * the form so the user can retry without losing input.
		 *
		 * @param {string} message Human-readable error message.
		 * @public
		 */
		setError(message) {
			this.loading = false
			this.error = message || t('nextcloud-vue', 'Failed to save view')
		},
	},
}
</script>

<style scoped>
.cn-save-view {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block: 8px;
}
</style>
