<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactPicker — modal dialog for picking a person to link to an
  - OpenRegister object: a Nextcloud user or an existing CardDAV contact
  - (people-on-objects; ADR-019 + openspec/changes/integration-contacts).
  -
  - Search is hit-as-you-type against the OR-side contact search endpoint
  - (`GET {apiBase}/contacts/search?q=<term>`) which proxies CardDAV via
  - `OCP\Contacts\IManager` so the dialog doesn't have to know about
  - addressbook ids. Each row shows the avatar + display name + primary
  - email; clicking a row selects it. Users come from the sharee
  - autocomplete (`/ocs/v2.php/apps/files_sharing/api/v1/sharees`), which
  - answers the accounts this caller may address, so no admin right is
  - needed. A role dropdown, a validity window and a note describe the
  - link before confirming. The `link` payload is
  - `{kind, userId | contactUid + addressbookId + contactUri, displayName,
  - email, role, validFrom, validUntil, note}` so the consumer can upsert
  - without an extra GET.
  -
  - Lives in its own .vue file under `components/` to satisfy
  - hydra-gate-modal-isolation (ADR-004 hard rule).
  -
  - @spec openspec/changes/integration-contacts-tier2/specs/integrations/contacts/spec.md
  -->
<template>
	<NcDialog
		:name="title"
		size="normal"
		:noClose="loading"
		data-testid="cn-modal"
		data-testid-modal="cn-contact-picker"
		@closing="onClose">
		<div class="cn-contact-picker">
			<NcTextField
				v-model="query"
				:label="searchLabel"
				:inputLabel="searchLabel"
				:placeholder="searchPlaceholder"
				class="cn-contact-picker__search"
				@update:modelValue="onSearch" />

			<NcLoadingIcon v-if="loading" class="cn-contact-picker__loading" />

			<NcEmptyContent
				v-else-if="results.length === 0"
				:name="emptyLabel"
				:description="emptyDescription">
				<template #icon>
					<AccountSearchOutline :size="48" />
				</template>
			</NcEmptyContent>

			<ul v-else class="cn-contact-picker__list">
				<li
					v-for="row in results"
					:key="rowKey(row)"
					class="cn-contact-picker__row"
					:class="{ 'cn-contact-picker__row--selected': isSelected(row) }"
					:data-kind="row.kind"
					data-testid="cn-contact-picker-row"
					@click="select(row)">
					<div class="cn-contact-picker__avatar" :title="row.displayName || ''">
						<img
							v-if="row.avatarUrl"
							:src="row.avatarUrl"
							:alt="row.displayName || ''"
							@error="row.avatarUrl = null">
						<span v-else>{{ initialsFor(row) }}</span>
					</div>
					<div class="cn-contact-picker__details">
						<div class="cn-contact-picker__name">
							{{ row.displayName || unknownLabel }}
							<span
								v-if="row.kind === 'user'"
								class="cn-contact-picker__kind"
								data-testid="cn-contact-picker-user-badge">{{ userBadgeLabel }}</span>
						</div>
						<div v-if="row.email" class="cn-contact-picker__email">
							{{ row.email }}
						</div>
						<div v-if="row.org" class="cn-contact-picker__org">
							{{ row.org }}
						</div>
					</div>
				</li>
			</ul>

			<div class="cn-contact-picker__role">
				<label for="cn-contact-picker-role">{{ roleLabel }}</label>
				<NcSelect
					inputId="cn-contact-picker-role"
					:options="roleOptions"
					:modelValue="role"
					:clearable="true"
					:inputLabel="roleLabel"
					data-testid="cn-contact-picker-role"
					@update:modelValue="role = $event" />
			</div>

			<!-- A role can hold for a period, and say why. Both optional:
			     an empty window means the person holds the role today and
			     until somebody says otherwise. -->
			<div class="cn-contact-picker__period">
				<NcDateTimePickerNative
					v-model="validFrom"
					type="date"
					:label="validFromLabel"
					data-testid="cn-contact-picker-valid-from" />
				<NcDateTimePickerNative
					v-model="validUntil"
					type="date"
					:label="validUntilLabel"
					data-testid="cn-contact-picker-valid-until" />
			</div>

			<NcTextField
				v-model="note"
				:label="noteLabel"
				:inputLabel="noteLabel"
				class="cn-contact-picker__note"
				data-testid="cn-contact-picker-note" />
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!selected || loading"
				@click="confirm">
				<template #icon>
					<LinkVariant :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcButton,
	NcDateTimePickerNative,
	NcDialog,
	NcEmptyContent,
	NcLoadingIcon,
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import AccountSearchOutline from 'vue-material-design-icons/AccountSearchOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnContactPicker — pick an existing CardDAV contact to link to an OR
 * object.
 *
 * ```vue
 * <CnContactPicker
 *   v-if="showPicker"
 *   :api-base="apiBase"
 *   @link="onPickerLink"
 *   @close="showPicker = false" />
 * ```
 *
 * Emits:
 * - `link`  — when the user confirms a selection. Payload:
 *   `{contactUid, addressbookId, contactUri, displayName, email, role}`.
 * - `close` — when the user cancels or closes the dialog.
 */
export default {
	name: 'CnContactPicker',

	components: {
		NcButton,
		NcDateTimePickerNative,
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		NcSelect,
		NcTextField,
		AccountSearchOutline,
		LinkVariant,
	},

	props: {
		/** Base API URL for OR's contact-search proxy. */
		apiBase: { type: String, default: '/apps/openregister/api' },

		/**
		 * Whether the picker offers Nextcloud users beside contacts. Users
		 * come from the sharee autocomplete, so the list holds the accounts
		 * this caller may address.
		 */
		includeUsers: { type: Boolean, default: true },

		/** The sharee autocomplete the user search reads. */
		userSearchUrl: {
			type: String,
			default: '/ocs/v2.php/apps/files_sharing/api/v1/sharees',
		},

		// --- Pre-translated labels (consumer-overridable) ---
		/** Pre-translated dialog title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Link contact') },
		/** Pre-translated label for the search field. */
		searchLabel: { type: String, default: () => t('nextcloud-vue', 'Search contacts') },
		/** Pre-translated placeholder for the search field. */
		searchPlaceholder: { type: String, default: () => t('nextcloud-vue', 'Type a name or email…') },
		/** Pre-translated heading shown when no contacts match. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No contacts found') },
		/** Pre-translated description shown when no contacts match. */
		emptyDescription: { type: String, default: () => t('nextcloud-vue', 'Try a different search term or create a new contact.') },
		/** Pre-translated fallback label for a contact with no display name. */
		unknownLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown contact') },
		/** Pre-translated label for the role dropdown. */
		roleLabel: { type: String, default: () => t('nextcloud-vue', 'Role') },
		/** Pre-translated badge marking a row as a Nextcloud user. */
		userBadgeLabel: { type: String, default: () => t('nextcloud-vue', 'User') },
		/** Pre-translated label for the first day of the role. */
		validFromLabel: { type: String, default: () => t('nextcloud-vue', 'From') },
		/** Pre-translated label for the last day of the role. */
		validUntilLabel: { type: String, default: () => t('nextcloud-vue', 'Until') },
		/** Pre-translated label for the note on the link. */
		noteLabel: { type: String, default: () => t('nextcloud-vue', 'Note') },
		/** Pre-translated label for the Cancel button. */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Pre-translated label for the confirm (Link) button. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Link contact') },
		/**
		 * Role options for the link's role dropdown.
		 *
		 * @type {Array<{ label: string, value: string }>}
		 */
		roleOptions: {
			type: Array,
			default: () => [
				{ label: t('nextcloud-vue', 'Applicant'), value: 'applicant' },
				{ label: t('nextcloud-vue', 'Handler'), value: 'handler' },
				{ label: t('nextcloud-vue', 'Advisor'), value: 'advisor' },
				{ label: t('nextcloud-vue', 'Other'), value: 'other' },
			],
		},
	},

	emits: ['link', 'close'],

	data() {
		return {
			query: '',
			results: [],
			selected: null,
			role: null,
			validFrom: null,
			validUntil: null,
			note: '',
			loading: false,
			searchTimer: null,
		}
	},

	mounted() {
		// Surface the first page of contacts when the dialog opens so the
		// list never starts empty.
		this.fetchContacts('')
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the user cancels or closes the dialog.
			 */
			this.$emit('close')
		},

		/**
		 * Initials from displayName ("Jan de Vries" → "JV"); falls back
		 * to `?`.
		 *
		 * @param {object} row contact row
		 *
		 * @return {string}
		 */
		initialsFor(row) {
			const name = (row?.displayName || '').trim()
			if (name === '') {
				return '?'
			}
			const parts = name.split(/\s+/).filter(Boolean)
			if (parts.length === 1) {
				return parts[0].charAt(0).toUpperCase()
			}
			return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
		},

		/**
		 * Debounced search-as-you-type — 250 ms idle before firing the
		 * request so a fast typist doesn't generate one fetch per
		 * keystroke.
		 *
		 * @return {void}
		 */
		onSearch() {
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchContacts(this.query)
			}, 250)
		},

		/**
		 * Search users and contacts for a term, users first.
		 *
		 * Each source is best-effort: one failing leaves the other's rows
		 * on screen and the "create new" fallback usable.
		 *
		 * @param {string} q The search term.
		 *
		 * @return {Promise<void>}
		 */
		async fetchContacts(q) {
			this.loading = true
			try {
				const [users, contacts] = await Promise.all([
					this.fetchUsers(q),
					this.fetchCardDavContacts(q),
				])
				this.results = [...users, ...contacts]
			} finally {
				this.loading = false
			}
		},

		/**
		 * The CardDAV contacts matching a term.
		 *
		 * @param {string} q The search term.
		 *
		 * @return {Promise<Array>} The rows, [] when the search failed.
		 */
		async fetchCardDavContacts(q) {
			try {
				const url = `${this.apiBase}/contacts/search?q=${encodeURIComponent(q || '')}`
				const response = await fetch(url, { headers: buildHeaders() })
				if (!response.ok) {
					return []
				}
				return this.unwrapList(await response.json()).map((row) => ({ ...row, kind: 'contact' }))
			} catch (err) {
				// eslint-disable-next-line no-console -- the empty list is the handled outcome; the console carries the detail
				console.error('CnContactPicker: contact search failed', err)
				return []
			}
		},

		/**
		 * The Nextcloud users matching a term, from the sharee autocomplete.
		 *
		 * The endpoint answers the accounts this caller may address, so the
		 * picker needs no admin right and shows nobody the caller cannot see.
		 * An empty term returns nothing there, so the list starts with
		 * contacts until the handler types.
		 *
		 * @param {string} q The search term.
		 *
		 * @return {Promise<Array>} The rows, [] when users are off or the search failed.
		 */
		async fetchUsers(q) {
			const term = (q || '').trim()
			if (this.includeUsers === false || term === '') {
				return []
			}
			try {
				const url = `${this.userSearchUrl}?format=json&itemType=file&shareType=0&perPage=25&search=${encodeURIComponent(term)}`
				const response = await fetch(url, {
					headers: { ...buildHeaders(), 'OCS-APIRequest': 'true' },
				})
				if (!response.ok) {
					return []
				}
				const body = await response.json()
				const data = body?.ocs?.data ?? {}
				const rows = [...(data.users ?? []), ...(data.exact?.users ?? [])]
				return this.dedupeUsers(rows)
			} catch (err) {
				// eslint-disable-next-line no-console -- the empty list is the handled outcome; the console carries the detail
				console.error('CnContactPicker: user search failed', err)
				return []
			}
		},

		/**
		 * Sharee rows as picker rows, each account once (exact matches repeat).
		 *
		 * @param {Array} rows The sharee entries.
		 *
		 * @return {Array} The picker rows.
		 */
		dedupeUsers(rows) {
			const byId = new Map()
			for (const row of rows) {
				const userId = row?.value?.shareWith ?? row?.shareWith ?? null
				if (!userId || byId.has(userId)) {
					continue
				}
				byId.set(userId, {
					kind: 'user',
					userId,
					contactUid: `user:${userId}`,
					displayName: row.label ?? row.name ?? userId,
					email: row.shareWithDisplayNameUnique ?? null,
					avatarUrl: `/index.php/avatar/${encodeURIComponent(userId)}/64`,
				})
			}
			return [...byId.values()]
		},

		/**
		 * Normalise a list response (`{results:[...]}`, `{items:[...]}`,
		 * or bare array).
		 *
		 * @param {unknown} data parsed JSON
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

		select(row) {
			this.selected = row
		},

		isSelected(row) {
			return this.selected !== null && this.rowKey(this.selected) === this.rowKey(row)
		},

		/**
		 * A row's identity: the account for a user, the card for a contact.
		 *
		 * @param {object} row The row.
		 *
		 * @return {string} The key.
		 */
		rowKey(row) {
			if (row?.kind === 'user') {
				return `user|${row.userId}`
			}
			return `contact|${row?.contactUid}|${row?.addressbookId}|${row?.contactUri}`
		},

		/**
		 * A date field's value as `YYYY-MM-DD`, or null when unset.
		 *
		 * @param {Date|string|null} value What the date picker holds.
		 *
		 * @return {?string} The date.
		 */
		dateValue(value) {
			if (!value) {
				return null
			}
			if (value instanceof Date) {
				return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
			}
			return String(value).slice(0, 10)
		},

		confirm() {
			if (!this.selected) {
				return
			}
			const person = this.selected.kind === 'user'
				? { kind: 'user', userId: this.selected.userId }
				: {
						kind: 'contact',
						contactUid: this.selected.contactUid,
						addressbookId: this.selected.addressbookId,
						contactUri: this.selected.contactUri,
					}
			/**
			 * @event link Emitted when the user confirms a selection. Payload: `{ kind, userId | contactUid + addressbookId + contactUri, displayName, email, role, validFrom, validUntil, note }`.
			 */
			this.$emit('link', {
				...person,
				displayName: this.selected.displayName,
				email: this.selected.email,
				role: this.role?.value || this.role || null,
				validFrom: this.dateValue(this.validFrom),
				validUntil: this.dateValue(this.validUntil),
				note: this.note.trim() === '' ? null : this.note.trim(),
			})
		},
	},
}
</script>

<style scoped>
.cn-contact-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-height: 320px;
}

.cn-contact-picker__search {
	width: 100%;
}

.cn-contact-picker__loading {
	margin: 24px auto;
}

.cn-contact-picker__kind {
	margin-inline-start: 6px;
	padding: 1px 6px;
	border-radius: var(--border-radius-pill, 100px);
	background-color: var(--color-primary-element-light, #d8e5f3);
	color: var(--color-primary-element-light-text, #1a3a5c);
	font-size: 0.75rem;
}

.cn-contact-picker__period {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.cn-contact-picker__period > * {
	flex: 1 1 140px;
	min-width: 0;
}

.cn-contact-picker__note {
	width: 100%;
}

.cn-contact-picker__list {
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: 320px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-contact-picker__row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-contact-picker__row:hover {
	background-color: var(--color-background-hover);
}

.cn-contact-picker__row--selected {
	background-color: var(--color-primary-element-light);
	color: var(--color-primary-element-text);
}

.cn-contact-picker__avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background-color: var(--color-primary-element-light);
	color: var(--color-primary-element-text);
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 600;
	font-size: 13px;
	flex-shrink: 0;
	overflow: hidden;
}

.cn-contact-picker__avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cn-contact-picker__details {
	flex: 1;
	min-width: 0;
}

.cn-contact-picker__name {
	font-weight: 500;
}

.cn-contact-picker__email,
.cn-contact-picker__org {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-contact-picker__role {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-contact-picker__role label {
	flex-shrink: 0;
	font-weight: 500;
}
</style>
