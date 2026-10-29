<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-kb-search-widget" :class="{ 'cn-kb-search-widget--board': isBoard }">
		<div class="cn-kb-search-widget__search">
			<NcTextField
				:modelValue="term"
				:label="searchLabel"
				:labelVisible="!isBoard"
				:placeholder="isBoard ? placeholder : undefined"
				type="search"
				@update:modelValue="onTermInput">
				<template v-if="isBoard" #icon>
					<Magnify :size="16" />
				</template>
			</NcTextField>
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
					:target="externalOpen ? '_blank' : '_self'"
					:rel="externalOpen ? 'noopener noreferrer' : null"
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

		<ul v-else-if="showSuggestions" class="cn-kb-search-widget__results cn-kb-search-widget__suggestions">
			<li
				v-for="(article, idx) in suggestions"
				:key="article.id || article.url || idx"
				class="cn-kb-search-widget__result">
				<a
					:href="article.url || undefined"
					:target="externalOpen ? '_blank' : '_self'"
					:rel="externalOpen ? 'noopener noreferrer' : null"
					class="cn-kb-search-widget__result-title">
					<BookOpenVariant v-if="isBoard" :size="16" class="cn-kb-search-widget__result-icon" />
					{{ article.title || article.url }}
				</a>
			</li>
		</ul>

		<div v-else-if="hasQuery" class="cn-kb-search-widget__empty">
			{{ emptyLabel }}
		</div>

		<div v-else-if="!isBoard && !content.suggestFrom" class="cn-kb-search-widget__hint">
			{{ hintLabel }}
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcTextField } from '@nextcloud/vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { BUILT_IN_KB_PROVIDERS, normaliseKbResults, resolveKbProvider } from '../../utils/kbSearchProviders.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedTokens, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/**
 * CnKbSearchWidget — a summary-driven knowledge-base search widget.
 *
 * Runs the search through a PLUGGABLE PROVIDER (#91 Wave 3) resolved from
 * `content.provider` against the library's built-in providers merged with
 * the consumer registry CnAppRoot provides (`cnKbSearchProviders` — the
 * formatter-registry pattern). The built-in `default` provider GETs the
 * configured `endpoint` (default the OpenRegister xWiki leaf
 * `/apps/openregister/api/integrations/xwiki/search`); an app talking to a
 * bespoke KB (the xwiki proxy, an external API) registers its own provider
 * key — the xwiki client stays app-side, the library ships only the seam.
 *
 * The query is driven two ways:
 *  1. The agent typing in the search box (debounced), and
 *  2. — the reason this is a WIDGET, not a plain box — a page-level workspace
 *     context key (`content.bindTo`, default `activeSummary`) that another
 *     widget writes. When a widget sets that key, this widget debounces a
 *     search on its text automatically. Manual typing overrides the bound
 *     text. The interaction form does not write `activeSummary`.
 *
 * Degrades gracefully: a rejected provider search (503 / network error /
 * unavailable backend) renders the unavailable-fallback text (never throws),
 * so a missing or unconfigured backend simply shows a fallback message rather
 * than breaking the page.
 *
 * Resolved by its registry type key `kb-search`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   provider: 'xwiki',           // registry key (default 'default')
 *   space: 'Support',            // provider-specific filters
 *   tags: ['printer', 'network'],
 *   endpoint: '/apps/openregister/api/integrations/xwiki/search', // default provider only
 *   queryParam: 'q',
 *   bindTo: 'activeSummary',
 *   minChars: 3,
 *   limit: 8,
 *   externalOpen: true,          // result links open in a new tab
 *   unavailableFallback: 'Knowledge base is not configured.',
 * }
 * ```
 */
export default {
	name: 'CnKbSearchWidget',

	components: { BookOpenVariant, Magnify, NcTextField },

	inject: {
		/**
		 * Page-level workspace context (reactive `ref({})`) provided by
		 * CnDashboardPage. The widget watches `content.bindTo` (default
		 * `activeSummary`) on it to auto-search as another widget writes the
		 * active summary. Null on pages that don't provide one (manual search
		 * still works).
		 */
		cnWorkspaceContext: { default: null },
		/**
		 * Pluggable KB-search provider registry (built-ins + consumer),
		 * provided by CnAppRoot as `cnKbSearchProviders`. The widget resolves
		 * `content.provider` against it. Falls back to the library built-ins
		 * (`{ default }`) when no CnAppRoot ancestor provides one.
		 */
		cnKbSearchProviders: { default: () => BUILT_IN_KB_PROVIDERS },
		cnLook: { default: 'nextcloud' },
		/** The page's record (`{ objectId, object }`), for `suggestFrom`. */
		cnObjectContext: { default: null },
		/** The records the detail page reads beside its record, for `@context.<name>` in `suggestFrom`. */
		cnDetailVisibilityRows: { default: null },
		/** The host app's translate, for the manifest-written placeholder. */
		cnTranslate: { default: null },
	},

	props: {
		/**
		 * Persisted configuration blob.
		 *
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
			suggestions: [],
		}
	},

	computed: {
		/** The workspace context bag, unwrapped (or null). */
		workspaceCtx() {
			const c = this.cnWorkspaceContext
			if (!c) {
				return null
			}
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},

		/** Workspace key this widget follows (default `activeSummary`). */
		bindKey() {
			return this.content.bindTo || 'activeSummary'
		},

		/** The summary text the page wrote, if any. */
		boundSummary() {
			const ws = this.workspaceCtx
			if (!ws) {
				return ''
			}
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
		/**
		 * Whether the suggestions show: there are some and nothing is typed.
		 *
		 * @return {boolean}
		 */
		showSuggestions() {
			return this.suggestions.length > 0 && this.term.trim() === ''
		},

		/**
		 * The page's record and its id, as the filter tokens read them.
		 *
		 * @return {object}
		 */
		tokenCtx() {
			const unwrap = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)
			const injected = unwrap(this.cnObjectContext) || {}
			return { ...injected, workspace: this.workspaceCtx || {} }
		},

		boundLabel() {
			if (this.manual || !this.boundSummary) {
				return ''
			}
			return t('nextcloud-vue', 'Suggested from the active summary')
		},

		/** The resolved provider (content.provider → registry → default). */
		resolvedProvider() {
			return resolveKbProvider(this.content.provider, this.cnKbSearchProviders || BUILT_IN_KB_PROVIDERS)
		},

		/**
		 * Whether result links open in a new tab: the provider's `externalOpen`
		 * default, overridden by an explicit `content.externalOpen`.
		 *
		 * @return {boolean}
		 */
		externalOpen() {
			if (typeof this.content.externalOpen === 'boolean') {
				return this.content.externalOpen
			}
			return Boolean(this.resolvedProvider && this.resolvedProvider.externalOpen)
		},

		/**
		 * Whether the page takes the board look: the field then carries a
		 * placeholder and a search icon, its label is read by assistive
		 * technology only, and the typing hint is left out.
		 *
		 * @return {boolean}
		 */
		isBoard() {
			const look = this.cnLook && typeof this.cnLook === 'object' && 'value' in this.cnLook ? this.cnLook.value : this.cnLook
			return normalizeLook(look) === 'board'
		},

		/**
		 * The placeholder in the board look (`content.placeholder`, else the
		 * label). The manifest writes it, so it reads through the host app's
		 * catalogue.
		 *
		 * @return {string}
		 * @spec openspec/changes/kb-search-board-rows/specs/kb-search-board-rows/spec.md#requirement-the-manifest-placeholder-reads-in-the-readers-language
		 */
		placeholder() {
			const written = this.content.placeholder
			if (typeof written !== 'string' || written === '') {
				return this.searchLabel
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(written) : written
		},

		searchLabel() {
			return t('nextcloud-vue', 'Search the knowledge base')
		},

		searchingLabel() {
			return t('nextcloud-vue', 'Searching…')
		},

		unavailableLabel() {
			return this.content.unavailableFallback || t('nextcloud-vue', 'Knowledge base unavailable')
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
			if (this.manual) {
				return
			}
			this.scheduleSearch(val || '')
		},
	},

	mounted() {
		if (this.content.suggestFrom) {
			this.loadSuggestions()
		}
	},

	beforeUnmount() {
		if (this.debounceHandle) {
			clearTimeout(this.debounceHandle)
		}
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
			if (this.debounceHandle) {
				clearTimeout(this.debounceHandle)
			}
			if (text.trim().length < this.minChars) {
				this.results = []
				this.unavailable = false
				return
			}
			this.debounceHandle = setTimeout(() => this.runSearch(), 300)
		},

		/**
		 * Execute the search through the resolved provider (#91 Wave 3),
		 * passing the widget config (endpoint / queryParam / space / tags /
		 * limit). Every failure (rejected provider search, unavailable
		 * backend) degrades to the unavailable-fallback state — never throws.
		 *
		 * @return {Promise<void>}
		 */
		/**
		 * The text to suggest articles for (`content.suggestFrom`): a token
		 * path into the page record (`@object.<path>`, `@context.<name>.<path>`),
		 * or `{ register, schema, filter?, sort?, path }`, the field at `path`
		 * of the first record that query finds.
		 *
		 * @return {Promise<string>} The text, or '' when there is none.
		 */
		async suggestionText() {
			const from = this.content.suggestFrom
			if (typeof from === 'string') {
				const unwrap = (c) => (c && typeof c === 'object' && 'value' in c ? c.value : c)
				const match = /^@(object|context)\.(.+)$/.exec(from)
				if (!match) {
					return ''
				}
				const source = match[1] === 'object' ? this.tokenCtx.object : unwrap(this.cnDetailVisibilityRows)
				const value = source ? readPath(source, match[2]) : ''
				return typeof value === 'string' ? value.trim() : ''
			}
			if (!from || typeof from !== 'object' || !from.register || !from.schema || !from.path) {
				return ''
			}
			const filter = resolveFilterTokens(from.filter || {}, this.tokenCtx)
			if (hasUnresolvedTokens(filter)) {
				return ''
			}
			const params = {}
			for (const [key, value] of Object.entries(filter)) {
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					for (const [op, operand] of Object.entries(value)) {
						params[`${key}[${op}]`] = operand
					}
				} else if (value !== '' && value !== null && value !== undefined) {
					params[key] = value
				}
			}
			if (from.sort && typeof from.sort.field === 'string' && from.sort.field !== '') {
				params[`_order[${from.sort.field}]`] = from.sort.dir === 'desc' ? 'desc' : 'asc'
			}
			params._limit = 1
			const [{ default: axios }, { generateUrl }] = await Promise.all([import('@nextcloud/axios'), import('@nextcloud/router')])
			const { data } = await axios.get(generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: from.register, schema: from.schema }), { params })
			const first = data && Array.isArray(data.results) ? data.results[0] : null
			const value = first ? readPath(first, from.path) : ''
			return typeof value === 'string' ? value.trim() : ''
		},

		/**
		 * Search the knowledge base for the record's text and keep the best
		 * matches (`content.suggestLimit`, 2 by default). Nothing shows when
		 * there is no text, no match or no knowledge base.
		 *
		 * @return {Promise<void>}
		 */
		async loadSuggestions() {
			const provider = this.resolvedProvider
			try {
				const text = await this.suggestionText()
				if (text === '' || !provider || typeof provider.search !== 'function') {
					this.suggestions = []
					return
				}
				const limit = typeof this.content.suggestLimit === 'number' ? this.content.suggestLimit : 2
				const articles = await provider.search(text, {
					endpoint: this.content.endpoint,
					queryParam: this.content.queryParam,
					space: this.content.space,
					tags: this.content.tags,
					limit,
				})
				this.suggestions = this.normalise(articles).slice(0, limit)
			} catch {
				this.suggestions = []
			}
		},

		async runSearch() {
			const provider = this.resolvedProvider
			if (!provider || typeof provider.search !== 'function') {
				this.results = []
				this.unavailable = true
				return
			}
			this.loading = true
			this.unavailable = false
			try {
				const articles = await provider.search(this.term.trim(), {
					endpoint: this.content.endpoint,
					queryParam: this.content.queryParam,
					space: this.content.space,
					tags: this.content.tags,
					limit: typeof this.content.limit === 'number' ? this.content.limit : 8,
				})
				this.results = this.normalise(articles)
			} catch {
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
		 * Delegates to the shared `normaliseKbResults` helper (also used by the
		 * built-in default provider), so a provider MAY return a raw response
		 * body and still normalise here.
		 *
		 * @param {object|Array<object>|null} data The raw provider result.
		 * @return {Array<object>} The article list (possibly empty).
		 */
		normalise(data) {
			return normaliseKbResults(data)
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

/* A board suggestion is a link row, its book icon before the title
   (PqKlant / PqOrganisatie Kennisbank), not a bordered card. */
.cn-kb-search-widget--board .cn-kb-search-widget__suggestions .cn-kb-search-widget__result {
	border: 0;
	border-radius: 0;
	padding: 0;
	background: transparent;
}

.cn-kb-search-widget--board .cn-kb-search-widget__suggestions .cn-kb-search-widget__result-title {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--color-primary-element);
	font-size: 14px;
	font-weight: 400;
	text-decoration: underline;
}

.cn-kb-search-widget--board .cn-kb-search-widget__result-icon {
	flex: none;
}

.cn-kb-search-widget__result-snippet {
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	margin-top: 4px;
}
</style>
