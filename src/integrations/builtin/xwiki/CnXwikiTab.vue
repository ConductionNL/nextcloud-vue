<!--
  CnXwikiTab — bespoke sidebar tab for the `xwiki` integration.

  Replaces the generic CnIntegrationTab for the `xwiki` leaf: renders
  linked XWiki pages as an XWiki-style document list. Each row mirrors
  an XWiki page-index entry — a document icon, the bold page title, a
  space breadcrumb subline ("Space › Subspace"), a relative last-
  modified hint (NcDateTime), and a one-line plain-text excerpt of the
  page body. Each row deep-links to the page on the external XWiki host
  (target=_blank rel=noopener).

  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/xwiki`
  served by `OCA\OpenRegister\Service\Integration\Providers\XwikiProvider`
  (storage strategy `external` — routed through `ExternalIntegrationRouter`
  → Integriq `xwiki` source → remote XWiki REST API). Provider
  payload shape per `normalizeRow()`:
    { id, reference, title, space, page, breadcrumb, url, content, ... }
  where `breadcrumb` is an array (the UI joins it with " › "), and
  `content` (when present, e.g. on the detail-page surface) is the
  HTML-rendered body — the excerpt strips HTML/macros to inert text and
  is bound via {{ }} interpolation, never injected.

  Surface behaviour:
    - Empty state ("No XWiki pages linked yet") when the provider
      returns zero rows.
    - **Unconfigured state**: 503 + cause `openconnector-down` or
      `openconnector-source-missing` → prominent "Configure XWiki
      connection" CTA pointing at Integriq's source admin page.
    - **Auth-expired state**: 503 + cause `provider-auth` → "XWiki
      returned 401 — check the Integriq source credentials" with
      a Reconnect CTA pointing at Integriq.
    - **Upstream-down state**: 503 + cause `upstream-service-down` →
      "XWiki is currently unavailable" + Retry CTA.
    - **Generic-error state**: fetch throws or non-OK non-503 → "Could
      not load XWiki pages" + Retry CTA.
    - Loading state via NcLoadingIcon for the full-tab spin.

  XWiki calls go through Integriq → external HTTP, so latency can
  spike on cold caches. The fetch carries no client-side timeout (the
  router enforces an upstream timeout server-side and surfaces
  upstream-down on expiry), but the loading state is shown for the
  whole round-trip so the sidebar never appears hung.

  See `openregister/openspec/changes/integration-xwiki/` for the spec
  delta and ADR-019 (registry mechanism) / ADR-022 (consumption).
-->
<template>
	<div class="cn-sidebar-tab cn-xwiki-tab">
		<!-- Banner state: surface auth + config + upstream failures prominently -->
		<div
			v-if="banner.kind !== 'none'"
			class="cn-xwiki-tab__banner"
			:class="`cn-xwiki-tab__banner--${banner.kind}`"
			role="alert">
			<AlertCircleOutline :size="18" class="cn-xwiki-tab__banner-icon" />
			<div class="cn-xwiki-tab__banner-body">
				<strong>{{ banner.title }}</strong>
				<p>{{ banner.message }}</p>
			</div>
			<NcButton
				v-if="banner.ctaLabel"
				variant="primary"
				class="cn-xwiki-tab__banner-cta"
				@click="banner.ctaHandler">
				{{ banner.ctaLabel }}
			</NcButton>
		</div>

		<!-- Link / Create actions. Disabled when the source is unconfigured;
		     the banner above already carries the Configure CTA. -->
		<div v-if="banner.kind === 'none' || banner.kind === 'unconfigured'" class="cn-xwiki-tab__actions">
			<NcButton variant="secondary" :disabled="banner.kind === 'unconfigured'" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link existing page') }}
			</NcButton>
			<NcButton variant="primary" :disabled="banner.kind === 'unconfigured'" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create new page') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />

		<div
			v-else-if="pages.length === 0 && banner.kind === 'none'"
			class="cn-sidebar-tab__empty cn-xwiki-tab__empty">
			<FileDocumentMultiple :size="32" class="cn-xwiki-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
		</div>

		<ul v-else-if="pages.length > 0" class="cn-xwiki-tab__list">
			<NcListItem
				v-for="page in pages"
				:key="pageKey(page)"
				class="cn-xwiki-tab__row"
				:name="pageTitle(page)"
				:bold="true"
				:href="pageHref(page)"
				:target="pageHref(page) ? '_blank' : undefined"
				:force-display-actions="true">
				<template #icon>
					<span class="cn-xwiki-tab__row-icon">
						<FileDocumentOutline :size="22" />
					</span>
				</template>
				<template #subname>
					<span class="cn-xwiki-tab__subline">
						<span v-if="breadcrumbLabel(page)" class="cn-xwiki-tab__breadcrumb">
							{{ breadcrumbLabel(page) }}
						</span>
						<NcDateTime
							v-if="modifiedMs(page) !== null"
							class="cn-xwiki-tab__date"
							:timestamp="modifiedMs(page)"
							:relative-time="'short'" />
					</span>
				</template>
				<template v-if="excerpt(page)" #extra>
					<span class="cn-xwiki-tab__excerpt">{{ excerpt(page) }}</span>
				</template>
				<template #actions>
					<NcActionButton
						v-if="pageHref(page)"
						class="cn-xwiki-tab__open"
						:close-after-click="true"
						@click="openPage(page)">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Open in XWiki') }}
					</NcActionButton>
					<NcActionButton
						class="cn-xwiki-tab__unlink"
						:close-after-click="true"
						@click="unlinkPage(page)">
						<template #icon>
							<LinkOff :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Unlink page') }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnXwikiPagePicker
			v-if="pickerOpen"
			:api-base="apiBase"
			:open-connector-sources-url="openConnectorSourcesUrl"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnXwikiPageCreate
			v-if="createOpen"
			:api-base="apiBase"
			:unavailable="banner.kind === 'unconfigured'"
			:open-connector-sources-url="openConnectorSourcesUrl"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcDateTime, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import FileDocumentMultiple from 'vue-material-design-icons/FileDocumentMultiple.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnXwikiPageCreate from '../../../components/CnXwikiPageCreate/CnXwikiPageCreate.vue'
import CnXwikiPagePicker from '../../../components/CnXwikiPagePicker/CnXwikiPagePicker.vue'
import { buildHeaders } from '../../../utils/index.js'

const EXCERPT_MAX_CHARS = 140

/**
 * CnXwikiTab — bespoke sidebar list for the `xwiki` external integration.
 *
 * Renders linked XWiki pages as an XWiki-style document index: document
 * icon, bold title, space breadcrumb, relative last-modified, and a
 * one-line plain-text excerpt — plus prominent auth/config banners when
 * the Integriq source is missing/unhealthy.
 */
export default {
	name: 'CnXwikiTab',

	components: {
		NcActionButton,
		NcButton,
		NcDateTime,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		FileDocumentMultiple,
		FileDocumentOutline,
		LinkOff,
		LinkVariant,
		OpenInNew,
		Plus,
		CnXwikiPagePicker,
		CnXwikiPageCreate,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'xwiki'`). */
		integrationId: { type: String, default: 'xwiki' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No XWiki pages linked yet') },
		/** URL of Integriq's sources admin page (deep-link target for the configure CTA). */
		openConnectorSourcesUrl: { type: String, default: '/index.php/apps/openconnector/sources' },
	},

	data() {
		return {
			pages: [],
			loading: false,
			/** One of: 'none' | 'unconfigured' | 'auth' | 'upstream' | 'error'. */
			bannerKind: 'none',
			pickerOpen: false,
			createOpen: false,
		}
	},

	computed: {
		banner() {
			switch (this.bannerKind) {
			case 'unconfigured':
				return {
					kind: 'unconfigured',
					title: t('nextcloud-vue', 'XWiki connection not configured'),
					message: t('nextcloud-vue', 'Add an XWiki source in Integriq with the upstream URL and credentials so OpenRegister can link pages.'),
					ctaLabel: t('nextcloud-vue', 'Configure XWiki connection'),
					ctaHandler: this.openIntegriq,
				}
			case 'auth':
				return {
					kind: 'auth',
					title: t('nextcloud-vue', 'XWiki authentication failed'),
					message: t('nextcloud-vue', 'XWiki returned 401 — check the Integriq source credentials.'),
					ctaLabel: t('nextcloud-vue', 'Reconnect'),
					ctaHandler: this.openIntegriq,
				}
			case 'upstream':
				return {
					kind: 'upstream',
					title: t('nextcloud-vue', 'XWiki is currently unavailable'),
					message: t('nextcloud-vue', 'The upstream XWiki host did not respond. Try again in a moment.'),
					ctaLabel: t('nextcloud-vue', 'Retry'),
					ctaHandler: this.fetchPages,
				}
			case 'error':
				return {
					kind: 'error',
					title: t('nextcloud-vue', 'Could not load XWiki pages'),
					message: t('nextcloud-vue', 'Something went wrong while loading the linked pages.'),
					ctaLabel: t('nextcloud-vue', 'Retry'),
					ctaHandler: this.fetchPages,
				}
			default:
				return { kind: 'none', title: '', message: '', ctaLabel: '', ctaHandler: () => {} }
			}
		},
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchPages() } } },
		register() { this.fetchPages() },
		schema() { this.fetchPages() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		/**
		 * Base for the Tier-2 xwiki endpoints (link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		xwikiEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/xwiki`
		},

		/**
		 * Open the page on the external XWiki host in a new tab. Used by
		 * the per-row "Open in XWiki" action (the row itself is also a
		 * deep-link via NcListItem's `href`).
		 *
		 * @param {object} page Provider row.
		 */
		openPage(page) {
			const href = this.pageHref(page)
			if (href && typeof window !== 'undefined') {
				window.open(href, '_blank', 'noopener')
			}
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.xwikiEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchPages()
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] link failed', err)
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.xwikiEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchPages()
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] create failed', err)
			}
		},

		async unlinkPage(page) {
			const ref = this.pageKey(page)
			if (!ref) {
				return
			}
			try {
				const response = await fetch(`${this.xwikiEndpoint()}/${encodeURIComponent(ref)}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchPages()
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] unlink failed', err)
			}
		},

		pageKey(page) {
			return page.id ?? page.reference ?? ''
		},

		pageTitle(page) {
			return String(page.title ?? page.page ?? page.reference ?? this.pageKey(page))
		},

		/**
		 * External XWiki deep-link for the page. Empty string when the
		 * provider didn't surface a `url`, so the row renders as a plain
		 * (non-anchored) NcListItem rather than a dead link.
		 *
		 * @param {object} page Provider row.
		 *
		 * @return {string} Absolute XWiki URL or ''.
		 */
		pageHref(page) {
			return String(page.url ?? '')
		},

		breadcrumbLabel(page) {
			const crumb = page.breadcrumb
			if (Array.isArray(crumb) === false || crumb.length === 0) {
				return ''
			}
			// Drop the last element (the title) per AC — show only the ancestor path.
			const ancestors = crumb.slice(0, -1)
			if (ancestors.length === 0) {
				// Single-element breadcrumb (root page) — fall back to the space name.
				return String(page.space ?? '')
			}
			// XWiki renders space paths with a "›" chevron separator.
			return ancestors.map((c) => String(c)).filter((s) => s !== '').join(' › ')
		},

		/**
		 * One-line plain-text excerpt of the page body for the detail
		 * surface. Strips `<script>`/`<style>` bodies, then all tags,
		 * collapses whitespace and truncates — XWiki macros stay inert
		 * text because the result is bound via {{ }} interpolation.
		 *
		 * @param {object} page Provider row.
		 *
		 * @return {string} Safe single-line excerpt (≤ EXCERPT_MAX_CHARS).
		 */
		excerpt(page) {
			const raw = page.content ?? page.renderedContent ?? page.excerpt ?? ''
			const str = String(raw)
			if (str === '') {
				return ''
			}
			let text = str
				.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
				.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
			if (text.length > EXCERPT_MAX_CHARS) {
				text = text.slice(0, EXCERPT_MAX_CHARS).trimEnd() + '…'
			}
			return text
		},

		/**
		 * Last-modified timestamp in milliseconds for the page, suitable
		 * for `NcDateTime`. Returns null when absent or unparseable.
		 *
		 * @param {object} page Provider row.
		 *
		 * @return {number|null} Epoch milliseconds or null.
		 */
		modifiedMs(page) {
			const v = page.modified ?? page.lastModified ?? page.updated ?? null
			if (v === null || v === undefined || v === '') {
				return null
			}
			if (typeof v === 'number') {
				return v < 1e12 ? v * 1000 : v
			}
			const parsed = Date.parse(String(v))
			return Number.isNaN(parsed) === true ? null : parsed
		},

		openIntegriq() {
			if (typeof window !== 'undefined') {
				window.open(this.openConnectorSourcesUrl, '_blank', 'noopener')
			}
		},

		/**
		 * Map a 503 cause from the controller (`details.cause` per AD-23) to
		 * the matching banner kind. Unknown causes fall through to 'upstream'.
		 *
		 * @param {string} cause One of `openconnector-down` / `openconnector-source-missing` / `provider-auth` / `upstream-service-down`.
		 *
		 * @return {string} Banner kind.
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

		async fetchPages() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.bannerKind = 'none'
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results || data.items || (Array.isArray(data) ? data : []) || []
					this.pages = rows
				} else if (response.status === 503) {
					this.pages = []
					let cause = ''
					try {
						const body = await response.json()
						cause = String(body?.details?.cause ?? '')
					} catch (_e) {
						cause = ''
					}
					this.bannerKind = this.bannerFromCause(cause)
				} else {
					this.pages = []
					this.bannerKind = 'error'
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiTab] failed to fetch XWiki pages', err)
				this.pages = []
				this.bannerKind = 'error'
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-xwiki-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
}

.cn-xwiki-tab__unlink {
	flex-shrink: 0;
}

.cn-xwiki-tab__banner {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 10px 12px;
	margin-bottom: 12px;
	border-radius: var(--border-radius);
	font-size: 0.9em;
}

.cn-xwiki-tab__banner--unconfigured {
	background: var(--color-background-hover);
	color: var(--color-main-text);
	border-left: 3px solid var(--color-primary-element, #21468B);
}

.cn-xwiki-tab__banner--auth,
.cn-xwiki-tab__banner--error {
	background: var(--color-error, #e9322d);
	color: var(--color-main-background);
}

.cn-xwiki-tab__banner--upstream {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-xwiki-tab__banner-icon {
	flex-shrink: 0;
	margin-top: 2px;
}

.cn-xwiki-tab__banner-body {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-xwiki-tab__banner-body p {
	margin: 0;
}

.cn-xwiki-tab__banner-cta {
	flex-shrink: 0;
}

.cn-xwiki-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-xwiki-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-xwiki-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* XWiki-style document tile: a tinted square holding the page glyph. */
.cn-xwiki-tab__row-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: var(--border-radius);
	background: var(--cn-xwiki-accent-soft, rgba(60, 162, 47, 0.12));
	color: var(--cn-xwiki-accent, #3CA22F);
}

.cn-xwiki-tab__subline {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	min-width: 0;
}

.cn-xwiki-tab__breadcrumb {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-xwiki-tab__date {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	white-space: nowrap;
}

.cn-xwiki-tab__excerpt {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}
</style>
