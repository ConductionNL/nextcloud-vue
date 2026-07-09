<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<component
		:is="linkTag"
		class="cn-delta-widget"
		:class="{ 'cn-delta-widget--linked': isLinked }"
		v-bind="linkAttrs">
		<div
			v-if="content.icon"
			class="cn-delta-widget__icon"
			:style="iconCircleStyle">
			<CnWidgetIcon :name="content.icon" :size="24" />
		</div>

		<div class="cn-delta-widget__body">
			<div v-if="content.label" class="cn-delta-widget__label">
				{{ content.label }}
			</div>

			<div class="cn-delta-widget__value-row">
				<NcLoadingIcon v-if="displayLoading" :size="22" />
				<span v-else-if="displayError" class="cn-delta-widget__error" :title="displayError">—</span>
				<template v-else>
					<span class="cn-delta-widget__value">{{ formattedCurrent }}</span>
					<span
						v-if="deltaPct !== null"
						class="cn-delta-widget__delta"
						:style="{ color: deltaColor }">
						<component :is="deltaIcon" :size="16" />
						{{ formattedDelta }}
					</span>
				</template>
			</div>

			<div v-if="!displayLoading && !displayError && content.caption" class="cn-delta-widget__caption">
				{{ content.caption }}
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
import { fetchAggregateValue } from '../../utils/fetchAggregate.js'
import { dropOptionalUnresolved, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { useEndpointSource, getByPath } from '../../composables/useEndpointSource.js'
import widgetLink from '../../mixins/widgetLink.js'
import { formatMetricValue, unwrapAppConfig } from '../../utils/formatMetric.js'

/**
 * CnDeltaWidget — an abstract comparison / delta KPI tile.
 *
 * Reads TWO scalars from OpenRegister's aggregation `/value` endpoint — a
 * `current` value and a `previous` value — and renders the current value
 * alongside the percentage change between them, with a directional arrow tinted
 * good/bad according to `goodDirection`. Use it for period-over-period KPIs
 * (e.g. "this month's revenue vs last month") by combining relative filter
 * tokens (`@monthStart`, `@quarterStart`, …) in each leg's filter. Nothing is
 * hard-coded — every fleet app gets the same editable delta tile (ADR-041).
 *
 * Resolved by its registry type key `delta`; reference it from a manifest
 * placement `{ id, type: 'delta', content: { label, source, format, ... } }`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   label: 'Revenue (MTD)',
 *   icon: 'Cash',
 *   format: { style: 'currency', currency: 'EUR', decimals: 0 },
 *   source: {
 *     register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value',
 *     goodDirection: 'up',
 *     current: { filter: { status: 'won', closedAt: { gte: '@monthStart' } } },
 *     previous: { filter: { status: 'won', closedAt: { gte: '@monthStart-1mo', lt: '@monthStart' } } },
 *   },
 * }
 * ```
 *
 * ENDPOINT BINDING (Wave 2, #91) — instead of the two OpenRegister legs, the
 * tile can read BOTH values from one app REST payload through the shared
 * `useEndpointSource` engine (token-resolved params, request dedup + TTL
 * cache, `cn:page:refresh` / `cn:widget:refresh` subscription). Exactly ONE
 * of `source` | `endpointSource` may be configured (validator-enforced).
 * The pipelinq `previousPeriod` overview contract:
 * ```js
 * content: {
 *   label: 'Revenue',
 *   format: { style: 'currency', currency: 'EUR', decimals: 0 },
 *   endpointSource: {
 *     url: '/apps/pipelinq/api/analytics/commercial',
 *     params: { period: '@workspace.datePreset?' },
 *   },
 *   valueField: 'revenue',                    // current value (dot-path)
 *   previousField: 'previousPeriod.revenue',  // previous value (dot-path)
 *   // deltaField: 'revenueDeltaPct',         // OR a server-computed percent
 *   goodDirection: 'up',
 * }
 * ```
 */
export default {
	name: 'CnDeltaWidget',

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
		 * Detail-page object context (`{ objectId, object }`) for `@objectId` /
		 * `@object.<field>` filter tokens. Null off a detail page.
		 */
		cnObjectContext: { default: null },
		/**
		 * Page-level workspace context (a reactive `{ <key>: value }` map)
		 * provided by CnDashboardPage. Drives `@workspace.<param>` token
		 * resolution — e.g. the date-range pills publish `dateFrom` / `dateTo`,
		 * so a leg filter can scope to the picked window.
		 */
		cnWorkspaceContext: { default: () => ({}) },
		/**
		 * Page-level app config for `@config.<key>` token resolution in
		 * `content.format` (e.g. the reporting `currency`). Provided by
		 * CnDashboardPage / CnDetailPage; defaults to `{}`.
		 */
		cnAppConfig: { default: () => ({}) },
	},

	props: {
		/**
		 * The widget's persisted configuration blob. An optional `route`
		 * (vue-router location), `clickRoute` (Wave-2 alias), or `link`
		 * (external href) turns the whole tile into a click-through target
		 * (see the widgetLink mixin).
		 *
		 * Wave 2 (#91): `endpointSource` (`{ url, method?, params?,
		 * responsePath? }`) reads BOTH legs from one app REST payload —
		 * `valueField` plucks the current value, `previousField` the previous
		 * value (the delta percent is computed client-side), or `deltaField`
		 * supplies a server-computed percent directly. Exactly one of
		 * `source` | `endpointSource`. `goodDirection` moves to the content
		 * top level in endpoint mode (`source.goodDirection` still wins for
		 * the OpenRegister form).
		 * @type {{label?: string, icon?: string, iconColor?: string, caption?: string, route?: (object|string), clickRoute?: (object|string), link?: string, format?: {style?: string, currency?: string, decimals?: number, prefix?: string, suffix?: string}, source?: {register?: string, schema?: string, metric?: string, field?: string, goodDirection?: ('up'|'down'), current?: {filter?: object}, previous?: {filter?: object}}, endpointSource?: {url: string, method?: string, params?: object, responsePath?: string}, valueField?: string, previousField?: string, deltaField?: string, goodDirection?: ('up'|'down')}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	setup(props) {
		// Endpoint binding (Wave 2): the shared useEndpointSource engine owns
		// token resolution, request dedup + TTL caching, and the
		// cn:page:refresh / cn:widget:refresh subscriptions. No-op while
		// `content.endpointSource` is absent, so the two-leg OpenRegister
		// path below is untouched. Injects re-read in setup (same resolution
		// as the Options `inject` block — the CnChartWidget precedent).
		const objectCtxRaw = inject('cnObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', ref({}))
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const unwrap = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)
		const { data, loading, error, refetch } = useEndpointSource(
			() => (props.content && props.content.endpointSource) || null,
			{
				ctx: () => ({
					...(unwrap(objectCtxRaw) || {}),
					workspace: unwrap(workspaceRaw) || {},
					config: unwrap(appConfigRaw) || {},
				}),
			},
		)
		return { epData: data, epLoading: loading, epError: error, epRefetch: refetch }
	},

	data() {
		return {
			current: null,
			previous: null,
			loading: false,
			error: '',
		}
	},

	computed: {
		/** Inline style for the icon circle (tinted with iconColor). */
		iconCircleStyle() {
			const color = this.content.iconColor || 'var(--color-primary-element)'
			return { color, backgroundColor: this.tint(color) }
		},
		/**
		 * Whether the tile is endpoint-bound (Wave 2): a `content.endpointSource`
		 * with a `url` reads both legs from one shared payload instead of the
		 * two OpenRegister aggregation legs. Exactly one of `source` |
		 * `endpointSource` is allowed (validator-enforced); endpointSource
		 * wins when both slip through.
		 *
		 * @return {boolean}
		 */
		endpointMode() {
			const es = this.content.endpointSource
			return !!(es && es.url)
		},
		/**
		 * The current value for the active source: the payload value at
		 * `content.valueField` in endpoint mode, else the OpenRegister
		 * `current` leg.
		 *
		 * @return {*}
		 */
		effectiveCurrent() {
			if (!this.endpointMode) return this.current
			const v = getByPath(this.epData, this.content.valueField)
			return v === undefined ? null : v
		},
		/**
		 * The previous value for the active source: the payload value at
		 * `content.previousField` in endpoint mode, else the OpenRegister
		 * `previous` leg.
		 *
		 * @return {*}
		 */
		effectivePrevious() {
			if (!this.endpointMode) return this.previous
			const v = getByPath(this.epData, this.content.previousField)
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
		/** The current value, number-formatted per content.format. */
		formattedCurrent() {
			return this.formatNumber(this.effectiveCurrent)
		},
		/**
		 * Percentage change current vs previous, or null when not computable.
		 * In endpoint mode a `content.deltaField` (a server-computed percent
		 * plucked from the payload) wins over the client-side computation.
		 */
		deltaPct() {
			if (this.endpointMode && this.content.deltaField) {
				const v = Number(getByPath(this.epData, this.content.deltaField))
				return Number.isFinite(v) ? v : null
			}
			const prev = Number(this.effectivePrevious)
			const cur = Number(this.effectiveCurrent)
			if (!Number.isFinite(prev) || prev === 0 || !Number.isFinite(cur)) return null
			return ((cur - prev) / Math.abs(prev)) * 100
		},
		/** The signed percentage, e.g. "+12.3%". */
		formattedDelta() {
			if (this.deltaPct === null) return ''
			const sign = this.deltaPct > 0 ? '+' : ''
			return `${sign}${this.deltaPct.toFixed(1)}%`
		},
		/** The arrow component for the delta direction. */
		deltaIcon() {
			if (this.deltaPct === null || Math.abs(this.deltaPct) < 0.05) return 'TrendingNeutral'
			return this.deltaPct > 0 ? 'TrendingUp' : 'TrendingDown'
		},
		/**
		 * Green when the change is in the configured good direction, else red.
		 * `source.goodDirection` (the OpenRegister form) wins; endpoint-bound
		 * tiles declare `content.goodDirection` at the top level.
		 */
		deltaColor() {
			if (this.deltaPct === null || Math.abs(this.deltaPct) < 0.05) return 'var(--color-text-maxcontrast)'
			const good = (this.content.source && this.content.source.goodDirection)
				|| this.content.goodDirection || 'up'
			const rising = this.deltaPct > 0
			const isGood = good === 'up' ? rising : !rising
			return isGood ? 'var(--color-success)' : 'var(--color-error)'
		},
		/** Stable signature so the watcher only refetches on real change. */
		sourceKey() {
			return JSON.stringify(this.content.source || {})
		},
		/** Unwrapped detail-page object context (`{ objectId, object }`) or null. */
		objectCtx() {
			const c = this.cnObjectContext
			return (c && typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/** Unwrapped page-level workspace context map (always an object). */
		pageCtx() {
			const c = this.cnWorkspaceContext
			const v = (c && typeof c === 'object' && 'value' in c) ? c.value : c
			return v || {}
		},
		/** Workspace signature so the widget refetches when the date window changes. */
		workspaceKey() {
			return JSON.stringify(this.pageCtx || {})
		},
	},

	watch: {
		sourceKey() {
			this.fetchValues()
		},
		workspaceKey() {
			this.fetchValues()
		},
	},

	mounted() {
		this.fetchValues()
	},

	methods: {
		/**
		 * Derive a faint background tint for the icon circle from a colour.
		 *
		 * @param {string} color The base colour (hex or CSS var).
		 * @return {string} A translucent or token background.
		 */
		tint(color) {
			if (typeof color === 'string' && /^#([0-9a-f]{6})$/i.test(color)) return color + '1f'
			return 'var(--color-primary-element-light, rgba(0,130,201,0.1))'
		},
		/**
		 * Format a number per the content.format spec (number/currency/percent).
		 *
		 * @param {*} value The raw value.
		 * @return {string} The formatted string.
		 */
		formatNumber(value) {
			return formatMetricValue(value, this.content.format, unwrapAppConfig(this.cnAppConfig))
		},
		/**
		 * Fetch the current and previous aggregates from OpenRegister.
		 *
		 * @return {Promise<void>}
		 */
		async fetchValues() {
			// Endpoint-bound tiles are fetched by the shared useEndpointSource
			// engine (see setup) — the two-leg OpenRegister path must not fire.
			if (this.endpointMode) {
				this.current = null
				this.previous = null
				this.error = ''
				return
			}
			const s = this.content.source || {}
			if (!s.register || !s.schema) {
				this.current = null
				this.previous = null
				this.error = ''
				return
			}
			this.loading = true
			this.error = ''
			try {
				const base = { register: s.register, schema: s.schema, metric: s.metric, field: s.field }
				// Resolve `@workspace.*` (date-range pills) / `@objectId` / `@object.*`
				// per leg, then drop any optional `@workspace.<key>?` that stayed
				// unresolved (an unset window) so the leg falls back to its base
				// scope instead of sending a literal token. fetchAggregateValue does
				// NOT drop optional tokens itself, so we pre-resolve here.
				const ctx = { ...(this.objectCtx || {}), workspace: this.pageCtx }
				const curFilter = dropOptionalUnresolved(resolveFilterTokens((s.current && s.current.filter) || {}, ctx))
				const prevFilter = dropOptionalUnresolved(resolveFilterTokens((s.previous && s.previous.filter) || {}, ctx))
				const [cur, prev] = await Promise.all([
					fetchAggregateValue({ ...base, filter: curFilter }, ctx),
					fetchAggregateValue({ ...base, filter: prevFilter }, ctx),
				])
				this.current = cur
				this.previous = prev
			} catch (e) {
				this.error = (e && e.message) || 'error'
				this.current = null
				this.previous = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-delta-widget {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 8px 4px;
	min-height: 64px;
}

/* Whole-tile click target when the widget declares a `route`/`link`. */
.cn-delta-widget--linked {
	cursor: pointer;
	text-decoration: none;
	color: inherit;
	border-radius: var(--border-radius-large, 8px);
	transition: background-color 0.1s ease-in-out;
}

.cn-delta-widget--linked:hover {
	background-color: var(--color-background-hover);
}

.cn-delta-widget--linked:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-delta-widget__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	flex-shrink: 0;
}

.cn-delta-widget__body {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-delta-widget__label {
	font-size: 0.95em;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-delta-widget__value-row {
	display: flex;
	align-items: baseline;
	gap: 10px;
}

.cn-delta-widget__value {
	font-size: 1.8em;
	font-weight: 700;
	line-height: 1.1;
	color: var(--color-main-text);
}

.cn-delta-widget__delta {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: 0.95em;
	font-weight: 600;
}

.cn-delta-widget__caption {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-delta-widget__error {
	font-size: 1.8em;
	font-weight: 700;
	color: var(--color-text-maxcontrast);
}
</style>
