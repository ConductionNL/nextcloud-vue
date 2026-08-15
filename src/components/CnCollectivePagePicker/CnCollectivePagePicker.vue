<!--
  CnCollectivePagePicker — modal for picking an existing NC Collectives
  (Knowledge) page to link to the parent OR object.

  Flow:
    1. Load pages via GET /api/integrations/collectives/available
       (each row carries pageId + collectiveId + collectiveName + title +
       emoji + lastModified)
    2. Optionally narrow by collective via the collective dropdown, and
       filter client-side via a search input (debounced; the same query
       is forwarded as `?search=` for server-side filtering)
    3. Single-select a page row (emoji + page title + collective name +
       last-modified hint)
    4. Confirm → emit `link` with `{ pageId }`

  All API calls are wrapped in best-effort try/catch so a transient
  Collectives failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry
  without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnCollectivePagePicker/` (NcDialog-based; matches the
  photos/deck/poll/talk picker pattern).

  ADR-019: drives the `collectives` integration leaf's "link existing"
  surface; emits `link` so the parent (CnCollectivesTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-collective-page-picker"
		@closing="onClose">
		<div class="cn-collective-page-picker">
			<NcNoteCard v-if="error" type="error" class="cn-collective-page-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcSelect
				v-if="collectives.length > 0"
				v-model="collectiveFilter"
				:options="collectiveOptions"
				:placeholder="t('nextcloud-vue', 'All collectives')"
				label="label"
				class="cn-collective-page-picker__collective"
				:clearable="true" />

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search pages')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-collective-page-picker__search"
				@update:model-value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visiblePages.length === 0"
				:name="t('nextcloud-vue', 'No pages available')"
				:description="t('nextcloud-vue', 'Create a page in NC Collectives first, or use the create dialog.')" />
			<ul v-else class="cn-collective-page-picker__list">
				<li
					v-for="page in visiblePages"
					:key="page.pageId"
					class="cn-collective-page-picker__row"
					:class="{ 'cn-collective-page-picker__row--selected': selectedPageId === page.pageId }">
					<button type="button" class="cn-collective-page-picker__row-button" @click="pickPage(page)">
						<span class="cn-collective-page-picker__emoji" :aria-hidden="true">
							<template v-if="pageEmoji(page)">{{ pageEmoji(page) }}</template>
							<BookOpenPageVariant v-else :size="18" />
						</span>
						<span class="cn-collective-page-picker__main">
							<span class="cn-collective-page-picker__title">{{ page.title }}</span>
							<span class="cn-collective-page-picker__sub">
								<span class="cn-collective-page-picker__collective-name">{{ page.collectiveName }}</span>
								<span v-if="whenLabel(page)" class="cn-collective-page-picker__when">· {{ whenLabel(page) }}</span>
							</span>
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="selectedPageId === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link page') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCollectivePagePicker — pick an existing Collectives page. Emits
 * `link` with the chosen page id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import BookOpenPageVariant from 'vue-material-design-icons/BookOpenPageVariant.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnCollectivePagePicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField, BookOpenPageVariant },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing page') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			pages: [],
			collectives: [],
			collectiveFilter: null,
			search: '',
			selectedPageId: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Options for the collective filter dropdown.
		 *
		 * @return {Array} The collective option rows.
		 */
		collectiveOptions() {
			return this.collectives.map(c => ({ id: c.id, label: c.emoji ? `${c.emoji} ${c.name}` : c.name }))
		},

		/**
		 * Client-side filter on top of the server-side `?search=` payload
		 * plus the optional collective narrowing — so the user sees
		 * instant feedback even between debounce ticks.
		 *
		 * @return {Array} The filtered page rows.
		 */
		visiblePages() {
			const term = this.search.trim().toLowerCase()
			const collId = this.collectiveFilter ? this.collectiveFilter.id : null
			return this.pages.filter((page) => {
				if (collId !== null && Number(page.collectiveId) !== Number(collId)) {
					return false
				}
				if (term !== '' && !(page.title || '').toLowerCase().includes(term)) {
					return false
				}
				return true
			})
		},
	},

	mounted() {
		this.fetchCollectives()
		this.fetchPages()
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		async fetchCollectives() {
			try {
				const response = await fetch(`${this.apiBase}/integrations/collectives/list`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.collectives = data.results || []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCollectivePagePicker] fetch collectives failed', err)
			}
		},

		async fetchPages(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/collectives/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.pages = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Collectives is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load pages.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCollectivePagePicker] fetch pages failed', err)
				this.error = t('nextcloud-vue', 'Could not load pages.')
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
				this.fetchPages(this.search.trim())
			}, 300)
		},

		pickPage(page) {
			this.selectedPageId = page.pageId
		},

		pageEmoji(page) {
			const emoji = page && page.emoji
			return typeof emoji === 'string' ? emoji.trim() : ''
		},

		whenLabel(page) {
			const value = page && page.lastModified
			if (!value) {
				return ''
			}
			const d = new Date(value)
			if (Number.isNaN(d.getTime())) {
				return ''
			}
			return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
		},

		confirm() {
			if (this.selectedPageId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ pageId }`.
			 */
			this.$emit('link', { pageId: this.selectedPageId })
		},
	},
}
</script>

<style scoped>
.cn-collective-page-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-collective-page-picker__error {
	margin: 4px 0;
}

.cn-collective-page-picker__collective,
.cn-collective-page-picker__search {
	width: 100%;
}

.cn-collective-page-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-collective-page-picker__row {
	border-radius: var(--border-radius);
}

.cn-collective-page-picker__row-button {
	display: flex;
	align-items: flex-start;
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

.cn-collective-page-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-collective-page-picker__row--selected .cn-collective-page-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-collective-page-picker__emoji {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.05em;
	line-height: 1;
	color: var(--color-text-maxcontrast);
}

.cn-collective-page-picker__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-collective-page-picker__title {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-collective-page-picker__sub {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-collective-page-picker__when {
	white-space: nowrap;
}
</style>
