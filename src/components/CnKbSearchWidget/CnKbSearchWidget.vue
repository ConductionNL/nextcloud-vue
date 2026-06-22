<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-kb-search-widget">
		<div class="cn-kb-search-widget__search">
			<NcTextField
				:value="term"
				:label="searchLabel"
				@update:value="onTermInput" />
		</div>

		<p v-if="boundLabel" class="cn-kb-search-widget__bound">
			{{ boundLabel }}
		</p>

		<div v-if="loading" class="cn-kb-search-widget__status">
			{{ searchingLabel }}
		</div>

		<div v-else-if="unavailable" class="cn-kb-search-widget__status">
			{{ unavailableLabel }}
		</div>

		<ul v-else-if="results.length > 0" class="cn-kb-search-widget__results">
			<li
				v-for="(article, idx) in results"
				:key="article.id || article.url || idx"
				class="cn-kb-search-widget__result">
				<a
					v-if="article.url"
					:href="article.url"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-kb-search-widget__result-title">
					{{ article.title || article.url }}
				</a>
				<span v-else class="cn-kb-search-widget__result-title">
					{{ article.title || '—' }}
				</span>
				<div v-if="snippet(article)" class="cn-kb-search-widget__result-snippet">
					{{ snippet(article) }}
				</div>
			</li>
		</ul>

		<div v-else-if="hasQuery" class="cn-kb-search-widget__empty">
			{{ emptyLabel }}
		</div>

		<div v-else class="cn-kb-search-widget__hint">
			{{ hintLabel }}
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField } from '@nextcloud/vue'

/**
 * CnKbSearchWidget — a summary-driven knowledge-base search widget.
 *
 * Queries a configurable HTTP endpoint (default the OpenRegister xWiki leaf
 * `/apps/openregister/api/integrations/xwiki/search`) and renders the returned
 * articles as a clickable list. The query is driven two ways:
 *  1. The agent typing in the search box (debounced), and
 *  2. — the reason this is a WIDGET, not a plain box — a page-level workspace
 *     context key (`content.bindTo`, default `activeSummary`) that another
 *     widget writes. When an interaction form sets `activeSummary`, this widget
 *     debounces a search on that text automatically, so the knowledge base
 *     follows the live conversation. Manual typing overrides the bound text.
 *
 * Degrades gracefully: a 503 / network error / empty body renders the
 * unavailable-or-empty state (never throws), so a missing or unconfigured
 * xWiki backend simply shows "Knowledge base unavailable" rather than breaking
 * the page.
 *
 * Resolved by its registry type key `kb-search`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   endpoint: '/apps/openregister/api/integrations/xwiki/search',
 *   queryParam: 'q',
 *   bindTo: 'activeSummary',
 *   minChars: 3,
 *   limit: 8,
 * }
 * ```
 */
export default {
	name: 'CnKbSearchWidget',

	components: { NcTextField },

	inject: {
		/**
		 * Page-level workspace context (reactive `ref({})`) provided by
		 * CnDashboardPage. The widget watches `content.bindTo` (default
		 * `activeSummary`) on it to auto-search as another widget writes the
		 * active summary. Null on pages that don't provide one (manual search
		 * still works).
		 */
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * Persisted configuration blob.
		 * @type {{endpoint?: string, queryParam?: string, bindTo?: string, minChars?: number, limit?: number}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			term: '',
			results: [],
			loading: false,
			unavailable: false,
			debounceHandle: null,
			// Tracks whether the agent typed manually — manual input wins over the
			// bound summary until the box is cleared.
			manual: false,
		}
	},

	computed: {
		/** The workspace context bag, unwrapped (or null). */
		workspaceCtx() {
			const c = this.cnWorkspaceContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/** Workspace key this widget follows (default `activeSummary`). */
		bindKey() {
			return this.content.bindTo || 'activeSummary'
		},
		/** The summary text the page wrote, if any. */
		boundSummary() {
			const ws = this.workspaceCtx
			if (!ws) return ''
			const v = ws[this.bindKey]
			return typeof v === 'string' ? v : ''
		},
		/** Minimum characters before a search fires. */
		minChars() {
			return typeof this.content.minChars === 'number' ? this.content.minChars : 3
		},
		/** Whether there is a query long enough to have searched. */
		hasQuery() {
			return this.term.trim().length >= this.minChars
		},
		/** Label noting the search is following the live summary. */
		boundLabel() {
			if (this.manual || !this.boundSummary) return ''
			return t('nextcloud-vue', 'Suggested from the active summary')
		},
		searchLabel() {
			return t('nextcloud-vue', 'Search the knowledge base')
		},
		searchingLabel() {
			return t('nextcloud-vue', 'Searching…')
		},
		unavailableLabel() {
			return t('nextcloud-vue', 'Knowledge base unavailable')
		},
		emptyLabel() {
			return t('nextcloud-vue', 'No articles found')
		},
		hintLabel() {
			return t('nextcloud-vue', 'Type to search, or fill in a summary to get suggestions.')
		},
	},

	watch: {
		/**
		 * Auto-search when the bound workspace summary changes (unless the agent
		 * is typing manually).
		 *
		 * @param {string} val The new summary text.
		 */
		boundSummary(val) {
			if (this.manual) return
			this.scheduleSearch(val || '')
		},
	},

	beforeDestroy() {
		if (this.debounceHandle) clearTimeout(this.debounceHandle)
	},

	methods: {
		/**
		 * Handle manual input — marks the widget as agent-driven and schedules a
		 * search. Clearing the box hands control back to the bound summary.
		 *
		 * @param {string} value The new input value.
		 */
		onTermInput(value) {
			const next = value || ''
			this.manual = next.trim().length > 0
			this.scheduleSearch(next)
		},

		/**
		 * Debounce (300ms) a search on the given text. Short text clears results.
		 *
		 * @param {string} text The query text.
		 */
		scheduleSearch(text) {
			this.term = text
			if (this.debounceHandle) clearTimeout(this.debounceHandle)
			if (text.trim().length < this.minChars) {
				this.results = []
				this.unavailable = false
				return
			}
			this.debounceHandle = setTimeout(() => this.runSearch(), 300)
		},

		/**
		 * Execute the search against the configured endpoint. Every failure
		 * (network, 503, malformed body) degrades to the unavailable/empty state.
		 *
		 * @return {Promise<void>}
		 */
		async runSearch() {
			const endpoint = this.content.endpoint || '/apps/openregister/api/integrations/xwiki/search'
			const queryParam = this.content.queryParam || 'q'
			const limit = typeof this.content.limit === 'number' ? this.content.limit : 8
			this.loading = true
			this.unavailable = false
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const params = { [queryParam]: this.term.trim(), limit }
				const res = await axios.get(generateUrl(endpoint), { params })
				this.results = this.normalise(res && res.data)
			} catch (e) {
				// 503 / network / disabled backend — show the unavailable state.
				this.results = []
				this.unavailable = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * Normalise an assortment of likely response shapes into an article list:
		 * an array, `{ results: [] }`, `{ items: [] }`, or `{ articles: [] }`.
		 *
		 * @param {*} data The raw response body.
		 * @return {Array<object>} The article list (possibly empty).
		 */
		normalise(data) {
			if (Array.isArray(data)) return data
			if (data && Array.isArray(data.results)) return data.results
			if (data && Array.isArray(data.items)) return data.items
			if (data && Array.isArray(data.articles)) return data.articles
			return []
		},

		/**
		 * A short text snippet for an article (summary/body/excerpt), trimmed.
		 *
		 * @param {object} article The article object.
		 * @return {string} A ≤140-char snippet.
		 */
		snippet(article) {
			const src = (article.summary || article.excerpt || article.body || '').toString()
			const clean = src.replace(/\s+/g, ' ').trim()
			return clean.length <= 140 ? clean : clean.slice(0, 137) + '…'
		},
	},
}
</script>

<style scoped>
.cn-kb-search-widget {
	display: flex;
	flex-direction: column;
	gap: 10px;
	width: 100%;
}

.cn-kb-search-widget__bound,
.cn-kb-search-widget__status,
.cn-kb-search-widget__empty,
.cn-kb-search-widget__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 0;
}

.cn-kb-search-widget__bound {
	font-style: italic;
}

.cn-kb-search-widget__results {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-kb-search-widget__result {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px 10px;
	background: var(--color-main-background);
}

.cn-kb-search-widget__result-title {
	font-weight: 600;
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-kb-search-widget__result-title:hover {
	color: var(--color-primary-element);
}

.cn-kb-search-widget__result-snippet {
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	margin-top: 4px;
}
</style>
