<!--
  CnFlowTab — bespoke sidebar tab for the `flow` (automation) integration.

  Replaces the generic CnIntegrationTab for the `flow` leaf: renders a
  list of NC Flow (workflowengine) operations bound to the parent
  object's schema/admin scope. Each row surfaces the operation name,
  the target entity class (short form), the operation type, a chips
  set of trigger events, a checks-count, and a (display-only) enabled
  toggle. A trailing "Open in Flow settings" deep-link points to
  `/index.php/settings/admin/workflow` (NC Flow is admin-gated, so
  edits happen in the admin settings, not in the sidebar tab).

  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/flow`
  served by `OCA\OpenRegister\Service\Integration\Providers\FlowProvider`
  (which calls `OCA\WorkflowEngine\Manager::getAllOperations()` on the
  admin scope and filters the result by an `[or:{uuid}]` marker on the
  operation name).

  Payload contract today (per FlowProvider::list):
    { id, title, class, entity, operation, hasMarker, url,
      data: { ...raw NC flow_operations row... } }

  The provider exposes the raw NC row under `data`; the tab reads
  `data.events` (array of trigger event names) and `data.checks`
  (array of check rule rows) defensively so the chips/counts light up
  even though the spec doesn't promise these top-level today.

  Surface behaviour:
    - Empty state with "Open Flow settings" CTA when no linked ops.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.

  Bespoke-vs-generic rationale: the generic tab renders a flat link
  list which loses Flow's core signal — which events trigger the rule
  and which entity class it's bound to. The bespoke tab surfaces both
  inline so admins can see at a glance which automations fire on this
  object's lifecycle.

  See `openregister/openspec/changes/integration-flow/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-flow-tab">
		<div v-if="degraded" class="cn-flow-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-flow-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="operations.length === 0" class="cn-sidebar-tab__empty cn-flow-tab__empty">
			<RobotOutline :size="32" class="cn-flow-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openFlowSettings">
				<template #icon>
					<RobotOutline :size="20" />
				</template>
				{{ openSettingsLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-flow-tab__list">
			<li
				v-for="op in operations"
				:key="opKey(op)"
				class="cn-flow-tab__row"
				:class="{ 'cn-flow-tab__row--disabled': isDisabled(op) }">
				<div class="cn-flow-tab__row-header">
					<RobotOutline :size="20" class="cn-flow-tab__row-icon" />
					<a
						:href="opUrl(op)"
						target="_blank"
						rel="noopener"
						class="cn-flow-tab__title">{{ opTitle(op) }}</a>
					<span
						class="cn-flow-tab__enabled"
						:class="enabledClass(op)"
						:aria-label="enabledAriaLabel(op)">
						<span class="cn-flow-tab__enabled-dot" />
						{{ enabledLabel(op) }}
					</span>
				</div>
				<div v-if="opSummary(op)" class="cn-flow-tab__summary">
					{{ opSummary(op) }}
				</div>
				<div v-if="events(op).length > 0" class="cn-flow-tab__events">
					<span
						v-for="evt in events(op)"
						:key="evt"
						class="cn-flow-tab__chip">{{ shortEvent(evt) }}</span>
				</div>
				<div v-if="opMeta(op)" class="cn-flow-tab__meta">
					{{ opMeta(op) }}
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import RobotOutline from 'vue-material-design-icons/RobotOutline.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnFlowTab — bespoke automation-rule list for the `flow` integration.
 *
 * Renders rows pulled from the OR pluggable-integration endpoint with
 * trigger-event chips, check counts, and a display-only enabled
 * indicator. Editing happens in NC Flow's admin settings — the
 * "Open Flow settings" CTA deep-links there.
 */
export default {
	name: 'CnFlowTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, RobotOutline },

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
		openSettingsLabel: { type: String, default: () => t('nextcloud-vue', 'Open Flow settings') },
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
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchOperations() } } },
		register() { this.fetchOperations() },
		schema() { this.fetchOperations() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		opKey(op) {
			return op.id ?? op.title ?? ''
		},

		opTitle(op) {
			return op.title || op.displayName || op.name || this.shortClass(op.class) || t('nextcloud-vue', 'Untitled automation')
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
			if (!op.entity) {
				return ''
			}
			return this.shortClass(op.entity)
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
			// NC events look like `OCA\WorkflowEngine\Entity\Foo::postCreate`
			// — strip down to the trailing method name for the chip.
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
			// Default to enabled — NC operations are enabled-by-default.
			// Honour explicit `enabled: false` if a future widening
			// surfaces it.
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

		enabledAriaLabel(op) {
			return this.enabledLabel(op)
		},

		openFlowSettings() {
			if (typeof window !== 'undefined') {
				window.open(this.flowSettingsUrl, '_blank', 'noopener')
			}
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
				} else if (response.status === 503) {
					this.operations = []
					this.degraded = this.unavailableLabel
				} else if (response.status === 403) {
					// NC Flow is admin-gated — surface the gap gracefully.
					this.operations = []
					this.degraded = t('nextcloud-vue', 'Flow operations are only visible to administrators.')
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

.cn-flow-tab__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-flow-tab__row:last-child {
	border-bottom: none;
}

.cn-flow-tab__row--disabled {
	opacity: 0.7;
}

.cn-flow-tab__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-flow-tab__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-flow-tab__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
}

a.cn-flow-tab__title:hover {
	text-decoration: underline;
}

.cn-flow-tab__enabled {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 1px 8px;
	border-radius: 10px;
	font-size: 0.75em;
	font-weight: 500;
	flex-shrink: 0;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-flow-tab__enabled-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
}

.cn-flow-tab__enabled--on {
	background: var(--color-success, #46ba61);
	color: var(--color-primary-element-text, #ffffff);
}

.cn-flow-tab__enabled--off {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-flow-tab__summary,
.cn-flow-tab__meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
}

.cn-flow-tab__events {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	padding-left: 28px;
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
