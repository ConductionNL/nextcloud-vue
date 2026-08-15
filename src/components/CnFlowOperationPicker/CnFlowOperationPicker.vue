<!--
  CnFlowOperationPicker — admin-only modal for picking an existing NC
  Flow (workflowengine) operation to link to the parent OR object.

  Flow:
    1. Load operations via GET /api/integrations/flow/operations
    2. Filter client-side via a search input (debounced; the same
       query is forwarded as `?search=` for server-side filtering)
    3. Single-select an operation row
    4. Confirm → emit `link` with `{ operationId }`

  NC Flow operations are configured exclusively by administrators in
  NC Workflow Settings. Non-admins receive a 403 from the
  /operations endpoint; the picker degrades to a "configured by
  administrators" message and a deep-link to the Workflow Settings
  page so the user knows where the configuration lives.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnFlowOperationPicker/` (NcDialog-based; matches
  the deck/contact/calendar/poll picker pattern).

  ADR-019 / ADR-023: drives the `flow` integration leaf's
  admin-gated "link existing" surface; emits `link` so the parent
  (CnFlowTab) can POST the selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-flow-operation-picker"
		@closing="onClose">
		<div class="cn-flow-operation-picker">
			<NcNoteCard v-if="error" type="error" class="cn-flow-operation-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcNoteCard
				v-if="adminOnly"
				variant="warning"
				class="cn-flow-operation-picker__admin-only">
				{{ adminOnlyMessage }}
				<a :href="flowSettingsUrl"
					target="_blank"
					rel="noopener"
					class="cn-flow-operation-picker__deep-link">
					{{ t('nextcloud-vue', 'Open Workflow settings') }}
				</a>
			</NcNoteCard>

			<NcTextField
				v-if="!adminOnly"
				v-model="search"
				:label="t('nextcloud-vue', 'Search automations')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-flow-operation-picker__search"
				@update:model-value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="!adminOnly && visibleOperations.length === 0"
				:name="t('nextcloud-vue', 'No automations available')"
				:description="t('nextcloud-vue', 'Create an automation in NC Workflow settings first.')">
				<template #action>
					<NcButton variant="primary" @click="openFlowSettings">
						{{ t('nextcloud-vue', 'Open Workflow settings') }}
					</NcButton>
				</template>
			</NcEmptyContent>
			<ul v-else-if="!adminOnly" class="cn-flow-operation-picker__list">
				<li
					v-for="op in visibleOperations"
					:key="op.id"
					class="cn-flow-operation-picker__row"
					:class="{ 'cn-flow-operation-picker__row--selected': selectedOperationId === op.id }">
					<button type="button" class="cn-flow-operation-picker__row-button" @click="pickOperation(op)">
						<RobotOutline :size="20" />
						<span class="cn-flow-operation-picker__row-main">
							<span class="cn-flow-operation-picker__row-title">{{ op.name || t('nextcloud-vue', 'Untitled automation') }}</span>
							<span class="cn-flow-operation-picker__row-meta">{{ rowMeta(op) }}</span>
						</span>
						<span
							class="cn-flow-operation-picker__enabled"
							:class="op.enabled ? 'cn-flow-operation-picker__enabled--on' : 'cn-flow-operation-picker__enabled--off'">
							{{ op.enabled ? t('nextcloud-vue', 'Enabled') : t('nextcloud-vue', 'Disabled') }}
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="!adminOnly"
				variant="primary"
				:disabled="!selectedOperationId"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link automation') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnFlowOperationPicker — admin-only picker for NC Flow operations.
 * Emits `link` with the chosen operationId.
 *
 * @see ADR-019 (pluggable integrations), ADR-022 (sidebar tabs),
 *      ADR-023 (action authorisation)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import RobotOutline from 'vue-material-design-icons/RobotOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnFlowOperationPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, RobotOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing automation') },
		/** URL of the NC Workflow settings page. */
		flowSettingsUrl: { type: String, default: '/index.php/settings/admin/workflow' },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			adminOnly: false,
			operations: [],
			search: '',
			selectedOperationId: null,
			searchTimer: null,
		}
	},

	computed: {
		adminOnlyMessage() {
			return t('nextcloud-vue', 'Flow operations are configured by administrators. You can view existing automations but cannot link new ones.')
		},

		/**
		 * Client-side filter on top of the server-side `?search=`
		 * payload — instant feedback even between debounce ticks.
		 *
		 * @return {Array}
		 */
		visibleOperations() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.operations
			}
			return this.operations.filter(op => (op.name || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchOperations()
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
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

		async fetchOperations(searchTerm = '') {
			this.loading = true
			this.error = ''
			this.adminOnly = false
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/flow/operations${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.operations = data.results || []
				} else if (response.status === 403) {
					// Admin-only gate — degrade to a "configured by admins" notice.
					this.adminOnly = true
					this.operations = []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Workflow Engine is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load automations.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowOperationPicker] fetch operations failed', err)
				this.error = t('nextcloud-vue', 'Could not load automations.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchOperations(this.search.trim())
			}, 300)
		},

		pickOperation(op) {
			this.selectedOperationId = op.id
		},

		rowMeta(op) {
			const parts = []
			const entity = this.shortClass(op.entity)
			if (entity !== '') {
				parts.push(entity)
			}
			const operation = op.operation || ''
			if (operation !== '') {
				parts.push(operation)
			}
			const events = Array.isArray(op.events) ? op.events.length : 0
			if (events > 0) {
				parts.push(t('nextcloud-vue', '{n} triggers', { n: events }))
			}
			const checks = Array.isArray(op.checks) ? op.checks.length : 0
			if (checks > 0) {
				parts.push(t('nextcloud-vue', '{n} conditions', { n: checks }))
			}
			return parts.join(' · ')
		},

		shortClass(className) {
			if (!className) {
				return ''
			}
			const parts = String(className).split('\\')
			return parts[parts.length - 1] || className
		},

		openFlowSettings() {
			if (typeof window !== 'undefined') {
				window.open(this.flowSettingsUrl, '_blank', 'noopener')
			}
		},

		confirm() {
			if (!this.selectedOperationId) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ operationId }`.
			 */
			this.$emit('link', { operationId: this.selectedOperationId })
		},
	},
}
</script>

<style scoped>
.cn-flow-operation-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-flow-operation-picker__error,
.cn-flow-operation-picker__admin-only {
	margin: 4px 0;
}

.cn-flow-operation-picker__deep-link {
	display: inline-block;
	margin-top: 6px;
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-flow-operation-picker__search {
	width: 100%;
}

.cn-flow-operation-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-flow-operation-picker__row {
	border-radius: var(--border-radius);
}

.cn-flow-operation-picker__row--selected {
	background: var(--color-primary-element-light);
}

.cn-flow-operation-picker__row-button {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 8px 10px;
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-flow-operation-picker__row-button:hover {
	background: var(--color-background-hover);
}

.cn-flow-operation-picker__row--selected .cn-flow-operation-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-flow-operation-picker__row-main {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-flow-operation-picker__row-title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}

.cn-flow-operation-picker__row-meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-operation-picker__enabled {
	display: inline-flex;
	align-items: center;
	padding: 1px 8px;
	border-radius: 10px;
	font-size: 0.75em;
	font-weight: 500;
	flex-shrink: 0;
}

.cn-flow-operation-picker__enabled--on {
	background: var(--color-success, #46ba61);
	color: var(--color-primary-element-text, #ffffff);
}

.cn-flow-operation-picker__enabled--off {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}
</style>
