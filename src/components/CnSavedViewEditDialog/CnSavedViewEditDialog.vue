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
		<div class="cn-edit-view" data-testid="cn-modal" data-testid-modal="cn-saved-view-edit-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<NcTextField
				:modelValue="name"
				:label="t('nextcloud-vue', 'Filter name')"
				:labelVisible="true"
				data-testid="cn-saved-view-edit-name"
				@update:modelValue="(v) => name = v" />
			<NcCheckboxRadioSwitch
				:modelValue="replaceCriteria"
				data-testid="cn-saved-view-edit-replace"
				@update:modelValue="(v) => replaceCriteria = v">
				{{ t('nextcloud-vue', 'Also replace the criteria with the current filters') }}
			</NcCheckboxRadioSwitch>
		</div>
		<template #actions>
			<NcButton :disabled="loading" @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="loading || !name.trim()"
				data-testid="cn-saved-view-edit-confirm"
				@click="onConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" :name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'

/**
 * CnSavedViewEditDialog — rename an own saved filter and, when asked, replace
 * its criteria with the filters, search and sort the list shows now. Opened by
 * `CnIndexPage` from the Edit entry of `CnSavedViewsControl`. Emits
 * `confirm({ name, replaceCriteria })`; the parent saves and either closes the
 * dialog or reports a failure through `setError()`, which keeps the form open.
 *
 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-3
 */
export default {
	name: 'CnSavedViewEditDialog',

	components: { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard, NcTextField },

	props: {
		/** The view being edited (its `name` fills the field). */
		view: {
			type: Object,
			default: () => ({}),
		},

		/** Dialog title. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Edit filter'),
		},
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			name: (this.view && typeof this.view.name === 'string') ? this.view.name : '',
			replaceCriteria: false,
			loading: false,
			error: '',
		}
	},

	methods: {
		t,

		/**
		 * Save clicked with a non-empty name.
		 *
		 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-3
		 */
		onConfirm() {
			if (!this.name.trim()) {
				return
			}
			this.loading = true
			this.error = ''
			/**
			 * @event confirm Save clicked. Payload: `{ name, replaceCriteria }`.
			 * @type {object}
			 */
			this.$emit('confirm', { name: this.name.trim(), replaceCriteria: this.replaceCriteria })
		},

		onClose() {
			/** @event close Dialog dismissed. */
			this.$emit('close')
		},

		/**
		 * Parent-callable (via ref): show a refused save and re-enable the form.
		 *
		 * @param {string} message The server's message.
		 * @public
		 */
		setError(message) {
			this.loading = false
			this.error = message || t('nextcloud-vue', 'Could not save the filter')
		},
	},
}
</script>

<style scoped>
.cn-edit-view {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block: 8px;
}
</style>
