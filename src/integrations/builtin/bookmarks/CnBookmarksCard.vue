<!--
  CnBookmarksCard — bespoke surface-aware widget for the `bookmarks`
  integration.

  Replaces the generic CnIntegrationCard for the `bookmarks` leaf.
  Branches on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N bookmarks" + the most
        recently added bookmark's favicon + title.
    - detail-page                    : compact list of linked bookmarks
        (favicon + title, up to COMPACT_LIMIT) with "view all" trail-off.
    - single-entity                  : chip with favicon + title for
        reference-property auto-rendering (referenceType: 'bookmarks').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnBookmarksTab; for `single-entity` the optional `value` prop addresses
  a single bookmark by id (matching CnIntegrationCard's fetchSingle
  contract).

  See `openregister/openspec/changes/integration-bookmarks/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-bookmarks-card__chip" :title="chipSubtitle(entity)">
				<img
					v-if="faviconUrl(entity)"
					:src="faviconUrl(entity)"
					:alt="''"
					class="cn-bookmarks-card__favicon"
					@error="onFaviconError(entity)">
				<Bookmark v-else :size="14" />
				<a
					:href="entity.url"
					target="_blank"
					rel="noopener noreferrer">{{ bookmarkTitle(entity) }}</a>
			</span>
			<span v-else class="cn-bookmarks-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-bookmarks-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="bookmarks.length === 0" class="cn-bookmarks-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-bookmarks-card__headline">
				<div class="cn-bookmarks-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-bookmarks-card__headline-recent">
					<img
						v-if="faviconUrl(mostRecent)"
						:src="faviconUrl(mostRecent)"
						:alt="''"
						class="cn-bookmarks-card__favicon"
						@error="onFaviconError(mostRecent)">
					<Bookmark v-else :size="14" />
					<a
						:href="mostRecent.url"
						target="_blank"
						rel="noopener noreferrer">{{ bookmarkTitle(mostRecent) }}</a>
				</div>
				<div v-if="bookmarks.length > 1" class="cn-bookmarks-card__view-all">
					<a
						:href="bookmarksAppUrl"
						target="_blank"
						rel="noopener noreferrer">{{ viewAllLabel }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-bookmarks-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="bookmarks.length === 0" class="cn-bookmarks-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-bookmarks-card__list">
				<li
					v-for="bookmark in displayedBookmarks"
					:key="bookmarkKey(bookmark)"
					class="cn-bookmarks-card__row">
					<div class="cn-bookmarks-card__row-icon">
						<img
							v-if="faviconUrl(bookmark)"
							:src="faviconUrl(bookmark)"
							:alt="''"
							class="cn-bookmarks-card__favicon"
							@error="onFaviconError(bookmark)">
						<Bookmark v-else :size="14" />
					</div>
					<div class="cn-bookmarks-card__row-main">
						<a
							:href="bookmark.url"
							target="_blank"
							rel="noopener noreferrer"
							class="cn-bookmarks-card__title">{{ bookmarkTitle(bookmark) }}</a>
					</div>
				</li>
			</ul>
			<div v-if="bookmarks.length > COMPACT_LIMIT" class="cn-bookmarks-card__view-all">
				<a
					:href="bookmarksAppUrl"
					target="_blank"
					rel="noopener noreferrer">{{ viewAllLabel }}</a>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import Bookmark from 'vue-material-design-icons/Bookmark.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnBookmarksCard — bespoke surface-aware widget for the `bookmarks`
 * integration.
 *
 * Renders Bookmarks-aware metadata across all four AD-19 surfaces. See
 * the file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnBookmarksCard',

	components: { CnDetailCard, NcLoadingIcon, Bookmark },

	props: {
		/** Stable integration id (forwarded from the registry — always `'bookmarks'`). */
		integrationId: { type: String, default: 'bookmarks' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Optional single-entity reference (bookmark id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Bookmarks') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => Bookmark },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No bookmarks linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Bookmarks is currently unavailable.') },
		/** Pre-translated "view all" trail-off link label. */
		viewAllLabel: { type: String, default: () => t('nextcloud-vue', 'View all in Bookmarks') },
		/** URL of the NC Bookmarks app entry. */
		bookmarksAppUrl: { type: String, default: '/index.php/apps/bookmarks' },
	},

	data() {
		return {
			COMPACT_LIMIT,
			bookmarks: [],
			entity: null,
			loading: false,
			degraded: '',
			brokenFavicons: {},
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedBookmarks() {
			return this.bookmarks.slice(0, COMPACT_LIMIT)
		},

		countHeadline() {
			const total = this.bookmarks.length
			return n('nextcloud-vue', '{count} bookmark', '{count} bookmarks', total, { count: total })
		},

		mostRecent() {
			if (this.bookmarks.length === 0) {
				return null
			}
			const sorted = [...this.bookmarks].sort((a, b) => {
				const ta = Number(a.added ?? a.addedAt ?? 0)
				const tb = Number(b.added ?? b.addedAt ?? 0)
				return tb - ta
			})
			return sorted[0]
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		bookmarkKey(bookmark) {
			return bookmark.id ?? bookmark.url ?? ''
		},

		bookmarkTitle(bookmark) {
			return bookmark.title || bookmark.url || ''
		},

		chipSubtitle(bookmark) {
			return bookmark.description || bookmark.url || this.bookmarkTitle(bookmark)
		},

		faviconUrl(bookmark) {
			if (!bookmark || this.brokenFavicons[this.bookmarkKey(bookmark)]) {
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

		fetch() {
			if (this.surface === 'single-entity') {
				this.fetchSingle()
				return
			}
			this.fetchList()
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.bookmarks = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.bookmarks = []
					this.degraded = this.unavailableLabel
				} else {
					this.bookmarks = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarksCard] failed to fetch bookmarks', err)
				this.bookmarks = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (this.value === '' || this.value === undefined || this.value === null || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else if (response.status === 503) {
					this.entity = null
					this.degraded = this.unavailableLabel
				} else {
					this.entity = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnBookmarksCard] failed to fetch single bookmark', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-bookmarks-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-bookmarks-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-bookmarks-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-bookmarks-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-bookmarks-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-bookmarks-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-bookmarks-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 12px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-bookmarks-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-bookmarks-card__chip a:hover {
	text-decoration: underline;
}

.cn-bookmarks-card__favicon {
	width: 14px;
	height: 14px;
	object-fit: contain;
	flex-shrink: 0;
}

.cn-bookmarks-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-bookmarks-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-bookmarks-card__row:last-child {
	border-bottom: none;
}

.cn-bookmarks-card__row-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-bookmarks-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-bookmarks-card__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-bookmarks-card__title:hover {
	text-decoration: underline;
}

.cn-bookmarks-card__view-all {
	margin-top: 6px;
	font-size: 0.8em;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-bookmarks-card__view-all a {
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-bookmarks-card__view-all a:hover {
	text-decoration: underline;
}
</style>
