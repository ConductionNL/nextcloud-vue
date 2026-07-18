<!--
  CnBookmarkPicker — modal for picking an existing NC Bookmarks bookmark
  to link to the parent OR object.

  Flow:
    1. Load bookmarks via GET /api/integrations/bookmarks/available
    2. Filter client-side via a search input (debounced; the same query
       is forwarded as `?search=` for server-side filtering)
    3. Single-select a bookmark row
    4. Confirm → emit `link` with `{ bookmarkId }`

  Rows render a favicon (derived client-side from the URL origin, with a
  Bookmark-icon fallback), the title, the URL, an optional description
  snippet, and the bookmark's tag chips.

  All API calls are wrapped in best-effort try/catch so a transient
  Bookmarks failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry
  without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnBookmarkPicker/` (NcDialog-based; matches the poll/
  contact/calendar picker pattern).

  ADR-019: drives the `bookmarks` integration leaf's "link existing"
  surface; emits `link` so the parent (CnBookmarksTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-bookmark-picker"
		@closing="onClose">
		<div class="cn-bookmark-picker">
			<NcNoteCard v-if="error" type="error" class="cn-bookmark-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search bookmarks')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-bookmark-picker__search"
				@update:value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visibleBookmarks.length === 0"
				:name="t('nextcloud-vue', 'No bookmarks available')"
				:description="t('nextcloud-vue', 'Add a bookmark in NC Bookmarks first, or use the create dialog.')" />
			<ul v-else class="cn-bookmark-picker__list">
				<li
					v-for="bookmark in visibleBookmarks"
					:key="bookmark.id"
					class="cn-bookmark-picker__row"
					:class="{ 'cn-bookmark-picker__row--selected': selectedBookmarkId === bookmark.id }">
					<button type="button" class="cn-bookmark-picker__row-button" @click="pickBookmark(bookmark)">
						<span class="cn-bookmark-picker__row-icon">
							<img
								v-if="faviconUrl(bookmark)"
								:src="faviconUrl(bookmark)"
								:alt="''"
								class="cn-bookmark-picker__favicon"
								@error="onFaviconError(bookmark)">
							<Bookmark v-else :size="20" />
						</span>
						<span class="cn-bookmark-picker__row-main">
							<span class="cn-bookmark-picker__row-title">{{ bookmark.title || bookmark.url }}</span>
							<span class="cn-bookmark-picker__row-url">{{ bookmark.url }}</span>
							<span v-if="bookmark.description" class="cn-bookmark-picker__row-description">
								{{ bookmark.description }}
							</span>
							<span v-if="displayTags(bookmark).length > 0" class="cn-bookmark-picker__tags">
								<span
									v-for="tag in displayTags(bookmark)"
									:key="tag"
									class="cn-bookmark-picker__tag">
									{{ tag }}
								</span>
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
				:disabled="!selectedBookmarkId"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link bookmark') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnBookmarkPicker — pick an existing Bookmarks bookmark. Emits `link`
 * with the chosen bookmark id.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import Bookmark from 'vue-material-design-icons/Bookmark.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnBookmarkPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, Bookmark },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing bookmark') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			bookmarks: [],
			search: '',
			selectedBookmarkId: null,
			searchTimer: null,
			brokenFavicons: {},
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=`
		 * payload — so the user sees instant feedback even between
		 * debounce ticks. Matches title + url.
		 *
		 * @return {Array}
		 */
		visibleBookmarks() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.bookmarks
			}
			return this.bookmarks.filter((bookmark) => {
				const title = (bookmark.title || '').toLowerCase()
				const url = (bookmark.url || '').toLowerCase()
				return title.includes(term) || url.includes(term)
			})
		},
	},

	mounted() {
		this.fetchBookmarks()
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

		async fetchBookmarks(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/bookmarks/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.bookmarks = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Bookmarks is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load bookmarks.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarkPicker] fetch bookmarks failed', err)
				this.error = t('nextcloud-vue', 'Could not load bookmarks.')
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
				this.fetchBookmarks(this.search.trim())
			}, 300)
		},

		pickBookmark(bookmark) {
			this.selectedBookmarkId = bookmark.id
		},

		displayTags(bookmark) {
			const tags = bookmark.tags
			if (!Array.isArray(tags)) {
				return []
			}
			return tags.filter((tag) => typeof tag === 'string' && tag !== '' && !tag.startsWith('or:'))
		},

		faviconUrl(bookmark) {
			if (this.brokenFavicons[bookmark.id]) {
				return ''
			}
			try {
				const url = new URL(bookmark.url)
				return `${url.origin}/favicon.ico`
			} catch (e) {
				return ''
			}
		},

		onFaviconError(bookmark) {
			this.$set(this.brokenFavicons, bookmark.id, true)
		},

		confirm() {
			if (!this.selectedBookmarkId) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ bookmarkId }`.
			 */
			this.$emit('link', { bookmarkId: this.selectedBookmarkId })
		},
	},
}
</script>

<style scoped>
.cn-bookmark-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-bookmark-picker__error {
	margin: 4px 0;
}

.cn-bookmark-picker__search {
	width: 100%;
}

.cn-bookmark-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-bookmark-picker__row {
	border-radius: var(--border-radius);
}

.cn-bookmark-picker__row--selected {
	background: var(--color-primary-element-light);
}

.cn-bookmark-picker__row-button {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	width: 100%;
	padding: 8px 10px;
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-bookmark-picker__row-button:hover {
	background: var(--color-background-hover);
}

.cn-bookmark-picker__row--selected .cn-bookmark-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-bookmark-picker__row-icon {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-maxcontrast);
	padding-top: 2px;
}

.cn-bookmark-picker__favicon {
	width: 16px;
	height: 16px;
	object-fit: contain;
}

.cn-bookmark-picker__row-main {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
	gap: 2px;
}

.cn-bookmark-picker__row-title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}

.cn-bookmark-picker__row-url {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-bookmark-picker__row-description {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.cn-bookmark-picker__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 2px;
}

.cn-bookmark-picker__tag {
	display: inline-block;
	padding: 1px 6px;
	border-radius: 8px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 0.7em;
}
</style>
