<!--
  CnPollCreate — inline-create dialog for a fresh NC Polls poll linked
  to the parent OR object.

  Form fields:
    - Title       (NcTextField, required)
    - Description (NcTextArea, optional)
    - Type        (radio: text choice / date choice)
    - Options     (dynamic list, add/remove rows; min 2 required)
    - Deadline    (input type=datetime-local, optional)

  On submit, emits `create` with
  `{ title, description, type, options: [string], deadline?: ISO-8601 }`.
  The parent (CnPollsTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/polls/new`.

  ADR-004: lives in its own .vue file under `src/components/CnPollCreate/`.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-poll-create"
		@closing="onClose">
		<form class="cn-poll-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-poll-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Title')"
				:maxlength="128"
				required />

			<NcTextArea
				v-model="description"
				:label="t('nextcloud-vue', 'Description')"
				:maxlength="4000"
				:rows="3" />

			<fieldset class="cn-poll-create__type">
				<legend>{{ t('nextcloud-vue', 'Poll type') }}</legend>
				<label class="cn-poll-create__type-option">
					<input
						v-model="type"
						type="radio"
						value="textPoll">
					<span>{{ t('nextcloud-vue', 'Text choice') }}</span>
				</label>
				<label class="cn-poll-create__type-option">
					<input
						v-model="type"
						type="radio"
						value="datePoll">
					<span>{{ t('nextcloud-vue', 'Date choice') }}</span>
				</label>
			</fieldset>

			<div class="cn-poll-create__options">
				<div class="cn-poll-create__options-header">
					<span class="cn-poll-create__options-label">{{ t('nextcloud-vue', 'Options') }}</span>
					<NcButton variant="tertiary" :aria-label="t('nextcloud-vue', 'Add option')" @click="addOption">
						<template #icon>
							<Plus :size="18" />
						</template>
						{{ t('nextcloud-vue', 'Add option') }}
					</NcButton>
				</div>
				<ul class="cn-poll-create__options-list">
					<li
						v-for="(option, index) in options"
						:key="index"
						class="cn-poll-create__option">
						<NcTextField
							v-model="options[index]"
							:label="optionLabel(index)"
							:maxlength="200"
							class="cn-poll-create__option-input"
							@update:model-value="onOptionChange(index, $event)" />
						<NcButton
							type="tertiary-no-background"
							:aria-label="t('nextcloud-vue', 'Remove option')"
							:disabled="options.length <= 2"
							@click="removeOption(index)">
							<template #icon>
								<TrashCanOutline :size="18" />
							</template>
						</NcButton>
					</li>
				</ul>
			</div>

			<label class="cn-poll-create__deadline">
				<span class="cn-poll-create__deadline-label">{{ t('nextcloud-vue', 'Deadline (optional)') }}</span>
				<input
					v-model="deadline"
					type="datetime-local"
					class="cn-poll-create__deadline-input">
			</label>
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create poll') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnPollCreate — inline-create dialog. Emits `create` with the form
 * payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcTextArea, NcTextField } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'

export default {
	name: 'CnPollCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcTextArea, NcTextField, Plus, TrashCanOutline },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new poll') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			title: '',
			description: '',
			type: 'textPoll',
			options: ['', ''],
			deadline: '',
		}
	},

	computed: {
		canSubmit() {
			const filledOptions = this.options.map(o => (o || '').trim()).filter(o => o !== '')
			return this.title.trim() !== '' && filledOptions.length >= 2
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

		optionLabel(index) {
			return t('nextcloud-vue', 'Option {n}', { n: index + 1 })
		},

		addOption() {
			this.options.push('')
		},

		removeOption(index) {
			if (this.options.length <= 2) {
				return
			}
			this.options.splice(index, 1)
		},

		onOptionChange(index, value) {
			// NcTextField v-model already updates; this hook is reserved
			// for live validation feedback.
			this.options[index] = value
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			const payload = {
				title: this.title.trim(),
				description: this.description.trim(),
				type: this.type,
				options: this.options.map(o => (o || '').trim()).filter(o => o !== ''),
				deadline: this.deadline ? new Date(this.deadline).toISOString() : null,
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ title, description, type, options, deadline }`.
			 */
			this.$emit('create', payload)
		},
	},
}
</script>

<style scoped>
.cn-poll-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-poll-create__error {
	margin: 4px 0;
}

.cn-poll-create__type {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px 12px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-poll-create__type legend {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	padding: 0 4px;
}

.cn-poll-create__type-option {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}

.cn-poll-create__options {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-poll-create__options-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.cn-poll-create__options-label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-poll-create__options-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-poll-create__option {
	display: flex;
	align-items: flex-end;
	gap: 4px;
}

.cn-poll-create__option-input {
	flex: 1 1 auto;
}

.cn-poll-create__deadline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-poll-create__deadline-label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-poll-create__deadline-input {
	border-radius: var(--border-radius);
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	background: var(--color-main-background);
	color: var(--color-main-text);
}
</style>
