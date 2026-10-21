<template>
	<div class="cn-search-page" data-testid="cn-search-page">
		<header class="cn-search-page__header">
			<h2 v-if="title" class="cn-search-page__title" :lang="langOf(title)">
				{{ shown(title) }}
			</h2>
			<form class="cn-search-page__query" @submit.prevent="onQuerySubmit">
				<input
					v-model="localQuery"
					type="search"
					:placeholder="placeholder"
					:aria-label="ariaLabel"
					class="cn-search-page__input"
					data-testid="cn-search-page-input"
					@input="onQueryInput">
				<button type="submit" class="cn-search-page__submit">
					{{ searchLabel }}
				</button>
			</form>
		</header>

		<div class="cn-search-page__body">
			<!-- Facet sidebar. -->
			<aside v-if="shownFacets.length > 0" class="cn-search-page__facets" data-testid="cn-search-page-facets">
				<h3 class="cn-search-page__facets-title">
					{{ facetsTitle }}
				</h3>
				<div v-for="facet in shownFacets" :key="facet.key" class="cn-search-page__facet">
					<h4 class="cn-search-page__facet-title">
						{{ shown(facet.label) || facet.key }}
					</h4>
					<ul class="cn-search-page__facet-options">
						<li v-for="opt in facet.options"
							:key="opt.value"
							class="cn-search-page__facet-option">
							<label>
								<input
									:model-value="isFacetActive(facet.key, opt.value)"
									:type="facet.multiple ? 'checkbox' : 'radio'"
									:name="'facet-' + facet.key"
									@change="toggleFacet(facet.key, opt.value, $event.target.checked, facet.multiple)">
								<span>{{ shown(opt.label) || opt.value }}</span>
								<small v-if="typeof opt.count === 'number'" class="cn-search-page__facet-count">{{ opt.count }}</small>
							</label>
						</li>
					</ul>
				</div>
				<button v-if="hasActiveFacets"
					type="button"
					class="cn-search-page__clear-facets"
					@click="clearFacets">
					{{ clearFacetsLabel }}
				</button>
			</aside>

			<!-- Results pane. -->
			<section class="cn-search-page__results" data-testid="cn-search-page-results">
				<div v-if="shownLoading" class="cn-search-page__loading">
					{{ loadingLabel }}
				</div>
				<ol v-else-if="shownResults.length > 0" class="cn-search-page__list">
					<li v-for="result in shownResults"
						:key="result.id || (result.schema + ':' + (result.title || ''))"
						class="cn-search-page__result"
						:data-result-id="result.id"
						@click="onResultClick(result)">
						<!-- @slot result Per-result body. Scope:
						     { result }. Default renders title +
						     snippet + schema badge. -->
						<slot name="result" :result="result">
							<div class="cn-search-page__result-head">
								<span class="cn-search-page__result-title">{{ result.title || result.id }}</span>
								<span v-if="result.schema" class="cn-search-page__result-badge">{{ result.schema }}</span>
							</div>
							<p v-if="result.snippet" class="cn-search-page__result-snippet">
								{{ result.snippet }}
							</p>
							<small v-if="result.subtitle" class="cn-search-page__result-subtitle">{{ result.subtitle }}</small>
						</slot>
					</li>
				</ol>
				<p v-else-if="hasSearched" class="cn-search-page__empty">
					{{ emptyLabel }}
				</p>
				<p v-else-if="idleLabel" class="cn-search-page__idle">
					{{ idleLabel }}
				</p>

				<div v-if="shownTotal > 0 && shownTotal > shownResults.length" class="cn-search-page__more">
					{{ totalCountLabel(shownTotal, shownResults.length) }}
				</div>
			</section>
		</div>
	</div>
</template>

<script>
import { labelLang } from '../../utils/manifestTranslate.js'
/**
 * CnSearchPage — Search surface with a query input, a facet
 * sidebar, and a results list. Mounted by CnPageRenderer when a
 * manifest page declares `type: 'search'`.
 *
 * The component owns the UI; consumers wire the actual search +
 * facet computation in `@query-change` and `@facets-change` (or use
 * the single `@search` event that fires on both). Cross-schema
 * search, full-text indexing, and facet aggregation are all
 * consumer-side.
 *
 * ```vue
 * <CnSearchPage
 *   title="Search"
 *   :query="q"
 *   :facets="facets"
 *   :active-facets="activeFacets"
 *   :results="results"
 *   :total-count="total"
 *   :loading="loading"
 *   @search="onSearch" />
 * ```
 */
export default {
	name: 'CnSearchPage',

	inject: {
		/** The label lookup from CnAppRoot, so manifest labels show in the user's language. */
		cnTranslate: { default: null },
	},

	props: {
		/** Optional title rendered above the query input. */
		title: { type: String, default: 'Search' },
		/**
		 * Controlled query string (v-model style). Falls back to
		 * the local state when omitted; consumers can read the
		 * current value via `@query-change`.
		 *
		 * @type {string}
		 */
		query: { type: String, default: '' },
		/** Query input placeholder. */
		placeholder: { type: String, default: 'Search…' },
		/** Query input aria-label. */
		ariaLabel: { type: String, default: 'Search input' },
		/** Submit-button label. */
		searchLabel: { type: String, default: 'Search' },
		/**
		 * Facet declarations. Each entry: `{ key, label?,
		 * options: [{value, label?, count?}], multiple? }`.
		 * Empty array hides the facet sidebar.
		 *
		 * @type {Array<{key:string,label?:string,options:Array,multiple?:boolean}>}
		 */
		facets: { type: Array, default: () => [] },
		/**
		 * Controlled active-facets map (`{facetKey: [value, ...]}`).
		 * Consumers persist this + push updates back; the widget
		 * emits `@facets-change` with the new map.
		 *
		 * @type {Record<string,Array<string>>}
		 */
		activeFacets: { type: Object, default: () => ({}) },
		/**
		 * Result entries. Each entry rendered through the `#result`
		 * slot or the default `{title, snippet, schema, subtitle}`
		 * shape.
		 *
		 * @type {Array<object>}
		 */
		results: { type: Array, default: () => [] },
		/** Total count of matching results (drives the "more" footer). */
		totalCount: { type: Number, default: 0 },
		/** Show the loading state. */
		loading: { type: Boolean, default: false },
		/** Empty-state when a search ran but matched nothing. */
		emptyLabel: { type: String, default: 'No matches found.' },
		/** Idle text shown before any search has run. Empty hides. */
		idleLabel: { type: String, default: 'Start typing to search.' },
		/** Loading-state text. */
		loadingLabel: { type: String, default: 'Searching…' },
		/** Facets sidebar header. */
		facetsTitle: { type: String, default: 'Filters' },
		/** Clear-facets button label. */
		clearFacetsLabel: { type: String, default: 'Clear filters' },
		/**
		 * Formatter for the "Showing X of Y" footer. Receives total
		 * + shown counts and returns the rendered string.
		 *
		 * @type {(total:number, shown:number) => string}
		 */
		totalCountLabel: {
			type: Function,
			default: (total, shown) => `Showing ${shown} of ${total} results.`,
		},

		/**
		 * The lists the page searches itself (manifest `config.sources`). Each
		 * `{ id?, label, register, schema, route?, titleField?, snippetField?,
		 * limit? }`: one request per list with `_search`, results in the order
		 * of the lists, and the lists offered as a Type filter with their
		 * totals. `route` names the page a result opens, with its id. Empty
		 * keeps the page controlled: `results` and `facets` come from props.
		 *
		 * @type {Array<object>}
		 */
		sources: { type: Array, default: () => [] },
		/** The Type filter's heading when the page searches `sources`. */
		typeLabel: { type: String, default: 'Type' },
	},

	emits: ['facets-change', 'query-change', 'result-click', 'search', 'update:query'],
	data() {
		return {
			localQuery: this.query,
			hasSearched: false,
			// What a `sources` search found, per list, and the filter it keeps.
			sourceRows: {},
			sourceTotals: {},
			sourceFacets: {},
			sourceLoading: false,
			sourceRun: 0,
		}
	},

	computed: {
		/** @return {boolean} Whether the page searches its own `sources`. */
		searchesSources() {
			return Array.isArray(this.sources) && this.sources.some((source) => source && source.register && source.schema)
		},

		/** @return {Array<object>} The lists searched, each with its key. */
		sourceList() {
			return (this.sources || [])
				.filter((source) => source && source.register && source.schema)
				.map((source) => ({ ...source, key: source.id || source.schema }))
		},

		/** @return {Record<string, Array<string>>} The active filter, the page's own when it searches `sources`. */
		effectiveFacets() {
			return this.searchesSources ? this.sourceFacets : (this.activeFacets || {})
		},

		/** @return {Array<object>} The facets shown: the Type filter of the lists, else the `facets` prop. */
		shownFacets() {
			if (!this.searchesSources) {
				return this.facets
			}
			if (!this.hasSearched) {
				return []
			}
			return [{
				key: 'type',
				label: this.typeLabel,
				multiple: true,
				options: this.sourceList.map((source) => ({
					value: source.key,
					label: source.label,
					...(typeof this.sourceTotals[source.key] === 'number' ? { count: this.sourceTotals[source.key] } : {}),
				})),
			}]
		},

		/** @return {Array<object>} The results shown. */
		shownResults() {
			if (!this.searchesSources) {
				return this.results
			}
			return this.activeSources.flatMap((source) => this.sourceRows[source.key] || [])
		},

		/** @return {number} The total of the results shown. */
		shownTotal() {
			if (!this.searchesSources) {
				return this.totalCount
			}
			return this.activeSources.reduce((sum, source) => sum + (this.sourceTotals[source.key] || 0), 0)
		},

		/** @return {boolean} Whether a search is running. */
		shownLoading() {
			return this.searchesSources ? this.sourceLoading : this.loading
		},

		/** @return {Array<object>} The lists the Type filter leaves in, all when none is picked. */
		activeSources() {
			const picked = Array.isArray(this.effectiveFacets.type) ? this.effectiveFacets.type : []
			return picked.length === 0 ? this.sourceList : this.sourceList.filter((source) => picked.includes(source.key))
		},

		/**
		 * Whether any facet has at least one active value.
		 *
		 * @return {boolean}
		 */
		hasActiveFacets() {
			for (const k of Object.keys(this.effectiveFacets)) {
				if (Array.isArray(this.effectiveFacets[k]) && this.effectiveFacets[k].length > 0) {
					return true
				}
			}
			return false
		},
	},

	watch: {
		query(next) {
			if (next !== this.localQuery) {
				this.localQuery = next
			}
		},
	},

	methods: {
		/**
		 * A manifest label through the injected lookup, or as written.
		 *
		 * @param {string} text The label as written.
		 * @return {string} The label in the user's language.
		 */
		shown(text) {
			return typeof this.cnTranslate === 'function' && typeof text === 'string' && text !== '' ? this.cnTranslate(text) : text
		},

		/**
		 * The `lang` of a label that fell back to its written text in another language.
		 *
		 * @param {string} text The label as written.
		 * @return {string|undefined} The source language, or undefined.
		 */
		langOf(text) {
			return labelLang(this.cnTranslate, text) || undefined
		},

		/**
		 * Whether a (facetKey, value) is currently active.
		 *
		 * @param {string} key Facet key.
		 * @param {string} value Option value.
		 * @return {boolean}
		 */
		isFacetActive(key, value) {
			const arr = this.effectiveFacets[key]
			return Array.isArray(arr) && arr.includes(value)
		},

		/**
		 * Toggle a facet option on/off and emit the new map.
		 *
		 * @param {string} key Facet key.
		 * @param {string} value Option value.
		 * @param {boolean} checked Checkbox state (radios pass true).
		 * @param {boolean} multiple Whether the facet allows multi-select.
		 * @return {void}
		 */
		toggleFacet(key, value, checked, multiple) {
			const next = { ...this.effectiveFacets }
			if (!multiple) {
				next[key] = checked ? [value] : []
			} else {
				const cur = Array.isArray(next[key]) ? [...next[key]] : []
				const idx = cur.indexOf(value)
				if (checked && idx < 0) {
					cur.push(value)
				} else if (!checked && idx >= 0) {
					cur.splice(idx, 1)
				}
				next[key] = cur
			}
			this.emitFacetsChange(next)
		},

		/**
		 * Clear every facet.
		 *
		 * @return {void}
		 */
		clearFacets() {
			this.emitFacetsChange({})
		},

		emitFacetsChange(next) {
			/**
			 * @event facets-change Emitted on any facet toggle / clear.
			 * @type {Record<string,Array<string>>}
			 */
			this.$emit('facets-change', next)
			if (this.searchesSources) {
				this.sourceFacets = next
			}
			this.emitSearch()
		},

		/**
		 * Submit-button handler — propagates the latest query.
		 *
		 * @return {void}
		 */
		onQuerySubmit() {
			this.emitQueryChange()
			this.emitSearch()
		},

		/**
		 * Live query-input handler — emits each keystroke (consumers
		 * are responsible for debouncing).
		 *
		 * @return {void}
		 */
		onQueryInput() {
			this.emitQueryChange()
		},

		emitQueryChange() {
			/**
			 * @event query-change Emitted on every query mutation.
			 * @type {string}
			 */
			this.$emit('query-change', this.localQuery)
			/** v-model-friendly alias. */
			this.$emit('update:query', this.localQuery)
		},

		emitSearch() {
			this.hasSearched = true
			/**
			 * @event search Emitted on Submit or facet change.
			 *   Combines query + active facets.
			 * @type {{ query: string, facets: Record<string,Array<string>> }}
			 */
			this.$emit('search', { query: this.localQuery, facets: { ...this.effectiveFacets } })
			if (this.searchesSources) {
				this.searchSources()
			}
		},

		/**
		 * Search the lists the Type filter leaves in, one request each, and
		 * keep what each found. A search started later wins over this one.
		 *
		 * @return {Promise<void>}
		 */
		async searchSources() {
			const run = this.sourceRun + 1
			this.sourceRun = run
			this.sourceLoading = true
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			const found = await Promise.all(this.activeSources.map(async (source) => {
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: source.register, schema: source.schema })
				const limit = Number(source.limit) > 0 ? Math.floor(Number(source.limit)) : 10
				try {
					const response = await axios.get(url, { params: { _search: this.localQuery, _limit: limit } })
					const data = response && response.data ? response.data : {}
					const rows = Array.isArray(data.results) ? data.results : []
					return { source, rows, total: typeof data.total === 'number' ? data.total : rows.length }
				} catch (e) {
					// eslint-disable-next-line no-console
					console.warn('[CnSearchPage] could not search', source.schema, e)
					return { source, rows: [], total: 0 }
				}
			}))
			if (run !== this.sourceRun) {
				return
			}
			const rows = { ...this.sourceRows }
			const totals = { ...this.sourceTotals }
			for (const { source, rows: list, total } of found) {
				rows[source.key] = list.map((row) => this.resultOf(source, row))
				totals[source.key] = total
			}
			this.sourceRows = rows
			this.sourceTotals = totals
			this.sourceLoading = false
		},

		/**
		 * One found object as a result row.
		 *
		 * @param {object} source The list it came from.
		 * @param {object} row The object.
		 * @return {object} `{ id, title, snippet, schema, route }`.
		 */
		resultOf(source, row) {
			const id = row && (row.id || row['@self']?.id)
			const titleField = source.titleField || ''
			const title = (titleField && row[titleField]) || row.title || row.name || id
			const snippet = source.snippetField ? row[source.snippetField] : undefined
			return {
				id,
				title: typeof title === 'string' ? title : String(title ?? ''),
				...(typeof snippet === 'string' && snippet !== '' ? { snippet } : {}),
				schema: this.shown(source.label) || source.schema,
				route: source.route || '',
			}
		},

		/**
		 * Forward a result click.
		 *
		 * @param {object} result The clicked result.
		 * @return {void}
		 */
		onResultClick(result) {
			/**
			 * @event result-click Emitted on result-row click.
			 * @type {object}
			 */
			this.$emit('result-click', result)
			if (this.searchesSources && result && result.route && result.id && this.$router) {
				this.$router.push({ name: result.route, params: { id: result.id } })
			}
		},
	},
}
</script>

<style scoped>
.cn-search-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px;
}

/* Reserve room for NcAppNavigationToggle (matches CnPageRenderer / CnPageHeader). */
.cn-search-page__header {
	padding-inline-start: 56px;
}

.cn-search-page__title {
	margin: 0 0 8px;
	font-size: 1.4em;
}

.cn-search-page__query {
	display: flex;
	gap: 8px;
}

.cn-search-page__input {
	flex: 1 1 auto;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	font-size: 1em;
}

.cn-search-page__submit {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
	border: none;
	padding: 8px 16px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-search-page__body {
	display: grid;
	grid-template-columns: 240px 1fr;
	gap: 16px;
}

.cn-search-page__body:has(:not(.cn-search-page__facets)) {
	grid-template-columns: 1fr;
}

.cn-search-page__facets {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	background: var(--color-background-hover);
}

.cn-search-page__facets-title {
	margin: 0;
	font-size: 1em;
}

.cn-search-page__facet-title {
	margin: 0 0 4px;
	font-size: 0.9em;
}

.cn-search-page__facet-options {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-search-page__facet-option {
	display: flex;
	gap: 4px;
}

.cn-search-page__facet-option label {
	display: flex;
	gap: 6px;
	align-items: center;
	cursor: pointer;
	font-size: 0.9em;
}

.cn-search-page__facet-count {
	color: var(--color-text-maxcontrast);
}

.cn-search-page__clear-facets {
	background: none;
	border: 1px solid var(--color-border);
	padding: 4px 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
	font-size: 0.85em;
	align-self: flex-start;
}

.cn-search-page__list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-search-page__result {
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: var(--color-main-background);
}

.cn-search-page__result:hover {
	background: var(--color-background-hover);
}

.cn-search-page__result-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
}

.cn-search-page__result-title {
	font-weight: 600;
}

.cn-search-page__result-badge {
	font-size: 0.75em;
	padding: 1px 8px;
	border-radius: 9999px;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.cn-search-page__result-snippet {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-search-page__result-subtitle {
	color: var(--color-text-maxcontrast);
}

.cn-search-page__empty,
.cn-search-page__idle,
.cn-search-page__loading {
	color: var(--color-text-maxcontrast);
	margin: 24px 0;
	text-align: center;
	font-style: italic;
}

.cn-search-page__more {
	margin-top: 12px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}
</style>
