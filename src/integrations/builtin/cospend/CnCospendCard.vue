<!--
  CnCospendCard — bespoke surface-aware widget for the `cospend`
  integration.

  Replaces the generic CnIntegrationCard for the `cospend` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N costs linked";
        sub-line with total amount across all linked bills (per
        currency); plus a most-recent row link.
    - detail-page                    : bounded row list with type chip,
        amount, currency, payer — same shape as the tab but read-only.
    - single-entity                  : chip with row title + type chip
        (referenceType: 'cospend').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnCospendTab; for `single-entity` the optional `value` prop addresses
  a single row by id.

  See `openregister/openspec/changes/integration-cospend/` for the spec
  delta, ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardHeaderTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-cospend-card__chip" :title="chipSubtitle(entity)">
				<CurrencyEur :size="14" />
				<a
					:href="rowUrl(entity)"
					target="_blank"
					rel="noopener">{{ rowTitle(entity) }}</a>
				<span class="cn-cospend-card__chip-pill" :class="typeChipClass(entity)">
					{{ typeLabel(entity) }}
				</span>
			</span>
			<span v-else class="cn-cospend-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + total amount + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-cospend-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rows.length === 0" class="cn-cospend-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-cospend-card__headline">
				<div class="cn-cospend-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<ul v-if="totals.length > 0" class="cn-cospend-card__totals">
					<li
						v-for="bucket in totals"
						:key="bucket.currency"
						class="cn-cospend-card__totals-row">
						<span class="cn-cospend-card__totals-label">
							<CurrencyEur :size="12" />
							{{ bucket.currency }}
						</span>
						<span class="cn-cospend-card__totals-amount">{{ bucket.amountLabel }}</span>
					</li>
				</ul>
				<div v-if="mostRecent" class="cn-cospend-card__headline-recent">
					<CurrencyEur :size="14" />
					<a
						:href="rowUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ rowTitle(mostRecent) }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: bounded row list -->
		<template v-else>
			<div v-if="degraded" class="cn-cospend-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="rows.length === 0" class="cn-cospend-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-cospend-card__rows">
				<li
					v-for="row in rows"
					:key="rowKey(row)"
					class="cn-cospend-card__row"
					:class="{ 'cn-cospend-card__row--highlight': isLinked(row) }">
					<a
						:href="rowUrl(row)"
						target="_blank"
						rel="noopener"
						class="cn-cospend-card__title">{{ rowTitle(row) }}</a>
					<span class="cn-cospend-card__chip-pill" :class="typeChipClass(row)">
						{{ typeLabel(row) }}
					</span>
					<span v-if="amountLabel(row)" class="cn-cospend-card__amount">
						{{ amountLabel(row) }}
					</span>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import CurrencyEur from 'vue-material-design-icons/CurrencyEur.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnCospendCard — bespoke surface-aware widget for the `cospend`
 * integration. See the file-level docblock for surface-by-surface
 * behaviour.
 */
export default {
	name: 'CnCospendCard',

	components: { CnDetailCard, NcLoadingIcon, CurrencyEur },

	props: {
		/** Stable integration id (forwarded from the registry — always `'cospend'`). */
		integrationId: { type: String, default: 'cospend' },
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
		/** Optional single-entity reference (row id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Costs') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => CurrencyEur },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No costs linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Costs is currently unavailable.') },
		/** URL of the NC Cospend app entry. */
		cospendAppUrl: { type: String, default: '/index.php/apps/cospend' },
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
		cardHeaderTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		/**
		 * Totals grouped by currency code so dashboards can show a
		 * per-currency sum (Cospend supports multi-currency projects).
		 *
		 * @return {Array<{currency: string, total: number, amountLabel: string}>}
		 */
		totals() {
			const groups = new Map()
			for (const row of this.rows) {
				if (this.rowType(row) !== 'bill' && this.amountRaw(row) === null) {
					continue
				}
				const amount = this.amountRaw(row)
				if (amount === null) {
					continue
				}
				const currency = this.currencyOf(row) || ''
				const existing = groups.get(currency) || { currency, total: 0 }
				existing.total += amount
				groups.set(currency, existing)
			}
			return Array.from(groups.values()).map((b) => ({
				currency: b.currency || t('nextcloud-vue', 'Unspecified'),
				total: b.total,
				amountLabel: b.total.toFixed(2),
			}))
		},

		countHeadline() {
			const total = this.rows.length
			return n('nextcloud-vue', '{count} cost', '{count} costs', total, { count: total })
		},

		mostRecent() {
			if (this.rows.length === 0) {
				return null
			}
			const sorted = [...this.rows].sort((a, b) => {
				const ta = Date.parse(a.date ?? a.linkedAt ?? a.created_at ?? '') || 0
				const tb = Date.parse(b.date ?? b.linkedAt ?? b.created_at ?? '') || 0
				return tb - ta
			})
			return sorted[0]
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

		rowKey(row) {
			return row.id ?? row.uuid ?? ''
		},

		rowTitle(row) {
			return row.title ?? row.name ?? this.rowKey(row)
		},

		rowUrl(row) {
			if (row.url) {
				return row.url
			}
			const projectId = row.projectId ?? row.project_id ?? row.data?.projectid ?? row.data?.project_id ?? null
			if (projectId !== null && projectId !== '') {
				return `/index.php/apps/cospend/p/${projectId}`
			}
			const id = this.rowKey(row)
			if (id !== '') {
				return `/index.php/apps/cospend/p/${id}`
			}
			return this.cospendAppUrl
		},

		rowType(row) {
			const t = String(row.type ?? row.kind ?? '').toLowerCase()
			if (t === 'bill' || t === 'expense') {
				return 'bill'
			}
			return 'project'
		},

		typeLabel(row) {
			return this.rowType(row) === 'bill'
				? t('nextcloud-vue', 'Bill')
				: t('nextcloud-vue', 'Project')
		},

		typeChipClass(row) {
			return this.rowType(row) === 'bill'
				? 'cn-cospend-card__chip-pill--bill'
				: 'cn-cospend-card__chip-pill--project'
		},

		amountRaw(row) {
			const raw = row.amount ?? row.data?.amount ?? null
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			return Number.isNaN(num) ? null : num
		},

		currencyOf(row) {
			return row.currency ?? row.currency_name ?? row.data?.currency_name ?? row.data?.currency ?? ''
		},

		amountLabel(row) {
			const num = this.amountRaw(row)
			if (num === null) {
				return ''
			}
			const currency = this.currencyOf(row)
			const fixed = num.toFixed(2)
			return currency ? `${fixed} ${currency}` : fixed
		},

		isLinked(row) {
			if (!this.value) {
				return false
			}
			return String(this.rowKey(row)) === String(this.value)
		},

		chipSubtitle(row) {
			return this.amountLabel(row) || this.typeLabel(row)
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
				console.error('[CnCospendCard] failed to fetch rows', err)
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
				console.error('[CnCospendCard] failed to fetch single row', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-cospend-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-cospend-card__headline {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-cospend-card__headline-line {
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-cospend-card__totals {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-cospend-card__totals-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-cospend-card__totals-label {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}

.cn-cospend-card__totals-amount {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-cospend-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-cospend-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-cospend-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-cospend-card__chip {
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

.cn-cospend-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-cospend-card__chip a:hover {
	text-decoration: underline;
}

.cn-cospend-card__chip-pill {
	display: inline-block;
	padding: 1px 6px;
	font-size: 0.7em;
	font-weight: 600;
	border-radius: 8px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	white-space: nowrap;
}

.cn-cospend-card__chip-pill--bill {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-cospend-card__chip-pill--project {
	background: var(--color-primary-element, #21468B);
	color: var(--color-main-background);
}

.cn-cospend-card__rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-cospend-card__row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	font-size: 0.85em;
}

.cn-cospend-card__row--highlight {
	border-color: var(--color-primary-element, #21468B);
	background: var(--color-primary-element-light, var(--color-background-darker));
	font-weight: 600;
}

.cn-cospend-card__title {
	flex: 1;
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-cospend-card__title:hover {
	text-decoration: underline;
}

.cn-cospend-card__amount {
	font-weight: 600;
	color: var(--color-main-text);
	font-size: 0.85em;
}
</style>
