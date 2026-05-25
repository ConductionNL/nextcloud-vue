<!--
  CnCospendTab — bespoke sidebar tab for the `cospend` integration.

  Replaces the generic CnIntegrationTab for the `cospend` leaf: renders
  the NC Cospend rows linked to the parent OR object as a Cospend-style
  list of projects and bills.
  Cospend exposes BOTH project rows AND bill rows in the same payload
  (per wave 2.3 design — see `CospendProvider.php`); each row carries
  a `type` discriminator (`'project'` | `'bill'`) which this tab shows
  as a `[Project]` / `[Bill]` status badge alongside the title.

  Rows render via NcListItem to mirror real Cospend:
    - project: name + [Project] badge + currency, payer (when present)
    - bill:    title + [Bill] badge + payer · date subline, prominent
               right-aligned amount with currency
  A per-currency total footer summarises the linked spend, matching
  Cospend's project balance row.

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

		<div v-if="!degraded" class="cn-cospend-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing project') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new project') }}
			</NcButton>
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
		<template v-else>
			<ul class="cn-cospend-tab__list">
				<NcListItem
					v-for="row in rows"
					:key="rowKey(row)"
					class="cn-cospend-tab__row"
					:class="rowClass(row)"
					:href="rowUrl(row)"
					target="_blank"
					:force-display-actions="true">
					<template #icon>
						<span class="cn-cospend-tab__row-icon" :class="iconClass(row)">
							<CashMultiple v-if="rowType(row) === 'bill'" :size="20" />
							<FolderOutline v-else :size="20" />
						</span>
					</template>
					<template #name>
						<span class="cn-cospend-tab__title">{{ rowTitle(row) }}</span>
					</template>
					<template #subname>
						<span class="cn-cospend-tab__subline">
							<CnStatusBadge
								class="cn-cospend-tab__type-chip"
								:class="typeChipClass(row)"
								size="small"
								:variant="typeVariant(row)"
								:label="typeLabel(row)" />
							<span v-if="sublineText(row)" class="cn-cospend-tab__subline-text">
								{{ sublineText(row) }}
							</span>
						</span>
					</template>
					<template #indicator>
						<span v-if="amountLabel(row)" class="cn-cospend-tab__amount" :class="amountClass(row)">
							{{ amountLabel(row) }}
						</span>
					</template>
					<template #actions>
						<NcActionButton
							v-if="entryIdOf(row)"
							:close-after-click="true"
							@click="unlinkEntry(row)">
							<template #icon>
								<LinkOff :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Unlink entry') }}
						</NcActionButton>
					</template>
				</NcListItem>
			</ul>

			<div v-if="totals.length > 0" class="cn-cospend-tab__totals">
				<span class="cn-cospend-tab__totals-label">{{ t('nextcloud-vue', 'Total') }}</span>
				<ul class="cn-cospend-tab__totals-list">
					<li
						v-for="bucket in totals"
						:key="bucket.currency"
						class="cn-cospend-tab__totals-row">
						<span class="cn-cospend-tab__totals-currency">{{ bucket.currency }}</span>
						<span class="cn-cospend-tab__totals-amount">{{ bucket.amountLabel }}</span>
					</li>
				</ul>
			</div>
		</template>

		<CnCospendPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnCospendCreate
			v-if="createOpen"
			:api-base="apiBase"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import CashMultiple from 'vue-material-design-icons/CashMultiple.vue'
import CurrencyEur from 'vue-material-design-icons/CurrencyEur.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import CnCospendCreate from '../../../components/CnCospendCreate/CnCospendCreate.vue'
import CnCospendPicker from '../../../components/CnCospendPicker/CnCospendPicker.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnCospendTab — bespoke sidebar tab for the `cospend` integration.
 *
 * Renders linked Cospend projects + bills with a type badge, amount,
 * currency, payer, date and a per-currency total footer. See the
 * file-level docblock for surface behaviour.
 */
export default {
	name: 'CnCospendTab',

	components: {
		NcActionButton,
		NcButton,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		CashMultiple,
		CurrencyEur,
		FolderOutline,
		LinkOff,
		LinkVariant,
		Plus,
		CnStatusBadge,
		CnCospendPicker,
		CnCospendCreate,
	},

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
			pickerOpen: false,
			createOpen: false,
		}
	},

	computed: {
		/**
		 * Per-currency totals of every row carrying an amount, mirroring
		 * the balance row Cospend renders under a project.
		 *
		 * @return {Array<{currency: string, amountLabel: string}>}
		 */
		totals() {
			const groups = new Map()
			for (const row of this.rows) {
				const amount = this.amountRaw(row)
				if (amount === null) {
					continue
				}
				const currency = this.currencyOf(row) || ''
				const existing = groups.get(currency) || { currency, total: 0 }
				existing.total += amount
				groups.set(currency, existing)
			}
			return Array.from(groups.values()).map((b) => {
				const code = b.currency || t('nextcloud-vue', 'Unspecified')
				return {
					currency: code,
					amountLabel: b.currency ? `${b.total.toFixed(2)} ${b.currency}` : b.total.toFixed(2),
				}
			})
		},
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

		/**
		 * Base for the Tier-2 cospend endpoints (list/link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		cospendEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/cospend`
		},

		rowKey(row) {
			return row.id ?? row.uuid ?? ''
		},

		/**
		 * Resolve the link-row id for a Tier-2 row (used for unlink).
		 * Legacy marker rows have no `entryId` so the unlink button hides.
		 *
		 * @param {object} row Provider/link row.
		 *
		 * @return {(number|string)} The link row id, or '' when absent.
		 */
		entryIdOf(row) {
			const d = (row && typeof row.data === 'object' && row.data !== null) ? row.data : {}
			return row.entryId ?? d.id ?? ''
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.cospendEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchRows()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This entry is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link entry.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCospendTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link entry.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.cospendEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchRows()
				} else {
					this.error = t('nextcloud-vue', 'Could not create project.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCospendTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create project.')
			}
		},

		async unlinkEntry(row) {
			const id = this.entryIdOf(row)
			if (!id) {
				return
			}
			try {
				const response = await fetch(`${this.cospendEndpoint()}/${id}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchRows()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink entry.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCospendTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink entry.')
			}
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

		typeVariant(row) {
			return this.rowType(row) === 'bill' ? 'warning' : 'primary'
		},

		rowClass(row) {
			return this.rowType(row) === 'bill'
				? 'cn-cospend-tab__row--bill'
				: 'cn-cospend-tab__row--project'
		},

		iconClass(row) {
			return this.rowType(row) === 'bill'
				? 'cn-cospend-tab__row-icon--bill'
				: 'cn-cospend-tab__row-icon--project'
		},

		amountClass(row) {
			return this.rowType(row) === 'bill'
				? 'cn-cospend-tab__amount--bill'
				: 'cn-cospend-tab__amount--project'
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
			const raw = row.amount ?? row.data?.amount ?? null
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const currency = this.currencyOf(row)
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

		/**
		 * Subline shown under the title. For bills this is the payer and
		 * date joined with a middot ("alice · 20 May 2026"); for projects
		 * it is the currency (or payer) when present.
		 *
		 * @param {object} row Provider row.
		 * @return {string} Subline text, or '' when nothing to show.
		 */
		sublineText(row) {
			const parts = []
			if (this.rowType(row) === 'bill') {
				const payer = this.payerLabel(row)
				if (payer) {
					parts.push(payer)
				}
				const date = this.dateLabel(row)
				if (date) {
					parts.push(date)
				}
			} else {
				const currency = this.currencyOf(row)
				if (currency) {
					parts.push(currency)
				}
				const payer = this.payerLabel(row)
				if (payer) {
					parts.push(payer)
				}
			}
			return parts.join(' · ')
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
				} else if (response.status === 503 || response.status === 501) {
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
.cn-cospend-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
}

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
	gap: 2px;
}

/* Coloured left rail per row type, echoing Cospend's project/bill split. */
.cn-cospend-tab__row {
	border-radius: var(--border-radius);
}

.cn-cospend-tab__row--bill {
	border-left: 3px solid var(--color-warning, #e9a40f);
}

.cn-cospend-tab__row--project {
	border-left: 3px solid var(--color-primary-element, #21468B);
}

.cn-cospend-tab__row-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	color: var(--color-main-background);
}

.cn-cospend-tab__row-icon--bill {
	background: var(--color-warning, #e9a40f);
}

.cn-cospend-tab__row-icon--project {
	background: var(--color-primary-element, #21468B);
}

.cn-cospend-tab__title {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-cospend-tab__subline {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-cospend-tab__subline-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-cospend-tab__type-chip {
	flex-shrink: 0;
}

.cn-cospend-tab__amount {
	font-weight: 700;
	font-size: 0.95em;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-cospend-tab__amount--bill {
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-cospend-tab__totals {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8px;
	margin-top: 8px;
	padding: 8px 10px;
	border-top: 1px solid var(--color-border);
}

.cn-cospend-tab__totals-label {
	font-weight: 600;
	color: var(--color-main-text);
	text-transform: uppercase;
	font-size: 0.78em;
	letter-spacing: 0.04em;
}

.cn-cospend-tab__totals-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
	text-align: right;
}

.cn-cospend-tab__totals-row {
	display: flex;
	align-items: baseline;
	justify-content: flex-end;
	gap: 8px;
	font-size: 0.85em;
}

.cn-cospend-tab__totals-currency {
	color: var(--color-text-maxcontrast);
}

.cn-cospend-tab__totals-amount {
	font-weight: 700;
	color: var(--color-main-text);
}
</style>
