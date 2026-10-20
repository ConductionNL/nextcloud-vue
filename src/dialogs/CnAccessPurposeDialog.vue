<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="title || t('nextcloud-vue', 'Why are you opening this?')"
		defaultWidth="confirm"
		size="small"
		:noClose="loading"
		data-testid="cn-access-purpose-dialog"
		@closing="$emit('cancel')">
		<p class="cn-access-purpose__sentence">
			{{ description || t('nextcloud-vue', 'This record holds special categories of personal data. Your purpose is recorded with your name and the time.') }}
		</p>
		<fieldset class="cn-access-purpose__choices">
			<legend class="cn-access-purpose__legend">
				{{ t('nextcloud-vue', 'Purpose') }}
			</legend>
			<NcCheckboxRadioSwitch
				v-for="option in choices"
				:key="option.value"
				v-model="purpose"
				type="radio"
				name="cn-access-purpose"
				:value="option.value"
				:disabled="loading"
				:data-testid="`cn-access-purpose-option-${option.value}`">
				{{ option.label }}
			</NcCheckboxRadioSwitch>
		</fieldset>
		<NcTextArea
			v-if="purpose === OTHER"
			v-model="note"
			:label="t('nextcloud-vue', 'Describe your purpose')"
			:maxlength="500"
			:disabled="loading"
			data-testid="cn-access-purpose-note" />
		<NcNoteCard v-if="error" type="error" data-testid="cn-access-purpose-error">
			{{ error }}
		</NcNoteCard>

		<template #actions>
			<NcButton :disabled="loading" data-testid="cn-access-purpose-cancel" @click="$emit('cancel')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!complete || loading"
				data-testid="cn-access-purpose-submit"
				@click="submit">
				<template v-if="loading" #icon>
					<NcLoadingIcon :size="20" :name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ t('nextcloud-vue', 'Open') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcTextArea } from '@nextcloud/vue'
import CnDialog from '../components/CnDialog/CnDialog.vue'

/** The value of the "Other" choice, which asks for a written purpose. */
const OTHER = 'other'

/**
 * CnAccessPurposeDialog — asks why the reader opens a record before the page
 * shows it (detail page `accessPurpose`). A short list of purposes plus
 * "Other", which needs a written purpose. Emits the choice; the page records
 * it and decides whether to open.
 *
 * @spec openspec/changes/detail-access-purpose/specs/detail-access-purpose/spec.md#requirement-a-detail-page-can-ask-for-a-purpose-before-it-opens
 */
export default {
	name: 'CnAccessPurposeDialog',

	components: { CnDialog, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcTextArea },

	props: {
		/** The dialog's title; a default question when empty. */
		title: {
			type: String,
			default: '',
		},

		/** The sentence under the title; a default when empty. */
		description: {
			type: String,
			default: '',
		},

		/**
		 * The purposes offered, already translated. "Other" is added at the end.
		 *
		 * @type {Array<{value: string, label: string}>}
		 */
		options: {
			type: Array,
			default: () => [],
		},

		/** Whether the purpose is being recorded. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** Why the last attempt was refused, shown in the dialog. */
		error: {
			type: String,
			default: '',
		},
	},

	emits: [
		/**
		 * The reader chose a purpose.
		 *
		 * @type {{purpose: string, note: string}}
		 */
		'submit',
		/** The reader closed the dialog without a purpose. */
		'cancel',
	],

	data() {
		return { purpose: '', note: '', OTHER }
	},

	computed: {
		/** @return {Array<{value: string, label: string}>} The offered purposes and "Other". */
		choices() {
			const own = (Array.isArray(this.options) ? this.options : [])
				.filter((option) => option && typeof option.value === 'string' && option.value !== '' && option.value !== OTHER)
			return [...own, { value: OTHER, label: t('nextcloud-vue', 'Other') }]
		},

		/** @return {boolean} Whether a purpose is chosen and, for "Other", written. */
		complete() {
			if (this.purpose === '') {
				return false
			}
			return this.purpose !== OTHER || this.note.trim() !== ''
		},
	},

	methods: {
		t,

		/**
		 * Emit the chosen purpose; the written note only goes with "Other".
		 *
		 * @return {void}
		 */
		submit() {
			if (!this.complete) {
				return
			}
			this.$emit('submit', { purpose: this.purpose, note: this.purpose === OTHER ? this.note.trim() : '' })
		},
	},
}
</script>

<style scoped>
.cn-access-purpose__sentence {
	margin: 0 0 12px;
}

.cn-access-purpose__choices {
	margin: 0 0 12px;
	padding: 0;
	border: 0;
}

.cn-access-purpose__legend {
	margin-bottom: 4px;
	font-weight: 600;
}
</style>
