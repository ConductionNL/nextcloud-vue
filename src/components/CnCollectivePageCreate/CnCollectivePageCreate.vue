<!--
  CnCollectivePageCreate — inline-create dialog for a fresh NC Collectives
  (Knowledge) page linked to the parent OR object.

  Form fields:
    - Collective (NcSelect, required) — loaded from
      GET /api/integrations/collectives/list
    - Title (NcTextField, required)

  On submit, emits `create` with `{ collectiveId, title }`. The parent
  (CnCollectivesTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/collectives/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnCollectivePageCreate/` (NcDialog-based; matches the
  photos/poll/talk/deck create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-collective-page-create"
		@closing="$emit('close')">
		<form class="cn-collective-page-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-collective-page-create__error">
				{{ error }}
			</NcNoteCard>

			<NcSelect
				v-model="collective"
				:options="collectiveOptions"
				:placeholder="t('nextcloud-vue', 'Select a collective')"
				:input-label="t('nextcloud-vue', 'Collective')"
				label="label"
				class="cn-collective-page-create__collective"
				required />

			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Page title')"
				:maxlength="255"
				required />
		</form>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create page') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCollectivePageCreate — inline-create dialog. Emits `create` with the
 * form payload `{ collectiveId, title }`; the parent submits to OR.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnCollectivePageCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcSelect, NcTextField },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new page') },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			title: '',
			collective: null,
			collectives: [],
		}
	},

	computed: {
		collectiveOptions() {
			return this.collectives.map(c => ({ id: c.id, label: c.emoji ? `${c.emoji} ${c.name}` : c.name }))
		},

		canSubmit() {
			return this.title.trim() !== '' && this.collective !== null && this.collective !== undefined
		},
	},

	mounted() {
		this.fetchCollectives()
	},

	methods: {
		t,

		async fetchCollectives() {
			this.error = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/collectives/list`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.collectives = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Collectives is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load collectives.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCollectivePageCreate] fetch collectives failed', err)
				this.error = t('nextcloud-vue', 'Could not load collectives.')
			}
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			this.$emit('create', { collectiveId: this.collective.id, title: this.title.trim() })
		},
	},
}
</script>

<style scoped>
.cn-collective-page-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-collective-page-create__error {
	margin: 4px 0;
}

.cn-collective-page-create__collective {
	width: 100%;
}
</style>
