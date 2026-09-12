<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnStatWidget renders the CANONICAL KPI card (src/css/kpi-card.css). This tile
  and CnStatsBlock used to be two different-looking KPIs — a transparent
  icon-beside-number row here, a grey card with a circular icon and a large
  coloured number there — so OpenCatalogi's and dossiq's dashboards did not
  match. Both now render the same `cn-kpi-card` markup from the same
  stylesheet. The legacy `cn-stat-widget*` classes stay on the same elements so
  app CSS targeting them keeps working.

  Keep this comment OUT of <template>: a comment node beside the root element
  makes the component multi-root in Vue 3, and a multi-root component has no
  root for its class bindings to land on.
-->
<template>
	<component
		:is="linkTag"
		class="cn-kpi-card cn-stat-widget"
		:class="[
			{ 'cn-kpi-card--clickable': isLinked, 'cn-stat-widget--linked': isLinked },
			'cn-kpi-card--' + cardLayout,
			flat ? 'cn-kpi-card--flat' : 'cn-kpi-card--filled',
		]"
		v-bind="linkAttrs">
		<div
			v-if="resolvedIcon"
			class="cn-kpi-card__icon cn-stat-widget__icon"
			:style="iconCircleStyle">
			<CnWidgetIcon :name="resolvedIcon" :size="24" />
		</div>

		<div class="cn-kpi-card__body cn-stat-widget__body">
			<div v-if="content.label || rangePresets.length" class="cn-kpi-card__title cn-stat-widget__label">
				<span v-if="content.label" :title="resolvedLabel">{{ resolvedLabel }}</span>

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

			<div class="cn-kpi-card__value-row cn-stat-widget__value-row">
				<NcLoadingIcon v-if="displayLoading" :size="22" />
				<span v-else-if="displayError" class="cn-stat-widget__error" :title="displayError">—</span>
				<template v-else>
					<!-- Badge mode: the value is a state name, so it reads as the
					     library's status pill rather than as a headline number. -->
					<CnStatusBadge
						v-if="isBadge"
						class="cn-stat-widget__badge"
						data-testid="cn-stat-widget-badge"
						:label="shownValue"
						:variant="badgeVariant" />
					<span
						v-else
						class="cn-kpi-card__value cn-stat-widget__value"
						:data-testid="isCountdown ? 'cn-stat-widget-countdown' : null"
						:class="{ 'cn-kpi-card__value--text': isTextValue || shownValueIsText }"
						:title="shownValueIsText ? shownValue : (isTextValue ? String(displayValue) : null)"
						:style="valueStyle">
						{{ shownValue }}
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
				<span v-if="!displayLoading && !displayError && content.caption" class="cn-kpi-card__label cn-stat-widget__caption">
					{{ resolvedCaption }}
				</span>
			</div>
		</div>
	</component>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import { inject, ref } from 'vue'
import TrendingDown from 'vue-material-design-icons/TrendingDown.vue'
import TrendingNeutral from 'vue-material-design-icons/TrendingNeutral.vue'
import TrendingUp from 'vue-material-design-icons/TrendingUp.vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { getByPath, useEndpointSource } from '../../composables/useEndpointSource.js'
import widgetLink from '../../mixins/widgetLink.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import { formatMetricValue, unwrapAppConfig } from '../../utils/formatMetric.js'
import { dropOptionalUnresolved, resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { evaluateVisibleWhenLocal, readVisibleWhenPath } from '../../utils/visibleWhen.js'

// The canonical KPI look lives in one shared stylesheet, imported by BOTH
// this component and CnStatsBlock, so the two cannot drift apart again.
// Importing it here also means the look arrives without the consuming app
// having pulled in the library's global css/index.css.
import '../../css/kpi-card.css'
// Badge mode renders CnStatusBadge, whose colours live in the global badge
// stylesheet. Imported here for the same reason as kpi-card.css above.
import '../../css/badge.css'

/**
 * Variant → CSS colour token map for the `variantWhen` threshold rules.
 * `danger` is accepted as an alias of `error` (the doriath KPI-card
 * vocabulary); `default` keeps the widget's configured colours.
 *
 * @type {Record<string, string>}
 */
// THE `-text` TOKENS, NOT THE PLAIN ONES. These paint the NUMBER and the icon
// tint, i.e. foreground. Nextcloud's `--color-success` / `--color-warning` /
// `--color-error` are FILL colours meant to sit behind something; DefaultTheme
// ships `--color-success-text` and friends for foreground use. Using a fill as
// a text colour failed WCAG AA — axe measured #d8f3da on #f5f5f5, a contrast of
// 1.08 against the required 3:1, serious, on filinq's dashboard (gate-33).
//
// kpi-card.css fixed exactly this for the CSS-class path; this inline map was
// missed because nothing reached it — every `variant` in the fleet is on a
// stats-block, which renders classes. The first manifest to put `variant` on a
// `stat` or `delta` would have hit the old failure.
//
// Each keeps the plain token as a fallback, so a theme predating the `-text`
// tokens degrades to the old colour rather than to none.
const VARIANT_COLORS = {
	default: '',
	primary: 'var(--color-primary-element)',
	success: 'var(--color-success-text, var(--color-success))',
	warning: 'var(--color-warning-text, var(--color-warning))',
	error: 'var(--color-error-text, var(--color-error))',
	danger: 'var(--color-error-text, var(--color-error))',
}

/**
 * The variants CnStatusBadge accepts. Badge mode normalises every tile
 * variant onto this list: `danger` becomes `error`, anything unknown is
 * skipped so the next rule in line decides.
 *
 * @type {string[]}
 */
const BADGE_VARIANTS = ['default', 'primary', 'success', 'warning', 'error', 'info']

/**
 * A bare `YYYY-MM-DD`, the shape OpenRegister stores a date property in.
 *
 * It is matched BEFORE `new Date()` sees it on purpose. `new Date('2026-09-26')`
 * is specified to parse a date-only string as UTC midnight, so west of
 * Greenwich it lands on the 25th local and every countdown built on it is a
 * day short. A date the schema calls a date has no time and no zone, so it is
 * read as the local calendar day it names.
 *
 * @type {RegExp}
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Milliseconds in a day, used only between two UTC-normalised midnights. */
const DAY_MS = 86400000

/**
 * The local calendar day a value names, as a UTC midnight timestamp.
 *
 * WHY CALENDAR DAYS AND NOT ELAPSED MILLISECONDS. A deadline is a day on a
 * calendar, not an instant. Subtracting timestamps makes a deadline at 23:00
 * today read as "0 days" and one at 01:00 tomorrow read as "0 days" as well
 * (two hours apart), while 09:00 tomorrow reads as "1 day" — the same calendar
 * distance rendering as two different answers because of the time somebody
 * happened to type. So both ends are collapsed to the LOCAL calendar day they
 * fall on, and the difference is taken between those days.
 *
 * The collapse goes through `Date.UTC` rather than a local `Date`, because two
 * UTC midnights are always exactly `DAY_MS` apart, while two local midnights
 * across a DST change are 23 or 25 hours apart and a plain division then
 * rounds to the wrong day twice a year.
 *
 * @param {unknown} value A date string, a `Date`, or an epoch-milliseconds number.
 * @return {number|null} The UTC-midnight timestamp of that local day, or null when there is no readable date.
 */
function calendarDay(value) {
	if (value === null || value === undefined || value === '') {
		return null
	}
	if (typeof value === 'string') {
		const parts = DATE_ONLY.exec(value.trim())
		if (parts) {
			return Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
		}
	}
	const isDate = value instanceof Date
	if (!isDate && typeof value !== 'string' && !Number.isFinite(value)) {
		// A boolean or an object is not a mis-typed date, it is not a date at
		// all; `new Date(true)` would happily answer 1 January 1970.
		return null
	}
	const parsed = isDate ? value : new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return null
	}
	return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
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
 *
 * BADGE MODE. `display: 'badge'` renders the value as a `CnStatusBadge` pill,
 * for a tile whose value is a state name rather than a count. The badge colour
 * can come from the RESOLVED ROW of an `objectField` reference, not only from
 * the displayed text: `resolve.variantField` names a field on the looked-up
 * row, and `resolve.variantMap` maps its value to a variant (without a map the
 * field value itself must be a variant name). `emptyText` replaces the dash
 * when the value is empty or its reference does not resolve. `overrides` test
 * the BOUND RECORD, first match wins, and replace the label, variant and icon,
 * so a record in a special state reads as that state:
 * ```js
 * content: {
 *   label: 'Status',
 *   display: 'badge',
 *   emptyText: 'Unknown',
 *   objectField: {
 *     field: 'status',
 *     resolve: {
 *       register: 'dossiq',
 *       schema: 'statusType',
 *       labelField: 'name',
 *       variantField: 'isFinal',
 *       variantMap: { true: 'success', false: 'info' },
 *     },
 *   },
 *   overrides: [
 *     { when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' },
 *   ],
 * }
 * ```
 *
 * COUNTDOWN MODE. `display: 'countdown'` reads a DATE off the record (or off an
 * endpoint payload) and renders the time remaining, so a deadline is a
 * configured KPI tile rather than a component an app writes by hand:
 * ```js
 * content: {
 *   label: 'Deadline',
 *   display: 'countdown',
 *   objectField: 'dueDate',
 *   countdown: {
 *     unit: 'days',                      // the only unit; anything else is read as days
 *     warnAt: 14,                        // warning at or below this many days left
 *     dangerAt: 5,                       // error at or below, and it wins over warnAt
 *     pastLabel: 'Overdue by {n} days',  // a date that has passed
 *     emptyText: 'No deadline',          // absent or unreadable date
 *   },
 * }
 * ```
 * A passed date NEVER renders as a negative number: it renders `pastLabel` with
 * `{n}` as the number of days it is past, and it is always the error colour
 * whether or not `dangerAt` is set. Today is 0, not 1 and not −1, and renders
 * `todayLabel` ("Today"). The thresholds are INCLUSIVE. An absent or unreadable
 * date renders `countdown.emptyText`, falling back to `content.emptyText` and
 * then to the dash, never `NaN` or `Invalid Date`. `overrides` outrank the
 * countdown's own label and colour exactly as they outrank a badge's.
 */
export default {
	name: 'CnStatWidget',

	components: {
		NcLoadingIcon,
		CnWidgetIcon,
		CnStatusBadge,
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
		 *
		 * `display: 'badge'` renders the value as a `CnStatusBadge`. On an
		 * `objectField` reference, `resolve.variantField` (a dot-path on the
		 * looked-up row) plus `resolve.variantMap` (`{ rowValue: variant }`)
		 * colour it from the row; without a map the row value must itself be a
		 * variant name. `emptyText` replaces the dash for an empty value, and
		 * for a reference that does not resolve. `overrides`
		 * (`[{ when: { field, op?, value? }, label?, variant?, icon? }]`, first
		 * match wins) test the bound record: `when` is the local `visibleWhen`
		 * grammar, and a `when` with neither `op` nor `value` tests the field
		 * for truthiness. A match replaces the shown label, the colour and the
		 * icon. Precedence of the colour: override, `variantWhen`, the countdown
		 * threshold, the at-limit warning, the resolved row, the static
		 * `variant`.
		 *
		 * `display: 'countdown'` reads the value as a DATE and renders the days
		 * remaining. `countdown.warnAt` / `countdown.dangerAt` are inclusive day
		 * thresholds and `dangerAt` wins; `countdown.pastLabel` (with `{n}`)
		 * words a date that has passed, which is always the error colour and is
		 * never shown as a negative number; `countdown.todayLabel` words a date
		 * due today, which counts as 0; `countdown.futureLabel` (with `{n}`)
		 * words the ordinary case; `countdown.emptyText` words an absent or
		 * unreadable date, falling back to the top-level `emptyText`. Days are
		 * counted between LOCAL CALENDAR DAYS, not as elapsed milliseconds, so
		 * the time of day on a deadline never moves the answer.
		 *
		 * @type {{label?: string, icon?: string, iconColor?: string, valueColor?: string, caption?: string, route?: (object|string), clickRoute?: (object|string), link?: string, format?: {style?: string, currency?: string, decimals?: number, prefix?: string, suffix?: string}, source?: {kind?: string, register?: string, schema?: string, metric?: string, field?: string, filter?: object, url?: string, path?: string, params?: object}, endpointSource?: {url: string, method?: string, params?: object, responsePath?: string}, valueField?: string, limitField?: string, limit?: number, dateRange?: {presets?: Array<{id: string, label?: string, from?: string, to?: string}>}, previousField?: string, deltaField?: string, goodDirection?: ('up'|'down'), variant?: ('default'|'primary'|'success'|'warning'|'error'|'danger'), variantWhen?: Array<{op: string, value: unknown, variant: string, icon?: string}>, objectField?: (string|{field: string, resolve?: {register: string, schema: string, labelField?: string, variantField?: string, variantMap?: {[key: string]: string}}}), display?: ('text'|'badge'|'countdown'), countdown?: {unit?: 'days', warnAt?: number, dangerAt?: number, futureLabel?: string, todayLabel?: string, pastLabel?: string, emptyText?: string}, emptyText?: string, overrides?: Array<{when: {field: string, op?: string, value?: unknown}, label?: string, variant?: string, icon?: string}>}}
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
			// Resolved display label for an `objectField` that holds a reference
			// uuid. Null until resolved, and null forever when it cannot be.
			referenceLabel: null,
			// The looked-up row behind `referenceLabel`, read by
			// `resolve.variantField` to colour the tile from the row itself.
			referenceRow: null,
			// True once a configured lookup ran and found no usable label.
			referenceFailed: false,
			// True while a configured lookup is in flight. Without it, "not
			// resolved yet" and "cannot be resolved" were the same state, so the
			// tile showed the RAW UUID for the length of the request and then
			// replaced it with the label or the empty text. A person watching a
			// status badge saw `4f2b9c10-…` flash past where a state belonged.
			referencePending: false,
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
		 * The tile caption, translated and then interpolated with the fetched
		 * payload.
		 *
		 * `{field}` tokens are replaced from the endpoint payload by dot-path,
		 * using the same {@link getByPath} that resolves `valueField` — so a
		 * caption can say what the number MEANS rather than repeating it:
		 *
		 *   caption: '{levelName} · {currentStreakDays}-day streak'
		 *
		 * WHY THIS EXISTS. Without it a tile needing a secondary line had to be
		 * a bespoke component: it could not be expressed as config, so apps
		 * wrote their own card, and that card then re-implemented fetching,
		 * loading and error handling too. Every one of those re-implementations
		 * observed so far swallowed its errors into a zero.
		 *
		 * Translation runs FIRST, so a translator sees `{levelName}` as a
		 * placeholder in the source string and can move it within the sentence —
		 * the same contract as Nextcloud's own `t()` parameters.
		 *
		 * A token with no matching field resolves to the empty string rather
		 * than being left as `{levelName}` on screen: a caption is decoration,
		 * and showing a reader a raw token is worse than showing them less.
		 *
		 * @return {string}
		 */
		resolvedCaption() {
			const caption = this.content.caption
			if (!caption) {
				return ''
			}
			const translated = this.effectiveTranslate(caption)
			if (translated.indexOf('{') === -1) {
				return translated
			}
			const payload = this.endpointMode ? this.epData : null
			return translated.replace(/\{([A-Za-z0-9_.]+)\}/g, (whole, path) => {
				const v = getByPath(payload, path)
				return (v === undefined || v === null) ? '' : String(v)
			}).replace(/\s{2,}/g, ' ').trim()
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
		 * @return {unknown}
		 */
		displayValue() {
			if (this.objectFieldMode) {
				return this.objectFieldValue
			}
			if (!this.endpointMode) {
				return this.value
			}
			const v = getByPath(this.epData, this.content.valueField)
			return v === undefined ? null : v
		},

		/**
		 * Whether the headline is text rather than a number.
		 *
		 * The KPI card is built around a number: it never wraps and never
		 * shrinks, because in a narrow tile the decoration should give way and
		 * the figure should not. A NAME needs the opposite, so it gets a variant
		 * that wraps and clamps, plus a title attribute for the full string.
		 *
		 * @return {boolean} true when the value is not numeric.
		 */
		isTextValue() {
			const v = this.displayValue
			if (v === null || v === undefined || v === '') {
				return false
			}
			return !Number.isFinite(Number(v))
		},

		/**
		 * Whether the tile renders its value as a status badge.
		 *
		 * @return {boolean} true when `content.display` is `'badge'`.
		 */
		isBadge() {
			return this.content.display === 'badge'
		},

		/**
		 * Whether the tile renders its value as a time-remaining countdown.
		 *
		 * @return {boolean} true when `content.display` is `'countdown'`.
		 */
		isCountdown() {
			return this.content.display === 'countdown'
		},

		/**
		 * The countdown block, or `{}`. `unit` is accepted and ignored: days is
		 * the only unit this renders, and saying so is better than pretending
		 * an hours or weeks mode exists.
		 *
		 * @return {object} The countdown config.
		 */
		countdownConfig() {
			const cfg = this.content.countdown
			return (cfg && typeof cfg === 'object') ? cfg : {}
		},

		/**
		 * Whole LOCAL CALENDAR DAYS from today to the tile's value read as a
		 * date. Positive is still to come, 0 is today, negative has passed.
		 *
		 * Zero is today because both ends are collapsed onto the calendar day
		 * they fall on and then subtracted: a deadline dated today is the same
		 * day as today, and the same day is a distance of nothing. Not 1 (which
		 * would claim a day that is already being spent) and not −1 (which
		 * would call a deadline that has not passed overdue).
		 *
		 * Null when the tile is not in countdown mode, or when the value holds
		 * no readable date — which is what keeps `NaN` off the tile.
		 *
		 * @return {number|null} The signed day count, or null.
		 */
		countdownDays() {
			if (!this.isCountdown) {
				return null
			}
			const due = calendarDay(this.displayValue)
			if (due === null) {
				return null
			}
			const now = new Date()
			const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
			return Math.round((due - today) / DAY_MS)
		},

		/**
		 * The countdown sentence: the past wording for a date that has gone by,
		 * the today wording for today, the future wording otherwise. `{n}` is
		 * the number of days, never signed — "−3 days left" is exactly the
		 * reading this mode exists to prevent.
		 *
		 * The built-in wordings carry their own singular, so a tile that
		 * configures nothing still reads "1 day left" rather than "1 days
		 * left". A configured `futureLabel` / `pastLabel` replaces both forms,
		 * because a manifest author writing their own wording is the one who
		 * knows how their language counts.
		 *
		 * @return {string} The sentence, or '' when there is nothing to count.
		 */
		countdownText() {
			const days = this.countdownDays
			if (days === null) {
				return ''
			}
			const cfg = this.countdownConfig
			if (days === 0) {
				return this.effectiveTranslate(cfg.todayLabel || 'Today')
			}
			const n = Math.abs(days)
			const past = days < 0
			let template = past ? cfg.pastLabel : cfg.futureLabel
			if (typeof template !== 'string' || template === '') {
				if (past) {
					template = n === 1 ? 'Overdue by {n} day' : 'Overdue by {n} days'
				} else {
					template = n === 1 ? '{n} day left' : '{n} days left'
				}
			}
			return this.effectiveTranslate(template).replace(/\{n\}/g, String(n))
		},

		/**
		 * The colour the countdown itself asks for: error once the date has
		 * passed or the day count is at or below `dangerAt`, warning at or
		 * below `warnAt`, else ''.
		 *
		 * A passed date is the danger colour whether or not `dangerAt` is
		 * configured: overdue is not a threshold anybody has to opt into. Both
		 * thresholds are INCLUSIVE, and `dangerAt` is tested first, so exactly
		 * 5 days with `dangerAt: 5` is danger and not warning even when
		 * `warnAt` also matches.
		 *
		 * @return {string} 'error', 'warning', or ''.
		 */
		countdownVariant() {
			const days = this.countdownDays
			if (days === null) {
				return ''
			}
			if (days < 0) {
				return 'error'
			}
			const cfg = this.countdownConfig
			if (Number.isFinite(cfg.dangerAt) && days <= cfg.dangerAt) {
				return 'error'
			}
			if (Number.isFinite(cfg.warnAt) && days <= cfg.warnAt) {
				return 'warning'
			}
			return ''
		},

		/**
		 * The first `content.overrides` entry whose `when` matches the BOUND
		 * RECORD, or null. Needs a detail-page record: on a dashboard there is
		 * nothing to test, so no override applies.
		 *
		 * @return {object|null} The matching override.
		 */
		activeOverride() {
			const rules = this.content.overrides
			if (!Array.isArray(rules) || rules.length === 0) {
				return null
			}
			const record = this.objectCtx?.object
			if (!record || typeof record !== 'object') {
				return null
			}
			return rules.find((rule) => rule && this.matchesOverride(record, rule.when)) || null
		},

		/**
		 * The translated `content.emptyText` when it applies, else ''.
		 *
		 * It applies to an empty value, and to an `objectField` reference whose
		 * lookup found nothing. Without `emptyText` an unresolvable reference
		 * keeps showing its raw value, as it always has.
		 *
		 * In countdown mode it applies to an UNREADABLE date as well, not only
		 * to an absent one. `'not yet planned'` is a perfectly non-empty value
		 * and there is no countdown to be had from it, so without this the tile
		 * would print the raw string where a deadline belongs.
		 *
		 * @return {string} The text to show instead of the value, or ''.
		 */
		emptyValueText() {
			const text = this.isCountdown
				? (this.countdownConfig.emptyText || this.content.emptyText)
				: this.content.emptyText
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			const v = this.displayValue
			const empty = v === null || v === undefined || v === ''
			if (empty || (this.objectFieldMode && this.referenceFailed) || (this.isCountdown && this.countdownDays === null)) {
				return this.effectiveTranslate(text)
			}
			return ''
		},

		/**
		 * The text the tile shows: an override's label, else the countdown
		 * sentence, else the empty text, else the formatted value.
		 *
		 * The override sits above the countdown for the same reason it sits
		 * above a badge's status: a suspended case is not waiting for its
		 * deadline, so it reads as suspended.
		 *
		 * @return {string} The shown text.
		 */
		shownValue() {
			const override = this.activeOverride
			if (override && typeof override.label === 'string' && override.label !== '') {
				return this.effectiveTranslate(override.label)
			}
			return this.countdownText || this.emptyValueText || this.formattedValue
		},

		/**
		 * Whether the shown text replaced the formatted value. Such a text is a
		 * word, so it takes the wrapping text style of a name.
		 *
		 * @return {boolean} true when an override or the empty text is shown.
		 */
		shownValueIsText() {
			return this.shownValue !== this.formattedValue
		},

		/**
		 * The variant the RESOLVED ROW asks for through
		 * `objectField.resolve.variantField` / `variantMap`, or ''.
		 *
		 * @return {string} The variant name, or ''.
		 */
		rowVariant() {
			const cfg = this.content.objectField
			const resolve = (cfg && typeof cfg === 'object') ? cfg.resolve : null
			if (!resolve || !resolve.variantField || !this.referenceRow) {
				return ''
			}
			const raw = getByPath(this.referenceRow, resolve.variantField)
			if (raw === undefined || raw === null) {
				return ''
			}
			const map = resolve.variantMap
			if (map && typeof map === 'object') {
				const hit = map[String(raw)]
				return typeof hit === 'string' ? hit : ''
			}
			return typeof raw === 'string' ? raw : ''
		},

		/**
		 * The CnStatusBadge variant in badge mode. Same precedence as the text
		 * colour: override, `variantWhen`, at-limit, resolved row, static
		 * `variant`. The first one that names a badge variant wins.
		 *
		 * @return {string} A CnStatusBadge variant.
		 */
		badgeVariant() {
			const rule = this.activeVariantRule
			const candidates = [
				this.activeOverride?.variant,
				rule?.variant,
				this.atLimit ? 'warning' : '',
				this.rowVariant,
				this.content.variant,
			]
			for (const candidate of candidates) {
				const variant = candidate === 'danger' ? 'error' : candidate
				if (BADGE_VARIANTS.includes(variant)) {
					return variant
				}
			}
			return 'default'
		},

		/**
		 * Whether the tile reads a field off the BOUND RECORD rather than
		 * aggregating or calling an endpoint (`content.objectField`).
		 *
		 * The record is already loaded by the detail page, so this costs no
		 * request at all. It is what lets a KPI row headline a case's type or
		 * its assignee beside the counts, instead of those facts being buried
		 * three rows down in the properties grid.
		 *
		 * @return {boolean} true in object-field mode.
		 */
		objectFieldMode() {
			const of = this.content.objectField
			return !!(of && (typeof of === 'string' || of.field))
		},

		/**
		 * The bound record's value for `content.objectField`.
		 *
		 * A reference field holds a uuid, which is not something to show a
		 * person, so `resolve` names the register/schema to look the label up in.
		 * The resolved label replaces the uuid; an unresolvable id falls back to
		 * the raw value rather than blanking, exactly as CnFkResolveCell does.
		 *
		 * @return {unknown} The field's value, or null.
		 */
		/**
		 * The bound record's raw value for `content.objectField`, before any
		 * reference resolution.
		 *
		 * @return {unknown} The raw field value, or null.
		 */
		objectFieldRaw() {
			const cfg = this.content.objectField
			const field = typeof cfg === 'string' ? cfg : cfg?.field
			const record = this.objectCtx?.object
			if (!record || !field) {
				return null
			}
			const raw = getByPath(record, field)
			return (raw === undefined || raw === '') ? null : raw
		},

		/**
		 * @return {unknown} The field's value, or null.
		 */
		objectFieldValue() {
			if (this.objectFieldRaw === null) {
				return null
			}
			// An unresolved or unresolvable reference falls back to the raw value
			// rather than blanking, the same way CnFkResolveCell does.
			return this.referenceLabel !== null ? this.referenceLabel : this.objectFieldRaw
		},

		/**
		 * Loading state for the active source (endpoint or OpenRegister).
		 *
		 * @return {boolean}
		 */
		displayLoading() {
			// A reference lookup is a request like any other, and it is the only
			// one the record mode makes. Leaving it out meant the tile rendered
			// the raw uuid as if it were the answer while the request was still
			// out.
			if (this.objectFieldMode) {
				return this.referencePending
			}
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
			if (!this.endpointMode || !this.content.previousField) {
				return null
			}
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
			if (!this.endpointMode) {
				return null
			}
			if (this.content.deltaField) {
				const v = Number(getByPath(this.epData, this.content.deltaField))
				return Number.isFinite(v) ? v : null
			}
			const prev = this.previousValue
			const cur = Number(this.displayValue)
			if (prev === null || prev === 0 || !Number.isFinite(cur)) {
				return null
			}
			return ((cur - prev) / Math.abs(prev)) * 100
		},

		/** The signed trend percent, e.g. "+12.3%". */
		formattedTrend() {
			if (this.trendPct === null) {
				return ''
			}
			const sign = this.trendPct > 0 ? '+' : ''
			return `${sign}${this.trendPct.toFixed(1)}%`
		},

		/** The arrow component for the trend direction. */
		trendIcon() {
			if (this.trendPct === null || Math.abs(this.trendPct) < 0.05) {
				return 'TrendingNeutral'
			}
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
			if (this.trendPct === null || Math.abs(this.trendPct) < 0.05) {
				return 'var(--color-text-maxcontrast)'
			}
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
			if (!Array.isArray(rules) || rules.length === 0) {
				return null
			}
			const current = this.displayValue
			if (current === null || current === undefined) {
				return null
			}
			return rules.find((r) => r && this.matchesRule(current, r)) || null
		},

		/**
		 * The CSS colour for the matched variant rule ('' = keep the
		 * configured colours).
		 *
		 * @return {string}
		 */
		variantColor() {
			// An override describes the RECORD's state (a suspended case), which
			// outranks anything the value itself suggests.
			const override = this.activeOverride
			if (override && override.variant) {
				return VARIANT_COLORS[override.variant] || ''
			}
			const rule = this.activeVariantRule
			if (rule && rule.variant) {
				return VARIANT_COLORS[rule.variant] || ''
			}
			// The countdown's own threshold sits below `variantWhen`, which is
			// the author naming a colour outright, and above the at-limit tint,
			// which is the generic one. A passed date reports `error` from here
			// whether or not a threshold was configured.
			if (this.countdownVariant) {
				return VARIANT_COLORS[this.countdownVariant] || ''
			}
			// An explicit variantWhen rule always wins: a tile that says how it
			// wants to be coloured is not overruled by the generic at-limit tint.
			if (this.atLimit) {
				return VARIANT_COLORS.warning || ''
			}
			// The resolved row's colour sits just above the static floor. An
			// unknown name falls through rather than blanking the tile.
			if (this.rowVariant && VARIANT_COLORS[this.rowVariant]) {
				return VARIANT_COLORS[this.rowVariant]
			}
			// A STATIC `variant` is the floor, below both of the above: it is the
			// tile's resting colour, not a signal about the current value, so a
			// threshold rule or an at-limit warning must be able to override it.
			//
			// It exists because that is how CnStatsBlock has always been coloured
			// (`variant="success"`), and a tile migrating from a bespoke card to
			// this component would otherwise silently lose its colour — a change
			// nothing would report, on a dashboard where colour is the fastest
			// thing a reader takes in.
			if (this.content.variant) {
				return VARIANT_COLORS[this.content.variant] || ''
			}
			return ''
		},

		/**
		 * The icon shown in the circle: a matched variant rule's `icon`
		 * override, else `content.icon`.
		 *
		 * @return {string}
		 */
		resolvedIcon() {
			const override = this.activeOverride
			const rule = this.activeVariantRule
			return (override && override.icon) || (rule && rule.icon) || this.content.icon || ''
		},

		/**
		 * Card orientation. Horizontal (icon beside the number) is the
		 * canonical KPI card; `content.layout: 'vertical'` stacks the icon
		 * above a centred number for a tile taller than it is wide.
		 *
		 * @return {'horizontal'|'vertical'}
		 */
		cardLayout() {
			return (this.content || {}).layout === 'vertical' ? 'vertical' : 'horizontal'
		},

		/**
		 * Whether the card draws no box of its own. On by default: every stat
		 * tile is rendered inside a CnWidgetWrapper that already draws a card,
		 * so a second box is a card inside a card. Set `content.flat: false`
		 * for a tile mounted somewhere with no wrapper around it.
		 *
		 * @return {boolean}
		 */
		flat() {
			return (this.content || {}).flat !== false
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
			if (this.limitValue === null) {
				return ''
			}
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
			if (this.limitValue === null) {
				return false
			}
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

		objectFieldRaw: {
			immediate: true,
			handler() {
				this.resolveReference()
			},
		},
	},

	mounted() {
		this.fetchValue()
	},

	methods: {
		/**
		 * Resolve an `objectField` that holds a reference uuid to the referenced
		 * object's label, through the shared object store (per-schema caching and
		 * in-flight dedup come for free).
		 *
		 * Does nothing unless `objectField.resolve` names a register and schema:
		 * a plain scalar field needs no lookup, and guessing that a string looks
		 * like a uuid would turn a legitimate identifier into a failed fetch.
		 *
		 * @return {Promise<void>}
		 */
		async resolveReference() {
			this.referenceLabel = null
			this.referenceRow = null
			this.referenceFailed = false
			this.referencePending = false
			const cfg = this.content.objectField
			const resolve = (cfg && typeof cfg === 'object') ? cfg.resolve : null
			const raw = this.objectFieldRaw
			if (!resolve || !resolve.register || !resolve.schema || !raw) {
				return
			}

			// Assigned by the try below, and the catch returns rather than falling
			// through, so an initialiser here would never be read.
			let store
			try {
				store = useObjectStore()
			} catch {
				// No active Pinia: the tile shows the raw value, which is correct
				// and never blank.
				return
			}
			if (!store) {
				return
			}

			const type = resolveObjectOpType(store, { register: resolve.register, schema: resolve.schema })
			const id = String(raw)
			const cached = store.objects && store.objects[type] && store.objects[type][id]
			// Only an actual request pends. A cache hit resolves in the same
			// tick, and flagging it would flicker a loading icon for nothing.
			if (!cached) {
				this.referencePending = true
			}
			try {
				const obj = cached || await store.fetchObject(type, id)
				// The record may have moved on while the lookup was in flight.
				// The newer call owns the state, so this one touches nothing.
				if (String(this.objectFieldRaw) !== id) {
					return
				}
				this.referencePending = false
				if (obj && typeof obj === 'object') {
					this.referenceRow = obj
				}
				const label = this.pickReferenceLabel(obj, resolve.labelField)
				if (label) {
					this.referenceLabel = label
				} else {
					this.referenceFailed = true
				}
			} catch {
				// Leave the raw value showing, unless `emptyText` says otherwise.
				if (String(this.objectFieldRaw) === id) {
					this.referencePending = false
					this.referenceFailed = true
				}
			}
		},

		/**
		 * Whether an override's `when` matches the bound record. Uses the local
		 * `visibleWhen` grammar (`{ field, op, value }`); a `when` with neither
		 * `op` nor `value` is a truthiness test on the field.
		 *
		 * @param {object} record The bound record.
		 * @param {{field: string, op?: string, value?: unknown}} when The condition.
		 * @return {boolean} True when the override applies.
		 */
		matchesOverride(record, when) {
			if (!when || typeof when !== 'object' || typeof when.field !== 'string' || when.field === '') {
				return false
			}
			const compares = Object.hasOwn(when, 'value') || Boolean(when.op)
			if (!compares) {
				return Boolean(readVisibleWhenPath(record, when.field))
			}
			return evaluateVisibleWhenLocal(when, record)
		},

		/**
		 * Pick a display label off a resolved reference: the configured field
		 * first, then `title`, then `@self.name`. A per-language map collapses to
		 * its first non-empty value.
		 *
		 * @param {object|null} obj The referenced object.
		 * @param {string} [labelField] The preferred label property.
		 * @return {string} The label, or '' when none is usable.
		 */
		pickReferenceLabel(obj, labelField) {
			if (!obj || typeof obj !== 'object') {
				return ''
			}
			const candidates = [obj[labelField || 'title'], obj.title, obj.name, obj['@self'] && obj['@self'].name]
			for (const value of candidates) {
				if (typeof value === 'string' && value !== '') {
					return value
				}
				if (typeof value === 'number') {
					return String(value)
				}
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					const first = Object.values(value).find((v) => typeof v === 'string' && v !== '')
					if (first) {
						return first
					}
				}
			}
			return ''
		},

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
			if (!preset) {
				return
			}
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
		 * @param {unknown} current The current display value.
		 * @param {{op: string, value: unknown}} rule The threshold rule.
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
			if (!filter || typeof filter !== 'object') {
				return
			}
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
					for (const [op, ov] of Object.entries(v)) {
						target[`filter[${k}][${op}]`] = ov
					}
				} else if (v !== '' && v !== null && v !== undefined) {
					target[`filter[${k}]`] = v
				}
			}
		},

		/**
		 * Fetch one scalar from the OpenRegister `/value` aggregation endpoint.
		 *
		 * @param {object} axios The axios instance.
		 * @param {(url: string, params?: object) => string} generateUrl The router helper.
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
			if (field) {
				params.field = field
			}
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
		 * @param {object} axios The axios instance.
		 * @param {(url: string, params?: object) => string} generateUrl The router helper.
		 * @param {object} s The weighted source `{ field, weightField, divisor?, filter?, limit? }`.
		 * @return {Promise<number|null>} The weighted sum.
		 */
		async fetchWeighted(axios, generateUrl, s) {
			if (!s.field || !s.weightField) {
				return null
			}
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
				if (Number.isFinite(v) && Number.isFinite(w)) {
					sum += (v * w) / divisor
				}
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
			if (typeof str !== 'string') {
				return str
			}
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
		 * @return {unknown} The resolved value or undefined.
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
		 * @param {object} axios The axios instance.
		 * @param {(url: string, params?: object) => string} generateUrl The router helper.
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
			if (extracted === undefined || extracted === null) {
				return null
			}
			const num = Number(extracted)
			return Number.isFinite(num) ? num : extracted
		},
	},
}
</script>

<style scoped>
/*
 * The card itself — its box, body stack, icon circle, title and value
 * typography — is the CANONICAL KPI card in src/css/kpi-card.css, shared with
 * CnStatsBlock. What remains here is only what is specific to THIS widget: the
 * range select, the "/ limit" denominator, the trend chip and the error glyph.
 *
 * Every size below is expressed against the shared `--cn-kpi-*` scale rather
 * than as its own number, so the widget's extras re-scale with the card they
 * sit in. Resist adding card styling back, and resist restating a value the
 * scale already holds; that is what split the two KPI looks apart in the first
 * place.
 */

/* The title row carries an optional range select beside the label, which the
   canonical `__title` (a plain truncating heading) does not account for. */
.cn-stat-widget__label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	width: 100%;
}

/* Stacked tile: the label and its range select centre over the number rather
   than spreading to the card's edges. */
.cn-kpi-card--vertical .cn-stat-widget__label {
	justify-content: center;
	width: auto;
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
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
	font-size: var(--cn-kpi-label-size, 13px);
	font-weight: normal;
	cursor: pointer;
}

.cn-stat-widget__range:hover,
.cn-stat-widget__range:focus-visible {
	background: var(--color-background-hover);
	color: var(--color-main-text);
}

/* Badge mode: the pill takes the value's place in the row. Sized to the
   card's label scale so it sits in the row without pushing the tile taller. */
.cn-stat-widget__badge {
	flex: 0 1 auto;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: var(--cn-kpi-label-size, 13px);
}

/* The denominator of a "value / limit" pair. Deliberately quieter and smaller
   than the value: the tile's subject is what the number IS, not what it is
   allowed to reach. Shares the value's `nowrap` so the pair never breaks. */
.cn-stat-widget__limit {
	flex: 0 0 auto;
	font-size: var(--cn-kpi-value-size-compact, 1.25rem);
	font-weight: var(--cn-kpi-title-weight, 600);
	line-height: var(--cn-kpi-value-line, 1.1);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
	white-space: nowrap;
}

.cn-stat-widget__trend {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: var(--cn-kpi-label-size, 13px);
	font-weight: var(--cn-kpi-title-weight, 600);
}

/* The dash shown when the number could not be fetched. It stands where the
   value stands, so it takes the value's size and weight — CnStatsBlock's own
   error dash is literally a `cn-kpi-card__value`, and two components showing
   the same failure at two different sizes is the drift this consolidation
   exists to remove. Only the colour differs: a failure is not a number. */
.cn-stat-widget__error {
	font-size: var(--cn-kpi-value-size, 2rem);
	font-weight: var(--cn-kpi-value-weight, 700);
	line-height: var(--cn-kpi-value-line, 1.1);
	color: var(--cn-kpi-label-color, var(--color-text-maxcontrast));
}
</style>
