<!--
  CnCollectivesCard — bespoke surface-aware widget for the `collectives`
  integration.

  Replaces the generic CnIntegrationCard for the `collectives` leaf.
  Branches on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N linked pages" + the
        most-recently-modified page (emoji + title + collective name).
    - detail-page                    : compact list of linked pages
        (emoji + title + collective name) capped at COMPACT_LIMIT with a
        "view all" trail-off pointing at NC Collectives.
    - single-entity                  : chip with emoji + title for
        reference-property auto-rendering (referenceType: 'collectives').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnCollectivesTab. Provider shape and field-fallback strategy matches
  the tab (see the tab's docblock).

  See `openregister/openspec/changes/integration-collectives/` for the
  spec delta and ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span
				v-if="entity"
				class="cn-collectives-card__chip"
				:title="chipSubtitle(entity)">
				<span class="cn-collectives-card__chip-emoji" :aria-hidden="true">
					<template v-if="pageEmoji(entity)">{{ pageEmoji(entity) }}</template>
					<BookOpenPageVariant v-else :size="14" />
				</span>
				<a
					:href="pageUrl(entity)"
					target="_blank"
					rel="noopener">{{ pageTitle(entity) }}</a>
				<span v-if="collectiveLabel(entity)" class="cn-collectives-card__chip-collective">
					· {{ collectiveLabel(entity) }}
				</span>
			</span>
			<span v-else-if="value" class="cn-collectives-card__chip cn-collectives-card__chip--fallback">
				<BookOpenPageVariant :size="14" />
				<span>{{ value }}</span>
			</span>
			<span v-else class="cn-collectives-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: count + most-recent -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div v-if="degraded" class="cn-collectives-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="pages.length === 0" class="cn-collectives-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-collectives-card__headline">
				<div class="cn-collectives-card__headline-line">
					<strong>{{ countHeadline }}</strong>
				</div>
				<div v-if="mostRecent" class="cn-collectives-card__headline-recent">
					<span class="cn-collectives-card__chip-emoji" :aria-hidden="true">
						<template v-if="pageEmoji(mostRecent)">{{ pageEmoji(mostRecent) }}</template>
						<BookOpenPageVariant v-else :size="14" />
					</span>
					<a
						:href="pageUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ pageTitle(mostRecent) }}</a>
					<span v-if="collectiveLabel(mostRecent)" class="cn-collectives-card__headline-collective">
						· {{ collectiveLabel(mostRecent) }}
					</span>
				</div>
				<div v-if="pages.length > 1" class="cn-collectives-card__view-all">
					<a
						:href="collectivesAppUrl"
						target="_blank"
						rel="noopener">{{ viewAllLabel }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: compact list -->
		<template v-else>
			<div v-if="degraded" class="cn-collectives-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="pages.length === 0" class="cn-collectives-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-collectives-card__list">
				<li
					v-for="page in displayedPages"
					:key="pageKey(page)"
					class="cn-collectives-card__row">
					<span class="cn-collectives-card__chip-emoji" :aria-hidden="true">
						<template v-if="pageEmoji(page)">{{ pageEmoji(page) }}</template>
						<BookOpenPageVariant v-else :size="14" />
					</span>
					<div class="cn-collectives-card__row-main">
						<a
							:href="pageUrl(page)"
							target="_blank"
							rel="noopener"
							class="cn-collectives-card__title">{{ pageTitle(page) }}</a>
						<span v-if="collectiveLabel(page)" class="cn-collectives-card__row-collective">
							{{ collectiveLabel(page) }}
						</span>
					</div>
				</li>
			</ul>
			<div v-if="pages.length > COMPACT_LIMIT" class="cn-collectives-card__view-all">
				<a
					:href="collectivesAppUrl"
					target="_blank"
					rel="noopener">{{ viewAllLabel }}</a>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import BookOpenPageVariant from 'vue-material-design-icons/BookOpenPageVariant.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'
import { stripMarker } from '../../utils/marker.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const COMPACT_LIMIT = 5

/**
 * CnCollectivesCard — bespoke surface-aware widget for the `collectives`
 * integration.
 *
 * Renders Collectives-aware metadata across all four AD-19 surfaces. See
 * the file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnCollectivesCard',

	components: { CnDetailCard, NcLoadingIcon, BookOpenPageVariant },

	props: {
		/** Stable integration id (forwarded from the registry — always `'collectives'`). */
		integrationId: { type: String, default: 'collectives' },
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
		/** Optional single-entity reference (page id or slug). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Knowledge') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => BookOpenPageVariant },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No Knowledge pages linked yet') },
		/** Pre-translated unavailable label. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'NC Knowledge is currently unavailable.') },
		/** Pre-translated "view all" trail-off link label. */
		viewAllLabel: { type: String, default: () => t('nextcloud-vue', 'View all in Knowledge') },
		/** URL of the NC Collectives app entry. */
		collectivesAppUrl: { type: String, default: '/index.php/apps/collectives' },
	},

	data() {
		return {
			COMPACT_LIMIT,
			pages: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		displayedPages() {
			return this.pages.slice(0, COMPACT_LIMIT)
		},

		countHeadline() {
			const total = this.pages.length
			return n('nextcloud-vue', '{count} linked page', '{count} linked pages', total, { count: total })
		},

		mostRecent() {
			if (this.pages.length === 0) {
				return null
			}
			const sorted = [...this.pages].sort((a, b) => this.modifiedMs(b) - this.modifiedMs(a))
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
			// Strip the [or:UUID] marker AND any dangling slug
			// separator (-, _, .) that gets left behind — see
			// CnCollectivesTab.pageTitle for the bug context.
			const stripped = stripMarker(candidate).replace(/[-_.]+$/, '').replace(/^[-_.]+/, '').trim()
			return stripped || String(this.pageKey(page))
		},

		pageEmoji(page) {
			const d = this.dataOf(page)
			const emoji = page.emoji ?? d.emoji ?? ''
			return typeof emoji === 'string' ? emoji.trim() : ''
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

		collectiveLabel(page) {
			const d = this.dataOf(page)
			const name = page.collectiveName ?? d.collectiveName ?? d.collective_name ?? page.collectiveSlug ?? d.collectiveSlug ?? d.collective_slug ?? ''
			return String(name).trim()
		},

		chipSubtitle(page) {
			return this.collectiveLabel(page) || this.pageTitle(page)
		},

		modifiedMs(page) {
			const d = this.dataOf(page)
			const v = page.lastModified ?? page.modified ?? page.updated ?? d.lastModified ?? d.modified ?? d.last_modified ?? null
			if (v === null || v === undefined || v === '') {
				return 0
			}
			if (typeof v === 'number') {
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? 0 : parsed
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
					this.pages = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.pages = []
					this.degraded = this.unavailableLabel
				} else {
					this.pages = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCollectivesCard] failed to fetch Knowledge pages', err)
				this.pages = []
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
				console.error('[CnCollectivesCard] failed to fetch single Knowledge page', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-collectives-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-collectives-card__headline {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-collectives-card__headline-line {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-collectives-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-collectives-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-collectives-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-collectives-card__headline-collective {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-collectives-card__chip {
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

.cn-collectives-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-collectives-card__chip a:hover {
	text-decoration: underline;
}

.cn-collectives-card__chip-emoji {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	line-height: 1;
	font-size: 0.95em;
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-collectives-card__chip-collective {
	color: var(--color-text-maxcontrast);
}

.cn-collectives-card__chip--fallback {
	opacity: 0.85;
}

.cn-collectives-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-collectives-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-collectives-card__row:last-child {
	border-bottom: none;
}

.cn-collectives-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-collectives-card__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-collectives-card__title:hover {
	text-decoration: underline;
}

.cn-collectives-card__row-collective {
	font-size: 0.75em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-collectives-card__view-all {
	margin-top: 6px;
	font-size: 0.8em;
}

.cn-collectives-card__view-all a {
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-collectives-card__view-all a:hover {
	text-decoration: underline;
}
</style>
