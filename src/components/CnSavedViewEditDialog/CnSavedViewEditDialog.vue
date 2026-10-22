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
		<div class="cn-edit-view" data-testid="cn-modal" data-testid-modal="cn-saved-view-edit-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<p v-if="!isBoardLook" class="cn-edit-view__intro">
				{{ t('nextcloud-vue', 'Give the view another name, or replace its criteria with what the list shows now.') }}
			</p>
			<!-- The board look: the label above its field, the criteria as choice cards that say what each keeps (DqFilterBewerken). -->
			<template v-if="isBoardLook">
				<div class="cn-edit-view__field">
					<label class="cn-edit-view__label" :for="nameId">{{ t('nextcloud-vue', 'Name') }}</label>
					<NcTextField
						:id="nameId"
						:modelValue="name"
						:label="t('nextcloud-vue', 'Name')"
						:labelOutside="true"
						data-testid="cn-saved-view-edit-name"
						@update:modelValue="(v) => name = v" />
				</div>
				<CnChoiceCards
					:label="t('nextcloud-vue', 'Criteria')"
					layout="rows"
					:options="criteriaOptions"
					:modelValue="replaceCriteria ? 'replace' : 'keep'"
					data-testid="cn-saved-view-edit-replace"
					@update:modelValue="(v) => replaceCriteria = v === 'replace'" />
			</template>
			<NcTextField
				v-if="!isBoardLook"
				:modelValue="name"
				:label="t('nextcloud-vue', 'Name')"
				:labelVisible="true"
				data-testid="cn-saved-view-edit-name"
				@update:modelValue="(v) => name = v" />
			<fieldset v-if="!isBoardLook" class="cn-edit-view__criteria" data-testid="cn-saved-view-edit-replace">
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
				{{ t('nextcloud-vue', 'Whoever you share the view with sees the change at once.') }}
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
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import CnChoiceCards from '../CnChoiceCards/CnChoiceCards.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import { dialogBoardMixin } from '../../mixins/dialogBoard.js'

/**
 * CnSavedViewEditDialog — rename an own saved view and, when asked, replace
 * its criteria with the filters, search and sort the list shows now. Opened by
 * `CnIndexPage` from the Edit entry of `CnSavedViewsControl`. Emits
 * `confirm({ name, replaceCriteria })`; the parent saves and either closes the
 * dialog or reports a failure through `setError()`, which keeps the form open.
 *
 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-3
 */
export default {
	name: 'CnSavedViewEditDialog',

	components: { CnChoiceCards, CnDialog, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcTextField },

	mixins: [dialogBoardMixin],

	props: {
		/** The view being edited (its `name` fills the field). */
		view: {
			type: Object,
			default: () => ({}),
		},

		/** Dialog title; empty reads "Edit view: {name}". */
		dialogTitle: {
			type: String,
			default: '',
		},

		/** What the view holds now, shown under "Keep what is saved" in the board look. */
		savedSummary: {
			type: String,
			default: '',
		},

		/** What the list shows now, shown under "Replace with …" in the board look. */
		currentSummary: {
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
		/**
		 * The two criteria choices as choice cards, each with what it keeps.
		 *
		 * @return {Array<{value: string, label: string, description: string}>} The options.
		 * @spec openspec/changes/saved-view-edit-board-form/specs/saved-views/spec.md
		 */
		criteriaOptions() {
			return [
				{ value: 'keep', label: t('nextcloud-vue', 'Keep what is saved'), description: this.savedSummary },
				{ value: 'replace', label: t('nextcloud-vue', 'Replace with the current search term, filters and sort'), description: this.currentSummary },
			]
		},

		/** @return {string} The id that ties the board label to the name field. */
		nameId() {
			return `cn-edit-view-name-${this._uid ?? this.$?.uid ?? 0}`
		},

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
			return this.subtitle || (this.isBoardLook ? t('nextcloud-vue', 'Give the view another name, or replace its criteria with what the list shows now.') : '')
		},

		/** @return {string} The title. */
		resolvedTitle() {
			return this.dialogTitle || t('nextcloud-vue', 'Edit view: {name}', { name: (this.view && this.view.name) || '' })
		},

		/** @return {boolean} Whether the view is shared with anyone. */
		isShared() {
			return Array.isArray(this.view && this.view.sharedWith) && this.view.sharedWith.length > 0
		},
	},

	methods: {
		t,

		/**
		 * Save clicked with a non-empty name.
		 *
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-3
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
			this.error = message || t('nextcloud-vue', 'Could not save the view')
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

/* The board look: the label above its field, 14px/600, 6px apart. */
.cn-edit-view__field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.cn-edit-view__label {
	font-size: 14px;
	font-weight: 600;
}
</style>
