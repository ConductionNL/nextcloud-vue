<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactPicker — modal dialog for selecting an existing CardDAV
  - contact to link to an OpenRegister object (Tier-2 of the contacts
  - integration leaf — see ADR-019 + openspec/changes/integration-contacts).
  -
  - Search is hit-as-you-type against the OR-side contact search endpoint
  - (`GET {apiBase}/contacts/search?q=<term>`) which proxies CardDAV via
  - `OCP\Contacts\IManager` so the dialog doesn't have to know about
  - addressbook ids. Each row shows the avatar + display name + primary
  - email; clicking a row selects it. A role dropdown lets the caller
  - tag the link before confirming. `link` event payload is
  - `{contactUid, addressbookId, contactUri, displayName, email, role}`
  - so the consumer can immediately upsert without an extra GET.
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
		:can-close="!loading"
		data-testid="cn-modal"
		data-testid-modal="cn-contact-picker"
		@closing="$emit('close')">
		<div class="cn-contact-picker">
			<NcTextField
				v-model="query"
				:label="searchLabel"
				:input-label="searchLabel"
				:placeholder="searchPlaceholder"
				class="cn-contact-picker__search"
				@input="onSearch" />

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
					:key="row.contactUid + '|' + row.addressbookId + '|' + row.contactUri"
					class="cn-contact-picker__row"
					:class="{ 'cn-contact-picker__row--selected': isSelected(row) }"
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
					input-id="cn-contact-picker-role"
					:options="roleOptions"
					:value="role"
					:clearable="true"
					:input-label="roleLabel"
					@input="role = $event" />
			</div>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton
				type="primary"
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
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		NcSelect,
		NcTextField,
		AccountSearchOutline,
		LinkVariant,
	},

	props: {
		apiBase: { type: String, default: '/apps/openregister/api' },

		// --- Pre-translated labels (consumer-overridable) ---
		title: { type: String, default: () => t('nextcloud-vue', 'Link contact') },
		searchLabel: { type: String, default: () => t('nextcloud-vue', 'Search contacts') },
		searchPlaceholder: { type: String, default: () => t('nextcloud-vue', 'Type a name or email…') },
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No contacts found') },
		emptyDescription: { type: String, default: () => t('nextcloud-vue', 'Try a different search term or create a new contact.') },
		unknownLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown contact') },
		roleLabel: { type: String, default: () => t('nextcloud-vue', 'Role') },
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Link contact') },
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
			loading: false,
			searchTimer: null,
		}
	},

	mounted() {
		// Surface the first page of contacts when the dialog opens so the
		// list never starts empty.
		this.fetchContacts('')
	},

	beforeDestroy() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
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
			if (name === '') return '?'
			const parts = name.split(/\s+/).filter(Boolean)
			if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
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

		async fetchContacts(q) {
			this.loading = true
			try {
				const url = `${this.apiBase}/contacts/search?q=${encodeURIComponent(q || '')}`
				const response = await fetch(url, { headers: buildHeaders() })
				if (!response.ok) {
					this.results = []
					return
				}
				const data = await response.json()
				this.results = this.unwrapList(data)
			} catch (err) {
				// Search is best-effort — surface an empty list so the
				// "create new" fallback button stays usable.
				console.error('CnContactPicker: search failed', err)
				this.results = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Normalise a list response (`{results:[...]}`, `{items:[...]}`,
		 * or bare array).
		 *
		 * @param {*} data parsed JSON
		 *
		 * @return {Array}
		 */
		unwrapList(data) {
			if (Array.isArray(data)) return data
			if (data && typeof data === 'object') {
				if (Array.isArray(data.results)) return data.results
				if (Array.isArray(data.items)) return data.items
			}
			return []
		},

		select(row) {
			this.selected = row
		},

		isSelected(row) {
			return this.selected
				&& this.selected.contactUid === row.contactUid
				&& this.selected.addressbookId === row.addressbookId
		},

		confirm() {
			if (!this.selected) return
			this.$emit('link', {
				contactUid: this.selected.contactUid,
				addressbookId: this.selected.addressbookId,
				contactUri: this.selected.contactUri,
				displayName: this.selected.displayName,
				email: this.selected.email,
				role: this.role?.value || this.role || null,
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
