<!--
  CnFormsCard — bespoke surface-aware widget for the `forms` integration.

  Replaces the generic CnIntegrationCard for the `forms` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N forms · M open"
        secondary line names the most-recent form with its submission
        count.
    - detail-page                    : compact list of linked forms
        with status pill + submission count per row.
    - single-entity                  : chip with form title + status
        indicator (referenceType: 'forms').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnFormsTab; for `single-entity` the optional `value` prop addresses a
  single form by id (matching CnIntegrationCard's fetchSingle
  contract).

  See `openregister/openspec/changes/integration-forms/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-forms-card__chip" :title="chipSubtitle(entity)">
				<ClipboardText :size="14" />
				<a
					:href="formUrl(entity)"
					target="_blank"
					rel="noopener">{{ formTitle(entity) }}</a>
				<span
					class="cn-forms-card__chip-status"
					:class="statusClass(entity)">{{ statusLabel(entity) }}</span>
			</span>
			<span v-else class="cn-forms-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-forms-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="forms.length === 0" class="cn-forms-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-forms-card__headline">
				<div class="cn-forms-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<div class="cn-forms-card__headline-total">
					{{ submissionsHeadline }}
				</div>
				<div v-if="mostRecent" class="cn-forms-card__headline-recent">
					<ClipboardText :size="14" />
					<a
						:href="formUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ formTitle(mostRecent) }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-forms-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="forms.length === 0" class="cn-forms-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-forms-card__list">
				<li
					v-for="form in displayedForms"
					:key="formKey(form)"
					class="cn-forms-card__row"
					:class="{ 'cn-forms-card__row--closed': isClosed(form) }">
					<div class="cn-forms-card__row-header">
						<ClipboardText :size="16" class="cn-forms-card__row-icon" />
						<a
							:href="formUrl(form)"
							target="_blank"
							rel="noopener"
							class="cn-forms-card__title">{{ formTitle(form) }}</a>
						<span
							class="cn-forms-card__status"
							:class="statusClass(form)">{{ statusLabel(form) }}</span>
					</div>
					<span v-if="rowMeta(form)" class="cn-forms-card__subtitle">{{ rowMeta(form) }}</span>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import ClipboardText from 'vue-material-design-icons/ClipboardText.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * CnFormsCard — bespoke surface-aware widget for the `forms` integration.
 *
 * Renders Forms-aware metadata across all four surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnFormsCard',

	components: { CnDetailCard, NcLoadingIcon, ClipboardText },

	props: {
		/** Stable integration id (forwarded from the registry — always `'forms'`). */
		integrationId: { type: String, default: 'forms' },
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
		/** Optional single-entity reference (form id). */
		value: { type: String, default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Forms') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => ClipboardText },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No forms linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Forms is currently unavailable.') },
		/** URL of the NC Forms app entry. */
		formsAppUrl: { type: String, default: '/index.php/apps/forms' },
	},

	data() {
		return {
			rawRows: [],
			entityRow: null,
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

		forms() {
			const out = []
			const byId = new Map()
			for (const row of this.rawRows) {
				if (!row || typeof row !== 'object') {
					continue
				}
				if ((row.type ?? 'form') === 'submission') {
					const formId = String(row.data?.formId ?? '')
					if (byId.has(formId) === true) {
						const target = byId.get(formId)
						target.submissions = (target.submissions || 0) + 1
					}
					continue
				}
				const normalised = this.normaliseFormRow(row)
				byId.set(String(normalised.id), normalised)
				out.push(normalised)
			}
			return out
		},

		entity() {
			if (this.entityRow === null) {
				return null
			}
			return this.normaliseFormRow(this.entityRow)
		},

		displayedForms() {
			if (this.surface === 'user-dashboard' || this.surface === 'app-dashboard') {
				return this.forms.slice(0, COMPACT_LIMIT)
			}
			return this.forms
		},

		openCount() {
			return this.forms.reduce((sum, f) => sum + (this.isClosed(f) ? 0 : 1), 0)
		},

		totalSubmissions() {
			return this.forms.reduce((sum, f) => sum + this.submissionCount(f), 0)
		},

		countHeadline() {
			const total = this.forms.length
			const open = this.openCount
			if (total === 0) {
				return ''
			}
			if (open === 0) {
				return n('nextcloud-vue', '{count} form (all closed)', '{count} forms (all closed)', total, { count: total })
			}
			const totalFragment = n('nextcloud-vue', '{count} form', '{count} forms', total, { count: total })
			const openFragment = n('nextcloud-vue', '{count} open', '{count} open', open, { count: open })
			return `${totalFragment} · ${openFragment}`
		},

		submissionsHeadline() {
			const total = this.totalSubmissions
			return n('nextcloud-vue', '{count} submission', '{count} submissions', total, { count: total })
		},

		mostRecent() {
			if (this.forms.length === 0) {
				return null
			}
			const sorted = [...this.forms].sort((a, b) => {
				return this.sortTimestamp(b) - this.sortTimestamp(a)
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

		normaliseFormRow(row) {
			const data = row.data || {}
			return {
				id: row.id ?? data.id ?? '',
				hash: data.hash ?? row.hash ?? '',
				title: row.title ?? data.title ?? '',
				description: row.description ?? data.description ?? '',
				url: row.url ?? '',
				lastUpdated: row.lastUpdated ?? data.lastUpdated ?? null,
				status: row.status ?? data.status ?? null,
				expiresAt: row.expiresAt ?? data.expiresAt ?? null,
				accessible: row.accessible ?? data.accessible ?? null,
				submissionCount: Number(row.submissionCount ?? data.submissionCount ?? 0) || 0,
				submissions: 0,
			}
		},

		formKey(form) {
			return form.id ?? form.hash ?? ''
		},

		formTitle(form) {
			return form.title || form.id || t('nextcloud-vue', 'Untitled form')
		},

		formUrl(form) {
			if (form.url) {
				return form.url
			}
			if (form.hash) {
				return `/index.php/apps/forms/${form.hash}`
			}
			return this.formsAppUrl
		},

		expiresAtMs(form) {
			const v = form.expiresAt
			if (v === null || v === undefined || v === '') {
				return null
			}
			if (typeof v === 'number') {
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? null : parsed
		},

		isClosed(form) {
			if (form.status === 'closed') {
				return true
			}
			const ms = this.expiresAtMs(form)
			if (ms !== null) {
				return ms <= Date.now()
			}
			return false
		},

		statusLabel(form) {
			if (this.isClosed(form) === true) {
				return t('nextcloud-vue', 'Closed')
			}
			if (form.status === 'draft') {
				return t('nextcloud-vue', 'Draft')
			}
			return t('nextcloud-vue', 'Open')
		},

		statusClass(form) {
			if (this.isClosed(form) === true) {
				return 'cn-forms-card__status--closed'
			}
			if (form.status === 'draft') {
				return 'cn-forms-card__status--draft'
			}
			return 'cn-forms-card__status--open'
		},

		submissionCount(form) {
			if (form.submissionCount > 0) {
				return form.submissionCount
			}
			return form.submissions || 0
		},

		sortTimestamp(form) {
			const lu = Number(form.lastUpdated ?? 0)
			if (Number.isFinite(lu) && lu > 0) {
				return lu < 1e12 ? lu * 1000 : lu
			}
			return 0
		},

		rowMeta(form) {
			const parts = []
			const count = this.submissionCount(form)
			if (count > 0) {
				parts.push(t('nextcloud-vue', '{n} submissions', { n: count }))
			}
			const ms = this.expiresAtMs(form)
			if (ms !== null) {
				const diff = ms - Date.now()
				if (diff > 0) {
					const days = Math.ceil(diff / MS_PER_DAY)
					if (days <= 1) {
						const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)))
						parts.push(t('nextcloud-vue', 'Closes in {n} hours', { n: hours }))
					} else {
						parts.push(t('nextcloud-vue', 'Closes in {n} days', { n: days }))
					}
				}
			}
			return parts.join(' · ')
		},

		chipSubtitle(form) {
			return this.statusLabel(form) || this.formTitle(form)
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
					this.rawRows = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.rawRows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rawRows = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFormsCard] failed to fetch forms', err)
				this.rawRows = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (!this.value || !this.register || !this.schema || !this.objectId) {
				this.entityRow = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entityRow = await response.json()
				} else if (response.status === 503) {
					this.entityRow = null
					this.degraded = this.unavailableLabel
				} else {
					this.entityRow = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFormsCard] failed to fetch single form', err)
				this.entityRow = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-forms-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-forms-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-forms-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-forms-card__headline-total {
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
}

.cn-forms-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-forms-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-forms-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-forms-card__chip {
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

.cn-forms-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-forms-card__chip a:hover {
	text-decoration: underline;
}

.cn-forms-card__chip-status {
	padding: 1px 6px;
	border-radius: 8px;
	font-size: 0.75em;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-forms-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-forms-card__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-forms-card__row:last-child {
	border-bottom: none;
}

.cn-forms-card__row--closed {
	opacity: 0.85;
}

.cn-forms-card__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-forms-card__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-forms-card__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-forms-card__title:hover {
	text-decoration: underline;
}

.cn-forms-card__status,
.cn-forms-card__chip-status {
	flex-shrink: 0;
	padding: 1px 6px;
	border-radius: 8px;
	font-size: 0.7em;
	font-weight: 500;
}

.cn-forms-card__status--open {
	background: var(--color-success, #46ba61);
	color: var(--color-primary-element-text, #ffffff);
}

.cn-forms-card__status--closed {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-forms-card__status--draft {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-forms-card__subtitle {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 24px;
}
</style>
