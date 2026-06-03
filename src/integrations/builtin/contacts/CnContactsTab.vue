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
  - Tier-2 (this revision): the tab now hosts two header actions — "Link
  - existing contact" (opens `CnContactPicker`) and "Add new contact"
  - (opens `CnContactCreate`). Both dialogs are loaded lazily via
  - dynamic import to keep the bundle below the integration-tab
  - threshold, and both delegate the actual API call back to this tab
  - so the loading + refresh handshake stays here.
  -
  - Backed by:
  -   GET    /api/objects/{register}/{schema}/{id}/contacts
  -   POST   /api/objects/{register}/{schema}/{id}/contacts            — link existing
  -   POST   /api/objects/{register}/{schema}/{id}/contacts/new        — create + link
  -   DELETE /api/objects/{register}/{schema}/{id}/contacts/{uid}      — unlink
  -
  - The payload shape mirrors `ContactLink::jsonSerialize()` —
  - `{id, contactUid, displayName, email, phone, org, avatarUrl, role,
  -   addressbookId, contactUri, schemaId, metadata, linkedAt}`.
  -
  - @spec openspec/changes/integration-contacts-tier2/specs/integrations/contacts/spec.md
  -->
<template>
	<div class="cn-contacts-tab">
		<!-- Header actions: link existing / create new -->
		<div class="cn-contacts-tab__header">
			<NcButton
				type="secondary"
				:aria-label="addNewLabel"
				@click="showCreateDialog = true">
				<template #icon>
					<AccountPlus :size="20" />
				</template>
				{{ addNewLabel }}
			</NcButton>
			<NcButton
				type="primary"
				:aria-label="linkExistingLabel"
				@click="showLinkDialog = true">
				<template #icon>
					<LinkVariant :size="20" />
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
					<span class="cn-contacts-tab__group-count">{{ group.items.length }}</span>
				</h3>
				<ul class="cn-contacts-tab__list">
					<li
						v-for="contact in group.items"
						:key="contact.id"
						class="cn-contacts-tab__item"
						@click="openReverseLookup(contact)">
						<div class="cn-contacts-tab__avatar">
							<NcAvatar
								:size="40"
								:display-name="contact.displayName || unknownLabel"
								:user="avatarSeed(contact)"
								:url="contact.avatarUrl || undefined"
								:is-no-user="true"
								:disable-menu="true"
								:disable-tooltip="true"
								:show-user-status="false" />
						</div>
						<div class="cn-contacts-tab__details">
							<div class="cn-contacts-tab__name-row">
								<span class="cn-contacts-tab__name">
									{{ contact.displayName || unknownLabel }}
								</span>
								<CnStatusBadge
									v-if="contact.role"
									:label="roleLabel(contact)"
									:variant="roleVariant(contact)"
									size="small" />
							</div>
							<div v-if="contact.email" class="cn-contacts-tab__sub">
								<Email :size="14" class="cn-contacts-tab__sub-icon" />
								<span class="cn-contacts-tab__sub-text">{{ contact.email }}</span>
							</div>
							<div v-if="contact.phone" class="cn-contacts-tab__sub">
								<Phone :size="14" class="cn-contacts-tab__sub-icon" />
								<span class="cn-contacts-tab__sub-text">{{ contact.phone }}</span>
							</div>
							<div v-if="contact.org" class="cn-contacts-tab__sub">
								<OfficeBuildingOutline :size="14" class="cn-contacts-tab__sub-icon" />
								<span class="cn-contacts-tab__sub-text">{{ contact.org }}</span>
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

		<!-- Link existing contact dialog -->
		<CnContactPicker
			v-if="showLinkDialog"
			:api-base="apiBase"
			@link="onPickerLink"
			@close="showLinkDialog = false" />

		<!-- Create new contact dialog -->
		<CnContactCreate
			v-if="showCreateDialog"
			:loading="createLoading"
			@create="onCreateSubmit"
			@close="showCreateDialog = false" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAvatar, NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AccountPlus from 'vue-material-design-icons/AccountPlus.vue'
import AccountMultipleOutline from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Email from 'vue-material-design-icons/Email.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import OfficeBuildingOutline from 'vue-material-design-icons/OfficeBuildingOutline.vue'
import Phone from 'vue-material-design-icons/Phone.vue'

import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import CnContactPicker from '../../../components/CnContactPicker/CnContactPicker.vue'
import CnContactCreate from '../../../components/CnContactCreate/CnContactCreate.vue'
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
		NcAvatar,
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		AccountPlus,
		AccountMultipleOutline,
		AlertCircleOutline,
		Close,
		Email,
		LinkVariant,
		OfficeBuildingOutline,
		Phone,
		CnStatusBadge,
		CnContactPicker,
		CnContactCreate,
	},

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },

		// --- Pre-translated labels (consumer-overridable for i18n flexibility) ---
		linkExistingLabel: { type: String, default: () => t('nextcloud-vue', 'Link contact') },
		addNewLabel: { type: String, default: () => t('nextcloud-vue', 'Add new contact') },
		emptyTitleLabel: { type: String, default: () => t('nextcloud-vue', 'No contacts linked') },
		emptyDescriptionLabel: { type: String, default: () => t('nextcloud-vue', 'Link a contact from your address book.') },
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load contacts') },
		unknownLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown contact') },
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink contact') },
		applicantsLabel: { type: String, default: () => t('nextcloud-vue', 'Applicants') },
		handlersLabel: { type: String, default: () => t('nextcloud-vue', 'Handlers') },
		advisorsLabel: { type: String, default: () => t('nextcloud-vue', 'Advisors') },
		otherLabel: { type: String, default: () => t('nextcloud-vue', 'Other') },
		applicantRoleLabel: { type: String, default: () => t('nextcloud-vue', 'Applicant') },
		handlerRoleLabel: { type: String, default: () => t('nextcloud-vue', 'Handler') },
		advisorRoleLabel: { type: String, default: () => t('nextcloud-vue', 'Advisor') },
	},

	emits: ['open-reverse-lookup'],

	data() {
		return {
			contacts: [],
			loading: false,
			error: null,
			showLinkDialog: false,
			showCreateDialog: false,
			createLoading: false,
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

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/contacts`
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
		 * Stable seed for NcAvatar's deterministic colour + initials.
		 * Prefer the contact UID, then email, then display name so the
		 * generated avatar colour stays consistent for a given contact.
		 *
		 * @param {object} contact ContactLink JSON.
		 *
		 * @return {string}
		 */
		avatarSeed(contact) {
			return contact.contactUid || contact.email || contact.displayName || '?'
		},

		/**
		 * Resolve the normalised role bucket for a contact.
		 *
		 * @param {object} contact ContactLink JSON.
		 *
		 * @return {string} one of applicant|handler|advisor|other
		 */
		roleKey(contact) {
			const matched = ROLE_BUCKETS.find((b) => b.match(contact.role))
			return matched ? matched.key : 'other'
		},

		/**
		 * Human-readable role chip label — the translated bucket name
		 * when the role maps to a known bucket, else the raw vCard role.
		 *
		 * @param {object} contact ContactLink JSON.
		 *
		 * @return {string}
		 */
		roleLabel(contact) {
			const map = {
				applicant: this.applicantRoleLabel,
				handler: this.handlerRoleLabel,
				advisor: this.advisorRoleLabel,
			}
			return map[this.roleKey(contact)] || contact.role
		},

		/**
		 * CnStatusBadge variant per role bucket so each role reads as a
		 * distinct accent (handlers = primary, advisors = info, etc.).
		 *
		 * @param {object} contact ContactLink JSON.
		 *
		 * @return {string}
		 */
		roleVariant(contact) {
			const map = {
				applicant: 'info',
				handler: 'primary',
				advisor: 'success',
			}
			return map[this.roleKey(contact)] || 'default'
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
				const response = await fetch(this.baseUrl, { headers: buildHeaders() })
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
			if (!contact?.contactUid) return
			try {
				const url = `${this.baseUrl}/${encodeURIComponent(contact.contactUid)}`
				await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				this.contacts = this.contactsArray.filter((c) => c.id !== contact.id)
			} catch (err) {
				console.error('CnContactsTab: Failed to unlink contact', err)
			}
		},

		/**
		 * Handle a `link` event from CnContactPicker — POST the picked
		 * contact to the bare `/contacts` endpoint, then refresh.
		 *
		 * @param {object} payload picker payload
		 *
		 * @return {Promise<void>}
		 */
		async onPickerLink(payload) {
			try {
				const response = await fetch(this.baseUrl, {
					method: 'POST',
					headers: {
						...buildHeaders(),
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				})
				if (!response.ok) {
					console.error('CnContactsTab: Failed to link picked contact', response.status)
					return
				}
				this.showLinkDialog = false
				await this.fetchContacts()
			} catch (err) {
				console.error('CnContactsTab: Failed to link picked contact', err)
			}
		},

		/**
		 * Handle a `create` event from CnContactCreate — POST the form
		 * payload to the dedicated `/contacts/new` endpoint.
		 *
		 * @param {object} payload form payload
		 *
		 * @return {Promise<void>}
		 */
		async onCreateSubmit(payload) {
			this.createLoading = true
			try {
				const response = await fetch(`${this.baseUrl}/new`, {
					method: 'POST',
					headers: {
						...buildHeaders(),
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				})
				if (!response.ok) {
					console.error('CnContactsTab: Failed to create+link contact', response.status)
					return
				}
				this.showCreateDialog = false
				await this.fetchContacts()
			} catch (err) {
				console.error('CnContactsTab: Failed to create+link contact', err)
			} finally {
				this.createLoading = false
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
	gap: 8px;
	margin-bottom: 12px;
	flex-wrap: wrap;
}

.cn-contacts-tab__group {
	margin-bottom: 16px;
}

.cn-contacts-tab__group-title {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	margin: 0 0 4px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.cn-contacts-tab__group-count {
	font-weight: 600;
	font-size: 11px;
	min-width: 18px;
	padding: 0 6px;
	height: 18px;
	line-height: 18px;
	text-align: center;
	border-radius: 9px;
	background-color: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-contacts-tab__list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
}

.cn-contacts-tab__item {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 10px 8px;
	border-radius: var(--border-radius-large, 8px);
	cursor: pointer;
	transition: background-color 0.1s ease-in-out;
}

.cn-contacts-tab__item:hover,
.cn-contacts-tab__item:focus-within {
	background-color: var(--color-background-hover);
}

.cn-contacts-tab__avatar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.cn-contacts-tab__details {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding-top: 2px;
}

.cn-contacts-tab__name-row {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.cn-contacts-tab__name {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-main-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-contacts-tab__sub {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	min-width: 0;
}

.cn-contacts-tab__sub-icon {
	flex-shrink: 0;
	opacity: 0.7;
}

.cn-contacts-tab__sub-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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
	align-self: center;
}

.cn-contacts-tab__unlink:hover,
.cn-contacts-tab__unlink:focus {
	background-color: var(--color-background-dark);
	color: var(--color-error);
}
</style>
