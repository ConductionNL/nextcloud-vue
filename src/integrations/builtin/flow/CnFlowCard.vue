<!--
  CnFlowCard — bespoke surface-aware widget for the `flow` (automation)
  integration.

  Replaces the generic CnIntegrationCard for the `flow` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N automations · M
        active" + most-recent name with its entity binding.
    - detail-page                    : compact list of linked
        operations with entity / operation type / enabled indicator
        per row.
    - single-entity                  : chip with operation name + an
        enabled dot (referenceType: 'flow').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnFlowTab; for `single-entity` the optional `value` prop addresses a
  single operation by id (matching CnIntegrationCard's fetchSingle
  contract).

  See `openregister/openspec/changes/integration-flow/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-flow-card__chip" :title="chipSubtitle(entity)">
				<SitemapOutline :size="14" />
				<a
					:href="opUrl(entity)"
					target="_blank"
					rel="noopener">{{ opTitle(entity) }}</a>
				<span
					class="cn-flow-card__chip-enabled"
					:class="enabledClass(entity)" />
			</span>
			<span v-else class="cn-flow-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-flow-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="operations.length === 0" class="cn-flow-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-flow-card__headline">
				<div class="cn-flow-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-flow-card__headline-recent">
					<SitemapOutline :size="14" />
					<a
						:href="opUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ opTitle(mostRecent) }}</a>
					<span
						v-if="entityLabel(mostRecent)"
						class="cn-flow-card__headline-entity">
						· {{ entityLabel(mostRecent) }}
					</span>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-flow-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="operations.length === 0" class="cn-flow-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-flow-card__list">
				<li
					v-for="op in displayedOperations"
					:key="opKey(op)"
					class="cn-flow-card__row"
					:class="{ 'cn-flow-card__row--disabled': isDisabled(op) }">
					<div class="cn-flow-card__row-header">
						<SitemapOutline :size="16" class="cn-flow-card__row-icon" />
						<a
							:href="opUrl(op)"
							target="_blank"
							rel="noopener"
							class="cn-flow-card__title">{{ opTitle(op) }}</a>
						<span
							class="cn-flow-card__enabled"
							:class="enabledClass(op)"
							:aria-label="enabledLabel(op)" />
					</div>
					<span v-if="rowMeta(op)" class="cn-flow-card__subtitle">{{ rowMeta(op) }}</span>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import SitemapOutline from 'vue-material-design-icons/SitemapOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnFlowCard — bespoke surface-aware widget for the `flow` integration.
 *
 * Renders Flow-aware metadata across all four surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnFlowCard',

	components: { CnDetailCard, NcLoadingIcon, SitemapOutline },

	props: {
		/** Stable integration id (forwarded from the registry — always `'flow'`). */
		integrationId: { type: String, default: 'flow' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Optional single-entity reference (operation id). */
		value: { type: String, default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Automation') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => SitemapOutline },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No automations linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Flow is currently unavailable.') },
		/** URL of the NC Flow admin settings page. */
		flowSettingsUrl: { type: String, default: '/index.php/settings/admin/workflow' },
	},

	data() {
		return {
			operations: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedOperations() {
			if (this.surface === 'user-dashboard' || this.surface === 'app-dashboard') {
				return this.operations.slice(0, COMPACT_LIMIT)
			}
			return this.operations
		},

		activeCount() {
			return this.operations.reduce((sum, op) => sum + (this.isDisabled(op) ? 0 : 1), 0)
		},

		countHeadline() {
			const total = this.operations.length
			const active = this.activeCount
			if (total === 0) {
				return ''
			}
			if (active === total) {
				return n('nextcloud-vue', '{count} automation', '{count} automations', total, { count: total })
			}
			const totalFragment = n('nextcloud-vue', '{count} automation', '{count} automations', total, { count: total })
			const activeFragment = n('nextcloud-vue', '{count} active', '{count} active', active, { count: active })
			return `${totalFragment} · ${activeFragment}`
		},

		mostRecent() {
			if (this.operations.length === 0) {
				return null
			}
			// NC Flow operations don't carry a stable "created" field,
			// so we just use the natural list order — the provider
			// returns admin-scoped operations newest-first via the
			// Manager API.
			return this.operations[0]
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
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
				? 'cn-flow-card__enabled--off'
				: 'cn-flow-card__enabled--on'
		},

		rowMeta(op) {
			const parts = []
			const entity = this.entityLabel(op)
			if (entity !== '') {
				parts.push(entity)
			}
			const operation = op.operation || ''
			if (operation !== '') {
				parts.push(operation)
			}
			const checks = this.checksCount(op)
			if (checks > 0) {
				parts.push(t('nextcloud-vue', '{n} conditions', { n: checks }))
			}
			return parts.join(' · ')
		},

		checksCount(op) {
			const raw = op.checks ?? op.data?.checks ?? []
			if (Array.isArray(raw) === true) {
				return raw.length
			}
			return 0
		},

		chipSubtitle(op) {
			return this.entityLabel(op) || this.opTitle(op)
		},

		fetch() {
			if (this.surface === 'single-entity') {
				this.fetchSingle()
				return
			}
			this.fetchList()
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.operations = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.operations = []
					this.degraded = this.unavailableLabel
				} else if (response.status === 403) {
					this.operations = []
					this.degraded = t('nextcloud-vue', 'Flow operations are only visible to administrators.')
				} else {
					this.operations = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowCard] failed to fetch operations', err)
				this.operations = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (!this.value || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else if (response.status === 503) {
					this.entity = null
					this.degraded = this.unavailableLabel
				} else {
					this.entity = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFlowCard] failed to fetch single operation', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-flow-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-flow-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-flow-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-flow-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-flow-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-flow-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-flow-card__headline-entity {
	color: var(--color-text-maxcontrast);
}

.cn-flow-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 12px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-flow-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-flow-card__chip a:hover {
	text-decoration: underline;
}

.cn-flow-card__chip-enabled,
.cn-flow-card__enabled {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.cn-flow-card__enabled--on {
	background: var(--color-success, #46ba61);
}

.cn-flow-card__enabled--off {
	background: var(--color-text-maxcontrast);
}

.cn-flow-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-flow-card__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-flow-card__row:last-child {
	border-bottom: none;
}

.cn-flow-card__row--disabled {
	opacity: 0.7;
}

.cn-flow-card__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-flow-card__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-flow-card__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-flow-card__title:hover {
	text-decoration: underline;
}

.cn-flow-card__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 24px;
}
</style>
