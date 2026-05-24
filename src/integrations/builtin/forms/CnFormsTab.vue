<!--
  CnFormsTab — bespoke sidebar tab for the `forms` integration.

  Replaces the generic CnIntegrationTab for the `forms` leaf: renders a
  list of linked NC Forms with title, description, status / expiry
  meta, submission count, and a per-row "Open form" deep-link
  (`/index.php/apps/forms/{hash}`). Submissions surfaced by the
  provider are grouped under their parent form so the tab stays
  scannable rather than collapsing into a flat row pile.

  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/forms`
  served by `OCA\OpenRegister\Service\Integration\Providers\FormsProvider`
  (which DB-queries `forms_v2_forms` filtered by an `[or:{uuid}]`
  description marker, then loads `forms_v2_submissions` per match).

  Payload contract today (per FormsProvider::list):
    { type: 'form'|'submission',
      id, title, description, url, lastUpdated,
      data: { id, hash, title, description, lastUpdated }  // forms
          | { id, formId, userId, timestamp } }              // submissions

  Surface behaviour:
    - Empty state with "Open Forms" CTA when no linked forms.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.
    - "Status" + "expiry" + "accessible" badges are rendered defensively
      from poll.status/expiresAt/accessible if the provider ships them
      later (currently NOT in the payload — flagged in the spec delta
      under Phase B widening; UI lights up the moment the provider
      extends).

  Bespoke-vs-generic rationale: the generic tab renders a flat link
  list which loses Forms' core signal — open vs. closed + how many
  submissions have come in. The bespoke tab surfaces both inline so
  case handlers can see at a glance whether a form needs collecting.

  See `openregister/openspec/changes/integration-forms/` for the spec
  delta and ADR-019 (registry mechanism).
-->
<template>
	<div class="cn-sidebar-tab cn-forms-tab">
		<div v-if="degraded" class="cn-forms-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-forms-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="forms.length === 0" class="cn-sidebar-tab__empty cn-forms-tab__empty">
			<ClipboardText :size="32" class="cn-forms-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openFormsApp">
				<template #icon>
					<ClipboardText :size="20" />
				</template>
				{{ openFormsLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-forms-tab__list">
			<li
				v-for="form in forms"
				:key="formKey(form)"
				class="cn-forms-tab__row"
				:class="{ 'cn-forms-tab__row--closed': isClosed(form) }">
				<div class="cn-forms-tab__row-header">
					<ClipboardText :size="20" class="cn-forms-tab__row-icon" />
					<a
						:href="formUrl(form)"
						target="_blank"
						rel="noopener"
						class="cn-forms-tab__title">{{ formTitle(form) }}</a>
					<span
						class="cn-forms-tab__status"
						:class="statusClass(form)">{{ statusLabel(form) }}</span>
				</div>
				<div v-if="formDescription(form)" class="cn-forms-tab__description">
					{{ formDescription(form) }}
				</div>
				<div v-if="formMeta(form)" class="cn-forms-tab__meta">
					{{ formMeta(form) }}
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClipboardText from 'vue-material-design-icons/ClipboardText.vue'
import { buildHeaders } from '../../../utils/index.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * CnFormsTab — bespoke linked-forms list for the `forms` integration.
 *
 * Renders rows pulled from the OR pluggable-integration endpoint,
 * grouped per parent form. Per-row metadata lights up defensively
 * whenever the provider ships extra fields
 * (`status` / `expiresAt` / `accessible` / `submissionCount`) — until
 * Phase-B widening lands these stay hidden.
 */
export default {
	name: 'CnFormsTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, ClipboardText },

	props: {
		/** Stable integration id (forwarded from the registry — always `'forms'`). */
		integrationId: { type: String, default: 'forms' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No forms linked yet') },
		/** Pre-translated label for the "Open in Forms" CTA. */
		openFormsLabel: { type: String, default: () => t('nextcloud-vue', 'Open Forms') },
		/** Pre-translated banner when Forms is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Forms is currently unavailable.') },
		/** URL of the NC Forms app entry. */
		formsAppUrl: { type: String, default: '/index.php/apps/forms' },
	},

	data() {
		return {
			rawRows: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	computed: {
		/**
		 * Group provider rows into a per-form list with attached
		 * submissions. The provider emits a flat sequence of `form`
		 * rows interleaved with the form's `submission` rows; the tab
		 * surfaces them as one card per form with a submission tally
		 * derived from the trailing submission rows.
		 *
		 * @return {object[]} Per-form display rows.
		 */
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
						if (row.lastUpdated && (!target.lastSubmissionAt || row.lastUpdated > target.lastSubmissionAt)) {
							target.lastSubmissionAt = row.lastUpdated
						}
					}
					continue
				}
				const normalised = this.normaliseFormRow(row)
				byId.set(String(normalised.id), normalised)
				out.push(normalised)
			}
			return out
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchForms() } } },
		register() { this.fetchForms() },
		schema() { this.fetchForms() },
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
				// Defensive: these come from a future provider widening.
				status: row.status ?? data.status ?? null,
				expiresAt: row.expiresAt ?? data.expiresAt ?? null,
				accessible: row.accessible ?? data.accessible ?? null,
				submissionCount: Number(row.submissionCount ?? data.submissionCount ?? 0) || 0,
				submissions: 0,
				lastSubmissionAt: null,
			}
		},

		formKey(form) {
			return form.id ?? form.hash ?? ''
		},

		formTitle(form) {
			return form.title || form.id || t('nextcloud-vue', 'Untitled form')
		},

		formDescription(form) {
			return form.description || ''
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
				return 'cn-forms-tab__status--closed'
			}
			if (form.status === 'draft') {
				return 'cn-forms-tab__status--draft'
			}
			return 'cn-forms-tab__status--open'
		},

		submissionCount(form) {
			// Prefer the explicit count if the provider ever ships it;
			// otherwise fall back to the submission rows we observed.
			if (form.submissionCount > 0) {
				return form.submissionCount
			}
			return form.submissions || 0
		},

		formMeta(form) {
			const parts = []
			const count = this.submissionCount(form)
			if (count > 0) {
				parts.push(t('nextcloud-vue', '{n} submissions', { n: count }))
			}
			const expiryFragment = this.expiryFragment(form)
			if (expiryFragment !== '') {
				parts.push(expiryFragment)
			}
			if (form.accessible === false) {
				parts.push(t('nextcloud-vue', 'Restricted'))
			}
			return parts.join(' · ')
		},

		expiryFragment(form) {
			const ms = this.expiresAtMs(form)
			if (ms === null) {
				return ''
			}
			const diff = ms - Date.now()
			if (diff <= 0) {
				return t('nextcloud-vue', 'Closed')
			}
			const days = Math.ceil(diff / MS_PER_DAY)
			if (days <= 1) {
				const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)))
				return t('nextcloud-vue', 'Closes in {n} hours', { n: hours })
			}
			return t('nextcloud-vue', 'Closes in {n} days', { n: days })
		},

		openFormsApp() {
			if (typeof window !== 'undefined') {
				window.open(this.formsAppUrl, '_blank', 'noopener')
			}
		},

		async fetchForms() {
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
					this.rawRows = rows
				} else if (response.status === 503) {
					this.rawRows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rawRows = []
					this.error = t('nextcloud-vue', 'Could not load forms.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFormsTab] failed to fetch forms', err)
				this.rawRows = []
				this.error = t('nextcloud-vue', 'Could not load forms.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-forms-tab__banner {
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

.cn-forms-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-forms-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-forms-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-forms-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-forms-tab__row {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-forms-tab__row:last-child {
	border-bottom: none;
}

.cn-forms-tab__row--closed {
	opacity: 0.85;
}

.cn-forms-tab__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-forms-tab__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-forms-tab__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
}

a.cn-forms-tab__title:hover {
	text-decoration: underline;
}

.cn-forms-tab__status {
	flex-shrink: 0;
	padding: 1px 8px;
	border-radius: 10px;
	font-size: 0.75em;
	font-weight: 500;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-forms-tab__status--open {
	background: var(--color-success, #46ba61);
	color: var(--color-primary-element-text, #ffffff);
}

.cn-forms-tab__status--closed {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-forms-tab__status--draft {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-forms-tab__description {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.cn-forms-tab__meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
}
</style>
