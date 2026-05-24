<!--
  CnCospendTab — bespoke sidebar tab for the `cospend` integration.

  Replaces the generic CnIntegrationTab for the `cospend` leaf: renders
  the NC Cospend rows linked to the parent OR object as a flat list.
  Cospend exposes BOTH project rows AND bill rows in the same payload
  (per wave 2.3 design — see `CospendProvider.php`); each row carries
  a `type` discriminator (`'project'` | `'bill'`) which this tab shows
  as a `[Project]` / `[Bill]` chip alongside the title.

  Rows show:
    - project: name + currency badge + payer (when present)
    - bill:    title + date + amount + currency + payer

  Clicking a project row deep-links to
    /index.php/apps/cospend/p/{id}
  Bills inherit the same URL (Cospend doesn't have a stable per-bill
  permalink — the project page lists its bills); a row's own `url`
  field wins if the provider already constructed one.

  Talks to the OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/cospend`
  served by `OCA\OpenRegister\Service\Integration\Providers\CospendProvider`
  (link-table strategy — marker `[or:{uuid}]` in `cospend_projects.name`).

  Surface behaviour (per ADR-017 graceful degradation):
    - Empty state with "Open Costs" CTA when no linked rows.
    - Loading spinner during fetch.
    - 503 "currently unavailable" banner when Cospend is down.
    - Generic error label when fetch throws.

  Bespoke-vs-generic rationale: the generic tab renders a flat link
  list which loses Cospend's primary signals — *whether the row is a
  project or a bill*, the amount, and the currency. Surfacing them
  inline lets case handlers triage spending at a glance without
  context-switching into Cospend.

  See `openregister/openspec/changes/integration-cospend/` for the
  spec delta, ADR-019 (registry mechanism), ADR-022 (sidebar tab
  contract), `openregister#1324` for provider follow-ups.
-->
<template>
	<div class="cn-sidebar-tab cn-cospend-tab">
		<div v-if="degraded" class="cn-cospend-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-cospend-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="rows.length === 0" class="cn-sidebar-tab__empty cn-cospend-tab__empty">
			<CurrencyEur :size="32" class="cn-cospend-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openCospendApp">
				<template #icon>
					<CurrencyEur :size="20" />
				</template>
				{{ openCospendLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-cospend-tab__list">
			<li
				v-for="row in rows"
				:key="rowKey(row)"
				class="cn-cospend-tab__row"
				:class="rowClass(row)">
				<div class="cn-cospend-tab__row-header">
					<a
						:href="rowUrl(row)"
						target="_blank"
						rel="noopener"
						class="cn-cospend-tab__title">{{ rowTitle(row) }}</a>
					<span
						class="cn-cospend-tab__type-chip"
						:class="typeChipClass(row)">
						{{ typeLabel(row) }}
					</span>
				</div>
				<div class="cn-cospend-tab__row-meta">
					<span v-if="amountLabel(row)" class="cn-cospend-tab__amount">
						<CurrencyEur :size="13" />
						{{ amountLabel(row) }}
					</span>
					<span v-if="payerLabel(row)" class="cn-cospend-tab__payer">
						<AccountCircleOutline :size="13" />
						{{ payerLabel(row) }}
					</span>
					<span v-if="dateLabel(row)" class="cn-cospend-tab__date">
						<ClockOutline :size="13" />
						{{ dateLabel(row) }}
					</span>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AccountCircleOutline from 'vue-material-design-icons/AccountCircleOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import CurrencyEur from 'vue-material-design-icons/CurrencyEur.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnCospendTab — bespoke sidebar tab for the `cospend` integration.
 *
 * Renders linked Cospend projects + bills with type chip, amount,
 * currency, payer, date. See the file-level docblock for surface
 * behaviour.
 */
export default {
	name: 'CnCospendTab',

	components: { NcButton, NcLoadingIcon, AccountCircleOutline, AlertCircleOutline, ClockOutline, CurrencyEur },

	props: {
		/** Stable integration id (forwarded from the registry — always `'cospend'`). */
		integrationId: { type: String, default: 'cospend' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No costs linked yet') },
		/** Pre-translated label for the "Open Costs" CTA. */
		openCospendLabel: { type: String, default: () => t('nextcloud-vue', 'Open Costs') },
		/** Pre-translated banner when Cospend is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Costs is currently unavailable.') },
		/** URL of the NC Cospend app entry. */
		cospendAppUrl: { type: String, default: '/index.php/apps/cospend' },
	},

	data() {
		return {
			rows: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchRows() } } },
		register() { this.fetchRows() },
		schema() { this.fetchRows() },
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

		/**
		 * Discriminator. Defaults to 'project' when the provider doesn't
		 * surface a `type` field (the current shipping CospendProvider
		 * only returns projects); when wave-2.3 ships bills the chip
		 * label flips accordingly.
		 *
		 * @param {object} row Provider row.
		 * @return {'project'|'bill'} Row type.
		 */
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
				? 'cn-cospend-tab__type-chip--bill'
				: 'cn-cospend-tab__type-chip--project'
		},

		rowClass(row) {
			return this.rowType(row) === 'bill'
				? 'cn-cospend-tab__row--bill'
				: 'cn-cospend-tab__row--project'
		},

		amountLabel(row) {
			const raw = row.amount ?? row.data?.amount ?? null
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const currency = row.currency ?? row.currency_name ?? row.data?.currency_name ?? row.data?.currency ?? ''
			const num = Number(raw)
			if (Number.isNaN(num)) {
				return currency ? `${raw} ${currency}` : String(raw)
			}
			const fixed = num.toFixed(2)
			return currency ? `${fixed} ${currency}` : fixed
		},

		payerLabel(row) {
			return row.payer ?? row.user_id ?? row.data?.user_id ?? row.data?.payer ?? ''
		},

		dateLabel(row) {
			const raw = row.date ?? row.created_at ?? row.data?.date ?? row.data?.timestamp ?? null
			if (!raw) {
				return ''
			}
			const date = typeof raw === 'number'
				? new Date(raw * 1000)
				: new Date(raw)
			if (Number.isNaN(date.getTime())) {
				return ''
			}
			return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
		},

		openCospendApp() {
			if (typeof window !== 'undefined') {
				window.open(this.cospendAppUrl, '_blank', 'noopener')
			}
		},

		async fetchRows() {
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
					this.rows = rows
				} else if (response.status === 503) {
					this.rows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rows = []
					this.error = t('nextcloud-vue', 'Could not load costs.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCospendTab] failed to fetch rows', err)
				this.rows = []
				this.error = t('nextcloud-vue', 'Could not load costs.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-cospend-tab__banner {
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

.cn-cospend-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-cospend-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-cospend-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-cospend-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-cospend-tab__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 10px;
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
}

.cn-cospend-tab__row--bill {
	border-left: 3px solid var(--color-warning, #e9a40f);
}

.cn-cospend-tab__row--project {
	border-left: 3px solid var(--color-primary-element, #21468B);
}

.cn-cospend-tab__row-header {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-cospend-tab__title {
	flex: 1;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-cospend-tab__title:hover {
	text-decoration: underline;
}

.cn-cospend-tab__type-chip {
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

.cn-cospend-tab__type-chip--bill {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-cospend-tab__type-chip--project {
	background: var(--color-primary-element, #21468B);
	color: var(--color-main-background);
}

.cn-cospend-tab__row-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	font-size: 0.78em;
	color: var(--color-text-maxcontrast);
}

.cn-cospend-tab__amount {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-cospend-tab__payer,
.cn-cospend-tab__date {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}
</style>
