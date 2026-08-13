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
			v-if="resolvedIcon"
			class="cn-stat-widget__icon"
			:style="iconCircleStyle">
			<CnWidgetIcon :name="resolvedIcon" :size="24" />
		</div>

		<div class="cn-stat-widget__body">
			<div v-if="content.label || rangePresets.length" class="cn-stat-widget__label">
				<span v-if="content.label">{{ resolvedLabel }}</span>

				<!-- Per-tile range override. Rendered ONLY when the tile declares its
				     own `content.dateRange.presets`; a tile that merely follows the
				     dashboard range shows no control, because the page already has one
				     and two controls for one range read as two ranges. Stops click
				     propagation so choosing a range inside a linked tile does not also
				     navigate. -->
				<select
					v-if="rangePresets.length"
					class="cn-stat-widget__range"
					data-testid="cn-stat-widget-range"
					:aria-label="rangeAriaLabel"
					:value="activeRangePreset"
					@click.stop.prevent
					@change="selectRange($event.target.value)">
					<option
						v-for="preset in rangePresets"
						:key="preset.id"
						:value="preset.id">
						{{ effectiveTranslate(preset.label || preset.id) }}
					</option>
				</select>
			</div>

			<div class="cn-stat-widget__value-row">
				<NcLoadingIcon v-if="displayLoading" :size="22" />
				<span v-else-if="displayError" class="cn-stat-widget__error" :title="displayError">—</span>
				<template v-else>
					<span class="cn-stat-widget__value" :style="valueStyle">
						{{ formattedValue }}
					</span>
					<span
						v-if="formattedLimit !== ''"
						class="cn-stat-widget__limit"
						data-testid="cn-stat-widget-limit">
						/ {{ formattedLimit }}
					</span>
					<span
						v-if="trendPct !== null"
						class="cn-stat-widget__trend"
						data-testid="cn-stat-widget-trend"
						:style="{ color: trendColor }">
						<component :is="trendIcon" :size="14" />
						{{ formattedTrend }}
					</span>
				</template>
				<span v-if="!displayLoading && !displayError && content.caption" class="cn-stat-widget__caption">
					{{ resolvedCaption }}
				</span>
			</div>
		</div>
	</component>
</template>

<script>
import { inject, ref } from 'vue'
import { NcLoadingIcon } from '@nextcloud/vue'
import TrendingUp from 'vue-material-design-icons/TrendingUp.vue'
import TrendingDown from 'vue-material-design-icons/TrendingDown.vue'
import TrendingNeutral from 'vue-material-design-icons/TrendingNeutral.vue'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { resolveFilterTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'
import { formatMetricValue, unwrapAppConfig } from '../../utils/formatMetric.js'
import { useEndpointSource, getByPath } from '../../composables/useEndpointSource.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import widgetLink from '../../mixins/widgetLink.js'

/**
 * Variant → CSS colour token map for the `variantWhen` threshold rules.
 * `danger` is accepted as an alias of `error` (the doriath KPI-card
 * vocabulary); `default` keeps the widget's configured colours.
 *
 * @type {Record<string, string>}
 */
const VARIANT_COLORS = {
	default: '',
	primary: 'var(--color-primary-element)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	error: 'var(--color-error)',
	danger: 'var(--color-error)',
}

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
 *
 * ENDPOINT BINDING (Wave 2, #91) — instead of an OpenRegister `source`, the
 * tile can bind to an arbitrary app REST endpoint through the shared
 * `useEndpointSource` engine (token-resolved params, per-(url+params)
 * request dedup + short-TTL cache, `cn:page:refresh` / `cn:widget:refresh`
 * subscription). Exactly ONE of `source` | `endpointSource` may be
 * configured (validator-enforced); when both slip through, `endpointSource`
 * wins. The pipelinq analytics-KPI contract in full:
 * ```js
 * content: {
 *   label: 'Revenue',
 *   icon: 'CashMultiple',
 *   format: { style: 'currency', currency: 'EUR', decimals: 0 },
 *   endpointSource: {
 *     url: '/apps/pipelinq/api/analytics/commercial',
 *     params: { period: '@workspace.datePreset?' },
 *   },
 *   valueField: 'revenue',                     // dot-path into the payload
 *   previousField: 'previousPeriod.revenue',   // → trend sublabel (arrow + % vs previous)
 *   // deltaField: 'revenueDeltaPct',          // OR a server-computed delta percent
 *   goodDirection: 'up',                       // tints the trend good/bad (default 'up')
 *   variantWhen: [                             // first-match threshold styling
 *     { op: 'gte', value: 100000, variant: 'success' },
 *     { op: 'lt', value: 10000, variant: 'warning', icon: 'AlertOutline' },
 *   ],
 *   clickRoute: 'leads',                       // whole-tile click-through (alias of route)
 * }
 * ```
 */
export default {
	name: 'CnStatWidget',

	components: {
		NcLoadingIcon,
		CnWidgetIcon,
		TrendingUp,
		TrendingDown,
		TrendingNeutral,
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
		 * v2 slot-grid detail context holder (`{ value: { objectData, schema,
		 * objectType, objectId, register, store } | null }`) provided by
		 * CnPageRenderer — backfills the object token context so
		 * `@objectId` / `@object.<field>` resolve on detail surfaces where
		 * CnDetailPage is not an ancestor (#91 Wave 3).
		 */
		cnDetailObjectContext: { default: null },
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
		/**
		 * Reactive date range provided by an ancestor `CnDashboardPage` when its
		 * `dateRange.enabled` is true — `{ from, to, preset }`, else null. Same
		 * ref `CnChartWidget` injects, so a tile and a chart on one dashboard
		 * always agree on the period. A tile follows it only once it declares
		 * `content.dateRange` (see the `content` prop docs for why).
		 *
		 * @type {{value: ({from: string, to: string, preset: string}|null)}}
		 */
		cnDashboardDateRange: { default: () => ref(null) },
	},

	props: {
		/**
		 * The widget's persisted configuration blob. An optional `route`
		 * (vue-router location), `clickRoute` (Wave-2 alias), or `link`
		 * (external href) turns the whole tile into a click-through target
		 * (see the widgetLink mixin).
		 * The `source` resolves the value. Besides the OpenRegister-backed kinds
		 * (plain aggregate / `ratio` / `computed` / `weighted`), an
		 * `{ kind: 'endpoint', url, path?, params? }` source reads an arbitrary
		 * app REST endpoint and extracts the value at the dot-`path` of the
		 * response (default = whole body). The `url` and any string `params`
		 * value interpolate `@page.<param>` / `@workspace.<param>` tokens from the
		 * page-level context (and `@objectId` / `@object.<field>` on a detail
		 * page) — so a page-rendered period selector can drive every endpoint KPI.
		 *
		 * Wave 2 (#91): `endpointSource` (`{ url, method?, params?,
		 * responsePath? }`) binds the tile to an arbitrary endpoint through the
		 * shared `useEndpointSource` engine — exactly one of `source` |
		 * `endpointSource`. `valueField` plucks the displayed value from the
		 * payload; `previousField` (previous-period value) or `deltaField`
		 * (server-computed percent) renders the trend sublabel (arrow +
		 * percent-vs-previous, tinted by `goodDirection`, default `'up'`);
		 * `variantWhen` (`[{ op, value, variant, icon? }]`, first match wins)
		 * re-tints the value/icon by threshold.
		 *
		 * `limitField` (dot-path into the payload) or a static `limit` renders the
		 * tile as a capacity pair — `0 / 100` — and tints it `warning` once the
		 * value reaches the limit, unless a `variantWhen` rule already claims the
		 * colour. Use `limitField` for a server-configured quota so the ceiling is
		 * read live rather than duplicated in the manifest.
		 *
		 * `dateRange` opts the tile into the dashboard's period. Present and empty
		 * (`{}`) = follow the ancestor `CnDashboardPage` range; add `presets`
		 * (`[{ id, label?, from?, to? }]`) to render a per-tile picker that
		 * overrides it. The active range is exposed to `endpointSource` as
		 * `@range.from` / `@range.to` / `@range.preset` tokens. A tile that
		 * declares no `dateRange` is unaffected by the page range — that is
		 * deliberate, so adding a range to a dashboard cannot silently change what
		 * an existing tile requests.
		 * @type {{label?: string, icon?: string, iconColor?: string, valueColor?: string, caption?: string, route?: (object|string), clickRoute?: (object|string), link?: string, format?: {style?: string, currency?: string, decimals?: number, prefix?: string, suffix?: string}, source?: {kind?: string, register?: string, schema?: string, metric?: string, field?: string, filter?: object, url?: string, path?: string, params?: object}, endpointSource?: {url: string, method?: string, params?: object, responsePath?: string}, valueField?: string, limitField?: string, limit?: number, dateRange?: {presets?: Array<{id: string, label?: string, from?: string, to?: string}>}, previousField?: string, deltaField?: string, goodDirection?: ('up'|'down'), variantWhen?: Array<{op: string, value: *, variant: string, icon?: string}>}}
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

	setup(props) {
		// Endpoint binding (Wave 2): the shared useEndpointSource engine owns
		// token resolution, request dedup + TTL caching, and the
		// cn:page:refresh / cn:widget:refresh subscriptions. It is a no-op
		// while `content.endpointSource` is absent, so the OpenRegister
		// `source` path below is untouched. The injects are re-read here in
		// setup — Vue 2.7 resolves them identically to the Options `inject`
		// block (same precedent as CnChartWidget's date-range ref).
		const objectCtxRaw = inject('cnObjectContext', null)
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', ref({}))
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const pageRangeRaw = inject('cnDashboardDateRange', ref(null))
		const unwrap = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)

		// The per-tile range override. Null = follow the dashboard range; set by
		// selectRange() when the tile renders its own preset picker. It lives in
		// setup, not data(), because the ctx closure below must read it reactively
		// — a data() property would be resolved once and never refetch.
		const tileRange = ref(null)
		const activeRange = () => (tileRange.value || unwrap(pageRangeRaw) || null)

		const { data, loading, error, refetch } = useEndpointSource(
			() => (props.content && props.content.endpointSource) || null,
			{
				ctx: () => ({
					...(resolveObjectTokenContext(objectCtxRaw, detailCtxRaw) || {}),
					workspace: unwrap(workspaceRaw) || {},
					config: unwrap(appConfigRaw) || {},
					// `@range.from` / `@range.to` / `@range.preset` tokens, usable in the
					// endpointSource url and params exactly like `@workspace.*`.
					range: activeRange() || {},
				}),
			},
		)
		return { epData: data, epLoading: loading, epError: error, epRefetch: refetch, tileRange, activeRange }
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
			return resolveObjectTokenContext(this.cnObjectContext, this.cnDetailObjectContext)
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
		/**
		 * Whether the tile is endpoint-bound (Wave 2): a `content.endpointSource`
		 * with a `url` switches the value/loading/error surface to the shared
		 * `useEndpointSource` engine. Exactly one of `source` | `endpointSource`
		 * is allowed (validator-enforced); endpointSource wins when both slip
		 * through.
		 *
		 * @return {boolean}
		 */
		endpointMode() {
			const es = this.content.endpointSource
			return !!(es && es.url)
		},
		/**
		 * The raw display value: in endpoint mode, the payload value plucked at
		 * `content.valueField` (dot-path; omitted = the payload itself);
		 * otherwise the OpenRegister-aggregated `value`.
		 *
		 * @return {*}
		 */
		displayValue() {
			if (!this.endpointMode) return this.value
			const v = getByPath(this.epData, this.content.valueField)
			return v === undefined ? null : v
		},
		/**
		 * Loading state for the active source (endpoint or OpenRegister).
		 *
		 * @return {boolean}
		 */
		displayLoading() {
			return this.endpointMode ? this.epLoading : this.loading
		},
		/**
		 * Error message for the active source ('' = none).
		 *
		 * @return {string}
		 */
		displayError() {
			return this.endpointMode ? this.epError : this.error
		},
		/**
		 * The previous-period value plucked at `content.previousField`
		 * (endpoint mode only), or null when not configured / not numeric.
		 *
		 * @return {number|null}
		 */
		previousValue() {
			if (!this.endpointMode || !this.content.previousField) return null
			const v = Number(getByPath(this.epData, this.content.previousField))
			return Number.isFinite(v) ? v : null
		},
		/**
		 * Trend percent for the sublabel (the pipelinq KPI contract): a
		 * server-computed percent plucked at `content.deltaField` when set,
		 * else the client-computed change vs `previousField`
		 * (`(current − previous) ÷ |previous| × 100`). Null when the trend is
		 * not configured or not computable (previous of 0, non-numeric values).
		 *
		 * @return {number|null}
		 */
		trendPct() {
			if (!this.endpointMode) return null
			if (this.content.deltaField) {
				const v = Number(getByPath(this.epData, this.content.deltaField))
				return Number.isFinite(v) ? v : null
			}
			const prev = this.previousValue
			const cur = Number(this.displayValue)
			if (prev === null || prev === 0 || !Number.isFinite(cur)) return null
			return ((cur - prev) / Math.abs(prev)) * 100
		},
		/** The signed trend percent, e.g. "+12.3%". */
		formattedTrend() {
			if (this.trendPct === null) return ''
			const sign = this.trendPct > 0 ? '+' : ''
			return `${sign}${this.trendPct.toFixed(1)}%`
		},
		/** The arrow component for the trend direction. */
		trendIcon() {
			if (this.trendPct === null || Math.abs(this.trendPct) < 0.05) return 'TrendingNeutral'
			return this.trendPct > 0 ? 'TrendingUp' : 'TrendingDown'
		},
		/**
		 * Green when the trend moves in `content.goodDirection` (default
		 * 'up'), red otherwise, neutral for a ~0 change — the CnDeltaWidget
		 * convention.
		 *
		 * @return {string}
		 */
		trendColor() {
			if (this.trendPct === null || Math.abs(this.trendPct) < 0.05) return 'var(--color-text-maxcontrast)'
			const good = this.content.goodDirection || 'up'
			const rising = this.trendPct > 0
			const isGood = good === 'up' ? rising : !rising
			return isGood ? 'var(--color-success)' : 'var(--color-error)'
		},
		/**
		 * The first `content.variantWhen` rule matching the current display
		 * value (first-match wins), or null. Each rule is
		 * `{ op: eq|neq|gt|gte|lt|lte, value, variant, icon? }`.
		 *
		 * @return {object|null}
		 */
		activeVariantRule() {
			const rules = this.content.variantWhen
			if (!Array.isArray(rules) || rules.length === 0) return null
			const current = this.displayValue
			if (current === null || current === undefined) return null
			return rules.find((r) => r && this.matchesRule(current, r)) || null
		},
		/**
		 * The CSS colour for the matched variant rule ('' = keep the
		 * configured colours).
		 *
		 * @return {string}
		 */
		variantColor() {
			const rule = this.activeVariantRule
			if (rule && rule.variant) return VARIANT_COLORS[rule.variant] || ''
			// An explicit variantWhen rule always wins: a tile that says how it
			// wants to be coloured is not overruled by the generic at-limit tint.
			if (this.atLimit) return VARIANT_COLORS.warning || ''
			return ''
		},
		/**
		 * The icon shown in the circle: a matched variant rule's `icon`
		 * override, else `content.icon`.
		 *
		 * @return {string}
		 */
		resolvedIcon() {
			const rule = this.activeVariantRule
			return (rule && rule.icon) || this.content.icon || ''
		},
		/** Inline style for the icon circle (variant rule wins over iconColor). */
		iconCircleStyle() {
			const color = this.variantColor || this.content.iconColor || this.content.valueColor || 'var(--color-primary-element)'
			return { color, backgroundColor: this.tint(color) }
		},
		/** Inline style for the value text (variant rule wins over valueColor). */
		valueStyle() {
			const color = this.variantColor || this.content.valueColor
			return color ? { color } : {}
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
			return formatMetricValue(this.displayValue, this.content.format, this.configCtx)
		},
		/**
		 * The capacity this tile is measured against — `content.limitField`
		 * (dot-path into the endpoint payload, so a server-configured quota is
		 * read live) or a static `content.limit`. Null when neither is set or
		 * the resolved value is not a finite number, which is what keeps the
		 * "value / limit" rendering off every tile that has no limit.
		 *
		 * @return {number|null}
		 */
		limitValue() {
			let raw = this.content.limit
			if (this.endpointMode && this.content.limitField) {
				raw = getByPath(this.epData, this.content.limitField)
			}
			const n = Number(raw)
			return Number.isFinite(n) ? n : null
		},
		/**
		 * The limit rendered beside the value, e.g. the "100" in "0 / 100".
		 * Formatted with the value's own `format` spec minus prefix/suffix —
		 * a suffix belongs to the pair, not to each half, so "0 % / 100 %" is
		 * never produced.
		 *
		 * @return {string}
		 */
		formattedLimit() {
			if (this.limitValue === null) return ''
			const { prefix, suffix, ...rest } = (this.content.format || {})
			return formatMetricValue(this.limitValue, rest, this.configCtx)
		},
		/**
		 * Whether the tile has reached or passed its limit. Drives the warning
		 * tint when no explicit `variantWhen` rule already claims the colour.
		 *
		 * @return {boolean}
		 */
		atLimit() {
			if (this.limitValue === null) return false
			const current = Number(this.displayValue)
			return Number.isFinite(current) && current >= this.limitValue
		},
		/**
		 * The tile's own range presets (`content.dateRange.presets`). Empty when
		 * the tile has no override, which is also what hides the picker.
		 *
		 * @return {Array<{id: string, label?: string, from?: string, to?: string}>}
		 */
		rangePresets() {
			const presets = this.content.dateRange?.presets
			return Array.isArray(presets) ? presets.filter(Boolean) : []
		},
		/**
		 * The preset id currently selected — the tile's own override when set,
		 * else whatever the dashboard range reports, so the picker opens showing
		 * the page's period rather than a stale default.
		 *
		 * @return {string}
		 */
		activeRangePreset() {
			return (this.tileRange || this.activeRange() || {}).preset || ''
		},
		/** Accessible name for the range picker (no visible label on a compact tile). */
		rangeAriaLabel() {
			const label = this.resolvedLabel || this.effectiveTranslate('Date range')
			return `${label} — ${this.effectiveTranslate('date range')}`
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
		/**
		 * Apply a per-tile range preset. Writes the tile override, which the
		 * endpoint ctx reads, so the tile refetches on its own period while the
		 * rest of the dashboard stays on the page range.
		 *
		 * @param {string} presetId The chosen preset's id.
		 * @return {void}
		 */
		selectRange(presetId) {
			const preset = this.rangePresets.find((p) => p.id === presetId)
			if (!preset) return
			this.tileRange = { preset: preset.id, from: preset.from ?? null, to: preset.to ?? null }
		},
		tint(color) {
			if (typeof color === 'string' && /^#([0-9a-f]{6})$/i.test(color)) {
				return color + '1f' // ~12% alpha
			}
			return 'var(--color-primary-element-light, rgba(0,130,201,0.1))'
		},
		/**
		 * Whether a `variantWhen` rule matches the current value. Numeric
		 * comparison when both sides coerce to numbers; `eq` / `neq` fall back
		 * to strict string equality for non-numeric values.
		 *
		 * @param {*} current The current display value.
		 * @param {{op: string, value: *}} rule The threshold rule.
		 * @return {boolean} True when the rule matches.
		 */
		matchesRule(current, rule) {
			const a = Number(current)
			const b = Number(rule.value)
			const numeric = Number.isFinite(a) && Number.isFinite(b)
			switch (rule.op) {
			case 'eq': return numeric ? a === b : String(current) === String(rule.value)
			case 'neq': return numeric ? a !== b : String(current) !== String(rule.value)
			case 'gt': return numeric && a > b
			case 'gte': return numeric && a >= b
			case 'lt': return numeric && a < b
			case 'lte': return numeric && a <= b
			default: return false
			}
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
			// Endpoint-bound tiles are fetched by the shared useEndpointSource
			// engine (see setup) — the OpenRegister paths below must not fire.
			if (this.endpointMode) {
				this.value = null
				this.error = ''
				return
			}
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
			// Delegates to the shared useEndpointSource util so the legacy
			// `source.kind: 'endpoint'` path and the Wave-2 `endpointSource`
			// path pluck identically.
			return getByPath(obj, path)
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
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-width: 0;
	font-size: 0.95em;
	font-weight: 600;
	color: var(--color-main-text);
}

/* Sized down to sit inside the label row without pushing the tile taller —
   the tile's height is fixed by its grid cell (ADR-062). */
.cn-stat-widget__range {
	flex: 0 0 auto;
	max-width: 50%;
	padding: 0 4px;
	border: none;
	border-radius: var(--border-radius);
	background: transparent;
	color: var(--color-text-maxcontrast);
	font-size: 0.8em;
	font-weight: normal;
	cursor: pointer;
}

.cn-stat-widget__range:hover,
.cn-stat-widget__range:focus-visible {
	background: var(--color-background-hover);
	color: var(--color-main-text);
}

.cn-stat-widget__value-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	min-width: 0;
}

/* The value NEVER shrinks. It shared a flex row with the caption while being
   the only shrinkable item, so any caption longer than the tile was wide won
   the space and the NUMBER — the entire point of a KPI tile — ellipsised to
   "3.." while its decoration rendered in full. */
.cn-stat-widget__value {
	flex: 0 0 auto;
	font-size: 1.6em;
	font-weight: 700;
	line-height: 1.15;
	color: var(--color-primary-element);
	white-space: nowrap;
}

/* The denominator of a "value / limit" pair. Deliberately quieter and smaller
   than the value: the tile's subject is what the number IS, not what it is
   allowed to reach. Shares the value's `nowrap` so the pair never breaks. */
.cn-stat-widget__limit {
	flex: 0 0 auto;
	font-size: 1.05em;
	font-weight: 600;
	line-height: 1.15;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

.cn-stat-widget__trend {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: 0.85em;
	font-weight: 600;
}

/* The caption is what gives way in a narrow tile — it truncates, the value
   does not. */
.cn-stat-widget__caption {
	flex: 1 1 auto;
	min-width: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-stat-widget__error {
	font-size: 1.8em;
	font-weight: 700;
	color: var(--color-text-maxcontrast);
}
</style>
