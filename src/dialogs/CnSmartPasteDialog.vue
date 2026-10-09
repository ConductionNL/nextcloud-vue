<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="t('nextcloud-vue', 'Paste to fill')"
		size="normal"
		:noClose="busy"
		@closing="$emit('close')">
		<div class="cn-smart-paste">
			<label class="cn-smart-paste__label" :for="inputId">
				{{ t('nextcloud-vue', 'Pasted text') }}
			</label>
			<p v-if="hint" :id="`${inputId}-hint`" class="cn-smart-paste__hint">
				{{ hint }}
			</p>
			<textarea
				:id="inputId"
				v-model="text"
				class="cn-smart-paste__text"
				rows="8"
				:aria-describedby="hint ? `${inputId}-hint` : null"
				data-testid="cn-smart-paste-text" />
			<NcCheckboxRadioSwitch v-model="replace" data-testid="cn-smart-paste-replace">
				{{ t('nextcloud-vue', 'Replace what I typed') }}
			</NcCheckboxRadioSwitch>
			<NcNoteCard v-if="error" type="error" data-testid="cn-smart-paste-error">
				{{ error }}
			</NcNoteCard>
		</div>
		<template #actions>
			<NcButton :disabled="busy" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="busy || text.trim() === ''"
				data-testid="cn-smart-paste-fill"
				@click="$emit('fill', { text, replace })">
				<template #icon>
					<NcLoadingIcon v-if="busy" :size="20" :name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ t('nextcloud-vue', 'Fill') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'

let uid = 0

/**
 * CnSmartPasteDialog — the "Paste to fill" dialog of `CnFormPage`.
 *
 * A labelled text area (with the maker's hint), a "Replace what I typed"
 * checkbox and Fill. The page runs the handler; while it does, `busy` shows a
 * spinner and the text stays editable. A handler error comes back as `error`.
 * Internal to the library.
 */
export default {
	name: 'CnSmartPasteDialog',

	components: { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard },

	props: {
		/** The maker's hint, shown above the text area. */
		hint: {
			type: String,
			default: '',
		},

		/** True while the handler runs. */
		busy: {
			type: Boolean,
			default: false,
		},

		/** The handler's error message, shown in the dialog. */
		error: {
			type: String,
			default: '',
		},
	},

	emits: [
		/**
		 * The user chose Fill. Payload: `{ text, replace }`.
		 *
		 * @event fill
		 * @type {{text: string, replace: boolean}}
		 */
		'fill',
		/**
		 * The dialog should close.
		 *
		 * @event close
		 */
		'close',
	],

	data() {
		uid += 1
		return { text: '', replace: false, inputId: `cn-smart-paste-${uid}` }
	},

	methods: { t },
}
</script>

<style scoped>
.cn-smart-paste {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-smart-paste__label {
	font-weight: 600;
}

.cn-smart-paste__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-smart-paste__text {
	width: 100%;
	resize: vertical;
}
</style>
