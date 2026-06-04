<!--
  CnXwikiPageCreate — inline-create dialog for a fresh remote xWiki page
  linked to the parent OR object.

  Form fields:
    - Space (NcTextField, required) — the target xWiki space
    - Title (NcTextField, required)

  On submit, emits `create` with `{ space, title }`. The parent
  (CnXwikiTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/xwiki/new`, which creates the
  page in remote xWiki via OpenConnector and links it.

  xWiki is external (OpenConnector-routed): when no `xwiki` source is
  configured the parent surfaces the Configure-XWiki CTA before this
  dialog is reachable, but the dialog also degrades gracefully — if it is
  opened against an unconfigured source the optional `unavailable` prop
  disables the form and shows the Configure CTA.

  ADR-004: lives in its own .vue file under
  `src/components/CnXwikiPageCreate/` (NcDialog-based; matches the
  collectives/photos/deck create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-xwiki-page-create"
		@closing="onClose">
		<div v-if="unavailable" class="cn-xwiki-page-create__unconfigured" role="alert">
			<AlertCircleOutline :size="32" class="cn-xwiki-page-create__unconfigured-icon" />
			<strong>{{ t('nextcloud-vue', 'XWiki connection not configured') }}</strong>
			<p>{{ t('nextcloud-vue', 'Add an XWiki source in OpenConnector before creating pages.') }}</p>
			<NcButton variant="primary" @click="openOpenConnector">
				{{ t('nextcloud-vue', 'Configure XWiki connection') }}
			</NcButton>
		</div>

		<form v-else class="cn-xwiki-page-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-xwiki-page-create__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="space"
				:label="t('nextcloud-vue', 'Space')"
				:placeholder="t('nextcloud-vue', 'e.g. Departments.Legal')"
				:maxlength="255"
				required />

			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Page title')"
				:maxlength="255"
				required />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="!unavailable"
				variant="primary"
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
 * CnXwikiPageCreate — inline-create dialog. Emits `create` with the form
 * payload `{ space, title }`; the parent submits to OR which creates the
 * page in remote xWiki via OpenConnector.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcNoteCard, NcTextField } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'

export default {
	name: 'CnXwikiPageCreate',

	components: { NcButton, NcDialog, NcNoteCard, NcTextField, AlertCircleOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new xWiki page') },
		/** When true, the source is unconfigured/down — disable the form, show the CTA. */
		unavailable: { type: Boolean, default: false },
		/** URL of OpenConnector's sources admin page (deep-link target for the configure CTA). */
		openConnectorSourcesUrl: { type: String, default: '/index.php/apps/openconnector/sources' },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			space: '',
			title: '',
		}
	},

	computed: {
		canSubmit() {
			return this.title.trim() !== '' && this.space.trim() !== ''
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

		openOpenConnector() {
			if (typeof window !== 'undefined') {
				window.open(this.openConnectorSourcesUrl, '_blank', 'noopener')
			}
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ space, title }`.
			 */
			this.$emit('create', { space: this.space.trim(), title: this.title.trim() })
		},
	},
}
</script>

<style scoped>
.cn-xwiki-page-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-xwiki-page-create__error {
	margin: 4px 0;
}

.cn-xwiki-page-create__unconfigured {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 24px 12px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.cn-xwiki-page-create__unconfigured-icon {
	color: var(--color-primary-element, #21468B);
}

.cn-xwiki-page-create__unconfigured p {
	margin: 0;
}
</style>
