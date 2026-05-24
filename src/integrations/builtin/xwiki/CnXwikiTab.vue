<!--
  CnXwikiTab — bespoke sidebar tab for the `xwiki` integration.

  Replaces the generic CnIntegrationTab for the `xwiki` leaf: renders
  linked XWiki pages with a hierarchical breadcrumb path ("Space / Sub
  / Page") + last-modified hint. Each row deep-links to the page on the
  external XWiki host (target=_blank rel=noopener).

  Talks to the same OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/xwiki`
  served by `OCA\OpenRegister\Service\Integration\Providers\XwikiProvider`
  (storage strategy `external` — routed through `ExternalIntegrationRouter`
  → OpenConnector `xwiki` source → remote XWiki REST API). Provider
  payload shape per `normalizeRow()`:
    { id, reference, title, space, page, breadcrumb, url, content, ... }
  where `breadcrumb` is an array (the UI joins it with " / "), and
  `content` (when present, e.g. on the detail-page surface) is the
  HTML-rendered body — the widget reads the text only, never injects.

  Surface behaviour:
    - Empty state ("No XWiki pages linked yet") when the provider
      returns zero rows.
    - **Unconfigured state**: 503 + cause `openconnector-down` or
      `openconnector-source-missing` → prominent "Configure XWiki
      connection" CTA pointing at OpenConnector's source admin page.
    - **Auth-expired state**: 503 + cause `provider-auth` → "XWiki
      returned 401 — check the OpenConnector source credentials" with
      a Reconnect CTA pointing at OpenConnector.
    - **Upstream-down state**: 503 + cause `upstream-service-down` →
      "XWiki is currently unavailable" + Retry CTA.
    - **Generic-error state**: fetch throws or non-OK non-503 → "Could
      not load XWiki pages" + Retry CTA.
    - Loading state via NcLoadingIcon for the full-tab spin.

  XWiki calls go through OpenConnector → external HTTP, so latency can
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
				type="primary"
				class="cn-xwiki-tab__banner-cta"
				@click="banner.ctaHandler">
				{{ banner.ctaLabel }}
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
			<li
				v-for="page in pages"
				:key="pageKey(page)"
				class="cn-xwiki-tab__row">
				<div class="cn-xwiki-tab__row-header">
					<FileDocumentMultiple :size="20" class="cn-xwiki-tab__row-icon" />
					<a
						:href="pageUrl(page)"
						target="_blank"
						rel="noopener"
						class="cn-xwiki-tab__title">{{ pageTitle(page) }}</a>
				</div>
				<div v-if="breadcrumbLabel(page)" class="cn-xwiki-tab__breadcrumb">
					{{ breadcrumbLabel(page) }}
				</div>
				<div v-if="metaLabel(page)" class="cn-xwiki-tab__meta">
					{{ metaLabel(page) }}
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import FileDocumentMultiple from 'vue-material-design-icons/FileDocumentMultiple.vue'
import { buildHeaders } from '../../../utils/index.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000

/**
 * CnXwikiTab — bespoke sidebar list for the `xwiki` external integration.
 *
 * Renders linked XWiki pages with breadcrumb + last-modified, plus
 * prominent auth/config banners when the OpenConnector source is
 * missing/unhealthy.
 */
export default {
	name: 'CnXwikiTab',

	components: { NcButton, NcLoadingIcon, AlertCircleOutline, FileDocumentMultiple },

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
		/** URL of OpenConnector's sources admin page (deep-link target for the configure CTA). */
		openConnectorSourcesUrl: { type: String, default: '/index.php/apps/openconnector/sources' },
	},

	data() {
		return {
			pages: [],
			loading: false,
			/** One of: 'none' | 'unconfigured' | 'auth' | 'upstream' | 'error'. */
			bannerKind: 'none',
		}
	},

	computed: {
		banner() {
			switch (this.bannerKind) {
			case 'unconfigured':
				return {
					kind: 'unconfigured',
					title: t('nextcloud-vue', 'XWiki connection not configured'),
					message: t('nextcloud-vue', 'Add an XWiki source in OpenConnector with the upstream URL and credentials so OpenRegister can link pages.'),
					ctaLabel: t('nextcloud-vue', 'Configure XWiki connection'),
					ctaHandler: this.openOpenConnector,
				}
			case 'auth':
				return {
					kind: 'auth',
					title: t('nextcloud-vue', 'XWiki authentication failed'),
					message: t('nextcloud-vue', 'XWiki returned 401 — check the OpenConnector source credentials.'),
					ctaLabel: t('nextcloud-vue', 'Reconnect'),
					ctaHandler: this.openOpenConnector,
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
			// Drop the last element (the title) per AC — show only the ancestor path.
			const ancestors = crumb.slice(0, -1)
			if (ancestors.length === 0) {
				// Single-element breadcrumb (root page) — fall back to the space name.
				return String(page.space ?? '')
			}
			return ancestors.map((c) => String(c)).filter((s) => s !== '').join(' / ')
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

		openOpenConnector() {
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
}

.cn-xwiki-tab__row {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-xwiki-tab__row:last-child {
	border-bottom: none;
}

.cn-xwiki-tab__row-header {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-xwiki-tab__row-icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-xwiki-tab__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
}

a.cn-xwiki-tab__title:hover {
	text-decoration: underline;
}

.cn-xwiki-tab__breadcrumb {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-xwiki-tab__meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
	padding-left: 28px;
}
</style>
