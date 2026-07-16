<!--
  CnXwikiCard — bespoke surface-aware widget for the `xwiki` integration.

  Replaces the generic CnIntegrationCard for the `xwiki` leaf. Branches
  on `surface` per AD-19:
    - user-dashboard / app-dashboard: headline count of linked XWiki
      pages + most-recent linked page title + breadcrumb + an auth-
      status badge (configured / not configured / unhealthy).
    - detail-page: linked-pages list with macro-inert text preview of
      the first page (HTML stripped to plain text, `<script>` body
      removed, ~500-char truncation — AD-1) + "Open in XWiki" link.
    - single-entity: title + breadcrumb chip resolved from the `value`
      prop (for `referenceType: 'xwiki'` properties); falls back to a
      minimal chip with just the `value` when the lookup fails.

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnXwikiTab; for `single-entity` the optional `value` prop addresses a
  single page by canonical reference (matching the underlying provider
  `get()` contract).

  External-fetch latency is normal for XWiki because the OR provider
  hops through OpenConnector → external HTTP. The card shows a loading
  spinner for the whole round-trip; failure modes (503 +
  `details.cause` per AD-23) collapse to a compact `authStatus` badge
  on the dashboard surfaces instead of a fat banner.

  Security note: the text preview NEVER injects HTML into the DOM. The
  `<script>`/`<style>` bodies are stripped first, then all tags are
  removed, and finally the result is bound through `{{ }}` (text
  interpolation) — macros remain inert text.

  See `openregister/openspec/changes/integration-xwiki/` for the spec
  delta and ADR-019 (registry mechanism), AD-19 (surface fallback),
  AD-1 (text-only preview).
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span
				v-if="entity"
				class="cn-xwiki-card__chip"
				:title="chipSubtitle(entity)">
				<FileDocumentMultiple :size="14" />
				<a
					:href="pageUrl(entity)"
					target="_blank"
					rel="noopener">{{ pageTitle(entity) }}</a>
				<span v-if="breadcrumbLabel(entity)" class="cn-xwiki-card__chip-breadcrumb">
					· {{ breadcrumbLabel(entity) }}
				</span>
			</span>
			<span v-else-if="value" class="cn-xwiki-card__chip cn-xwiki-card__chip--fallback">
				<FileDocumentMultiple :size="14" />
				<span>{{ value }}</span>
			</span>
			<span v-else class="cn-xwiki-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: count + most-recent + auth status badge -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div class="cn-xwiki-card__dashboard">
				<div class="cn-xwiki-card__headline-row">
					<strong v-if="!degraded" class="cn-xwiki-card__count">{{ countHeadline }}</strong>
					<span v-else class="cn-xwiki-card__count cn-xwiki-card__count--muted">
						{{ degradedHeadline }}
					</span>
					<span
						class="cn-xwiki-card__auth-badge"
						:class="`cn-xwiki-card__auth-badge--${authBadge.kind}`"
						:title="authBadge.title">
						{{ authBadge.label }}
					</span>
				</div>
				<div v-if="!degraded && mostRecent" class="cn-xwiki-card__recent">
					<FileDocumentMultiple :size="14" />
					<a
						:href="pageUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ pageTitle(mostRecent) }}</a>
					<span v-if="breadcrumbLabel(mostRecent)" class="cn-xwiki-card__recent-breadcrumb">
						· {{ breadcrumbLabel(mostRecent) }}
					</span>
				</div>
				<div v-else-if="!degraded && pages.length === 0" class="cn-xwiki-card__empty">
					{{ emptyLabel }}
				</div>
			</div>
		</template>

		<!-- detail-page surface: list + text preview of first page -->
		<template v-else>
			<div v-if="degraded" class="cn-xwiki-card__banner" :class="`cn-xwiki-card__banner--${bannerKind}`">
				{{ degraded }}
			</div>
			<div v-else-if="pages.length === 0" class="cn-xwiki-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-xwiki-card__detail">
				<ul class="cn-xwiki-card__list">
					<li
						v-for="page in pages"
						:key="pageKey(page)"
						class="cn-xwiki-card__row">
						<div class="cn-xwiki-card__row-header">
							<FileDocumentMultiple :size="16" class="cn-xwiki-card__row-icon" />
							<a
								:href="pageUrl(page)"
								target="_blank"
								rel="noopener"
								class="cn-xwiki-card__title">{{ pageTitle(page) }}</a>
						</div>
						<div v-if="breadcrumbLabel(page)" class="cn-xwiki-card__breadcrumb">
							{{ breadcrumbLabel(page) }}
						</div>
					</li>
				</ul>
				<div v-if="previewText" class="cn-xwiki-card__preview">
					<p>{{ previewText }}</p>
					<a
						v-if="firstPageUrl"
						:href="firstPageUrl"
						target="_blank"
						rel="noopener"
						class="cn-xwiki-card__open-link">
						{{ openLabel }}
					</a>
				</div>
			</div>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import FileDocumentMultiple from 'vue-material-design-icons/FileDocumentMultiple.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
const PREVIEW_MAX_CHARS = 500

/**
 * CnXwikiCard — bespoke surface-aware widget for the `xwiki` integration.
 *
 * Renders XWiki-aware metadata across all four surfaces. See the
 * file-level docblock for surface-by-surface behaviour.
 */
export default {
	name: 'CnXwikiCard',

	components: { CnDetailCard, NcLoadingIcon, FileDocumentMultiple },

	props: {
		/** Stable integration id (forwarded from the registry — always `'xwiki'`). */
		integrationId: { type: String, default: 'xwiki' },
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
		/** Optional single-entity reference (page canonical reference). */
		value: { type: String, default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Articles') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => FileDocumentMultiple },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No XWiki pages linked yet') },
		/** Pre-translated "Open in XWiki" label. */
		openLabel: { type: String, default: () => t('nextcloud-vue', 'Open in XWiki') },
	},

	data() {
		return {
			pages: [],
			entity: null,
			loading: false,
			degraded: '',
			/** One of: 'none' | 'unconfigured' | 'auth' | 'upstream' | 'error'. */
			bannerKind: 'none',
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		mostRecent() {
			if (this.pages.length === 0) {
				return null
			}
			const sorted = [...this.pages].sort((a, b) => this.modifiedMs(b) - this.modifiedMs(a))
			return sorted[0]
		},

		countHeadline() {
			const total = this.pages.length
			return n('nextcloud-vue', '{count} linked page', '{count} linked pages', total, { count: total })
		},

		degradedHeadline() {
			if (this.bannerKind === 'unconfigured') {
				return t('nextcloud-vue', 'Not configured')
			}
			if (this.bannerKind === 'auth') {
				return t('nextcloud-vue', 'Auth failed')
			}
			return t('nextcloud-vue', 'Unavailable')
		},

		authBadge() {
			if (this.bannerKind === 'unconfigured') {
				return {
					kind: 'missing',
					label: t('nextcloud-vue', 'Not configured'),
					title: t('nextcloud-vue', 'Add an XWiki source in OpenConnector to enable this integration.'),
				}
			}
			if (this.bannerKind === 'auth') {
				return {
					kind: 'unhealthy',
					label: t('nextcloud-vue', 'Auth failed'),
					title: t('nextcloud-vue', 'XWiki returned 401 — check the OpenConnector source credentials.'),
				}
			}
			if (this.bannerKind === 'upstream' || this.bannerKind === 'error') {
				return {
					kind: 'unhealthy',
					label: t('nextcloud-vue', 'Unavailable'),
					title: t('nextcloud-vue', 'The upstream XWiki host did not respond.'),
				}
			}
			return {
				kind: 'configured',
				label: t('nextcloud-vue', 'Configured'),
				title: t('nextcloud-vue', 'OpenConnector source is configured.'),
			}
		},

		firstPageUrl() {
			if (this.pages.length === 0) {
				return ''
			}
			return this.pageUrl(this.pages[0])
		},

		previewText() {
			if (this.surface !== 'detail-page' || this.pages.length === 0) {
				return ''
			}
			const raw = this.pages[0].content ?? this.pages[0].renderedContent ?? ''
			return this.toSafePreviewText(String(raw))
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

		pageKey(page) {
			return page.id ?? page.reference ?? ''
		},

		pageTitle(page) {
			return String(page.title ?? page.page ?? page.reference ?? this.pageKey(page))
		},

		pageUrl(page) {
			return page.url ?? ''
		},

		breadcrumbLabel(page) {
			const crumb = page.breadcrumb
			if (Array.isArray(crumb) === false || crumb.length === 0) {
				return ''
			}
			const ancestors = crumb.slice(0, -1)
			if (ancestors.length === 0) {
				return String(page.space ?? '')
			}
			// XWiki renders space paths with a "›" chevron separator.
			return ancestors.map((c) => String(c)).filter((s) => s !== '').join(' › ')
		},

		chipSubtitle(page) {
			return this.breadcrumbLabel(page) || this.pageTitle(page)
		},

		modifiedMs(page) {
			const v = page.modified ?? page.lastModified ?? page.updated ?? null
			if (v === null || v === undefined || v === '') {
				return 0
			}
			if (typeof v === 'number') {
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? 0 : parsed
		},

		/**
		 * Reduce a (possibly rendered-HTML) string to safe inert text:
		 *   1. Strip `<script>` and `<style>` blocks entirely (incl. body).
		 *   2. Strip all remaining HTML tags.
		 *   3. Collapse whitespace.
		 *   4. Truncate to PREVIEW_MAX_CHARS.
		 *
		 * Macro markup (e.g. `{{velocity}}…{{/velocity}}`) is preserved as
		 * inert text — it is never executed because the result is bound
		 * via `{{ }}` text interpolation in the template, not v-html.
		 *
		 * @param {string} raw Raw rendered-HTML body or plain text.
		 *
		 * @return {string} Safe preview text (≤ PREVIEW_MAX_CHARS).
		 */
		toSafePreviewText(raw) {
			if (raw === '') {
				return ''
			}
			let text = raw
				.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
				.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
			if (text.length > PREVIEW_MAX_CHARS) {
				text = text.slice(0, PREVIEW_MAX_CHARS).trimEnd() + '…'
			}
			return text
		},

		/**
		 * Map a 503 cause (`details.cause` per AD-23) to a banner kind.
		 *
		 * @param {string} cause Cause string from the controller envelope.
		 *
		 * @return {string} Banner kind (`unconfigured` / `auth` / `upstream`).
		 */
		bannerFromCause(cause) {
			if (cause === 'openconnector-down' || cause === 'openconnector-source-missing') {
				return 'unconfigured'
			}
			if (cause === 'provider-auth') {
				return 'auth'
			}
			return 'upstream'
		},

		applyDegradedFromCause(cause) {
			this.bannerKind = this.bannerFromCause(cause)
			if (this.bannerKind === 'unconfigured') {
				this.degraded = t('nextcloud-vue', 'XWiki connection not configured — add a source in OpenConnector.')
			} else if (this.bannerKind === 'auth') {
				this.degraded = t('nextcloud-vue', 'XWiki returned 401 — check the OpenConnector source credentials.')
			} else {
				this.degraded = t('nextcloud-vue', 'XWiki is currently unavailable.')
			}
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
			this.bannerKind = 'none'
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.pages = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.pages = []
					let cause = ''
					try {
						const body = await response.json()
						cause = String(body?.details?.cause ?? '')
					} catch (_e) {
						cause = ''
					}
					this.applyDegradedFromCause(cause)
				} else {
					this.pages = []
					this.bannerKind = 'error'
					this.degraded = t('nextcloud-vue', 'Could not load XWiki pages.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiCard] failed to fetch XWiki pages', err)
				this.pages = []
				this.bannerKind = 'error'
				this.degraded = t('nextcloud-vue', 'Could not load XWiki pages.')
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (!this.value || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			this.bannerKind = 'none'
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else {
					// On any non-OK (incl. 503) we keep the chip-fallback path
					// (renders the raw `value` as a minimal chip). The dashboard
					// surfaces show the badge; single-entity is intentionally
					// quieter — it's an inline chip in a form/table.
					this.entity = null
					if (response.status === 503) {
						let cause = ''
						try {
							const body = await response.json()
							cause = String(body?.details?.cause ?? '')
						} catch (_e) {
							cause = ''
						}
						this.bannerKind = this.bannerFromCause(cause)
					} else {
						this.bannerKind = 'error'
					}
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiCard] failed to fetch single XWiki page', err)
				this.entity = null
				this.bannerKind = 'error'
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-xwiki-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-xwiki-card__dashboard {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-xwiki-card__headline-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.cn-xwiki-card__count {
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-xwiki-card__count--muted {
	color: var(--color-text-maxcontrast);
	font-weight: normal;
}

.cn-xwiki-card__auth-badge {
	flex-shrink: 0;
	font-size: 0.75em;
	padding: 2px 8px;
	border-radius: 10px;
	white-space: nowrap;
}

.cn-xwiki-card__auth-badge--configured {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-xwiki-card__auth-badge--missing {
	background: var(--color-background-hover);
	color: var(--color-main-text);
	border: 1px solid var(--color-border);
}

.cn-xwiki-card__auth-badge--unhealthy {
	background: var(--color-error, #e9322d);
	color: var(--color-main-background);
}

.cn-xwiki-card__recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-xwiki-card__recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-xwiki-card__recent a:hover {
	text-decoration: underline;
}

.cn-xwiki-card__recent-breadcrumb {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-xwiki-card__banner {
	padding: 8px 10px;
	border-radius: var(--border-radius);
	font-size: 0.9em;
	margin-bottom: 8px;
}

.cn-xwiki-card__banner--unconfigured {
	background: var(--color-background-hover);
	color: var(--color-main-text);
	border-left: 3px solid var(--color-primary-element, #21468B);
}

.cn-xwiki-card__banner--auth,
.cn-xwiki-card__banner--error {
	background: var(--color-error, #e9322d);
	color: var(--color-main-background);
}

.cn-xwiki-card__banner--upstream {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-xwiki-card__list {
	list-style: none;
	margin: 0 0 8px;
	padding: 0;
}

.cn-xwiki-card__row {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-xwiki-card__row:last-child {
	border-bottom: none;
}

.cn-xwiki-card__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-xwiki-card__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-xwiki-card__title {
	flex: 1;
	min-width: 0;
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
	padding-left: 24px;
}

.cn-xwiki-card__preview {
	padding-top: 8px;
	border-top: 1px solid var(--color-border);
	font-size: 0.9em;
	color: var(--color-main-text);
}

.cn-xwiki-card__preview p {
	margin: 0 0 6px;
}

.cn-xwiki-card__open-link {
	color: var(--color-primary-element, #21468B);
	text-decoration: none;
	font-weight: 500;
}

.cn-xwiki-card__open-link:hover {
	text-decoration: underline;
}

.cn-xwiki-card__chip {
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
.cn-xwiki-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-xwiki-card__chip a:hover {
	text-decoration: underline;
}

.cn-xwiki-card__chip-breadcrumb {
	color: var(--color-text-maxcontrast);
}

.cn-xwiki-card__chip--fallback {
	opacity: 0.85;
}
</style>
