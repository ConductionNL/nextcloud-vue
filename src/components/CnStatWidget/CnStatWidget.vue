<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<component
		:is="linkTag"
		class="cn-stat-widget"
		:class="{ 'cn-stat-widget--linked': isLinked }"
		v-bind="linkAttrs">
		<div
			v-if="content.icon"
			class="cn-stat-widget__icon"
			:style="iconCircleStyle">
			<CnWidgetIcon :name="content.icon" :size="24" />
		</div>

		<div class="cn-stat-widget__body">
			<div v-if="content.label" class="cn-stat-widget__label">
				{{ resolvedLabel }}
			</div>

			<div class="cn-stat-widget__value-row">
				<NcLoadingIcon v-if="loading" :size="22" />
				<span v-else-if="error" class="cn-stat-widget__error" :title="error">—</span>
				<span v-else class="cn-stat-widget__value" :style="valueStyle">
					{{ formattedValue }}
				</span>
				<span v-if="!loading && !error && content.caption" class="cn-stat-widget__caption">
					{{ resolvedCaption }}
				</span>
			</div>
		</div>
	</component>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { resolveFilterTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'
import { formatMetricValue, unwrapAppConfig } from '../../utils/formatMetric.js'
import widgetLink from '../../mixins/widgetLink.js'

/**
 * CnStatWidget — an abstract, manifest-configured KPI / single-statistic tile.
 *
 * Reads ONE scalar value from OpenRegister's ad-hoc aggregation endpoint
 * (`/apps/openregister/api/objects/aggregations/{register}/{schema}/value`)
 * given a `source` config (register, schema, metric, field, filter) and renders
 * it with a configurable label, icon, value colour, and number format. Nothing
 * about the data or presentation is hard-coded — every fleet app gets the same
 * editable KPI tile, replacing per-app coded KPI components (ADR-041).
 *
 * The widget is resolved by its registry type key `stat` (see
 * `CnStatWidget/index.js`); apps reference it from a manifest placement, e.g.
 * `{ id, widgetKey: 'stat', type: 'stat', content: { label, source, ... } }`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   label: 'Revenue',
 *   icon: 'Cash',
 *   valueColor: '#0082c9',
 *   format: { style: 'currency', currency: 'EUR', decimals: 0 },
 *   source: { register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', filter: { status: 'won' } },
 * }
 * ```
 */
export default {
	name: 'CnStatWidget',

	components: {
		NcLoadingIcon,
		CnWidgetIcon,
	},

	mixins: [widgetLink],

	inject: {
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage — enables `@objectId` / `@object.<field>`
		 * filter tokens so a detail-page KPI can be scoped to the current
		 * object. Null on dashboards (tokens then pass through unresolved).
		 */
		cnObjectContext: { default: null },
		/**
		 * Page-level workspace context (a reactive `{ <key>: value }` map)
		 * provided by CnDashboardPage. Drives `@page.<param>` / `@workspace.<param>`
		 * tokens in an `endpoint` source's URL / params (e.g. a period selector
		 * the page renders that every endpoint KPI reads). Empty `{}` when no
		 * dashboard ancestor provides one.
		 */
		cnWorkspaceContext: { default: () => ({}) },
		/**
		 * Page-level app config (a reactive `{ <key>: value }` map) provided by
		 * CnDashboardPage / CnDetailPage. Drives `@config.<key>` tokens in an
		 * `endpoint` source's URL / params AND in the `format.currency` /
		 * `format.suffix` / `format.prefix` strings (e.g. the reporting currency
		 * the setup wizard captures). Empty `{}` when no ancestor provides one.
		 */
		cnAppConfig: { default: () => ({}) },
		/**
		 * Translate function provided by CnAppRoot (the host app's
		 * `translate`, scoped to its app id). Applied to the manifest-authored
		 * `content.label` / `content.caption` so a KPI tile renders in the
		 * user's Nextcloud language instead of the raw source string. Defaults
		 * to an identity function so the widget stays usable standalone.
		 *
		 * @type {(key: string) => string}
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's persisted configuration blob. An optional `route`
		 * (vue-router location) or `link` (external href) turns the whole
		 * tile into a click-through target (see the widgetLink mixin).
		 * The `source` resolves the value. Besides the OpenRegister-backed kinds
		 * (plain aggregate / `ratio` / `computed` / `weighted`), an
		 * `{ kind: 'endpoint', url, path?, params? }` source reads an arbitrary
		 * app REST endpoint and extracts the value at the dot-`path` of the
		 * response (default = whole body). The `url` and any string `params`
		 * value interpolate `@page.<param>` / `@workspace.<param>` tokens from the
		 * page-level context (and `@objectId` / `@object.<field>` on a detail
		 * page) — so a page-rendered period selector can drive every endpoint KPI.
		 * @type {{label?: string, icon?: string, iconColor?: string, valueColor?: string, caption?: string, route?: (object|string), link?: string, format?: {style?: string, currency?: string, decimals?: number, prefix?: string, suffix?: string}, source?: {kind?: string, register?: string, schema?: string, metric?: string, field?: string, filter?: object, url?: string, path?: string, params?: object}}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Translate function. Falls back to the injected `cnTranslate`
		 * (itself an identity function by default). Provide explicitly when
		 * mounting CnStatWidget outside a CnAppRoot ancestor.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	data() {
		return {
			value: null,
			loading: false,
			error: '',
		}
	},

	computed: {
		/**
		 * Effective translate function: the explicit `translate` prop when
		 * given, else the injected `cnTranslate` (identity by default).
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},
		/**
		 * The tile label, run through the host translate function so a
		 * manifest-authored source string localises to the user's language.
		 *
		 * @return {string}
		 */
		resolvedLabel() {
			const label = this.content.label
			return label ? this.effectiveTranslate(label) : ''
		},
		/**
		 * The tile caption, run through the host translate function.
		 *
		 * @return {string}
		 */
		resolvedCaption() {
			const caption = this.content.caption
			return caption ? this.effectiveTranslate(caption) : ''
		},
		/**
		 * The unwrapped detail-page object context for token resolution, or null
		 * on surfaces (dashboards) that don't provide one.
		 *
		 * @return {object|null}
		 */
		objectCtx() {
			const c = this.cnObjectContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * The unwrapped page-level workspace context map for `@page.*` /
		 * `@workspace.*` token resolution. Always an object (defaults to `{}`).
		 *
		 * @return {object}
		 */
		pageCtx() {
			const c = this.cnWorkspaceContext
			const unwrapped = (c && typeof c === 'object' && 'value' in c) ? c.value : c
			return (unwrapped && typeof unwrapped === 'object') ? unwrapped : {}
		},
		/**
		 * The unwrapped page-level app config map for `@config.*` token
		 * resolution. Always an object (defaults to `{}`).
		 *
		 * @return {object}
		 */
		configCtx() {
			return unwrapAppConfig(this.cnAppConfig)
		},
		/** Inline style for the icon circle (tinted with iconColor). */
		iconCircleStyle() {
			const color = this.content.iconColor || this.content.valueColor || 'var(--color-primary-element)'
			return { color, backgroundColor: this.tint(color) }
		},
		/** Inline style for the value text (the configurable primary colour). */
		valueStyle() {
			return this.content.valueColor ? { color: this.content.valueColor } : {}
		},
		/**
		 * The formatted value string per the `content.format` spec. Resolves
		 * `@config.<key>` tokens (e.g. `currency: '@config.currency'`) against the
		 * page-level app config and guards the currency code, so an unresolved
		 * token or invalid currency falls back to a safe default instead of
		 * throwing. See `formatMetricValue`.
		 *
		 * @return {string}
		 */
		formattedValue() {
			return formatMetricValue(this.value, this.content.format, this.configCtx)
		},
		/** Stable signature of the data source so the watcher only refetches on real change. */
		sourceKey() {
			return JSON.stringify({
				s: this.content.source || {},
				o: this.objectCtx ? this.objectCtx.objectId : null,
				p: this.pageCtx,
				c: this.configCtx,
			})
		},
	},

	watch: {
		sourceKey() {
			this.fetchValue()
		},
	},

	mounted() {
		this.fetchValue()
	},

	methods: {
		/**
		 * Derive a faint background tint for the icon circle from a colour.
		 * Falls back to the NC light primary token for CSS variables / unknowns.
		 *
		 * @param {string} color The base colour (hex or CSS var).
		 * @return {string} A translucent or token background.
		 */
		tint(color) {
			if (typeof color === 'string' && /^#([0-9a-f]{6})$/i.test(color)) {
				return color + '1f' // ~12% alpha
			}
			return 'var(--color-primary-element-light, rgba(0,130,201,0.1))'
		},
		/**
		 * Flatten a filter map into `filter[key]=value` / `filter[key][op]=value`
		 * query params (operator-aware, matching the OpenRegister vocabulary).
		 *
		 * @param {object} target The params object to write into.
		 * @param {object} filter The filter map.
		 * @return {void}
		 */
		flattenFilter(target, filter) {
			if (!filter || typeof filter !== 'object') return
			// Resolve `@objectId` / `@object.*` (detail page), `@workspace.*`
			// (page-level context — e.g. the dashboard date-range pills publish
			// `dateFrom` / `dateTo`) AND `@config.*` (page-level app config), then
			// drop any optional `@workspace.<key>?` / `@config.<key>?` that stayed
			// unresolved so an unset value omits the filter (show all) instead of
			// sending a literal token.
			const ctx = { ...(this.objectCtx || {}), workspace: this.pageCtx, config: this.configCtx }
			filter = dropOptionalUnresolved(resolveFilterTokens(filter, ctx))
			for (const [k, v] of Object.entries(filter)) {
				if (v && typeof v === 'object') {
					for (const [op, ov] of Object.entries(v)) target[`filter[${k}][${op}]`] = ov
				} else if (v !== '' && v !== null && v !== undefined) {
					target[`filter[${k}]`] = v
				}
			}
		},
		/**
		 * Fetch one scalar from the OpenRegister `/value` aggregation endpoint.
		 *
		 * @param {Function} axios The axios instance.
		 * @param {Function} generateUrl The router helper.
		 * @param {object} s The source (register/schema).
		 * @param {string} metric The aggregation metric.
		 * @param {?string} field The numeric field (non-count metrics).
		 * @param {object} filter The filter map.
		 * @return {Promise<number|null>} The aggregated value.
		 */
		async fetchAggregate(axios, generateUrl, s, metric, field, filter) {
			const url = generateUrl(
				'/apps/openregister/api/objects/aggregations/{register}/{schema}/value',
				{ register: s.register, schema: s.schema },
			)
			const params = { metric: metric || 'count' }
			if (field) params.field = field
			this.flattenFilter(params, filter)
			const res = await axios.get(url, { params })
			return res?.data?.value ?? null
		},
		/**
		 * Resolve the widget's value from its `source`. Supports three source
		 * kinds (ADR-041): a plain `aggregate` (count/sum/avg/min/max with
		 * operator filters), a `ratio` (numerator ÷ denominator × 100, e.g. a
		 * win-rate), and a `weighted` sum (Σ field × weightField ÷ divisor,
		 * computed client-side over the fetched objects). Lazily imports
		 * axios/router (same pattern as CnFilesWidget).
		 *
		 * @return {Promise<void>}
		 */
		async fetchValue() {
			const s = this.content.source || {}
			// An `endpoint` source reads an arbitrary app REST endpoint instead
			// of OpenRegister's per-schema aggregation, so it needs no register/schema.
			if (s.kind !== 'endpoint' && (!s.register || !s.schema)) {
				this.value = null
				this.error = ''
				return
			}
			if (s.kind === 'endpoint' && !s.url) {
				this.value = null
				this.error = ''
				return
			}
			this.loading = true
			this.error = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])

				if (s.kind === 'endpoint') {
					this.value = await this.fetchEndpoint(axios, generateUrl, s)
				} else if (s.kind === 'ratio') {
					const num = await this.fetchAggregate(axios, generateUrl, s, s.metric, s.field, (s.numerator && s.numerator.filter) || {})
					const den = await this.fetchAggregate(axios, generateUrl, s, s.metric, s.field, (s.denominator && s.denominator.filter) || {})
					this.value = (den && Number(den) !== 0) ? (Number(num) / Number(den)) * 100 : null
				} else if (s.kind === 'computed') {
					// Fetch each named part, then evaluate the formula over them.
					const { evalFormula } = await import('../../utils/evalFormula.js')
					const parts = s.parts || {}
					const vars = {}
					for (const [name, p] of Object.entries(parts)) {
						vars[name] = Number(await this.fetchAggregate(axios, generateUrl, s, p.metric || 'count', p.field, p.filter || {})) || 0
					}
					this.value = evalFormula(s.formula || '', vars)
				} else if (s.kind === 'weighted') {
					this.value = await this.fetchWeighted(axios, generateUrl, s)
				} else {
					this.value = await this.fetchAggregate(axios, generateUrl, s, s.metric, s.field, s.filter || {})
				}
			} catch (e) {
				this.error = (e && e.message) || 'error'
				this.value = null
			} finally {
				this.loading = false
			}
		},
		/**
		 * Compute a weighted sum `Σ (field × weightField) ÷ divisor` client-side
		 * (no OpenRegister expression-aggregation primitive yet). Pulls the
		 * matching objects (capped at `limit`, default 1000) and folds them.
		 *
		 * @param {Function} axios The axios instance.
		 * @param {Function} generateUrl The router helper.
		 * @param {object} s The weighted source `{ field, weightField, divisor?, filter?, limit? }`.
		 * @return {Promise<number|null>} The weighted sum.
		 */
		async fetchWeighted(axios, generateUrl, s) {
			if (!s.field || !s.weightField) return null
			const url = generateUrl(
				'/apps/openregister/api/objects/{register}/{schema}',
				{ register: s.register, schema: s.schema },
			)
			const params = { _limit: s.limit || 1000 }
			this.flattenFilter(params, s.filter || {})
			const res = await axios.get(url, { params })
			const rows = (res && res.data && res.data.results) || []
			const divisor = Number(s.divisor) || 1
			let sum = 0
			for (const r of rows) {
				const v = Number(r[s.field])
				const w = Number(r[s.weightField])
				if (Number.isFinite(v) && Number.isFinite(w)) sum += (v * w) / divisor
			}
			return sum
		},
		/**
		 * Resolve `@page.<key>` / `@workspace.<key>` / `@config.<key>` /
		 * `@objectId` / `@object.<field>` tokens inside a string against the page
		 * + config + object contexts. `@page.*` is an alias for `@workspace.*`
		 * (both read the page-level context); `@config.*` reads the page-level app
		 * config. Unresolved tokens collapse to an empty string so a half-built
		 * URL never sends a literal `@page.period`.
		 *
		 * @param {string} str The raw string (URL or param value).
		 * @return {string} The interpolated string.
		 */
		interpolateTokens(str) {
			if (typeof str !== 'string') return str
			return str.replace(/@(page|workspace)\.([A-Za-z0-9_]+)/g, (_, _ns, key) => {
				const v = this.pageCtx[key]
				return (v === undefined || v === null) ? '' : String(v)
			}).replace(/@config\.([A-Za-z0-9_]+)/g, (_, key) => {
				const v = this.configCtx[key]
				return (v === undefined || v === null) ? '' : String(v)
			}).replace(/@objectId/g, () => {
				const id = this.objectCtx && this.objectCtx.objectId
				return (id === undefined || id === null) ? '' : String(id)
			}).replace(/@object\.([A-Za-z0-9_]+)/g, (_, field) => {
				const v = this.objectCtx && this.objectCtx.object && this.objectCtx.object[field]
				return (v === undefined || v === null) ? '' : String(v)
			})
		},
		/**
		 * Read a dot-path off an object (e.g. `"data.totalLeads"`, `"summary.0.count"`).
		 * Returns undefined when any segment is missing.
		 *
		 * @param {object} obj The source object.
		 * @param {string} path The dot-path.
		 * @return {*} The resolved value or undefined.
		 */
		getByPath(obj, path) {
			if (!path) return obj
			return String(path).split('.').reduce(
				(o, k) => (o == null ? undefined : o[k]),
				obj,
			)
		},
		/**
		 * Fetch a single value from an arbitrary app REST endpoint. The `url` and
		 * any string `params` value are token-interpolated (`@page.*` etc.), the
		 * response is read at `path` (dot-path; default = whole body), and the
		 * result is coerced to a number when numeric. Lets a dashboard KPI bind
		 * to a custom-aggregation endpoint (e.g. `/api/analytics/summary`) that
		 * OpenRegister's per-schema aggregation can't express.
		 *
		 * @param {Function} axios The axios instance.
		 * @param {Function} generateUrl The router helper.
		 * @param {object} s The endpoint source `{ url, path?, params?, method? }`.
		 * @return {Promise<number|null>} The extracted value.
		 */
		async fetchEndpoint(axios, generateUrl, s) {
			const rawUrl = this.interpolateTokens(s.url)
			// Leave absolute URLs (http/https) untouched; route app-relative
			// paths through generateUrl so they resolve under the NC base.
			const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : generateUrl(rawUrl)
			const params = {}
			for (const [k, v] of Object.entries(s.params || {})) {
				params[k] = typeof v === 'string' ? this.interpolateTokens(v) : v
			}
			const res = await axios.get(url, { params })
			const extracted = this.getByPath(res && res.data, s.path)
			if (extracted === undefined || extracted === null) return null
			const num = Number(extracted)
			return Number.isFinite(num) ? num : extracted
		},
	},
}
</script>

<style scoped>
.cn-stat-widget {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 4px;
	min-height: 64px;
	min-width: 0;
	max-width: 100%;
}

/* Whole-tile click target when the widget declares a `route`/`link`. */
.cn-stat-widget--linked {
	cursor: pointer;
	text-decoration: none;
	color: inherit;
	border-radius: var(--border-radius-large, 8px);
	transition: background-color 0.1s ease-in-out;
}

.cn-stat-widget--linked:hover {
	background-color: var(--color-background-hover);
}

.cn-stat-widget--linked:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-stat-widget__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	flex-shrink: 0;
}

.cn-stat-widget__body {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-stat-widget__label {
	font-size: 0.95em;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-stat-widget__value-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	min-width: 0;
}

.cn-stat-widget__value {
	font-size: 1.6em;
	font-weight: 700;
	line-height: 1.15;
	color: var(--color-primary-element);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-stat-widget__caption {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-stat-widget__error {
	font-size: 1.8em;
	font-weight: 700;
	color: var(--color-text-maxcontrast);
}
</style>
