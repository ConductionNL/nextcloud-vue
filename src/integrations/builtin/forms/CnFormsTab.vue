<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnFormsTab — bespoke sidebar tab for the Tier-2 `forms` integration.
  -
  - Replaces the generic CnIntegrationTab for the `forms` leaf: renders a
  - list of linked NC Forms forms styled to mirror the real Forms app —
  - each row is an NcListItem with a clipboard/form icon, the bold form
  - title, an optional description, a response-count bubble
  - (NcCounterBubble), an open/closed/draft state chip (CnStatusBadge),
  - and an expiry date (NcDateTime) when the form has one. Per-row "Open
  - in Forms" + unlink live in the row actions menu, with Tier-2
  - link/unlink + create-new actions on the header.
  -
  - Talks to the OpenRegister Tier-2 forms link surface:
  -    GET    /api/objects/{r}/{s}/{id}/forms        — list linked
  -    POST   /api/objects/{r}/{s}/{id}/forms        — link existing
  -    POST   /api/objects/{r}/{s}/{id}/forms/new    — create + link
  -    DELETE /api/objects/{r}/{s}/{id}/forms/{id}   — unlink form
  -
  - The Tier-2 endpoint returns canonical form rows enriched with
  - submission roll-ups; pre-Tier-2 forms (still on the marker scan)
  - keep working through the same endpoint via the provider's
  - backwards-compat fallback.
  -
  - Per ADR-004 (modal isolation) the picker + create modals live in
  - their own .vue files (CnFormPicker, CnFormCreate) and are wired
  - in here rather than inlined.
  -
  - @spec openspec/changes/integration-forms/specs/integrations/forms/spec.md
  -->
<template>
	<div class="cn-sidebar-tab cn-forms-tab">
		<div class="cn-forms-tab__header">
			<NcButton
				variant="primary"
				:aria-label="linkExistingLabel"
				@click="showPicker = true">
				<template #icon>
					<LinkVariantPlus :size="20" />
				</template>
				{{ linkExistingLabel }}
			</NcButton>
			<NcButton
				:aria-label="createNewLabel"
				@click="showCreate = true">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ createNewLabel }}
			</NcButton>
		</div>

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
			<NcButton variant="primary" @click="openFormsApp">
				<template #icon>
					<ClipboardText :size="20" />
				</template>
				{{ openFormsLabel }}
			</NcButton>
		</div>
		<ul v-else class="cn-forms-tab__list">
			<NcListItem
				v-for="form in forms"
				:key="formKey(form)"
				class="cn-forms-tab__row"
				:class="{ 'cn-forms-tab__row--closed': isClosed(form) }"
				:name="formTitle(form)"
				:bold="false"
				:href="formUrl(form)"
				target="_blank"
				:force-display-actions="true">
				<template #icon>
					<ClipboardText :size="40" class="cn-forms-tab__row-icon" />
				</template>
				<template v-if="formDescription(form)" #subname>
					<span class="cn-forms-tab__description">{{ formDescription(form) }}</span>
				</template>
				<template #details>
					<div class="cn-forms-tab__details">
						<CnStatusBadge
							class="cn-forms-tab__status"
							:class="statusClass(form)"
							:label="statusLabel(form)"
							:variant="statusVariant(form)"
							size="small" />
						<NcDateTime
							v-if="expiresAtMs(form) !== null"
							class="cn-forms-tab__expiry"
							:timestamp="expiresAtMs(form)"
							:relative-time="'short'" />
					</div>
				</template>
				<template v-if="submissionCount(form) > 0" #indicator>
					<NcCounterBubble
						class="cn-forms-tab__count"
						:aria-label="responsesAriaLabel(form)">
						{{ submissionCount(form) }}
					</NcCounterBubble>
				</template>
				<template #actions>
					<NcActionButton :close-after-click="true" @click="openForm(form)">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ openInFormsLabel }}
					</NcActionButton>
					<NcActionButton
						class="cn-forms-tab__unlink"
						:close-after-click="true"
						@click="unlink(form)">
						<template #icon>
							<Close :size="20" />
						</template>
						{{ unlinkLabel }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnFormPicker
			v-if="showPicker"
			:object-id="objectId"
			:register="register"
			:schema="schema"
			:api-base="apiBase"
			@link="onLinkSelected"
			@close="showPicker = false" />

		<CnFormCreate
			v-if="showCreate"
			:submitting="creating"
			:submit-error="createError"
			@create="onCreateSubmit"
			@close="onCreateClose" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcCounterBubble, NcDateTime, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClipboardText from 'vue-material-design-icons/ClipboardText.vue'
import Close from 'vue-material-design-icons/Close.vue'
import LinkVariantPlus from 'vue-material-design-icons/LinkVariantPlus.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'

import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import { buildHeaders } from '../../../utils/index.js'
import CnFormCreate from './CnFormCreate.vue'
import CnFormPicker from './CnFormPicker.vue'

/**
 * CnFormsTab — bespoke linked-forms list for the Tier-2 `forms` leaf.
 *
 * Renders rows pulled from the OR Tier-2 forms link endpoint, styled to
 * mirror NC Forms (form icon, bold title, description, response-count
 * bubble, state chip, expiry date), with inline "Link existing form" +
 * "Create new form" actions on the header and per-row open/unlink in the
 * row actions menu.
 */
export default {
	name: 'CnFormsTab',

	components: {
		NcActionButton,
		NcButton,
		NcCounterBubble,
		NcDateTime,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		ClipboardText,
		Close,
		LinkVariantPlus,
		OpenInNew,
		Plus,
		CnStatusBadge,
		CnFormCreate,
		CnFormPicker,
	},

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
		/** Pre-translated label for the per-row "Open in Forms" action. */
		openInFormsLabel: { type: String, default: () => t('nextcloud-vue', 'Open in Forms') },
		/** Pre-translated banner when Forms is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Forms is currently unavailable.') },
		/** Pre-translated label for the link-existing action. */
		linkExistingLabel: { type: String, default: () => t('nextcloud-vue', 'Link existing form') },
		/** Pre-translated label for the create-new action. */
		createNewLabel: { type: String, default: () => t('nextcloud-vue', 'Create new form') },
		/** Pre-translated label for the per-row unlink action. */
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink form') },
		/** URL of the NC Forms app entry. */
		formsAppUrl: { type: String, default: '/index.php/apps/forms' },
	},

	data() {
		return {
			rawRows: [],
			loading: false,
			error: '',
			degraded: '',
			showPicker: false,
			showCreate: false,
			creating: false,
			createError: '',
		}
	},

	computed: {
		/**
		 * Group provider rows into a per-form list with attached
		 * submissions. The Tier-2 endpoint already emits per-form rows
		 * with `submissionCount` rolled up; this method also handles
		 * the legacy flat shape (rows with `type: 'submission'`) for
		 * forms that pre-date the link table.
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
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/forms`
		},

		normaliseFormRow(row) {
			const data = row.data || {}
			return {
				id: row.id ?? row.formId ?? data.id ?? '',
				hash: data.hash ?? row.formHash ?? row.hash ?? '',
				title: row.title ?? data.title ?? '',
				description: row.description ?? data.description ?? '',
				url: row.url ?? '',
				lastUpdated: row.lastUpdated ?? data.lastUpdated ?? null,
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

		/**
		 * Resolve the form's expiry as a millisecond epoch, or null when
		 * the form never expires. Accepts both second- and millisecond-
		 * granularity numbers and ISO strings.
		 *
		 * @param {object} form normalised form row
		 *
		 * @return {?number}
		 */
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
			if (form.status === 'closed' || form.status === 'archived') {
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

		/**
		 * Map the form's state to a CnStatusBadge colour variant —
		 * open = success (green), draft = warning, closed = default.
		 *
		 * @param {object} form normalised form row
		 *
		 * @return {string}
		 */
		statusVariant(form) {
			if (this.isClosed(form) === true) {
				return 'default'
			}
			if (form.status === 'draft') {
				return 'warning'
			}
			return 'success'
		},

		submissionCount(form) {
			if (form.submissionCount > 0) {
				return form.submissionCount
			}
			return form.submissions || 0
		},

		responsesAriaLabel(form) {
			return t('nextcloud-vue', '{n} submissions', { n: this.submissionCount(form) })
		},

		openForm(form) {
			if (typeof window !== 'undefined') {
				window.open(this.formUrl(form), '_blank', 'noopener')
			}
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
					this.rawRows = this.unwrapList(data)
				} else if (response.status === 503) {
					this.rawRows = []
					this.degraded = this.unavailableLabel
				} else {
					this.rawRows = []
					this.error = t('nextcloud-vue', 'Could not load forms.')
				}
			} catch (err) {
				console.error('[CnFormsTab] failed to fetch forms', err)
				this.rawRows = []
				this.error = t('nextcloud-vue', 'Could not load forms.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Canonical wrapper-key cascade — mirrors CnContactsTab.unwrapList.
		 *
		 * @param {*} data parsed JSON response body
		 *
		 * @return {Array}
		 */
		unwrapList(data) {
			if (Array.isArray(data)) {
				return data
			}
			if (data && typeof data === 'object') {
				if (Array.isArray(data.results)) {
					return data.results
				}
				if (Array.isArray(data.items)) {
					return data.items
				}
			}
			return []
		},

		async onLinkSelected(payload) {
			if (!payload || !payload.formId) return
			try {
				const response = await fetch(this.baseUrl(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (!response.ok) {
					console.error('[CnFormsTab] link failed', response.status, response.statusText)
					return
				}
				this.showPicker = false
				await this.fetchForms()
			} catch (err) {
				console.error('[CnFormsTab] link error', err)
			}
		},

		async onCreateSubmit(payload) {
			if (!payload || !payload.title) return
			this.creating = true
			this.createError = ''
			try {
				const response = await fetch(`${this.baseUrl()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (!response.ok) {
					const data = await response.json().catch(() => ({}))
					this.createError = data?.error || `${response.status} ${response.statusText}`
					return
				}
				this.showCreate = false
				await this.fetchForms()
			} catch (err) {
				console.error('[CnFormsTab] create error', err)
				this.createError = String(err?.message || err)
			} finally {
				this.creating = false
			}
		},

		onCreateClose() {
			this.showCreate = false
			this.createError = ''
		},

		async unlink(form) {
			if (!form?.id) return
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(form.id)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (!response.ok) {
					console.error('[CnFormsTab] unlink failed', response.status, response.statusText)
					return
				}
				this.rawRows = this.rawRows.filter((r) => String(r.id ?? r.formId ?? '') !== String(form.id))
			} catch (err) {
				console.error('[CnFormsTab] unlink error', err)
			}
		},
	},
}
</script>

<style scoped>
.cn-forms-tab {
	padding: 12px;
}

.cn-forms-tab__header {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
	margin-bottom: 10px;
	flex-wrap: wrap;
}

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

/* Forms brand accent on the row icon, mirroring the real Forms app. */
.cn-forms-tab__row-icon {
	color: var(--cn-forms-accent, #0d7000);
	flex-shrink: 0;
}

.cn-forms-tab__row--closed {
	opacity: 0.85;
}

.cn-forms-tab__row--closed .cn-forms-tab__row-icon {
	color: var(--color-text-maxcontrast);
}

.cn-forms-tab__description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	color: var(--color-text-maxcontrast);
}

.cn-forms-tab__details {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.cn-forms-tab__expiry {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

/* Status chip colours layered on top of CnStatusBadge variants so the
   open/closed/draft state reads at a glance, like the real Forms app. */
.cn-forms-tab__status--open {
	--cn-forms-status: var(--color-success, #46ba61);
}

.cn-forms-tab__status--closed {
	--cn-forms-status: var(--color-text-maxcontrast);
}

.cn-forms-tab__status--draft {
	--cn-forms-status: var(--color-warning, #e9a40f);
}
</style>
