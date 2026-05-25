<!--
  CnAnalyticsReportCreate — inline-create dialog for a fresh NC Analytics
  report linked to the parent OR object.

  Form fields:
    - Name (NcTextField, required)
    - Type (NcSelect dropdown — NC Analytics datasource type)

  On submit, emits `create` with `{ name, type }`. The parent
  (CnAnalyticsTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/analytics/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnAnalyticsReportCreate/` (NcDialog-based; matches the
  photos/poll/talk/deck create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-analytics-report-create"
		@closing="onClose">
		<form class="cn-analytics-report-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-analytics-report-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="name"
				:label="t('nextcloud-vue', 'Report name')"
				:maxlength="255"
				required />

			<div class="cn-analytics-report-create__field">
				<label class="cn-analytics-report-create__label" for="cn-analytics-report-create-type">
					{{ t('nextcloud-vue', 'Report type') }}
				</label>
				<NcSelect
					id="cn-analytics-report-create-type"
					v-model="selectedType"
					:options="typeOptions"
					:clearable="false"
					label="label"
					:aria-label-combobox="t('nextcloud-vue', 'Report type')" />
			</div>
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create report') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnAnalyticsReportCreate — inline-create dialog. Emits `create` with the
 * form payload; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'

export default {
	name: 'CnAnalyticsReportCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextField },

	props: {
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new report') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			name: '',
			// NC Analytics datasource type codes. Group (0) is the safe
			// default — a blank folder report the user fills in later.
			typeOptions: [
				{ value: 0, label: t('nextcloud-vue', 'Group') },
				{ value: 2, label: t('nextcloud-vue', 'Database') },
				{ value: 1, label: t('nextcloud-vue', 'File') },
				{ value: 6, label: t('nextcloud-vue', 'JSON') },
				{ value: 4, label: t('nextcloud-vue', 'External') },
			],
			selectedType: { value: 0, label: t('nextcloud-vue', 'Group') },
		}
	},

	computed: {
		canSubmit() {
			return this.name.trim() !== ''
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
			if (!this.canSubmit) {
				return
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ name, type }`.
			 */
			this.$emit('create', {
				name: this.name.trim(),
				type: this.selectedType ? this.selectedType.value : 0,
			})
		},
	},
}
</script>

<style scoped>
.cn-analytics-report-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-analytics-report-create__error {
	margin: 4px 0;
}

.cn-analytics-report-create__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-analytics-report-create__label {
	font-size: 13px;
	font-weight: 500;
	color: var(--color-text-maxcontrast);
}
</style>
