<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-news-widget" :class="layoutClass">
		<div v-if="failedCount > 0" class="cn-news-widget__badge" :title="failedTooltip">
			{{ failedBadgeLabel }}
		</div>

		<div v-if="loading" class="cn-news-widget__state cn-news-widget__state--loading">
			{{ t('nextcloud-vue', 'Loading news…') }}
		</div>

		<div v-else-if="hasError" class="cn-news-widget__state cn-news-widget__state--error">
			{{ t('nextcloud-vue', 'Unable to load news. Please try again later.') }}
		</div>

		<div v-else-if="items.length === 0" class="cn-news-widget__state cn-news-widget__state--empty">
			{{ t('nextcloud-vue', 'No news yet — try adding feeds in the widget settings') }}
		</div>

		<ul v-else class="cn-news-widget__list">
			<li v-for="item in items" :key="item.guid" class="cn-news-widget__item">
				<a
					v-if="item.link"
					:href="item.link"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-news-widget__item-link"
					@click="onItemClick($event, item)">
					<img
						v-if="showThumbnails && item.thumbnailUrl"
						class="cn-news-widget__thumb"
						:src="item.thumbnailUrl"
						:alt="''">
					<div class="cn-news-widget__body">
						<h4 class="cn-news-widget__title">{{ item.title }}</h4>
						<p
							v-if="showSummary && item.summary"
							class="cn-news-widget__summary"
							v-html="formattedSummary(item)" /><!-- eslint-disable-line vue/no-v-html -- formattedSummary() sanitises through DOMPurify (SAFE_MARKDOWN_DOMPURIFY_CONFIG) -->
						<div class="cn-news-widget__meta">
							<span class="cn-news-widget__source">{{ item.sourceTitle }}</span>
							<span class="cn-news-widget__date">{{ formatDate(item.pubDate) }}</span>
						</div>
					</div>
				</a>
				<div v-else class="cn-news-widget__item-link cn-news-widget__item-link--inert">
					<img
						v-if="showThumbnails && item.thumbnailUrl"
						class="cn-news-widget__thumb"
						:src="item.thumbnailUrl"
						:alt="''">
					<div class="cn-news-widget__body">
						<h4 class="cn-news-widget__title">
							{{ item.title }}
						</h4>
						<p
							v-if="showSummary && item.summary"
							class="cn-news-widget__summary"
							v-html="formattedSummary(item)" /><!-- eslint-disable-line vue/no-v-html -- formattedSummary() sanitises through DOMPurify (SAFE_MARKDOWN_DOMPURIFY_CONFIG) -->
						<div class="cn-news-widget__meta">
							<span class="cn-news-widget__source">{{ item.sourceTitle }}</span>
							<span class="cn-news-widget__date">{{ formatDate(item.pubDate) }}</span>
						</div>
					</div>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import DOMPurify from 'dompurify'
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
import { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '../../utils/safeMarkdownDompurifyConfig.js'

const ALLOWED_LAYOUTS = ['list', 'grid', 'carousel']
const DEFAULT_LAYOUT = 'list'
const DEFAULT_LIMIT = 10

/**
 * CnNewsWidget — renders merged RSS/Atom feed items in one of three layout
 * modes (list, grid, carousel), switched via a CSS class.
 *
 * Items are fetched from the consumer-supplied `itemsEndpoint` (a URL string
 * or a `(placementId, { limit }) => string` builder); the expected response
 * shape is `{ items: [{guid, title, summary, link, pubDate, sourceTitle,
 * thumbnailUrl}], feedsFailed, failedUrls }`. When no endpoint is supplied
 * the widget renders the empty state — it never assumes a backend route.
 *
 * A single feed failure does not break the widget: successful sources still
 * render and the failure count surfaces in a top-right badge. Item links open
 * in a new tab with `noopener,noreferrer`.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnNewsWidget',

	props: {
		/**
		 * Persisted widget content `{feedUrls, layout, itemLimit,
		 * showThumbnails, showSummary, summaryMaxChars, dateFormat,
		 * metadataFilter}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/** Placement entity carrying the id used in the items request. */
		placement: {
			type: Object,
			default: null,
		},
		/**
		 * Consumer-supplied items source: either a fully-formed URL string or
		 * a builder `(placementId, { limit }) => string`. When `null` the
		 * widget renders the empty state without making a request.
		 *
		 * @type {string|Function|null}
		 */
		itemsEndpoint: {
			type: [String, Function],
			default: null,
		},
	},

	data() {
		return {
			items: [],
			failedCount: 0,
			failedUrls: [],
			loading: false,
			hasError: false,
		}
	},

	computed: {
		/**
		 * The configured feed URLs.
		 *
		 * @return {string[]} the feed URLs.
		 */
		feedUrls() {
			const value = this.content && this.content.feedUrls
			return Array.isArray(value) ? value : []
		},

		/**
		 * The validated layout mode (defaults to `list`).
		 *
		 * @return {string} one of list/grid/carousel.
		 */
		layout() {
			const value = this.content && this.content.layout
			if (typeof value !== 'string' || ALLOWED_LAYOUTS.includes(value) === false) {
				return DEFAULT_LAYOUT
			}
			return value
		},

		/**
		 * The layout CSS modifier class.
		 *
		 * @return {string} the layout class.
		 */
		layoutClass() {
			return `cn-news-widget--${this.layout}`
		},

		/**
		 * The validated item limit (1–50, defaults to 10).
		 *
		 * @return {number} the item limit.
		 */
		itemLimit() {
			const value = this.content && this.content.itemLimit
			if (typeof value !== 'number' || value < 1 || value > 50) {
				return DEFAULT_LIMIT
			}
			return value
		},

		/**
		 * Whether thumbnails render (defaults to true).
		 *
		 * @return {boolean} the showThumbnails flag.
		 */
		showThumbnails() {
			const value = this.content && this.content.showThumbnails
			return value === undefined ? true : value === true
		},

		/**
		 * Whether item summaries render (defaults to true).
		 *
		 * @return {boolean} the showSummary flag.
		 */
		showSummary() {
			const value = this.content && this.content.showSummary
			return value === undefined ? true : value === true
		},

		/**
		 * The summary truncation budget in characters (defaults to 200).
		 *
		 * @return {number} the max characters.
		 */
		summaryMaxChars() {
			const value = this.content && this.content.summaryMaxChars
			if (typeof value !== 'number' || value < 0) {
				return 200
			}
			return value
		},

		/**
		 * The date format mode (`relative` or `absolute`).
		 *
		 * @return {string} the date format.
		 */
		dateFormat() {
			const value = this.content && this.content.dateFormat
			return value === 'absolute' ? 'absolute' : 'relative'
		},

		/**
		 * The placement id used to build the items request.
		 *
		 * @return {*} the placement id, or `null`.
		 */
		placementId() {
			return this.placement && this.placement.id ? this.placement.id : null
		},

		/**
		 * The failed-feeds badge label.
		 *
		 * @return {string} the badge label.
		 */
		failedBadgeLabel() {
			if (this.failedCount === 1) {
				return t('nextcloud-vue', '1 feed failed')
			}
			return t('nextcloud-vue', '{count} feeds failed').replace('{count}', String(this.failedCount))
		},

		/**
		 * The failed-feeds tooltip listing the failed URLs.
		 *
		 * @return {string} the tooltip text.
		 */
		failedTooltip() {
			if (this.failedUrls.length === 0) {
				return ''
			}
			return t('nextcloud-vue', 'Failed: {urls}').replace('{urls}', this.failedUrls.join(', '))
		},
	},

	watch: {
		placementId: {
			immediate: true,
			handler(newId) {
				if (newId !== null && newId !== undefined) {
					this.loadItems()
				}
			},
		},
	},

	methods: {
		/**
		 * Resolve the items request URL from the `itemsEndpoint` prop.
		 *
		 * @return {string|null} the URL, or `null` when none is configured.
		 */
		resolveEndpoint() {
			if (typeof this.itemsEndpoint === 'function') {
				return this.itemsEndpoint(this.placementId, { limit: this.itemLimit })
			}
			if (typeof this.itemsEndpoint === 'string' && this.itemsEndpoint !== '') {
				return this.itemsEndpoint
			}
			return null
		},

		/**
		 * Load feed items from the resolved endpoint.
		 *
		 * @return {Promise<void>}
		 */
		async loadItems() {
			const url = this.resolveEndpoint()
			if (url === null) {
				return
			}

			this.loading = true
			this.hasError = false

			try {
				const response = await axios.get(url, { params: { limit: this.itemLimit } })
				const data = response && response.data ? response.data : {}
				this.items = Array.isArray(data.items) ? data.items : []
				this.failedCount = typeof data.feedsFailed === 'number' ? data.feedsFailed : 0
				this.failedUrls = Array.isArray(data.failedUrls) ? data.failedUrls : []
			} catch (err) {
				this.hasError = true
				this.items = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Defence-in-depth click handler. The native anchor opens safely; this
		 * only fires `window.open` when a consumer has preventDefault()-ed.
		 *
		 * @param {Event} event the mouse event.
		 * @param {object} item the rendered news item.
		 * @return {void}
		 */
		onItemClick(event, item) {
			if (!item || !item.link) {
				return
			}
			if (event && event.defaultPrevented) {
				window.open(item.link, '_blank', 'noopener,noreferrer')
			}
		},

		/**
		 * Truncate a feed item's summary to the char budget and sanitise it.
		 *
		 * `summary` arrives verbatim from a third-party RSS/Atom feed by way of
		 * the consumer's `itemsEndpoint`, so it is untrusted markup and MUST NOT
		 * reach the `v-html` binding unsanitised. Truncation runs first (it
		 * preserves the historical `summaryMaxChars` budget, which counts markup
		 * characters), then DOMPurify both strips XSS vectors — `<script>`,
		 * `on*` handlers, `javascript:` URLs — and repairs the unbalanced tag a
		 * mid-element cut would otherwise leave behind.
		 *
		 * @param {object} item the news item, whose `summary` may contain HTML.
		 * @return {string} sanitised summary HTML, safe for `v-html` injection.
		 */
		formattedSummary(item) {
			const raw = typeof item.summary === 'string' ? item.summary : ''
			const truncated = raw.length <= this.summaryMaxChars
				? raw
				: raw.slice(0, this.summaryMaxChars) + '…'
			return DOMPurify.sanitize(truncated, SAFE_MARKDOWN_DOMPURIFY_CONFIG)
		},

		/**
		 * Format an ISO 8601 publication date per the configured mode.
		 *
		 * @param {string} pubDate the ISO 8601 date string.
		 * @return {string} the formatted date label.
		 */
		formatDate(pubDate) {
			if (typeof pubDate !== 'string' || pubDate === '') {
				return ''
			}
			const ts = Date.parse(pubDate)
			if (Number.isNaN(ts)) {
				return ''
			}
			if (this.dateFormat === 'absolute') {
				return new Date(ts).toISOString().slice(0, 16).replace('T', ' ')
			}
			const diffSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
			if (diffSeconds < 60) {
				return t('nextcloud-vue', 'just now')
			}
			const diffMinutes = Math.floor(diffSeconds / 60)
			if (diffMinutes < 60) {
				return t('nextcloud-vue', '{n} minutes ago').replace('{n}', String(diffMinutes))
			}
			const diffHours = Math.floor(diffMinutes / 60)
			if (diffHours < 24) {
				return t('nextcloud-vue', '{n} hours ago').replace('{n}', String(diffHours))
			}
			const diffDays = Math.floor(diffHours / 24)
			return t('nextcloud-vue', '{n} days ago').replace('{n}', String(diffDays))
		},
	},
}
</script>

<style scoped>
.cn-news-widget {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.cn-news-widget__badge {
	position: absolute;
	top: 6px;
	right: 6px;
	padding: 2px 8px;
	font-size: 11px;
	background: var(--color-warning, #ffcc00);
	color: var(--color-main-text, #000);
	border-radius: 12px;
	z-index: 2;
}

.cn-news-widget__state {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-news-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
	overflow: auto;
	flex: 1;
}

.cn-news-widget--list .cn-news-widget__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-news-widget--grid .cn-news-widget__list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 12px;
}

.cn-news-widget--carousel .cn-news-widget__list {
	display: flex;
	flex-direction: row;
	gap: 12px;
	overflow-x: auto;
	overflow-y: hidden;
}

.cn-news-widget--carousel .cn-news-widget__item {
	flex: 0 0 220px;
}

.cn-news-widget__item-link {
	display: flex;
	gap: 8px;
	padding: 8px;
	color: inherit;
	text-decoration: none;
	border-radius: var(--border-radius, 4px);
	transition: background-color 0.15s ease;
}

.cn-news-widget__item-link:hover {
	background-color: var(--color-background-hover);
}

.cn-news-widget__item-link--inert {
	cursor: default;
}

.cn-news-widget--grid .cn-news-widget__item-link,
.cn-news-widget--carousel .cn-news-widget__item-link {
	flex-direction: column;
}

.cn-news-widget__thumb {
	width: 64px;
	height: 64px;
	object-fit: cover;
	border-radius: var(--border-radius, 4px);
	flex-shrink: 0;
}

.cn-news-widget--grid .cn-news-widget__thumb,
.cn-news-widget--carousel .cn-news-widget__thumb {
	width: 100%;
	height: 96px;
}

.cn-news-widget__body {
	flex: 1;
	min-width: 0;
}

.cn-news-widget__title {
	margin: 0 0 4px 0;
	font-size: 14px;
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-news-widget__summary {
	margin: 0 0 4px 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
}

.cn-news-widget__meta {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}
</style>
