<!--
  CnTimeTrackerPicker — modal for picking an existing NC TimeManager entry
  to link to the parent OR object.

  Flow:
    1. Load entries via GET /api/integrations/time-tracker/available
       (each row carries id + kind + name [+ optional duration])
    2. Filter client-side via a search input (debounced; the same query is
       forwarded as `?search=` for server-side filtering)
    3. Single-select an entry row (kind badge + name + optional duration)
    4. Confirm → emit `link` with `{ entryType, id }`

  All API calls are wrapped in best-effort try/catch so a transient
  TimeManager failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry
  without losing context.

  Note: the leaf slug is `time-tracker` (with a hyphen); the underlying NC
  app id is `timemanager` (no hyphen). The picker source surfaces
  TimeManager clients (the linkable top-level entity); tasks + time entries
  are linked from the TimeManager UI and surface in the tab once present.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnTimeTrackerPicker/` (NcDialog-based; matches the
  collectives/photos/deck/poll/talk picker pattern).

  ADR-019: drives the `time-tracker` integration leaf's "link existing"
  surface; emits `link` so the parent (CnTimeTrackerTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-time-tracker-picker"
		@closing="$emit('close')">
		<div class="cn-time-tracker-picker">
			<NcNoteCard v-if="error" type="error" class="cn-time-tracker-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search entries')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-time-tracker-picker__search"
				@update:value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visibleEntries.length === 0"
				:name="t('nextcloud-vue', 'No entries available')"
				:description="t('nextcloud-vue', 'Create a client in NC TimeManager first, or use the create dialog.')" />
			<ul v-else class="cn-time-tracker-picker__list">
				<li
					v-for="entry in visibleEntries"
					:key="entryKey(entry)"
					class="cn-time-tracker-picker__row"
					:class="{ 'cn-time-tracker-picker__row--selected': isSelected(entry) }">
					<button type="button" class="cn-time-tracker-picker__row-button" @click="pickEntry(entry)">
						<span class="cn-time-tracker-picker__kind" :class="kindChipClass(entry)">
							{{ kindLabel(entry) }}
						</span>
						<span class="cn-time-tracker-picker__main">
							<span class="cn-time-tracker-picker__name">{{ entry.name }}</span>
							<span v-if="durationLabel(entry)" class="cn-time-tracker-picker__duration">
								{{ durationLabel(entry) }}
							</span>
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="selected === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link entry') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnTimeTrackerPicker — pick an existing TimeManager entry. Emits `link`
 * with `{ entryType, id }`.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnTimeTrackerPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing entry') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			entries: [],
			search: '',
			selected: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=` payload
		 * so the user sees instant feedback even between debounce ticks.
		 *
		 * @return {Array} The filtered entry rows.
		 */
		visibleEntries() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.entries
			}
			return this.entries.filter(entry => (entry.name || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchEntries()
	},

	beforeDestroy() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		t,

		async fetchEntries(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/time-tracker/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.entries = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC TimeManager is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load entries.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTimeTrackerPicker] fetch entries failed', err)
				this.error = t('nextcloud-vue', 'Could not load entries.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			// Debounce server-side filter; client-side filter is live.
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchEntries(this.search.trim())
			}, 300)
		},

		entryKind(entry) {
			const k = String(entry.kind ?? entry.type ?? 'client').toLowerCase()
			if (k === 'task') {
				return 'task'
			}
			if (k === 'time') {
				return 'time'
			}
			return 'client'
		},

		entryKey(entry) {
			return `${this.entryKind(entry)}:${entry.id}`
		},

		isSelected(entry) {
			return this.selected !== null && this.selected.id === entry.id && this.selected.entryType === this.entryKind(entry)
		},

		kindLabel(entry) {
			const kind = this.entryKind(entry)
			if (kind === 'task') {
				return t('nextcloud-vue', 'Task')
			}
			if (kind === 'time') {
				return t('nextcloud-vue', 'Entry')
			}
			return t('nextcloud-vue', 'Client')
		},

		kindChipClass(entry) {
			return `cn-time-tracker-picker__kind--${this.entryKind(entry)}`
		},

		durationLabel(entry) {
			const raw = entry.duration ?? null
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			const total = Number(raw)
			if (Number.isNaN(total)) {
				return ''
			}
			const totalMinutes = Math.round(total / 60)
			const hours = Math.floor(totalMinutes / 60)
			const minutes = totalMinutes % 60
			if (hours > 0) {
				return `${hours}h ${minutes}m`
			}
			return `${minutes}m`
		},

		pickEntry(entry) {
			this.selected = { entryType: this.entryKind(entry), id: entry.id }
		},

		confirm() {
			if (this.selected === null) {
				return
			}
			this.$emit('link', { entryType: this.selected.entryType, id: this.selected.id })
		},
	},
}
</script>

<style scoped>
.cn-time-tracker-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-time-tracker-picker__error {
	margin: 4px 0;
}

.cn-time-tracker-picker__search {
	width: 100%;
}

.cn-time-tracker-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-time-tracker-picker__row {
	border-radius: var(--border-radius);
}

.cn-time-tracker-picker__row-button {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	background: var(--color-background-hover);
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-time-tracker-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-time-tracker-picker__row--selected .cn-time-tracker-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-time-tracker-picker__kind {
	flex-shrink: 0;
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

.cn-time-tracker-picker__kind--client {
	background: var(--color-primary-element, #21468B);
	color: var(--color-main-background);
}

.cn-time-tracker-picker__kind--task {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-time-tracker-picker__kind--time {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-time-tracker-picker__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-time-tracker-picker__name {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-time-tracker-picker__duration {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}
</style>
