<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="resolvedTitle"
		size="small"
		:noClose="loading"
		@closing="onClose">
		<div class="cn-edit-view" data-testid="cn-modal" data-testid-modal="cn-saved-view-edit-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<p class="cn-edit-view__intro">
				{{ t('nextcloud-vue', 'Give the filter another name, or replace its criteria with what the list shows now.') }}
			</p>
			<NcTextField
				:modelValue="name"
				:label="t('nextcloud-vue', 'Name')"
				:labelVisible="true"
				data-testid="cn-saved-view-edit-name"
				@update:modelValue="(v) => name = v" />
			<fieldset class="cn-edit-view__criteria" data-testid="cn-saved-view-edit-replace">
				<legend>{{ t('nextcloud-vue', 'Criteria') }}</legend>
				<NcCheckboxRadioSwitch
					type="radio"
					name="cn-edit-view-criteria"
					value="keep"
					:modelValue="replaceCriteria ? 'replace' : 'keep'"
					data-testid="cn-saved-view-edit-keep"
					@update:modelValue="replaceCriteria = false">
					{{ t('nextcloud-vue', 'Keep what is saved') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch
					type="radio"
					name="cn-edit-view-criteria"
					value="replace"
					:modelValue="replaceCriteria ? 'replace' : 'keep'"
					data-testid="cn-saved-view-edit-replace-current"
					@update:modelValue="replaceCriteria = true">
					{{ t('nextcloud-vue', 'Replace with the current search term, filters and sort') }}
				</NcCheckboxRadioSwitch>
			</fieldset>
			<p v-if="isShared" class="cn-edit-view__note">
				{{ t('nextcloud-vue', 'Whoever you share the filter with sees the change at once.') }}
			</p>
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

		/** Dialog title; empty reads "Edit filter: {name}". */
		dialogTitle: {
			type: String,
			default: '',
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

	computed: {
		/** @return {string} The title. */
		resolvedTitle() {
			return this.dialogTitle || t('nextcloud-vue', 'Edit filter: {name}', { name: (this.view && this.view.name) || '' })
		},

		/** @return {boolean} Whether the filter is shared with anyone. */
		isShared() {
			return Array.isArray(this.view && this.view.sharedWith) && this.view.sharedWith.length > 0
		},
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
.cn-edit-view__intro,
.cn-edit-view__note {
	margin: 0;
}

.cn-edit-view__note {
	color: var(--color-text-maxcontrast);
}

.cn-edit-view__criteria {
	display: flex;
	flex-direction: column;
	gap: 4px;
	border: 0;
	margin: 0;
	padding: 0;
}

.cn-edit-view__criteria legend {
	font-weight: bold;
	margin-bottom: 4px;
}

.cn-edit-view {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block: 8px;
}
</style>
