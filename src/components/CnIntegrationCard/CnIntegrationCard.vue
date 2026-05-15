<!--
  CnIntegrationCard — surface-aware widget for any pluggable integration.

  Used as the `widget` component for the 18 leaf integrations (activity,
  analytics, bookmarks, calendar, collectives, contacts, cospend, deck,
  email, flow, forms, maps, openproject, photos, polls, shares, talk,
  time-tracker) that don't yet need a bespoke widget. CnDashboardPage /
  CnDetailPage / CnFormDialog forward `surface` + the object context;
  the registration descriptor supplies the integration id.

  Branches on `surface` (AD-19):
    - detail-page    : full list of linked things (title + subtitle).
    - user-dashboard /
      app-dashboard  : compact list (max 5 items).
    - single-entity  : one row chip, resolved via the optional `value`
                       prop when a schema property declares
                       `referenceType: '<id>'` (AD-18).

  Same `/api/objects/{register}/{schema}/{objectId}/integrations/{id}`
  endpoint as CnIntegrationTab; a 503 from the endpoint renders a quiet
  "currently unavailable" state. Bespoke per-leaf widgets supersede
  this when a leaf gets dedicated UX.
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-integration-card__chip" :title="rowSubtitle(entity)">
				<LinkVariant :size="14" />
				<a v-if="entity.url"
					:href="entity.url"
					target="_blank"
					rel="noopener">{{ rowTitle(entity) }}</a>
				<span v-else>{{ rowTitle(entity) }}</span>
				<span v-if="rowSubtitle(entity)" class="cn-integration-card__chip-sub">· {{ rowSubtitle(entity) }}</span>
			</span>
			<span v-else class="cn-integration-card__empty">{{ emptyLabel }}</span>
		</template>

		<template v-else>
			<div v-if="degraded" class="cn-integration-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rows.length === 0" class="cn-integration-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-integration-card__list">
				<li v-for="row in displayedRows" :key="rowKey(row)" class="cn-integration-card__row">
					<LinkVariant :size="16" class="cn-integration-card__icon" />
					<div class="cn-integration-card__row-main">
						<a v-if="row.url"
							:href="row.url"
							target="_blank"
							rel="noopener"
							class="cn-integration-card__title">{{ rowTitle(row) }}</a>
						<span v-else class="cn-integration-card__title">{{ rowTitle(row) }}</span>
						<span v-if="rowSubtitle(row)" class="cn-integration-card__subtitle">{{ rowSubtitle(row) }}</span>
					</div>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnIntegrationCard — generic surface-aware widget for the pluggable
 * integration registry.
 *
 * Renders the linked-things list returned by the named integration's
 * IntegrationProvider; for the 12 greenfield leaf stubs the list will
 * be empty until each leaf's wrapped service ships, at which point the
 * widget lights up without code changes here.
 */
export default {
	name: 'CnIntegrationCard',

	components: { CnDetailCard, NcLoadingIcon, LinkVariant },

	props: {
		/** Stable integration id (matches PHP-side provider id). */
		integrationId: { type: String, required: true },
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
		/** Optional single-entity reference (id or canonical reference). */
		value: { type: String, default: '' },
		/** Pre-translated card title (defaults to id). */
		title: { type: String, default: '' },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => LinkVariant },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'Nothing linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'This integration is currently unavailable.') },
	},

	data() {
		return {
			rows: [],
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

		displayedRows() {
			if (this.surface === 'user-dashboard' || this.surface === 'app-dashboard') {
				return this.rows.slice(0, COMPACT_LIMIT)
			}
			return this.rows
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		integrationId() { this.fetch() },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		rowKey(row) {
			return row.id ?? row.reference ?? row.uuid ?? row.uri ?? ''
		},

		rowTitle(row) {
			return row.title ?? row.label ?? row.name ?? row.subject ?? row.summary ?? this.rowKey(row)
		},

		rowSubtitle(row) {
			if (Array.isArray(row.breadcrumb) && row.breadcrumb.length > 1) {
				return row.breadcrumb.slice(0, -1).join(' / ')
			}
			return row.subtitle ?? row.description ?? row.status ?? ''
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
					this.rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.rows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rows = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(`[CnIntegrationCard:${this.integrationId}] failed to fetch`, err)
				this.rows = []
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
				console.error(`[CnIntegrationCard:${this.integrationId}] failed to fetch entity`, err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-integration-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-integration-card__chip {
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

.cn-integration-card__chip-sub {
	color: var(--color-text-maxcontrast);
}

.cn-integration-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-integration-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-integration-card__row:last-child {
	border-bottom: none;
}

.cn-integration-card__icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-integration-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-integration-card__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-integration-card__title:hover {
	text-decoration: underline;
}

.cn-integration-card__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
