<!--
  CnXwikiCard — surface-aware widget for the XWiki ("Articles")
  integration. Registered on the pluggable integration registry as
  `xwiki` (see src/integrations/builtin/xwiki.js).

  Per AD-19 one component renders all four surfaces, branching on the
  `surface` prop:
    - detail-page    : linked pages list + a TEXT preview of the first
                       linked page (HTML stripped, first ~500 chars,
                       macros NOT executed — AD-1) + link to the full
                       page in XWiki.
    - user-dashboard / app-dashboard : the most recent linked pages
                       (compact list, no preview).
    - single-entity  : a chip for ONE page — title + breadcrumb —
                       resolved from the `value` prop (a canonical
                       `Space.Page` reference). Used when a schema
                       property declares `referenceType: 'xwiki'`
                       (AD-18); the chip is read-only.

  All data comes from OpenRegister's
  `/objects/{register}/{schema}/{id}/xwiki` sub-resource (and
  `/{reference}` for single-entity), which the PHP XwikiProvider
  delegates to the OpenConnector `xwiki` source. A 503 from the
  endpoint renders a quiet unavailable state, never a broken widget.
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="FileDocumentMultiple" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity: one chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-xwiki-card__chip" :title="breadcrumbText(entity)">
				<FileDocumentOutline :size="14" />
				<a v-if="entity.url"
					:href="entity.url"
					target="_blank"
					rel="noopener">{{ entity.title }}</a>
				<span v-else>{{ entity.title }}</span>
				<span v-if="breadcrumbText(entity)" class="cn-xwiki-card__chip-crumb">· {{ breadcrumbText(entity) }}</span>
			</span>
			<span v-else class="cn-xwiki-card__empty">{{ noPagesLabel }}</span>
		</template>

		<!-- list-based surfaces -->
		<template v-else>
			<div v-if="degraded" class="cn-xwiki-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="pages.length === 0" class="cn-xwiki-card__empty">
				{{ noPagesLabel }}
			</div>
			<template v-else>
				<ul class="cn-xwiki-card__list">
					<li v-for="page in displayedPages" :key="page.id" class="cn-xwiki-card__row">
						<FileDocumentOutline :size="16" class="cn-xwiki-card__icon" />
						<div class="cn-xwiki-card__row-main">
							<a v-if="page.url"
								:href="page.url"
								target="_blank"
								rel="noopener"
								class="cn-xwiki-card__title">{{ page.title }}</a>
							<span v-else class="cn-xwiki-card__title">{{ page.title }}</span>
							<span v-if="breadcrumbText(page)" class="cn-xwiki-card__breadcrumb">{{ breadcrumbText(page) }}</span>
						</div>
					</li>
				</ul>

				<!-- detail-page: text preview of the first linked page -->
				<div v-if="surface === 'detail-page' && previewText" class="cn-xwiki-card__preview">
					<p class="cn-xwiki-card__preview-text">
						{{ previewText }}
					</p>
					<a
						v-if="firstPage && firstPage.url"
						:href="firstPage.url"
						target="_blank"
						rel="noopener"
						class="cn-xwiki-card__preview-link">
						{{ openInXwikiLabel }}
					</a>
				</div>
			</template>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import FileDocumentMultiple from 'vue-material-design-icons/FileDocumentMultiple.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../utils/index.js'

/** Surfaces understood by the pluggable integration registry (AD-19). */
const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/** Hard cap on the preview length (AD-1 — keeps it cheap + safe). */
const PREVIEW_CHARS = 500

/**
 * CnXwikiCard — XWiki "Articles" widget for the pluggable integration
 * registry. Surface-aware: see the component header for what each
 * surface renders.
 */
export default {
	name: 'CnXwikiCard',

	components: { CnDetailCard, NcLoadingIcon, FileDocumentOutline },

	props: {
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
			validator: (value) => VALID_SURFACES.includes(value),
		},
		/**
		 * For `surface === 'single-entity'`: the canonical XWiki page
		 * reference (`Space.Page`) to render as a chip. Ignored on the
		 * other surfaces.
		 */
		value: { type: [String, Object], default: null },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Max rows on the compact surfaces. */
		maxDisplay: { type: Number, default: 5 },
		/** Whether the card collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },
		/** Pre-translated empty-state label when no pages are linked. */
		noPagesLabel: { type: String, default: () => t('nextcloud-vue', 'No linked articles') },
		/** Pre-translated label for the "Open in XWiki" link below the detail-page preview. */
		openInXwikiLabel: { type: String, default: () => t('nextcloud-vue', 'Open in XWiki') },
		/** Pre-translated message shown when XWiki / OpenConnector is unreachable. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'XWiki is not reachable right now.') },
	},

	data() {
		return {
			FileDocumentMultiple,
			pages: [],
			entity: null,
			loading: false,
			degraded: '',
		}
	},

	computed: {
		cardTitle() {
			return this.title || t('nextcloud-vue', 'Articles')
		},
		displayedPages() {
			return this.pages.slice(0, this.maxDisplay)
		},
		firstPage() {
			return this.pages.length > 0 ? this.pages[0] : null
		},
		previewText() {
			const html = this.firstPage?.content
			if (typeof html !== 'string' || html === '') {
				return ''
			}
			// Strip tags to plain text — macros are NOT executed (AD-1):
			// the source returns already-rendered HTML; we never inject
			// it into the DOM, we only read its text content.
			const text = html
				.replace(/<style[\s\S]*?<\/style>/gi, ' ')
				.replace(/<script[\s\S]*?<\/script>/gi, ' ')
				.replace(/<[^>]+>/g, ' ')
				.replace(/&nbsp;/gi, ' ')
				.replace(/\s+/g, ' ')
				.trim()
			return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text
		},
		referenceValue() {
			if (this.value === null || this.value === undefined) {
				return ''
			}
			if (typeof this.value === 'object') {
				return String(this.value.reference || this.value.id || '')
			}
			return String(this.value)
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.load() } },
		surface() { this.load() },
		value() { if (this.surface === 'single-entity') { this.load() } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/xwiki`
		},

		breadcrumbText(page) {
			if (page && Array.isArray(page.breadcrumb) && page.breadcrumb.length > 1) {
				return page.breadcrumb.slice(0, -1).join(' / ')
			}
			return page?.space || ''
		},

		async load() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			if (this.surface === 'single-entity') {
				await this.loadEntity()
				return
			}
			await this.loadList()
		},

		async loadList() {
			this.loading = true
			this.degraded = ''
			try {
				const params = new URLSearchParams({ _limit: String(Math.max(this.maxDisplay, 1)) })
				const response = await fetch(`${this.baseUrl()}?${params.toString()}`, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.pages = data.results || data || []
				} else if (response.status === 503) {
					this.pages = []
					this.degraded = this.unavailableLabel
				} else {
					this.pages = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiCard] failed to load linked pages', err)
				this.pages = []
			} finally {
				this.loading = false
			}
		},

		async loadEntity() {
			const ref = this.referenceValue
			if (ref === '') {
				this.entity = null
				return
			}
			this.loading = true
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(ref)}`, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					let resolved = null
					if (data) {
						resolved = (Array.isArray(data.results) === true) ? (data.results[0] || null) : data
					}
					this.entity = resolved
				} else {
					// Fall back to a minimal chip from the reference itself.
					this.entity = { id: ref, reference: ref, title: ref, breadcrumb: ref.split('.') }
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiCard] failed to load page', err)
				this.entity = { id: ref, reference: ref, title: ref, breadcrumb: ref.split('.') }
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-xwiki-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-xwiki-card__row {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 5px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-xwiki-card__row:last-child {
	border-bottom: none;
}

.cn-xwiki-card__icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
	margin-top: 2px;
}

.cn-xwiki-card__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.cn-xwiki-card__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-xwiki-card__title:hover {
	text-decoration: underline;
}

.cn-xwiki-card__breadcrumb {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-xwiki-card__preview {
	margin-top: 10px;
	padding-top: 8px;
	border-top: 1px solid var(--color-border);
}

.cn-xwiki-card__preview-text {
	margin: 0 0 6px;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	line-height: 1.4;
}

.cn-xwiki-card__preview-link {
	font-size: 0.85em;
	color: var(--color-primary-element);
}

.cn-xwiki-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 10px;
	border-radius: 999px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
}

.cn-xwiki-card__chip a {
	color: inherit;
	text-decoration: none;
}

.cn-xwiki-card__chip a:hover {
	text-decoration: underline;
}

.cn-xwiki-card__chip-crumb {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-xwiki-card__empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 10px 0;
}
</style>
