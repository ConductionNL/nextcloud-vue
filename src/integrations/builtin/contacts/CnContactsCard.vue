<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactsCard — bespoke widget for the `contacts` integration leaf.
  -
  - Surface-aware (per AD-2 of `openspec/changes/integration-contacts/design.md`
  - and AD-11 of `pluggable-integration-registry`):
  -
  - * `single-entity`   — canonical person chip: initials avatar + name + role.
  -                        THIS is the chip every Conduction app gets when a
  -                        schema property is typed `referenceType: 'contacts'`.
  - * `detail-page`     — count + 1-2 most recent contacts + "view all" link.
  - * `app-dashboard`   — scoped to current app/object, same compact layout.
  - * `user-dashboard`  — count badge + most-recent across all visible objects.
  -
  - Backed by:
  -   GET /api/objects/{register}/{schema}/{id}/integrations/contacts
  -
  - @spec openspec/changes/integration-contacts/specs/integrations/contacts/spec.md
  -->
<template>
	<!-- Single-entity surface: the canonical person chip (AD-2). -->
	<div
		v-if="surface === 'single-entity'"
		class="cn-contacts-card cn-contacts-card--chip"
		:title="chipTitle">
		<div class="cn-contacts-card__avatar cn-contacts-card__avatar--sm">
			{{ initialsFor(primaryContact || {}) }}
		</div>
		<div class="cn-contacts-card__chip-text">
			<span class="cn-contacts-card__chip-name">
				{{ (primaryContact && primaryContact.displayName) || unknownLabel }}
			</span>
			<span v-if="primaryContact && primaryContact.role" class="cn-contacts-card__chip-role">
				{{ primaryContact.role }}
			</span>
		</div>
	</div>

	<!-- All other surfaces: compact count + recent + view-all (per ADR-018). -->
	<div v-else class="cn-contacts-card">
		<header class="cn-contacts-card__header">
			<AccountMultiple :size="20" />
			<span class="cn-contacts-card__header-title">{{ titleLabel }}</span>
			<span class="cn-contacts-card__header-count">{{ contacts.length }}</span>
		</header>

		<!-- Loading -->
		<NcLoadingIcon v-if="loading" />

		<!-- Error -->
		<div v-else-if="error" class="cn-contacts-card__error">
			<AlertCircleOutline :size="20" />
			<span>{{ errorLabel }}</span>
		</div>

		<!-- Empty -->
		<div v-else-if="contacts.length === 0" class="cn-contacts-card__empty">
			{{ emptyLabel }}
		</div>

		<!-- Recent contacts -->
		<ul v-else class="cn-contacts-card__list">
			<li
				v-for="item in displayedContacts"
				:key="item.id"
				class="cn-contacts-card__item">
				<div class="cn-contacts-card__avatar cn-contacts-card__avatar--sm">
					{{ initialsFor(item) }}
				</div>
				<div class="cn-contacts-card__item-text">
					<span class="cn-contacts-card__item-name">{{ item.displayName || unknownLabel }}</span>
					<span v-if="item.email" class="cn-contacts-card__item-email">{{ item.email }}</span>
				</div>
				<span v-if="item.role" class="cn-contacts-card__item-role">
					{{ item.role }}
				</span>
			</li>
		</ul>

		<footer v-if="contacts.length > displayMax" class="cn-contacts-card__footer">
			<button
				type="button"
				class="cn-contacts-card__view-all"
				@click="$emit('view-all')">
				{{ viewAllLabel }} ({{ contacts.length }})
			</button>
		</footer>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import AccountMultiple from 'vue-material-design-icons/AccountMultiple.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'

import { buildHeaders } from '../../../utils/index.js'

/**
 * CnContactsCard — vCard contacts widget.
 *
 * Renders four surfaces; the `single-entity` surface is the canonical
 * person chip used by every schema property typed
 * `referenceType: 'contacts'` across the app suite.
 *
 * Basic usage
 * ```vue
 * <CnContactsCard
 *   register="my-register"
 *   schema="case"
 *   object-id="abc-123"
 *   surface="detail-page" />
 * ```
 */
export default {
	name: 'CnContactsCard',

	components: {
		NcLoadingIcon,
		AccountMultiple,
		AlertCircleOutline,
	},

	props: {
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		objectId: { type: [String, Number], default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },

		/**
		 * Widget surface — `user-dashboard`, `app-dashboard`,
		 * `detail-page`, or `single-entity`. Unknown values fall back
		 * to `detail-page` layout (per AD-11 graceful fallback).
		 */
		surface: { type: String, default: 'detail-page' },

		/**
		 * Pre-resolved single contact for the `single-entity` chip.
		 * When provided (e.g. via a schema property reference), the
		 * component skips the fetch and renders the chip immediately.
		 */
		contact: { type: Object, default: null },

		displayMax: { type: Number, default: 2 },

		// --- Pre-translated labels ---
		titleLabel: { type: String, default: () => t('nextcloud-vue', 'Contacts') },
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No contacts linked') },
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load contacts') },
		unknownLabel: { type: String, default: () => t('nextcloud-vue', 'Unknown contact') },
		viewAllLabel: { type: String, default: () => t('nextcloud-vue', 'View all') },
	},

	emits: ['view-all'],

	data() {
		return {
			contacts: [],
			loading: false,
			error: null,
		}
	},

	computed: {
		/**
		 * Most recent N (sorted by `linkedAt` desc).
		 */
		displayedContacts() {
			const sorted = [...this.contacts].sort((a, b) => {
				const aT = a?.linkedAt ? new Date(a.linkedAt).getTime() : 0
				const bT = b?.linkedAt ? new Date(b.linkedAt).getTime() : 0
				return bT - aT
			})
			return sorted.slice(0, this.displayMax)
		},

		/**
		 * For the single-entity chip: prefer the prop-supplied contact,
		 * else the first fetched one.
		 */
		primaryContact() {
			return this.contact || this.contacts[0] || null
		},

		chipTitle() {
			const c = this.primaryContact
			if (!c) return ''
			const bits = [c.displayName, c.email, c.role].filter(Boolean)
			return bits.join(' — ')
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				// In single-entity mode with a pre-resolved `contact`,
				// no fetch needed.
				if (this.surface === 'single-entity' && this.contact) {
					return
				}
				if (id && this.register && this.schema) {
					this.fetchContacts()
				}
			},
		},
	},

	methods: {
		initialsFor(contact) {
			const name = (contact?.displayName || '').trim()
			if (name === '') return '?'
			const parts = name.split(/\s+/).filter(Boolean)
			if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
			return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
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
				this.contacts = data.results || data || []
			} catch (err) {
				console.error('CnContactsCard: Failed to fetch contacts', err)
				this.error = String(err?.message || err)
				this.contacts = []
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-contacts-card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px;
}

.cn-contacts-card--chip {
	flex-direction: row;
	align-items: center;
	padding: 4px 8px;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius-pill, 16px);
	max-width: fit-content;
}

.cn-contacts-card__chip-text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cn-contacts-card__chip-name {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-contacts-card__chip-role {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-contacts-card__header {
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--color-text-maxcontrast);
}

.cn-contacts-card__header-title {
	font-size: 13px;
	font-weight: 600;
	flex: 1;
}

.cn-contacts-card__header-count {
	font-size: 12px;
	background-color: var(--color-background-dark);
	padding: 2px 8px;
	border-radius: var(--border-radius-pill, 12px);
}

.cn-contacts-card__empty,
.cn-contacts-card__error {
	text-align: center;
	padding: 12px 8px;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.cn-contacts-card__error {
	color: var(--color-error);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}

.cn-contacts-card__list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-contacts-card__item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 4px;
	border-bottom: 1px solid var(--color-border);
}

.cn-contacts-card__item:last-child {
	border-bottom: none;
}

.cn-contacts-card__avatar {
	border-radius: 50%;
	background-color: var(--color-primary-element-light, var(--color-primary-light));
	color: var(--color-primary-element-text, var(--color-primary-text));
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 600;
	flex-shrink: 0;
	width: 32px;
	height: 32px;
	font-size: 12px;
}

.cn-contacts-card__avatar--sm {
	width: 28px;
	height: 28px;
	font-size: 11px;
}

.cn-contacts-card__item-text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-contacts-card__item-name {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-contacts-card__item-email {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-contacts-card__item-role {
	font-size: 11px;
	color: var(--color-text-lighter);
	font-style: italic;
	white-space: nowrap;
}

.cn-contacts-card__footer {
	margin-top: 4px;
}

.cn-contacts-card__view-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	padding: 4px 0;
	width: 100%;
	text-align: center;
}

.cn-contacts-card__view-all:hover {
	text-decoration: underline;
}
</style>
