<!--
  CnCospendCreate — inline-create dialog for a fresh NC Cospend (Costs)
  project linked to the parent OR object.

  Form fields:
    - Project name (NcTextField, required)
    - Currency (NcSelect, optional — defaults to EUR)

  On submit, emits `create` with `{ name, currency }`. The parent
  (CnCospendTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/cospend/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnCospendCreate/` (NcDialog-based; matches the
  photos/collectives/poll create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-cospend-create"
		@closing="onClose">
		<form class="cn-cospend-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-cospend-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="name"
				:label="t('nextcloud-vue', 'Project name')"
				:maxlength="255"
				required />

			<NcSelect
				v-model="currency"
				:options="currencyOptions"
				:placeholder="t('nextcloud-vue', 'Select a currency')"
				:input-label="t('nextcloud-vue', 'Currency')"
				label="label"
				class="cn-cospend-create__currency" />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create project') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCospendCreate — inline-create dialog. Emits `create` with the form
 * payload `{ name, currency }`; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'

const DEFAULT_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY']

export default {
	name: 'CnCospendCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextField },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new project') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			name: '',
			currency: { id: 'EUR', label: 'EUR' },
		}
	},

	computed: {
		currencyOptions() {
			return DEFAULT_CURRENCIES.map(code => ({ id: code, label: code }))
		},

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
			const currency = (this.currency && this.currency.id) ? this.currency.id : ''
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ name, currency }`.
			 */
			this.$emit('create', { name: this.name.trim(), currency })
		},
	},
}
</script>

<style scoped>
.cn-cospend-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-cospend-create__error {
	margin: 4px 0;
}

.cn-cospend-create__currency {
	width: 100%;
}
</style>
