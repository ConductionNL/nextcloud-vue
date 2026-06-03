<!--
  CnFlowTab — bespoke sidebar tab for the `flow` (automation) integration.

  Renders a list of NC Flow (workflowengine) operations bound to the
  parent OR object via the Tier-2 `openregister_flow_links` table.
  Each row surfaces the operation name, the target entity class
  (short form), the operation type, a chips set of trigger events, a
  checks-count, and a (display-only) enabled toggle. A trailing
  "Open in Flow settings" deep-link points to
  `/index.php/settings/admin/workflow` (NC Flow is admin-gated, so
  edits happen in the admin settings, not in the sidebar tab).

  Talks to the Tier-2 link-table endpoints:
    GET    /api/objects/{r}/{s}/{id}/flow                  (read, all users)
    POST   /api/objects/{r}/{s}/{id}/flow                  (link, admin-only)
    DELETE /api/objects/{r}/{s}/{id}/flow/{operationId}    (unlink, admin-only)

  Payload contract (per FlowProvider + FlowLinkService):
    { operationId, operationName, operationClass, entityType,
      enabled, url, linkId, events, checks, operation }
    + envelope `{ results, total, isAdmin }`

  Surface behaviour:
    - Admins see: "Link existing automation" button → CnFlowOperationPicker
      + per-row unlink action.
    - Non-admins see: read-only list, no link/unlink controls. The
      "Open Flow settings" deep-link is still surfaced so the user
      knows where automations live.
    - Loading + 503 "currently unavailable" + generic error states
      match CnIntegrationTab's behaviour for AD-23 graceful degradation.

  See `openregister/openspec/changes/integration-flow/` for the spec
  delta and ADR-019 (registry mechanism) / ADR-023 (action authorisation).
-->
<template>
	<div class="cn-sidebar-tab cn-flow-tab">
		<div v-if="degraded" class="cn-flow-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div v-if="isAdmin && !loading && !error" class="cn-flow-tab__actions">
			<NcButton type="secondary" data-testid="cn-flow-tab-link" @click="openPicker">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Link existing automation') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-flow-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="operations.length === 0" class="cn-sidebar-tab__empty cn-flow-tab__empty">
			<SitemapOutline :size="32" class="cn-flow-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openFlowSettings">
				<template #icon>
					<SitemapOutline :size="20" />
				</template>
				{{ openSettingsLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-flow-tab__list">
			<NcListItem
				v-for="op in operations"
				:key="opKey(op)"
				class="cn-flow-tab__row"
				:class="{ 'cn-flow-tab__row--disabled': isDisabled(op) }"
				:name="opTitle(op)"
				:href="opUrl(op)"
				target="_blank"
				:bold="true"
				:force-display-actions="isAdmin">
				<template #icon>
					<span class="cn-flow-tab__avatar" :class="enabledClass(op)" :aria-hidden="true">
						<SitemapOutline :size="20" />
					</span>
				</template>
				<template #subname>
					<span v-if="opSummary(op)" class="cn-flow-tab__summary">{{ opSummary(op) }}</span>
				</template>
				<template #indicator>
					<CnStatusBadge
						class="cn-flow-tab__enabled"
						:class="enabledClass(op)"
						size="small"
						:variant="enabledVariant(op)"
						:label="enabledLabel(op)"
						:aria-label="enabledAriaLabel(op)" />
				</template>
				<template v-if="events(op).length > 0 || opMeta(op)" #details>
					<span class="cn-flow-tab__details">
						<span v-if="events(op).length > 0" class="cn-flow-tab__events">
							<span
								v-for="evt in events(op)"
								:key="evt"
								class="cn-flow-tab__chip">{{ shortEvent(evt) }}</span>
						</span>
						<span v-if="opMeta(op)" class="cn-flow-tab__meta">{{ opMeta(op) }}</span>
					</span>
				</template>
				<template v-if="isAdmin" #actions>
					<NcActionButton
						class="cn-flow-tab__unlink"
						:aria-label="t('nextcloud-vue', 'Unlink automation')"
						data-testid="cn-flow-tab-unlink"
						:close-after-click="true"
						@click="confirmUnlink(op)">
						<template #icon>
							<Close :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Unlink automation') }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnFlowOperationPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			:flow-settings-url="flowSettingsUrl"
			@close="pickerOpen = false"
			@link="onLink" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import SitemapOutline from 'vue-material-design-icons/SitemapOutline.vue'
import CnFlowOperationPicker from '../../../components/CnFlowOperationPicker/CnFlowOperationPicker.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnFlowTab — bespoke automation-rule list for the `flow` integration.
 *
 * Admins can link/unlink operations via the picker; non-admins see
 * a read-only list with a deep-link to NC Workflow Settings.
 */
export default {
	name: 'CnFlowTab',

	components: { NcActionButton, NcButton, NcListItem, NcLoadingIcon, AlertCircleOutline, Close, Plus, SitemapOutline, CnFlowOperationPicker, CnStatusBadge },

	props: {
		/** Stable integration id (forwarded from the registry — always `'flow'`). */
		integrationId: { type: String, default: 'flow' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No automations linked yet') },
		/** Pre-translated label for the "Open Flow settings" CTA. */
		openSettingsLabel: { type: String, default: () => t('nextcloud-vue', 'Open Workflow settings') },
		/** Pre-translated banner when Flow is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Flow is currently unavailable.') },
		/** URL of the NC Flow admin settings page. */
		flowSettingsUrl: { type: String, default: '/index.php/settings/admin/workflow' },
	},

	data() {
		return {
			operations: [],
			loading: false,
			error: '',
			degraded: '',
			isAdmin: false,
			pickerOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchOperations() } } },
		register() { this.fetchOperations() },
		schema() { this.fetchOperations() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/flow`
		},

		opKey(op) {
			return op.operationId ?? op.id ?? op.title ?? ''
		},

		opTitle(op) {
			return op.operationName || op.title || op.name || this.shortClass(op.operationClass) || t('nextcloud-vue', 'Untitled automation')
		},

		opUrl(op) {
			return op.url || this.flowSettingsUrl
		},

		shortClass(className) {
			if (!className) {
				return ''
			}
			const parts = String(className).split('\\')
			return parts[parts.length - 1] || className
		},

		entityLabel(op) {
			const entity = op.entityType || op.entity
			if (!entity) {
				return ''
			}
			return this.shortClass(entity)
		},

		operationLabel(op) {
			return op.operation || ''
		},

		opSummary(op) {
			const parts = []
			const entity = this.entityLabel(op)
			if (entity !== '') {
				parts.push(t('nextcloud-vue', 'Entity: {entity}', { entity }))
			}
			const opLabel = this.operationLabel(op)
			if (opLabel !== '') {
				parts.push(t('nextcloud-vue', 'Operation: {op}', { op: opLabel }))
			}
			return parts.join(' · ')
		},

		events(op) {
			const raw = op.events ?? op.data?.events ?? []
			if (Array.isArray(raw) === true) {
				return raw.filter(e => typeof e === 'string' && e !== '')
			}
			return []
		},

		shortEvent(evt) {
			const colon = String(evt).lastIndexOf(':')
			if (colon === -1) {
				return String(evt)
			}
			return String(evt).slice(colon + 1) || String(evt)
		},

		checksCount(op) {
			const raw = op.checks ?? op.data?.checks ?? []
			if (Array.isArray(raw) === true) {
				return raw.length
			}
			if (typeof raw === 'string' && raw.startsWith('[') === true) {
				try {
					const parsed = JSON.parse(raw)
					return Array.isArray(parsed) === true ? parsed.length : 0
				} catch (e) {
					return 0
				}
			}
			return 0
		},

		opMeta(op) {
			const parts = []
			const checks = this.checksCount(op)
			if (checks > 0) {
				parts.push(t('nextcloud-vue', '{n} conditions', { n: checks }))
			}
			return parts.join(' · ')
		},

		isDisabled(op) {
			const v = op.enabled ?? op.data?.enabled
			if (v === undefined || v === null) {
				return false
			}
			return v === false || v === 0 || v === '0'
		},

		enabledLabel(op) {
			return this.isDisabled(op) === true
				? t('nextcloud-vue', 'Disabled')
				: t('nextcloud-vue', 'Enabled')
		},

		enabledClass(op) {
			return this.isDisabled(op) === true
				? 'cn-flow-tab__enabled--off'
				: 'cn-flow-tab__enabled--on'
		},

		enabledVariant(op) {
			return this.isDisabled(op) === true ? 'default' : 'success'
		},

		enabledAriaLabel(op) {
			return this.enabledLabel(op)
		},

		openFlowSettings() {
			if (typeof window !== 'undefined') {
				window.open(this.flowSettingsUrl, '_blank', 'noopener')
			}
		},

		openPicker() {
			this.pickerOpen = true
		},

		async fetchOperations() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.operations = rows
					this.isAdmin = Boolean(data.isAdmin)
				} else if (response.status === 501) {
					this.operations = []
					this.degraded = t('nextcloud-vue', 'NC Workflow Engine is not installed.')
				} else if (response.status === 503) {
					this.operations = []
					this.degraded = this.unavailableLabel
				} else {
					this.operations = []
					this.error = t('nextcloud-vue', 'Could not load automations.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowTab] failed to fetch operations', err)
				this.operations = []
				this.error = t('nextcloud-vue', 'Could not load automations.')
			} finally {
				this.loading = false
			}
		},

		async onLink({ operationId }) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.baseUrl(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify({ operationId }),
				})
				if (response.ok) {
					await this.fetchOperations()
				} else if (response.status === 403) {
					this.error = t('nextcloud-vue', 'Only administrators can link automations.')
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'Automation is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link automation.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link automation.')
			}
		},

		async confirmUnlink(op) {
			const opId = op.operationId ?? op.id
			if (!opId) {
				return
			}
			if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
				const ok = window.confirm(t('nextcloud-vue', 'Remove this automation link?'))
				if (!ok) {
					return
				}
			}
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(opId)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchOperations()
				} else if (response.status === 403) {
					this.error = t('nextcloud-vue', 'Only administrators can unlink automations.')
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink automation.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink automation.')
			}
		},
	},
}
</script>

<style scoped>
.cn-flow-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-flow-tab__actions {
	margin-bottom: 8px;
}

.cn-flow-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-flow-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-flow-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-flow-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

/* Mirror NC Flow's rule rows: a round robot avatar, the bold rule
   name, a trigger/condition subline, and an enabled/disabled chip. */
.cn-flow-tab__row--disabled {
	opacity: 0.7;
}

.cn-flow-tab__avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-flow-tab__avatar.cn-flow-tab__enabled--on {
	background: var(--color-primary-element-light, var(--color-background-dark));
	color: var(--color-primary-element, #0082c9);
}

.cn-flow-tab__avatar.cn-flow-tab__enabled--off {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-flow-tab__summary {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-flow-tab__meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-tab__details {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
}

.cn-flow-tab__events {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 4px;
}

.cn-flow-tab__chip {
	display: inline-block;
	padding: 1px 8px;
	border-radius: 10px;
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 0.75em;
}
</style>
