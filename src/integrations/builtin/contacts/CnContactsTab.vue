<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactsTab — bespoke sidebar tab for the `contacts` integration leaf.
  -
  - Renders the vCard contacts linked to an OR object grouped by role
  - (Applicants / Handlers / Advisors / Other) per AD-1 of
  - `openspec/changes/integration-contacts/design.md`. Each contact card
  - shows initials avatar + display name + primary email + role.
  -
  - Clicking a contact opens the reverse-lookup flyout (AD-3) listing every
  - OR object linked to that vCard.
  -
  - Backed by:
  -   GET    /api/objects/{register}/{schema}/{id}/integrations/contacts
  -   POST   /api/objects/{register}/{schema}/{id}/integrations/contacts
  -   DELETE /api/objects/{register}/{schema}/{id}/integrations/contacts/{linkId}
  -
  - The payload shape mirrors `ContactLink::jsonSerialize()` —
  - `{id, contactUid, displayName, email, role, addressbookId, contactUri, linkedAt}`.
  -
  - @spec openspec/changes/integration-contacts/specs/integrations/contacts/spec.md
  -->
<template>
	<div class="cn-contacts-tab">
		<!-- Header actions: link existing / create new -->
		<div class="cn-contacts-tab__header">
			<NcButton
				type="primary"
				:aria-label="linkExistingLabel"
				@click="showLinkDialog = true">
				<template #icon>
					<AccountPlus :size="20" />
				</template>
				{{ linkExistingLabel }}
			</NcButton>
		</div>

		<!-- Loading -->
		<NcLoadingIcon v-if="loading" />

		<!-- Error -->
		<NcEmptyContent
			v-else-if="error"
			:name="errorLabel"
			:description="error">
			<template #icon>
				<AlertCircleOutline :size="48" />
			</template>
		</NcEmptyContent>

		<!-- Empty -->
		<NcEmptyContent
			v-else-if="contactsArray.length === 0"
			:name="emptyTitleLabel"
			:description="emptyDescriptionLabel">
			<template #icon>
				<AccountMultipleOutline :size="48" />
			</template>
		</NcEmptyContent>

		<!-- Grouped list -->
		<div v-else class="cn-contacts-tab__groups">
			<section
				v-for="group in groupedContacts"
				:key="group.key"
				class="cn-contacts-tab__group">
				<h3 class="cn-contacts-tab__group-title">
					{{ group.label }}
					<span class="cn-contacts-tab__group-count">({{ group.items.length }})</span>
				</h3>
				<ul class="cn-contacts-tab__list">
					<li
						v-for="contact in group.items"
						:key="contact.id"
						class="cn-contacts-tab__item"
						@click="openReverseLookup(contact)">
						<div class="cn-contacts-tab__avatar" :title="contact.displayName || ''">
							{{ initialsFor(contact) }}
						</div>
						<div class="cn-contacts-tab__details">
							<div class="cn-contacts-tab__name">
								{{ contact.displayName || unknownLabel }}
							</div>
							<div v-if="contact.email" class="cn-contacts-tab__email">
								{{ contact.email }}
							</div>
							<div v-if="contact.role" class="cn-contacts-tab__role">
								{{ contact.role }}
							</div>
						</div>
						<button
							type="button"
							class="cn-contacts-tab__unlink"
							:aria-label="unlinkLabel"
							:title="unlinkLabel"
							@click.stop="unlink(contact)">
							<Close :size="18" />
						</button>
					</li>
				</ul>
			</section>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AccountPlus from 'vue-material-design-icons/AccountPlus.vue'
import AccountMultipleOutline from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'

import { buildHeaders } from '../../../utils/index.js'

/**
 * Normalised role keys for grouping. Free-text vCard roles are
 * normalised by lowercasing + trimming; unknown roles fall into `other`.
 *
 * @type {Array<{key: string, match: (r: ?string) => boolean, labelKey: string}>}
 */
const ROLE_BUCKETS = [
	{ key: 'applicant', match: (r) => /^(applicant|aanvrager|requestor)$/i.test(r ?? ''), labelKey: 'Applicants' },
	{ key: 'handler', match: (r) => /^(handler|behandelaar|owner|assignee)$/i.test(r ?? ''), labelKey: 'Handlers' },
	{ key: 'advisor', match: (r) => /^(advisor|advisor|adviseur|reviewer)$/i.test(r ?? ''), labelKey: 'Advisors' },
]

/**
 * CnContactsTab — vCard contacts linked to an OR object, grouped by role.
 *
 * Basic usage
 * ```vue
 * <CnContactsTab
 *   register="my-register"
 *   schema="case"
 *   object-id="abc-123" />
 * ```
 */
export default {
	name: 'CnContactsTab',

	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		AccountPlus,
		AccountMultipleOutline,
		AlertCircleOutline,
		Close,
	},

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },

		// --- Pre-translated labels (consumer-overridable for i18n flexibility) ---
		linkExistingLabel: { type: String, default: () => t('nextcloud-vue', 'Link contact') },
		emptyTitleLabel: { type: String, default: () => t('nextcloud-vue', 'No contacts linked') },
		emptyDescriptionLabel: { type: String, default: () => t('nextcloud-vue', 'Link a contact from your address book.') },
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load contacts') },
		unknownLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown contact') },
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink contact') },
		applicantsLabel: { type: String, default: () => t('nextcloud-vue', 'Applicants') },
		handlersLabel: { type: String, default: () => t('nextcloud-vue', 'Handlers') },
		advisorsLabel: { type: String, default: () => t('nextcloud-vue', 'Advisors') },
		otherLabel: { type: String, default: () => t('nextcloud-vue', 'Other') },
	},

	emits: ['open-reverse-lookup'],

	data() {
		return {
			contacts: [],
			loading: false,
			error: null,
			showLinkDialog: false,
		}
	},

	computed: {
		/**
		 * Defensive view onto `this.contacts` — always an array.
		 *
		 * Guards against the well-known "this.contacts is not iterable"
		 * TypeError observed in Phase A / D-1 when the provider returns
		 * an object-shaped payload (or `null`) and the iteration site
		 * blows up before the watch has even fired.
		 *
		 * @return {Array}
		 */
		contactsArray() {
			return Array.isArray(this.contacts) ? this.contacts : []
		},

		/**
		 * Group contacts by normalised role bucket.
		 *
		 * @return {Array<{key: string, label: string, items: Array}>}
		 */
		groupedContacts() {
			const labelMap = {
				applicant: this.applicantsLabel,
				handler: this.handlersLabel,
				advisor: this.advisorsLabel,
				other: this.otherLabel,
			}
			const buckets = { applicant: [], handler: [], advisor: [], other: [] }
			for (const c of this.contactsArray) {
				const matched = ROLE_BUCKETS.find((b) => b.match(c.role))
				if (matched) {
					buckets[matched.key].push(c)
				} else {
					buckets.other.push(c)
				}
			}
			const out = []
			for (const key of ['applicant', 'handler', 'advisor', 'other']) {
				if (buckets[key].length > 0) {
					out.push({ key, label: labelMap[key], items: buckets[key] })
				}
			}
			return out
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.fetchContacts()
				}
			},
		},
	},

	methods: {
		/**
		 * Initials from displayName ("Jan de Vries" → "JV"); falls back to `?`.
		 *
		 * @param {object} contact ContactLink JSON.
		 *
		 * @return {string}
		 */
		initialsFor(contact) {
			const name = (contact?.displayName || '').trim()
			if (name === '') return '?'
			const parts = name.split(/\s+/).filter(Boolean)
			if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
			return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
		},

		/**
		 * Open the reverse-lookup flyout for a contact (AD-3). Emits an
		 * event for the consuming app to handle (since the flyout's
		 * implementation depends on the host router).
		 *
		 * @param {object} contact ContactLink JSON.
		 *
		 * @return {void}
		 */
		openReverseLookup(contact) {
			this.$emit('open-reverse-lookup', {
				contactUid: contact.contactUid,
				displayName: contact.displayName,
			})
		},

		async fetchContacts() {
			if (!this.register || !this.schema || !this.objectId) return
			this.loading = true
			this.error = null
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/contacts`
				const response = await fetch(url, { headers: buildHeaders() })
				if (!response.ok) {
					this.error = `${response.status} ${response.statusText}`
					this.contacts = []
					return
				}
				const data = await response.json()
				// Canonical wrapper-key cascade (per ADR-022): provider
				// may return `{results: [...]}` (paginated), `{items:
				// [...]}` (some leaves), or a bare array. Anything else
				// falls back to `[]` rather than letting a non-iterable
				// object reach `groupedContacts` (Phase A / D-1 bug).
				this.contacts = this.unwrapList(data)
			} catch (err) {
				console.error('CnContactsTab: Failed to fetch contacts', err)
				this.error = String(err?.message || err)
				this.contacts = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Normalise a list-shaped response body to an array. Accepts
		 * `{results:[...]}`, `{items:[...]}`, or a bare array; any
		 * other shape (object, null, undefined) becomes `[]`.
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

		async unlink(contact) {
			if (!contact?.id) return
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/contacts/${encodeURIComponent(contact.id)}`
				await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				this.contacts = this.contactsArray.filter((c) => c.id !== contact.id)
			} catch (err) {
				console.error('CnContactsTab: Failed to unlink contact', err)
			}
		},
	},
}
</script>

<style scoped>
.cn-contacts-tab {
	padding: 12px;
	overflow-x: hidden;
}

.cn-contacts-tab__header {
	display: flex;
	justify-content: flex-end;
	margin-bottom: 12px;
}

.cn-contacts-tab__group {
	margin-bottom: 16px;
}

.cn-contacts-tab__group-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	margin: 0 0 8px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.cn-contacts-tab__group-count {
	font-weight: 400;
	margin-inline-start: 4px;
}

.cn-contacts-tab__list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-contacts-tab__item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.cn-contacts-tab__item:hover,
.cn-contacts-tab__item:focus-within {
	background-color: var(--color-background-hover);
}

.cn-contacts-tab__avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background-color: var(--color-primary-element-light, var(--color-primary-light));
	color: var(--color-primary-element-text, var(--color-primary-text));
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 600;
	font-size: 13px;
	flex-shrink: 0;
}

.cn-contacts-tab__details {
	flex: 1;
	min-width: 0;
}

.cn-contacts-tab__name {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-contacts-tab__email {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-contacts-tab__role {
	font-size: 11px;
	color: var(--color-text-lighter);
	font-style: italic;
	margin-top: 2px;
}

.cn-contacts-tab__unlink {
	background: none;
	border: none;
	padding: 4px;
	cursor: pointer;
	color: var(--color-text-maxcontrast);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.cn-contacts-tab__unlink:hover,
.cn-contacts-tab__unlink:focus {
	background-color: var(--color-background-dark);
	color: var(--color-error);
}
</style>
