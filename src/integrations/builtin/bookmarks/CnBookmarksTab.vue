<!--
  CnBookmarksTab — bespoke sidebar tab for the `bookmarks` integration.

  Replaces the generic CnIntegrationTab for the `bookmarks` leaf: renders
  URL preview cards (favicon, title, URL, description snippet, tag chips)
  one per linked bookmark. Talks to the same OpenRegister
  pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/bookmarks`
  served by `OCA\OpenRegister\Service\Integration\Providers\BookmarksProvider`
  (which uses NC Bookmarks' own BookmarkMapper filtered by an `or:{uuid}`
  tag). Payload shape: `{ id, title, url, description, tags, added }`.

  Surface behaviour:
    - Empty state with "Open Bookmarks" CTA when no linked URLs.
    - Loading + 503 "currently unavailable" + generic error states match
      CnIntegrationTab's behaviour for AD-23 graceful degradation.
    - Tag chips above the list filter the displayed rows client-side per
      the integration-bookmarks spec (Tag-Aware Display).

  Bespoke-vs-generic rationale: the generic tab renders a flat link list
  which loses the favicon, the description snippet, and the Bookmarks-side
  tags — three signals case-workers rely on to triage which reference is
  relevant. The bespoke tab surfaces them per row.

  See `openregister/openspec/changes/integration-bookmarks/` for the spec
  delta and ADR-019 (registry mechanism), ADR-022 (consumption principle).
-->
<template>
	<div class="cn-sidebar-tab cn-bookmarks-tab">
		<div v-if="degraded" class="cn-bookmarks-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<div class="cn-bookmarks-tab__actions">
			<NcButton type="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing bookmark') }}
			</NcButton>
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new bookmark') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="error" class="cn-bookmarks-tab__error" role="alert">
			{{ error }}
		</div>
		<div v-else-if="bookmarks.length === 0" class="cn-sidebar-tab__empty cn-bookmarks-tab__empty">
			<Bookmark :size="32" class="cn-bookmarks-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openBookmarksApp">
				<template #icon>
					<Bookmark :size="20" />
				</template>
				{{ openBookmarksLabel }}
			</NcButton>
		</div>
		<div v-else>
			<div v-if="allTags.length > 0" class="cn-bookmarks-tab__filters">
				<button
					v-for="tag in allTags"
					:key="tag"
					type="button"
					class="cn-bookmarks-tab__chip"
					:class="{ 'cn-bookmarks-tab__chip--active': activeTag === tag }"
					@click="toggleTagFilter(tag)">
					{{ tag }}
				</button>
				<button
					v-if="activeTag"
					type="button"
					class="cn-bookmarks-tab__chip cn-bookmarks-tab__chip--clear"
					@click="activeTag = ''">
					{{ clearFilterLabel }}
				</button>
			</div>
			<ul class="cn-bookmarks-tab__list">
				<NcListItem
					v-for="bookmark in filteredBookmarks"
					:key="bookmarkKey(bookmark)"
					class="cn-bookmarks-tab__row"
					:name="bookmarkTitle(bookmark)"
					:bold="true"
					:href="bookmark.url"
					target="_blank"
					:force-display-actions="true">
					<template #icon>
						<span class="cn-bookmarks-tab__row-icon">
							<img
								v-if="faviconUrl(bookmark)"
								:src="faviconUrl(bookmark)"
								:alt="''"
								class="cn-bookmarks-tab__favicon"
								@error="onFaviconError(bookmark)">
							<Bookmark v-else :size="20" />
						</span>
					</template>
					<template #subname>
						<span class="cn-bookmarks-tab__url" :title="bookmark.url">
							<span class="cn-bookmarks-tab__url-text">{{ displayUrl(bookmark) }}</span>
							<OpenInNew :size="12" class="cn-bookmarks-tab__url-ext" />
						</span>
					</template>
					<template #extra>
						<span v-if="bookmark.description" class="cn-bookmarks-tab__description">
							{{ bookmark.description }}
						</span>
						<span v-if="bookmarkTags(bookmark).length > 0" class="cn-bookmarks-tab__tags">
							<CnStatusBadge
								v-for="tag in bookmarkTags(bookmark)"
								:key="tag"
								class="cn-bookmarks-tab__tag"
								size="small"
								variant="info"
								:label="tag" />
						</span>
					</template>
					<template #actions>
						<NcActionButton :close-after-click="true" @click="openBookmark(bookmark)">
							<template #icon>
								<OpenInNew :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Open bookmark') }}
						</NcActionButton>
						<NcActionButton :close-after-click="true" @click="unlinkBookmark(bookmark)">
							<template #icon>
								<LinkOff :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Unlink bookmark') }}
						</NcActionButton>
					</template>
				</NcListItem>
			</ul>
		</div>

		<CnBookmarkPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnBookmarkCreate
			v-if="createOpen"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Bookmark from 'vue-material-design-icons/Bookmark.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnBookmarkCreate from '../../../components/CnBookmarkCreate/CnBookmarkCreate.vue'
import CnBookmarkPicker from '../../../components/CnBookmarkPicker/CnBookmarkPicker.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnBookmarksTab — bespoke URL preview list for the `bookmarks`
 * integration.
 *
 * Renders rows pulled from the OR pluggable-integration endpoint with
 * favicon, title, URL, description, and Bookmarks-side tag chips. Tag
 * chips at the top filter the visible rows client-side. Tier-2: adds
 * link/create modals and per-row unlink.
 */
export default {
	name: 'CnBookmarksTab',

	components: {
		NcActionButton,
		NcButton,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		Bookmark,
		LinkOff,
		LinkVariant,
		OpenInNew,
		Plus,
		CnBookmarkPicker,
		CnBookmarkCreate,
		CnStatusBadge,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'bookmarks'`). */
		integrationId: { type: String, default: 'bookmarks' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No bookmarks linked yet') },
		/** Pre-translated "Open Bookmarks" CTA label. */
		openBookmarksLabel: { type: String, default: () => t('nextcloud-vue', 'Open Bookmarks') },
		/** Pre-translated banner when Bookmarks is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Bookmarks is currently unavailable.') },
		/** Pre-translated "Clear filter" chip label. */
		clearFilterLabel: { type: String, default: () => t('nextcloud-vue', 'Clear filter') },
		/** URL of the NC Bookmarks app entry. */
		bookmarksAppUrl: { type: String, default: '/index.php/apps/bookmarks' },
	},

	data() {
		return {
			bookmarks: [],
			loading: false,
			error: '',
			degraded: '',
			activeTag: '',
			brokenFavicons: {},
			pickerOpen: false,
			createOpen: false,
		}
	},

	computed: {
		allTags() {
			const set = new Set()
			for (const b of this.bookmarks) {
				for (const tag of this.bookmarkTags(b)) {
					set.add(tag)
				}
			}
			return Array.from(set).sort()
		},

		filteredBookmarks() {
			if (!this.activeTag) {
				return this.bookmarks
			}
			return this.bookmarks.filter((b) => this.bookmarkTags(b).includes(this.activeTag))
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchBookmarks() } } },
		register() { this.fetchBookmarks() },
		schema() { this.fetchBookmarks() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		/**
		 * Base for the Tier-2 bookmark endpoints (link/new/destroy).
		 *
		 * @return {string}
		 */
		bookmarksEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/bookmarks`
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		bookmarkId(bookmark) {
			return bookmark.bookmarkId ?? bookmark.id ?? ''
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.bookmarksEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchBookmarks()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This bookmark is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link bookmark.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarksTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link bookmark.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.bookmarksEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchBookmarks()
				} else {
					this.error = t('nextcloud-vue', 'Could not create bookmark.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarksTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create bookmark.')
			}
		},

		async unlinkBookmark(bookmark) {
			const id = this.bookmarkId(bookmark)
			if (!id) {
				return
			}
			try {
				const response = await fetch(`${this.bookmarksEndpoint()}/${id}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchBookmarks()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink bookmark.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarksTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink bookmark.')
			}
		},

		bookmarkKey(bookmark) {
			return bookmark.id ?? bookmark.url ?? ''
		},

		bookmarkTitle(bookmark) {
			return bookmark.title || bookmark.url || ''
		},

		/**
		 * Host (+ path) of the bookmark URL for the subline — drops the
		 * scheme and trailing slash so the row reads like NC Bookmarks
		 * ("example.com/spec" rather than "https://example.com/spec/").
		 * Falls back to the raw URL when it cannot be parsed.
		 *
		 * @param {object} bookmark Bookmark row.
		 * @return {string} Display URL.
		 */
		displayUrl(bookmark) {
			const raw = bookmark.url || ''
			try {
				const url = new URL(raw)
				const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
				return `${url.host}${path}${url.search}`
			} catch (e) {
				return raw
			}
		},

		openBookmark(bookmark) {
			if (typeof window !== 'undefined' && bookmark.url) {
				window.open(bookmark.url, '_blank', 'noopener')
			}
		},

		bookmarkTags(bookmark) {
			const tags = bookmark.tags
			if (!Array.isArray(tags)) {
				return []
			}
			return tags.filter((tag) => typeof tag === 'string' && tag !== '' && !tag.startsWith('or:'))
		},

		faviconUrl(bookmark) {
			if (this.brokenFavicons[this.bookmarkKey(bookmark)]) {
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
			this.$set(this.brokenFavicons, this.bookmarkKey(bookmark), true)
		},

		toggleTagFilter(tag) {
			this.activeTag = this.activeTag === tag ? '' : tag
		},

		openBookmarksApp() {
			if (typeof window !== 'undefined') {
				window.open(this.bookmarksAppUrl, '_blank', 'noopener')
			}
		},

		async fetchBookmarks() {
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
					this.bookmarks = rows
				} else if (response.status === 503) {
					this.bookmarks = []
					this.degraded = this.unavailableLabel
				} else {
					this.bookmarks = []
					this.error = t('nextcloud-vue', 'Could not load bookmarks.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarksTab] failed to fetch bookmarks', err)
				this.bookmarks = []
				this.error = t('nextcloud-vue', 'Could not load bookmarks.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-bookmarks-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}

.cn-bookmarks-tab__banner {
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

.cn-bookmarks-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-bookmarks-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-bookmarks-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-bookmarks-tab__filters {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 10px;
}

.cn-bookmarks-tab__chip {
	display: inline-flex;
	align-items: center;
	padding: 3px 10px;
	border-radius: 12px;
	border: 1px solid var(--color-border);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 0.8em;
	cursor: pointer;
}

.cn-bookmarks-tab__chip:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-bookmarks-tab__chip--active {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	border-color: var(--color-primary-element);
}

.cn-bookmarks-tab__chip--clear {
	font-style: italic;
	color: var(--color-text-maxcontrast);
}

.cn-bookmarks-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* Favicon / fallback glyph rendered inside NcListItem's #icon slot,
   sized like a real NC Bookmarks site icon. */
.cn-bookmarks-tab__row-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
}

.cn-bookmarks-tab__favicon {
	width: 18px;
	height: 18px;
	object-fit: contain;
}

/* Truncated URL subline with a trailing external-link affordance. */
.cn-bookmarks-tab__url {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	max-width: 100%;
	color: var(--color-text-maxcontrast);
}

.cn-bookmarks-tab__url-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-bookmarks-tab__url-ext {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-bookmarks-tab__description {
	display: -webkit-box;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
}

.cn-bookmarks-tab__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 2px;
}
</style>
