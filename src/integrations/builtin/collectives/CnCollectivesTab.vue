<!--
  CnCollectivesTab — bespoke sidebar tab for the `collectives` integration.

  Replaces the generic CnIntegrationTab for the `collectives` leaf:
  renders linked Knowledge pages grouped by collective (emoji + title +
  optional content snippet + last-modified hint). Each row deep-links to
  the page inside the NC Collectives app via
    /index.php/apps/collectives/{collectiveSlug}/{pageSlug}
  (with a sane fallback to /index.php/apps/collectives/{pageId} when the
  provider only carries an id).

  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/collectives`
  served by `OCA\OpenRegister\Service\Integration\Providers\CollectivesProvider`
  (storage strategy `link-table` — the marker `[or:{uuid}]` lives in the
  Collectives `collectives_pages.slug` column). Provider payload shape
  (verified against `CollectivesProvider::list`):
    { id, title, url, data: { id, slug, emoji, last_user_id, ... } }
  The richer "spec" shape (title, slug, emoji, content, fileId,
  lastModified, collectiveId, collectiveName, url) is accepted as well —
  the UI reads both top-level and `data.*` fields defensively so a future
  provider expansion stays drop-in.

  Bespoke-vs-generic rationale: the generic tab renders a flat title
  list which loses the collective grouping, the emoji glyph, and the
  per-page content snippet — three signals that make Knowledge linkage
  legible at-a-glance. The bespoke tab surfaces them per row.

  Surface behaviour:
    - Empty state ("No Knowledge pages linked yet") + "Open Knowledge"
      CTA when zero rows.
    - Loading state via NcLoadingIcon for the full-tab spin.
    - 503 unavailable banner (matches CnIntegrationTab's AD-23 graceful
      degradation), generic error path on non-OK / fetch throw.

  See `openregister/openspec/changes/integration-collectives/` for the
  spec delta and ADR-019 (registry mechanism), ADR-022 (consumption).
-->
<template>
	<div class="cn-sidebar-tab cn-collectives-tab">
		<div v-if="degraded" class="cn-collectives-tab__banner" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />

		<div v-else-if="error" class="cn-collectives-tab__error" role="alert">
			{{ error }}
		</div>

		<div
			v-else-if="pages.length === 0 && !degraded"
			class="cn-sidebar-tab__empty cn-collectives-tab__empty">
			<BookOpenPageVariant :size="32" class="cn-collectives-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="primary" @click="openCollectivesApp">
				<template #icon>
					<BookOpenPageVariant :size="20" />
				</template>
				{{ openCollectivesLabel }}
			</NcButton>
		</div>

		<div v-else-if="pages.length > 0" class="cn-collectives-tab__groups">
			<section
				v-for="group in groupedPages"
				:key="group.key"
				class="cn-collectives-tab__group">
				<header v-if="group.label" class="cn-collectives-tab__group-header">
					{{ group.label }}
				</header>
				<ul class="cn-collectives-tab__list">
					<li
						v-for="page in group.pages"
						:key="pageKey(page)"
						class="cn-collectives-tab__row">
						<span class="cn-collectives-tab__emoji" :aria-hidden="true">
							<template v-if="pageEmoji(page)">{{ pageEmoji(page) }}</template>
							<BookOpenPageVariant v-else :size="18" />
						</span>
						<div class="cn-collectives-tab__row-main">
							<a
								:href="pageUrl(page)"
								target="_blank"
								rel="noopener"
								class="cn-collectives-tab__title">
								{{ pageTitle(page) }}
							</a>
							<span v-if="pageSnippet(page)" class="cn-collectives-tab__snippet">
								{{ pageSnippet(page) }}
							</span>
							<span v-if="metaLabel(page)" class="cn-collectives-tab__meta">
								{{ metaLabel(page) }}
							</span>
						</div>
					</li>
				</ul>
			</section>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import BookOpenPageVariant from 'vue-material-design-icons/BookOpenPageVariant.vue'
import { buildHeaders } from '../../../utils/index.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000
const SNIPPET_MAX_CHARS = 160

/**
 * CnCollectivesTab — bespoke sidebar list for the `collectives`
 * integration.
 *
 * Renders Knowledge pages grouped by parent collective; each row has
 * emoji + title + content snippet + last-modified hint and deep-links
 * to the page inside NC Collectives.
 */
export default {
	name: 'CnCollectivesTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, BookOpenPageVariant },

	props: {
		/** Stable integration id (forwarded from the registry — always `'collectives'`). */
		integrationId: { type: String, default: 'collectives' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No Knowledge pages linked yet') },
		/** Pre-translated "Open Knowledge" CTA label. */
		openCollectivesLabel: { type: String, default: () => t('nextcloud-vue', 'Open Knowledge') },
		/** Pre-translated banner when Collectives is unavailable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Knowledge is currently unavailable.') },
		/** URL of the NC Collectives app entry. */
		collectivesAppUrl: { type: String, default: '/index.php/apps/collectives' },
	},

	data() {
		return {
			pages: [],
			loading: false,
			error: '',
			degraded: '',
		}
	},

	computed: {
		groupedPages() {
			const buckets = new Map()
			for (const page of this.pages) {
				const key = String(this.collectiveKey(page) || '__default__')
				if (!buckets.has(key)) {
					buckets.set(key, { key, label: this.collectiveLabel(page), pages: [] })
				}
				buckets.get(key).pages.push(page)
			}
			return Array.from(buckets.values())
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchPages() } } },
		register() { this.fetchPages() },
		schema() { this.fetchPages() },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		dataOf(page) {
			return (page && typeof page.data === 'object' && page.data !== null) ? page.data : {}
		},

		pageKey(page) {
			const d = this.dataOf(page)
			return page.id ?? d.id ?? page.slug ?? d.slug ?? ''
		},

		pageTitle(page) {
			const d = this.dataOf(page)
			const candidate = page.title ?? d.title ?? d.slug ?? page.slug ?? ''
			const text = String(candidate)
			// Provider returns the slug (which carries the `[or:{uuid}]` marker)
			// when no real title is available. Strip the marker for display.
			return text.replace(/\s*\[or:[^\]]+\]\s*/g, '').trim() || String(this.pageKey(page))
		},

		pageEmoji(page) {
			const d = this.dataOf(page)
			const emoji = page.emoji ?? d.emoji ?? ''
			return typeof emoji === 'string' ? emoji.trim() : ''
		},

		pageSnippet(page) {
			const d = this.dataOf(page)
			const raw = page.content ?? d.content ?? ''
			const text = String(raw).replace(/\s+/g, ' ').trim()
			if (text === '') {
				return ''
			}
			if (text.length > SNIPPET_MAX_CHARS) {
				return text.slice(0, SNIPPET_MAX_CHARS).trimEnd() + '…'
			}
			return text
		},

		pageUrl(page) {
			if (typeof page.url === 'string' && page.url !== '') {
				return page.url
			}
			const d = this.dataOf(page)
			const collectiveSlug = page.collectiveSlug ?? d.collectiveSlug ?? d.collective_slug ?? ''
			const pageSlug = page.slug ?? d.slug ?? this.pageKey(page)
			if (collectiveSlug !== '' && pageSlug !== '') {
				return `/index.php/apps/collectives/${collectiveSlug}/${pageSlug}`
			}
			return `/index.php/apps/collectives/${this.pageKey(page)}`
		},

		collectiveKey(page) {
			const d = this.dataOf(page)
			return page.collectiveId ?? d.collectiveId ?? d.collective_id ?? page.collectiveSlug ?? d.collectiveSlug ?? d.collective_slug ?? ''
		},

		collectiveLabel(page) {
			const d = this.dataOf(page)
			const name = page.collectiveName ?? d.collectiveName ?? d.collective_name ?? page.collectiveSlug ?? d.collectiveSlug ?? d.collective_slug ?? ''
			return String(name).trim()
		},

		modifiedMs(page) {
			const d = this.dataOf(page)
			const v = page.lastModified ?? page.modified ?? page.updated ?? d.lastModified ?? d.modified ?? d.last_modified ?? null
			if (v === null || v === undefined || v === '') {
				return null
			}
			if (typeof v === 'number') {
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? null : parsed
		},

		metaLabel(page) {
			const ms = this.modifiedMs(page)
			if (ms === null) {
				return ''
			}
			const diff = Date.now() - ms
			if (diff < 0) {
				return ''
			}
			if (diff < MS_PER_HOUR) {
				const minutes = Math.max(1, Math.floor(diff / (60 * 1000)))
				return t('nextcloud-vue', 'Updated {n} minutes ago', { n: minutes })
			}
			if (diff < MS_PER_DAY) {
				const hours = Math.max(1, Math.floor(diff / MS_PER_HOUR))
				return t('nextcloud-vue', 'Updated {n} hours ago', { n: hours })
			}
			const days = Math.max(1, Math.floor(diff / MS_PER_DAY))
			return t('nextcloud-vue', 'Updated {n} days ago', { n: days })
		},

		openCollectivesApp() {
			if (typeof window !== 'undefined') {
				window.open(this.collectivesAppUrl, '_blank', 'noopener')
			}
		},

		async fetchPages() {
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
					this.pages = rows
				} else if (response.status === 503) {
					this.pages = []
					this.degraded = this.unavailableLabel
				} else {
					this.pages = []
					this.error = t('nextcloud-vue', 'Could not load Knowledge pages.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCollectivesTab] failed to fetch Knowledge pages', err)
				this.pages = []
				this.error = t('nextcloud-vue', 'Could not load Knowledge pages.')
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-collectives-tab__banner {
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

.cn-collectives-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-collectives-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-collectives-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-collectives-tab__groups {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-collectives-tab__group-header {
	font-size: 0.8em;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-maxcontrast);
	margin-bottom: 4px;
}

.cn-collectives-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-collectives-tab__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-collectives-tab__row:last-child {
	border-bottom: none;
}

.cn-collectives-tab__emoji {
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

.cn-collectives-tab__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-collectives-tab__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
}

a.cn-collectives-tab__title:hover {
	text-decoration: underline;
}

.cn-collectives-tab__snippet {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.cn-collectives-tab__meta {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
}
</style>
