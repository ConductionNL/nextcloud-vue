<!--
  CnChartWidget — Renders charts inside dashboard widgets.

  A thin wrapper around ApexCharts for use in CnDashboardPage widget slots.
  Supports area, line, bar, pie, donut, and radialBar chart types.
  Automatically adapts to the widget container size.

  ApexCharts is loaded as a peer dependency — consuming apps must
  install `apexcharts` and `vue-apexcharts` in their own package.json.
-->
<template>
	<div class="cn-chart-widget" :class="{ 'cn-chart-widget--fit': fitToContainer }">
		<!-- In-widget view switcher (Wave-4 amendment folded into Wave 3,
		     #91): a compact pill row that switches which named series /
		     value format render. Pure display — no series arithmetic.
		     Renders only when 2+ views are configured. -->
		<div
			v-if="views.length > 1"
			class="cn-chart-widget__views"
			role="group"
			:aria-label="viewsGroupLabel"
			data-testid="cn-chart-widget-views">
			<button
				v-for="view in views"
				:key="view.key"
				type="button"
				class="cn-chart-widget__view-pill"
				:class="{ 'cn-chart-widget__view-pill--active': activeView && activeView.key === view.key }"
				:aria-pressed="String(Boolean(activeView && activeView.key === view.key))"
				:data-testid="`cn-chart-widget-view-${view.key}`"
				@click="activeViewKey = view.key">
				{{ view.label || view.key }}
			</button>
		</div>
		<div v-if="showEmptyState" class="cn-chart-widget__empty" data-testid="cn-chart-widget-empty">
			{{ emptyLabel }}
		</div>
		<!-- Sizing box for the apexcharts mount. apexcharts resolves a
		     percentage `height` against its element's PARENT (Core.js
		     setSVGDimensions → Utils.getDimensions(el.parentNode)), so a
		     container-fitting chart needs a parent whose height is the space
		     left over — not one sized by the chart itself. This box is
		     `flex: 1 1 0` inside the flex column, so its height is the
		     leftover after the view-switcher row, independent of the chart's
		     own height. Without it the percentage would resolve against the
		     content-sized root and either collapse to 0 or ignore the pill
		     row. -->
		<div v-else-if="chartComponent" class="cn-chart-widget__canvas">
			<component
				:is="chartComponent"
				ref="chart"
				:type="type"
				:height="computedHeight"
				:width="computedWidth"
				:options="mergedOptions"
				:series="displayedSeries" />
		</div>
		<div v-else class="cn-chart-widget__fallback">
			<!-- @slot Rendered when the ApexCharts peer dependency is not available (defaults to the unavailableLabel text). -->
			<slot name="fallback">
				<p class="cn-chart-widget__error">
					{{ unavailableLabel }}
				</p>
			</slot>
		</div>
	</div>
</template>

<script>
import { inject, ref } from 'vue'
import { translate as t, getLanguage } from '@nextcloud/l10n'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import VueApexCharts from 'vue3-apexcharts'
import { useDataSource } from '../../composables/useDataSource.js'
import { useEndpointSource, getByPath } from '../../composables/useEndpointSource.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { safeCurrencyCode } from '../../utils/formatMetric.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'

/** Event-bus channel CnWidgetWrapper's Refresh action broadcasts on. */
const REFRESH_BUS_CHANNEL = 'cn:widget:refresh'

/**
 * Sentinel raw key of the folded "Other" bucket (Wave 3 aggregate top-N).
 * Never a real category value, so drilldown clicks on it are skipped.
 */
const OTHER_BUCKET_KEY = '__other__'

/**
 * CnChartWidget — Chart component for dashboard widgets.
 *
 * Wraps ApexCharts with sensible defaults for Nextcloud theming.
 * Apps must install `apexcharts` and `vue-apexcharts` as dependencies.
 * Basic area chart
 * ```vue
 * <CnChartWidget
 *   type="area"
 *   :series="[{ name: 'Searches', data: [10, 41, 35, 51] }]"
 *   :categories="['Mon', 'Tue', 'Wed', 'Thu']"
 *   :height="250" />
 * Pie chart
 * <CnChartWidget
 *   type="pie"
 *   :series="[44, 55, 13]"
 *   :labels="['Active', 'Pending', 'Closed']" />
 * With custom options
 * <CnChartWidget
 *   type="bar"
 *   :series="barSeries"
 *   :options="{ plotOptions: { bar: { horizontal: true } } }" />
 * ```
 *
 * Manifest usage — when CnDashboardPage's widget dispatcher sees
 * `widgetDef.type === 'chart'` it mounts CnChartWidget automatically,
 * forwarding `widgetDef.props.chartKind` as the `type` prop and
 * `series` / `categories` / `labels` / `options` / `colors` / `toolbar` /
 * `legend` / `height` / `width` / `unavailableLabel` directly. Manifest
 * authors do NOT mount this component themselves — declare a chart
 * widget in `pages[].config.widgets[]` instead. See CnDashboardPage's
 * leading docblock for the manifest example.
 */
export default {
	name: 'CnChartWidget',

	inject: {
		/**
		 * Reactive date-range provided by an ancestor `CnDashboardPage`.
		 * When the dashboard's `dateRange.enabled` is `true`, the ref's
		 * value is `{ from, to, preset }`; otherwise it stays `null`.
		 * The widget passes this through to `useDataSource` so the
		 * bucket shorthand's `fromVar` / `toVar` GraphQL variables
		 * track the dashboard's range automatically.
		 *
		 * Default factory: `() => ref(null)`. This keeps isolated
		 * mounts (Storybook, jest with `shallowMount`) safe — there's
		 * always a ref to inject, even outside a dashboard.
		 */
		cnDashboardDateRange: { default: () => ref(null) },
	},

	props: {
		/**
		 * Chart type: area, line, bar, pie, donut, radialBar
		 * @type {string}
		 */
		type: {
			type: String,
			default: 'area',
			validator: (v) => ['area', 'line', 'bar', 'pie', 'donut', 'radialBar'].includes(v),
		},
		/**
		 * Chart data series. Format depends on chart type.
		 * For line/area/bar: [{ name: string, data: number[] }]
		 * For pie/donut: number[]
		 * @type {Array}
		 */
		series: {
			type: Array,
			default: () => [],
		},
		/**
		 * X-axis categories (for line, area, bar charts)
		 * @type {Array<string>}
		 */
		categories: {
			type: Array,
			default: () => [],
		},
		/**
		 * Labels (for pie, donut charts)
		 * @type {Array<string>}
		 */
		labels: {
			type: Array,
			default: () => [],
		},
		/**
		 * Chart height. A number (or `'250px'`) pins the height in pixels. A
		 * percentage — `'100%'` — fits the chart to its container instead, which
		 * is what a fixed-height surface such as a dashboard tile wants: a
		 * pinned height taller than the tile turns the tile into a scroll
		 * region. `'auto'` derives the height from the width (16:10 for axis
		 * charts). Container fitting needs an ancestor with a resolved height.
		 * @type {number|string}
		 */
		height: {
			type: [Number, String],
			default: 250,
		},
		/**
		 * Chart width. Defaults to '100%' (fills container).
		 * @type {number|string}
		 */
		width: {
			type: [Number, String],
			default: '100%',
		},
		/**
		 * Custom ApexCharts options (deep-merged with defaults).
		 * @type {object}
		 */
		options: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Chart color palette. Defaults to Nextcloud theme colors.
		 * @type {Array<string>}
		 */
		colors: {
			type: Array,
			default: () => [],
		},
		/**
		 * Show or hide the toolbar (zoom, download, etc.)
		 * @type {boolean}
		 */
		toolbar: {
			type: Boolean,
			default: false,
		},
		/**
		 * Show or hide the legend
		 * @type {boolean}
		 */
		legend: {
			type: Boolean,
			default: true,
		},
		/**
		 * Label shown when ApexCharts is not available
		 * @type {string}
		 */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Chart library not available'),
		},
		/**
		 * Render bar charts horizontally (row bars instead of columns).
		 * Only meaningful for `type: "bar"`; an explicit
		 * `options.plotOptions.bar.horizontal` still wins (deep-merge).
		 * @type {boolean}
		 */
		horizontal: {
			type: Boolean,
			default: false,
		},
		/**
		 * Legend placement override: `top | bottom | left | right`. Empty (the
		 * default) keeps the pre-existing automatic placement (bottom for
		 * pie-family charts, top otherwise).
		 * @type {string}
		 */
		legendPosition: {
			type: String,
			default: '',
			validator: (v) => ['', 'top', 'bottom', 'left', 'right'].includes(v),
		},
		/**
		 * Named value formatter applied to the VALUE axis labels and the
		 * tooltip: `"currency"` (Intl currency, 0 decimals), `"currency-compact"`
		 * (compact notation, e.g. `€ 1,2K`), or `"percent"` (appends `%`). The
		 * object form `{ name, currency?, decimals? }` overrides the ISO-4217
		 * currency code (EUR default, guarded) and the fraction digits.
		 * `null` (the default) keeps raw values.
		 * @type {string|{name: string, currency?: string, decimals?: number}|null}
		 */
		valueFormat: {
			type: [String, Object],
			default: null,
		},
		/**
		 * Per-category colour map (`{ categoryLabel: cssColor }`) applied to
		 * pie / donut / radialBar slices and (distributed) bar categories.
		 * Categories without an entry keep the default palette colour. `null`
		 * (the default) keeps the palette-based colouring.
		 * @type {Record<string, string>|null}
		 */
		colorMap: {
			type: Object,
			default: null,
		},
		/**
		 * Empty-state message rendered INSTEAD of the chart when the resolved
		 * series contain no data points. Empty (the default) keeps the
		 * pre-existing behaviour (an empty chart canvas).
		 * @type {string}
		 */
		emptyLabel: {
			type: String,
			default: '',
		},
		/**
		 * Manifest dataSource block. When set, `series` /
		 * `categories` / `labels` are resolved from the GraphQL
		 * response via the dataSource selectors and override the
		 * static props of the same names. Static props remain the
		 * fallback while the query is loading or when no
		 * dataSource is configured.
		 *
		 * Supported shapes (one of):
		 * - Count shorthand: `{ register?, schema, filter?, aggregate: 'count' }`
		 * - Bucket shorthand: `{ register?, schema, filter?,
		 *     bucket: { field, interval, metric?, metricField?,
		 *               fromVar?, toVar?, staticRange? } }` — emits OR's
		 *     `groupBy` argument. When mounted under a CnDashboardPage
		 *     with `dateRange.enabled`, `from` / `to` come from the
		 *     injected `cnDashboardDateRange` ref; otherwise they come
		 *     from `bucket.staticRange`. If neither is available no
		 *     query is fired and the chart shows its fallback.
		 * - Raw GraphQL: `{ graphql: { query, variables?, selectors } }`.
		 * - Aggregation shorthand (Wave 3, #91): `aggregate` as an OBJECT —
		 *   `{ groupBy, metric?: 'count'|'sum', sumField?, topN?,
		 *     otherBucket?, labelResolve?: { register?, schema, labelField?,
		 *     colorField? } }` — a categorical group-by over the schema's
		 *   objects. Served by OpenRegister's `/grouped` facet endpoint
		 *   (the server aggregates); when that endpoint is unavailable the
		 *   widget falls back to fetching the collection and grouping
		 *   client-side. `topN` keeps the N largest groups (sorted by value
		 *   desc) and `otherBucket: true` folds the remainder into a single
		 *   translated "Other" slice (sum of the rest). `labelResolve`
		 *   swaps reference (uuid) group keys for the referenced objects'
		 *   `labelField` labels via the shared object store (per-id cache +
		 *   request dedup — the fkResolve pattern), and `colorField` reads a
		 *   per-category colour off each referenced object (feeding the
		 *   same per-category colour path as the `colorMap` prop, which
		 *   wins on overlap). `metric: 'sum'` requires `sumField`.
		 *
		 * Drilldown (Wave 3, #91): a sibling `drilldown: { route,
		 * filterParam }` block makes every segment / bar click navigate to
		 * `route` (a route NAME, or a PATH when it starts with `/`) with
		 * the clicked category's RAW key in the query —
		 * `{ [filterParam]: rawKey }` — so an index page opens pre-filtered.
		 * The folded "Other" bucket never navigates (it has no single
		 * category value).
		 *
		 * @type {{
		 *   register?: string,
		 *   schema?: string,
		 *   filter?: object,
		 *   aggregate?: ('count'|{ groupBy: string, metric?: string, sumField?: string, topN?: number, otherBucket?: boolean, labelResolve?: { register?: string, schema: string, labelField?: string, colorField?: string } }),
		 *   drilldown?: { route: string, filterParam: string },
		 *   bucket?: { field: string, interval: string, metric?: string, metricField?: string, fromVar?: string, toVar?: string, staticRange?: { from: string, to: string } },
		 *   graphql?: { query: string, variables?: object, selectors: object }
		 * }|null}
		 */
		dataSource: {
			type: Object,
			default: null,
		},
		/**
		 * Endpoint data binding (Wave 2, #91). Reads `series` / `categories` /
		 * `labels` from an arbitrary app REST endpoint through the shared
		 * `useEndpointSource` engine (token-resolved `params`, per-(url+params)
		 * request dedup + short-TTL cache, `cn:page:refresh` subscription).
		 * Exactly one of `dataSource` | `endpointSource` (validator-enforced);
		 * endpoint data wins when both slip through. Static `series` /
		 * `categories` / `labels` props stay the fallback while loading.
		 *
		 * The response mapping keys live INSIDE this block (not as sibling
		 * props) because the flat `series` / `labels` prop names already carry
		 * the static data:
		 * - `responsePath` — dot-path pluck of the payload (default whole body).
		 * - When the payload is an ARRAY of points (e.g. pipelinq
		 *   `/api/analytics/trends` → `series: [{ date, value }]` with
		 *   `responsePath: 'series'`): `labelsPath` / `series[].path` are
		 *   PER-ITEM field paths — `labelsPath: 'date'`,
		 *   `series: [{ name: 'Leads', path: 'value' }]`.
		 * - When the payload is an OBJECT: `labelsPath` / `series[].path`
		 *   point at parallel arrays — `labelsPath: 'labels'`,
		 *   `series: [{ name: 'Total', path: 'totals' }]`.
		 *
		 * Pie-family charts (`pie` / `donut` / `radialBar`) flatten the FIRST
		 * mapped series into the flat value array ApexCharts expects. `params`
		 * values use the shared filter-token grammar (`@workspace.dateFrom?`,
		 * `@workspace.datePreset?`, `@me`, `@today±Nd`, …) and re-resolve +
		 * refetch automatically when the dashboard date range changes (the
		 * page publishes `dateFrom` / `dateTo` / `datePreset` into the
		 * workspace context).
		 *
		 * @type {{url: string, method?: string, params?: object, responsePath?: string, labelsPath?: string, series?: Array<{name?: string, path: string}>}|null}
		 */
		endpointSource: {
			type: Object,
			default: null,
		},
		/**
		 * In-widget view switcher (the Wave-4 amendment folded into Wave 3,
		 * #91): each entry declares a named display view —
		 * `{ key, label?, series?, valueFormat? }`. When 2+ views are
		 * configured a compact pill row renders above the chart; the active
		 * view's `series` (an array of series NAMES) filters which of the
		 * resolved cartesian series render, and its `valueFormat` overrides
		 * the widget-level `valueFormat` (same named-formatter grammar).
		 * This is PURE DISPLAY — no series arithmetic — covering the €/%
		 * and hours/% toggles (shillinq Margin / BillableHours) with zero
		 * client-side computation. Empty (the default) renders no switcher.
		 *
		 * @type {Array<{key: string, label?: string, series?: string[], valueFormat?: (string|object)}>}
		 */
		views: {
			type: Array,
			default: () => [],
		},
		/**
		 * Widget id used to match `cn:widget:refresh` event-bus events
		 * (broadcast by CnWidgetWrapper's Refresh action). When the bus
		 * fires with a matching `widgetId`, the chart re-queries its
		 * `dataSource`. Passed by CnDashboardPage from the layout item.
		 * Empty disables bus-driven refresh (the chart still refetches
		 * reactively when its dataSource / range changes).
		 *
		 * @type {string}
		 */
		widgetId: {
			type: String,
			default: '',
		},
	},

	setup(props) {
		// useDataSource is a no-op when `dataSource` is null/undefined
		// — it never fires a request and always resolves `data.value`
		// to null, so the static `series`/`categories`/`labels` props
		// remain the source of truth in that case.
		//
		// We pipe the injected `cnDashboardDateRange` ref through as
		// the `range` source; useDataSource only reads it for the
		// bucket shorthand, so the other shorthand forms are
		// unaffected.
		//
		// Inject is also exposed via Options API (above), but reading
		// it again here in setup ensures we hand the SAME ref to
		// useDataSource — Vue treats inject() within setup and the
		// Options `inject:` declaration as the same resolution.
		const range = inject('cnDashboardDateRange', null) || ref(null)
		// The `bucket` (time), `groupBy` (category), and OBJECT-form
		// `aggregate` (Wave 3) shorthands are fetched over REST by this
		// component (fetchTimeBucket / fetchGroupBy / fetchAggregateSource)
		// against OpenRegister's /timeseries + /grouped aggregation
		// endpoints — the GraphQL bucket path is bypassed. Hide those shapes
		// from useDataSource so it stays a no-op for them (raw `graphql` /
		// the STRING `aggregate: 'count'` still flow through it).
		const dsForGraphql = () => {
			const ds = props.dataSource
			if (ds && (ds.bucket || ds.groupBy)) return null
			if (ds && ds.aggregate && typeof ds.aggregate === 'object') return null
			return ds
		}
		const { data, refetch } = useDataSource(dsForGraphql, { range })

		// Endpoint binding (Wave 2, #91): the shared useEndpointSource engine
		// resolves `params` tokens against the page-level workspace context
		// (the dashboard publishes dateFrom / dateTo / datePreset into it), so
		// a date-range change re-resolves + refetches automatically. No-op
		// while `endpointSource` is null. The chart's existing
		// cn:widget:refresh handler routes through refresh() (which also
		// re-runs this source), so no widgetId is passed here — the composable
		// still covers cn:page:refresh.
		const objectCtxRaw = inject('cnObjectContext', null)
		// v2 slot-grid detail context (CnPageRenderer holder) — backfills the
		// object token context so `@objectId` / `@object.<field>` params
		// resolve on detail surfaces where CnDetailPage is not an ancestor
		// (the ZGW sidebar-tab contract, #91 Wave 3).
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', ref({}))
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const unwrap = (v) => ((v && typeof v === 'object' && 'value' in v) ? v.value : v)
		// One token context for EVERY declarative binding on this widget —
		// the endpoint params AND the REST-aggregation source filters, so
		// `@objectId` / `@object.<field>` / `@workspace.<key>` /
		// `@config.<key>` resolve identically in both (#91 Wave 3).
		const chartTokenCtx = () => ({
			...(resolveObjectTokenContext(objectCtxRaw, detailCtxRaw) || {}),
			workspace: unwrap(workspaceRaw) || {},
			config: unwrap(appConfigRaw) || {},
		})
		const ep = useEndpointSource(
			() => props.endpointSource,
			{ ctx: chartTokenCtx },
		)
		return { dsData: data, dsRefetch: refetch, epData: ep.data, epRefetch: ep.refetch, chartTokenCtx }
	},

	data() {
		return {
			chartComponent: null,
			// Series/categories resolved from a categorical `dataSource.groupBy`
			// (REST /grouped) or a time `dataSource.bucket` (REST /timeseries),
			// kept separate from the raw-GraphQL path (`dsData`). Null until the
			// respective source resolves.
			groupByData: null,
			bucketData: null,
			// Series/categories resolved from the OBJECT-form
			// `dataSource.aggregate` (Wave 3, #91): server /grouped facet with
			// a client-side collection fallback, top-N + Other folding, and
			// fkResolve-style label/colour resolution. Shape when resolved:
			// `{ series, categories, labels, rawKeys, colorMap? }` — `rawKeys`
			// carries the UNRESOLVED group keys (uuids / raw values) so a
			// `drilldown` click navigates with the filterable value, not the
			// display label.
			aggregateData: null,
			// Active `views[]` switcher key (null = the first view). Local
			// UI state only — never persisted.
			activeViewKey: null,
			// Pre-translated aria-label for the views pill group, evaluated
			// once at creation (data, not computed — matches the dashboard
			// date-chip convention).
			viewsGroupLabel: t('nextcloud-vue', 'Chart view'),
		}
	},

	computed: {
		/**
		 * Whether `height` asks the chart to fit its container (a percentage)
		 * rather than pin a pixel height. Switches the root to a flex column
		 * with a leftover-sized canvas box so apexcharts' own percentage maths
		 * resolves against the available space.
		 *
		 * @return {boolean} true for a percentage height.
		 */
		fitToContainer() {
			return typeof this.height === 'string' && this.height.trim().endsWith('%')
		},
		computedHeight() {
			return this.height
		},
		computedWidth() {
			return this.width
		},
		/**
		 * Series/categories/labels mapped from a resolved `endpointSource`
		 * payload (Wave 2), or null while the source is absent / unresolved.
		 *
		 * Mapping rules (see the `endpointSource` prop docblock):
		 * - ARRAY payload → `labelsPath` / `series[].path` are per-item field
		 *   paths (one point per array item).
		 * - OBJECT payload → they point at parallel arrays.
		 * - Pie-family types flatten the first mapped series into the flat
		 *   value array ApexCharts expects.
		 *
		 * @return {{series: Array, categories: Array<string>, labels: Array<string>}|null}
		 */
		endpointChartData() {
			const es = this.endpointSource
			if (!es || !es.url) return null
			const payload = this.epData
			if (payload === null || payload === undefined) return null
			const seriesDefs = Array.isArray(es.series) ? es.series.filter((s) => s && s.path) : []
			let labels = []
			let mapped = []
			if (Array.isArray(payload)) {
				if (es.labelsPath) {
					labels = payload.map((pt) => {
						const v = getByPath(pt, es.labelsPath)
						return (v === null || v === undefined) ? '' : String(v)
					})
				}
				mapped = seriesDefs.map((s) => ({
					name: s.name || s.path,
					data: payload.map((pt) => Number(getByPath(pt, s.path)) || 0),
				}))
			} else {
				const rawLabels = es.labelsPath ? getByPath(payload, es.labelsPath) : undefined
				labels = Array.isArray(rawLabels)
					? rawLabels.map((v) => ((v === null || v === undefined) ? '' : String(v)))
					: []
				mapped = seriesDefs.map((s) => {
					const values = getByPath(payload, s.path)
					return {
						name: s.name || s.path,
						data: Array.isArray(values) ? values.map((v) => Number(v) || 0) : [],
					}
				})
			}
			if (['pie', 'donut', 'radialBar'].includes(this.type)) {
				return { series: (mapped[0] && mapped[0].data) || [], categories: labels, labels }
			}
			return { series: mapped, categories: labels, labels }
		},
		/**
		 * Series shown to ApexCharts. An `endpointSource` (Wave 2) wins,
		 * then the REST aggregate/bucket/groupBy data, then `dsData.series`
		 * from a GraphQL `dataSource`; otherwise falls back to the static
		 * `series` prop. Same fallback rule applies to `categories`
		 * and `labels`.
		 */
		resolvedSeries() {
			const ep = this.endpointChartData
			if (ep) return ep.series
			const rest = this.aggregateData || this.bucketData || this.groupByData
			if (rest?.series !== undefined) return rest.series
			const fromDs = this.dsData?.series
			return fromDs !== undefined ? fromDs : this.series
		},
		resolvedCategories() {
			const ep = this.endpointChartData
			if (ep) return ep.categories
			const rest = this.aggregateData || this.bucketData || this.groupByData
			if (rest?.categories !== undefined) return rest.categories
			const fromDs = this.dsData?.categories
			return fromDs !== undefined ? fromDs : this.categories
		},
		resolvedLabels() {
			const ep = this.endpointChartData
			if (ep) return ep.labels
			const rest = this.aggregateData || this.bucketData || this.groupByData
			if (rest?.labels !== undefined) return rest.labels
			const fromDs = this.dsData?.labels
			return fromDs !== undefined ? fromDs : this.labels
		},
		/**
		 * The OBJECT-form `dataSource.aggregate` block (Wave 3), or null —
		 * the STRING form (`aggregate: 'count'`) stays on the GraphQL path.
		 *
		 * @return {object|null}
		 */
		aggregateDef() {
			const agg = this.dataSource && this.dataSource.aggregate
			return (agg && typeof agg === 'object' && agg.groupBy) ? agg : null
		},
		/**
		 * The `dataSource.drilldown` block (Wave 3) when it is actionable —
		 * both `route` and `filterParam` set — else null.
		 *
		 * @return {{route: string, filterParam: string}|null}
		 */
		drilldownDef() {
			const d = this.dataSource && this.dataSource.drilldown
			return (d && d.route && d.filterParam) ? d : null
		},
		/**
		 * The RAW (unresolved) category keys backing the rendered
		 * slices/bars, index-aligned with the resolved labels — what a
		 * drilldown click puts in the route query. Aggregate and groupBy
		 * data carry explicit `rawKeys`; other paths fall back to the
		 * display labels/categories (raw == label there).
		 *
		 * @return {string[]}
		 */
		drilldownKeys() {
			const rest = this.aggregateData || this.groupByData
			if (rest && Array.isArray(rest.rawKeys)) return rest.rawKeys
			const keys = ['pie', 'donut', 'radialBar'].includes(this.type)
				? this.resolvedLabels
				: this.resolvedCategories
			return Array.isArray(keys) ? keys.map((k) => String(k)) : []
		},
		/** Stable signature of the aggregate source (else null). */
		aggregateKey() {
			const agg = this.aggregateDef
			if (!agg || !this.dataSource.schema) return null
			return JSON.stringify({
				register: this.dataSource.register || '',
				schema: this.dataSource.schema,
				filter: this.dataSource.filter || {},
				aggregate: agg,
			})
		},
		/** Stable signature of a categorical groupBy source (else null). */
		groupByKey() {
			const gb = this.dataSource && this.dataSource.groupBy
			if (!gb || !this.dataSource.schema) return null
			return JSON.stringify({
				register: this.dataSource.register || '',
				schema: this.dataSource.schema,
				filter: this.dataSource.filter || {},
				groupBy: gb,
			})
		},
		/** Stable signature of a time-bucket source + the active range (else null). */
		bucketKey() {
			const b = this.dataSource && this.dataSource.bucket
			if (!b || !this.dataSource.schema) return null
			const r = this.cnDashboardDateRange && this.cnDashboardDateRange.value
			return JSON.stringify({
				register: this.dataSource.register || '',
				schema: this.dataSource.schema,
				filter: this.dataSource.filter || {},
				bucket: b,
				range: r ? { from: r.from, to: r.to } : null,
			})
		},
		defaultColors() {
			if (this.colors.length > 0) return this.colors
			// Nextcloud-themed color palette
			return [
				'var(--color-primary-element, #0082c9)',
				'var(--color-success, #46ba61)',
				'var(--color-warning, #e9a300)',
				'var(--color-error, #e04224)',
				'var(--color-primary-element-light, #aad2ed)',
				'var(--color-text-maxcontrast, #767676)',
			]
		},
		/**
		 * The active `views[]` entry: the one matching `activeViewKey`,
		 * else the FIRST configured view, else null (no switcher).
		 *
		 * @return {{key: string, label?: string, series?: string[], valueFormat?: (string|object)}|null}
		 */
		activeView() {
			if (!Array.isArray(this.views) || this.views.length === 0) return null
			return this.views.find((v) => v && v.key === this.activeViewKey) || this.views[0]
		},
		/**
		 * The series actually handed to ApexCharts: the resolved series,
		 * filtered to the active view's named `series` when the view
		 * declares any (cartesian charts only — pie-family series are flat
		 * value arrays with no names to filter on). Falls back to the full
		 * resolved series when the filter matches nothing, so a typo'd view
		 * never blanks the chart.
		 *
		 * @return {Array} The displayed series.
		 */
		displayedSeries() {
			const series = this.resolvedSeries
			const view = this.activeView
			if (!view || !Array.isArray(view.series) || view.series.length === 0) return series
			if (['pie', 'donut', 'radialBar'].includes(this.type)) return series
			if (!Array.isArray(series)) return series
			const filtered = series.filter((s) => s && view.series.includes(s.name))
			return filtered.length > 0 ? filtered : series
		},
		/**
		 * The value-formatter function derived from `valueFormat` (the
		 * active `views[]` entry's `valueFormat` wins when set), or null.
		 * Applied to the value-axis labels and the tooltip so both read
		 * identically. Non-numeric values pass through untouched.
		 *
		 * @return {(function(*): string)|null}
		 */
		valueFormatterFn() {
			const vf = (this.activeView && this.activeView.valueFormat) || this.valueFormat
			if (!vf) return null
			const name = typeof vf === 'string' ? vf : vf.name
			const currency = safeCurrencyCode(typeof vf === 'object' ? vf.currency : undefined)
			const decimals = (typeof vf === 'object' && Number.isFinite(vf.decimals)) ? vf.decimals : null
			const numeric = (v, fmt) => {
				const num = Number(v)
				return Number.isFinite(num) ? fmt(num) : v
			}
			if (name === 'currency') {
				return (v) => numeric(v, (num) => new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency,
					minimumFractionDigits: decimals ?? 0,
					maximumFractionDigits: decimals ?? 0,
				}).format(num))
			}
			if (name === 'currency-compact') {
				return (v) => numeric(v, (num) => new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency,
					notation: 'compact',
					maximumFractionDigits: decimals ?? 1,
				}).format(num))
			}
			if (name === 'percent') {
				return (v) => numeric(v, (num) => new Intl.NumberFormat(undefined, {
					minimumFractionDigits: decimals ?? 0,
					maximumFractionDigits: decimals ?? 0,
				}).format(num) + '%')
			}
			return null
		},
		/**
		 * The effective per-category colour map: the explicit `colorMap`
		 * prop wins; otherwise the map an aggregate `labelResolve.colorField`
		 * built from the referenced objects (Wave 3). Null when neither is
		 * available.
		 *
		 * @return {Record<string, string>|null}
		 */
		effectiveColorMap() {
			if (this.colorMap && typeof this.colorMap === 'object') return this.colorMap
			const fromAggregate = this.aggregateData && this.aggregateData.colorMap
			return (fromAggregate && typeof fromAggregate === 'object') ? fromAggregate : null
		},
		/**
		 * Palette with the effective per-category colour map applied: one
		 * colour per resolved label/category (map hit, else the default
		 * palette colour by position). Null when no map is set or nothing
		 * resolved yet — the default palette then applies unchanged.
		 *
		 * @return {string[]|null}
		 */
		mappedColors() {
			const map = this.effectiveColorMap
			if (!map) return null
			const keys = ['pie', 'donut', 'radialBar'].includes(this.type)
				? this.resolvedLabels
				: this.resolvedCategories
			if (!Array.isArray(keys) || keys.length === 0) return null
			const palette = this.defaultColors
			return keys.map((key, i) => map[key] || palette[i % palette.length])
		},
		/**
		 * Whether the resolved series carry any data point (pie-family charts
		 * use a flat value array; cartesian charts use `[{ data: [...] }]`).
		 *
		 * @return {boolean}
		 */
		hasChartData() {
			const series = this.resolvedSeries
			if (!Array.isArray(series) || series.length === 0) return false
			if (['pie', 'donut', 'radialBar'].includes(this.type)) return true
			return series.some((s) => Array.isArray(s && s.data) && s.data.length > 0)
		},
		/**
		 * Whether the declarative empty state renders instead of the chart —
		 * only when an `emptyLabel` is configured (default keeps the
		 * pre-existing empty-canvas behaviour).
		 *
		 * @return {boolean}
		 */
		showEmptyState() {
			return this.emptyLabel !== '' && !this.hasChartData
		},
		mergedOptions() {
			const isPieType = ['pie', 'donut', 'radialBar'].includes(this.type)

			const defaults = {
				chart: {
					type: this.type,
					toolbar: { show: this.toolbar },
					zoom: { enabled: false },
					fontFamily: 'var(--default-font, system-ui, sans-serif)',
					foreColor: 'var(--color-main-text, #222)',
					background: 'transparent',
				},
				colors: this.mappedColors || this.defaultColors,
				stroke: {
					curve: 'smooth',
					width: this.type === 'area' ? 2 : (this.type === 'bar' ? 0 : 2),
				},
				fill: this.type === 'area'
					? {
						type: 'gradient',
						gradient: {
							shade: 'light',
							type: 'vertical',
							opacityFrom: 0.5,
							opacityTo: 0.1,
						},
					}
					: { opacity: 1 },
				grid: {
					borderColor: 'var(--color-border, #ededed)',
					strokeDashArray: 4,
				},
				legend: {
					show: this.legend,
					position: this.legendPosition || (isPieType ? 'bottom' : 'top'),
					labels: {
						colors: 'var(--color-main-text, #222)',
					},
				},
				dataLabels: {
					enabled: isPieType,
				},
				tooltip: {
					// Nominal: it only decides which class apexcharts stamps on
					// the tooltip, and BOTH of its themes are restyled with
					// Nextcloud tokens in this component's stylesheet. Neither
					// apexcharts theme is theme-responsive on its own — see the
					// `apexcharts-tooltip` block at the bottom of <style>.
					theme: 'light',
				},
			}

			// Named value formatter (currency / currency-compact / percent) —
			// applied to the tooltip and, below, to the VALUE axis so both read
			// identically. An explicit `options.tooltip/xaxis/yaxis` formatter
			// still wins through the deep-merge.
			if (this.valueFormatterFn) {
				defaults.tooltip.y = { formatter: this.valueFormatterFn }
			}

			// Drilldown (Wave 3, #91): a segment / bar click navigates to the
			// configured route with the clicked category's RAW key in the
			// query. Wired through ApexCharts' own selection event so it
			// works identically for pie slices and (distributed) bars; the
			// cursor hint makes the affordance visible. An explicit
			// `options.chart.events` still wins through the deep-merge.
			if (this.drilldownDef && this.$router) {
				defaults.chart.events = {
					dataPointSelection: this.onDataPointSelection,
					dataPointMouseEnter: (event) => {
						if (event && event.target) event.target.style.cursor = 'pointer'
					},
				}
			}

			// Add categories for cartesian charts
			if (!isPieType && this.resolvedCategories.length > 0) {
				defaults.xaxis = {
					categories: this.resolvedCategories,
					labels: {
						style: {
							colors: 'var(--color-text-maxcontrast, #767676)',
						},
					},
				}
				defaults.yaxis = {
					labels: {
						style: {
							colors: 'var(--color-text-maxcontrast, #767676)',
						},
					},
				}
				// The VALUE axis is the y-axis normally, the x-axis when bars
				// render horizontally (ApexCharts flips the axes).
				if (this.valueFormatterFn) {
					const valueAxis = (this.type === 'bar' && this.horizontal) ? defaults.xaxis : defaults.yaxis
					valueAxis.labels = { ...valueAxis.labels, formatter: this.valueFormatterFn }
				}
			}

			// Add labels for pie/donut
			if (isPieType && this.resolvedLabels.length > 0) {
				defaults.labels = this.resolvedLabels
			}

			// Bar-specific defaults
			if (this.type === 'bar') {
				defaults.plotOptions = {
					bar: {
						horizontal: this.horizontal,
						columnWidth: '55%',
						borderRadius: 4,
						// Per-category colours need distributed bars — otherwise
						// apexcharts colours per SERIES and the map has no effect.
						...(this.mappedColors ? { distributed: true } : {}),
					},
				}
			}

			return this.deepMerge(defaults, this.options)
		},
	},

	watch: {
		groupByKey() {
			this.fetchGroupBy()
		},
		bucketKey() {
			this.fetchTimeBucket()
		},
		aggregateKey() {
			this.fetchAggregateSource()
		},
	},

	created() {
		this.chartComponent = VueApexCharts
	},

	mounted() {
		this.fetchGroupBy()
		this.fetchTimeBucket()
		this.fetchAggregateSource()
		// Subscribe to the widget Refresh bus (B3 event-bus opt-in mode)
		// FIRST, before the ResizeObserver early-return — environments
		// without ResizeObserver (jsdom) must still get the subscription.
		this._onWidgetRefresh = (payload) => {
			if (!this.widgetId) return
			if (payload?.widgetId !== this.widgetId) return
			this.refresh()
		}
		subscribe(REFRESH_BUS_CHANNEL, this._onWidgetRefresh)

		if (typeof ResizeObserver === 'undefined') return
		this._lastWidth = this.$el.offsetWidth
		this._lastHeight = this.$el.offsetHeight
		this._resizeTimer = null
		this._resizeObserver = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect
			const newWidth = rect?.width ?? this.$el.offsetWidth
			const newHeight = rect?.height ?? this.$el.offsetHeight
			// A container-fitting chart must also re-render when only the
			// HEIGHT changes: apexcharts reads the parent's height once, at
			// create time, and its own re-measure hook is the window resize —
			// which a GridStack tile resize is not. This is also what recovers
			// a chart created while its tile had no height yet (percentage of
			// zero is zero), so it is correctness, not just resize polish.
			// Pinned-height charts keep the width-only behaviour: their height
			// never depends on the box.
			const heightChanged = this.fitToContainer && newHeight !== this._lastHeight
			if (newWidth === this._lastWidth && !heightChanged) return
			this._lastWidth = newWidth
			this._lastHeight = newHeight
			clearTimeout(this._resizeTimer)
			this._resizeTimer = setTimeout(() => {
				if (this.$refs.chart?.refresh) {
					this.$refs.chart.refresh()
				}
			}, 100)
		})
		this._resizeObserver.observe(this.$el)
	},

	beforeUnmount() {
		clearTimeout(this._resizeTimer)
		if (this._resizeObserver) {
			this._resizeObserver.disconnect()
			this._resizeObserver = null
		}
		if (this._onWidgetRefresh) {
			unsubscribe(REFRESH_BUS_CHANNEL, this._onWidgetRefresh)
			this._onWidgetRefresh = null
		}
	},

	methods: {
		/**
		 * Re-query the chart's dataSource / endpointSource. Exposed as a
		 * ref-callable method (B3 canonical refresh mode) AND invoked by the
		 * `cn:widget:refresh` bus subscription. No-op when the chart has
		 * neither (static series/labels mode). The endpoint refetch is
		 * force-mode: it bypasses the shared useEndpointSource cache.
		 *
		 * @return {void}
		 */
		refresh() {
			if (typeof this.dsRefetch === 'function') {
				this.dsRefetch()
			}
			if (typeof this.epRefetch === 'function') {
				this.epRefetch()
			}
			this.fetchGroupBy()
			this.fetchTimeBucket()
			this.fetchAggregateSource()
		},
		/**
		 * Fetch a time series from OpenRegister's REST `/timeseries` aggregation
		 * when `dataSource.bucket` is set, mapping `{groups:[{key,value}]}` into
		 * ApexCharts `series` + date `categories`. The window comes from the
		 * dashboard date chip; a too-narrow chip (< ~90 days) widens to a 12-month
		 * lookback so the curve stays meaningful. Replaces the GraphQL bucket
		 * path. Lazily imports axios/router.
		 *
		 * @spec openspec/changes/add-dashboard-date-range-and-chart-bucket/specs/chart-bucket-data-source/spec.md
		 * @return {Promise<void>}
		 */
		async fetchTimeBucket() {
			const ds = this.dataSource || {}
			const b = ds.bucket
			if (!b || !b.field || !ds.schema) {
				this.bucketData = null
				return
			}
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				// Resolve the [from, to] window: chip range, else staticRange,
				// else a 12-month lookback; widen a too-narrow chip.
				const r = (this.cnDashboardDateRange && this.cnDashboardDateRange.value) || b.staticRange || {}
				const to = r.to || new Date().toISOString()
				let from = r.from
				const span = (from && to) ? (new Date(to).getTime() - new Date(from).getTime()) : 0
				if (!from || span < (90 * 86400000)) {
					from = new Date(new Date(to).getTime() - (365 * 86400000)).toISOString()
				}
				const url = generateUrl(
					'/apps/openregister/api/objects/aggregations/{register}/{schema}/timeseries',
					{ register: ds.register, schema: ds.schema },
				)
				const params = {
					field: b.field,
					interval: String(b.interval || 'month').toUpperCase(),
					metric: b.metric || 'count',
					from,
					to,
				}
				if (b.metricField) params.metricField = b.metricField
				const _f = resolveFilterTokens(ds.filter || {}, this.chartTokenCtx())
				if (_f && typeof _f === 'object') {
					for (const [k, v] of Object.entries(_f)) {
						if (v && typeof v === 'object') {
							for (const [op, ov] of Object.entries(v)) params[`filter[${k}][${op}]`] = ov
						} else if (v !== '' && v !== null && v !== undefined) {
							params[`filter[${k}]`] = v
						}
					}
				}
				const res = await axios.get(url, { params })
				const groups = (res && res.data && res.data.groups) || []
				const categories = groups.map((g) => this.formatBucketKey(g.key))
				const values = groups.map((g) => Number(g.value) || 0)
				this.bucketData = { series: [{ name: b.metricField || b.metric || 'count', data: values }], categories, labels: categories }
			} catch (e) {
				this.bucketData = null
			}
		},
		/**
		 * Format a time-bucket key (ISO date) into a short axis label.
		 *
		 * @param {string} key The bucket key (ISO date string).
		 * @return {string} A short, locale-aware label.
		 */
		formatBucketKey(key) {
			if (!key) return ''
			const d = new Date(key)
			if (Number.isNaN(d.getTime())) return String(key)
			return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
		},
		/**
		 * Fetch a categorical breakdown from OpenRegister's REST `/grouped`
		 * aggregation when `dataSource.groupBy` is set, mapping `{groups}` into
		 * ApexCharts `series` + `categories`/`labels` (pie/donut use a flat
		 * value array + labels; other types use one named series + categories).
		 * No-op for the time-bucket (GraphQL) path. Lazily imports axios/router.
		 *
		 * @spec openspec/changes/add-dashboard-date-range-and-chart-bucket/specs/chart-bucket-data-source/spec.md
		 * @return {Promise<void>}
		 */
		async fetchGroupBy() {
			const ds = this.dataSource || {}
			const gb = ds.groupBy
			if (!gb || !gb.field || !ds.schema) {
				this.groupByData = null
				return
			}
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/aggregations/{register}/{schema}/grouped',
					{ register: ds.register, schema: ds.schema },
				)
				const params = { groupBy: gb.field, metric: gb.metric || 'count' }
				if (gb.metricField) params.field = gb.metricField
				if (gb.sort === 'asc' || gb.sort === 'desc') params.sort = gb.sort
				if (gb.limit) params.limit = gb.limit
				const _f = resolveFilterTokens(ds.filter || {}, this.chartTokenCtx())
				if (_f && typeof _f === 'object') {
					for (const [k, v] of Object.entries(_f)) {
						if (v && typeof v === 'object') {
							for (const [op, ov] of Object.entries(v)) params[`filter[${k}][${op}]`] = ov
						} else if (v !== '' && v !== null && v !== undefined) {
							params[`filter[${k}]`] = v
						}
					}
				}
				const res = await axios.get(url, { params })
				let groups = (res && res.data && res.data.groups) || []
				// Client-side sort + top-N (robust even if the backend ignored them).
				if (gb.sort === 'asc' || gb.sort === 'desc') {
					groups = [...groups].sort((a, b) => (gb.sort === 'desc' ? b.value - a.value : a.value - b.value))
				}
				if (gb.limit) groups = groups.slice(0, gb.limit)
				let keys = groups.map((g) => (g.key === null || g.key === undefined ? '—' : String(g.key)))
				// Raw (unresolved) keys, index-aligned with the display labels —
				// a `dataSource.drilldown` click navigates with these (Wave 3).
				const rawKeys = groups.map((g) => (g.key === null || g.key === undefined ? '' : String(g.key)))
				const values = groups.map((g) => Number(g.value) || 0)
				// When the grouped field is a reference (uuid), swap the raw ids for
				// the referenced objects' display labels (e.g. client name).
				if (gb.reference && gb.reference.schema) {
					keys = await this.resolveGroupByLabels(ds.register, gb.reference, groups)
				}
				if (['pie', 'donut', 'radialBar'].includes(this.type)) {
					this.groupByData = { series: values, labels: keys, categories: keys, rawKeys }
				} else {
					this.groupByData = { series: [{ name: gb.metricField || gb.metric || 'count', data: values }], categories: keys, labels: keys, rawKeys }
				}
			} catch (e) {
				this.groupByData = null
			}
		},
		/**
		 * Resolve the OBJECT-form `dataSource.aggregate` (Wave 3, #91) into
		 * chart data: a categorical group-by over the schema's objects with
		 * top-N + Other folding and optional reference label/colour
		 * resolution.
		 *
		 * Server-first: OpenRegister's `/grouped` facet endpoint does the
		 * aggregation (count, or sum of `sumField`) — the same facet the
		 * existing `groupBy` shorthand reaches — so the client never pulls
		 * the collection just to count it. Only when that endpoint is
		 * unavailable (older OR) does the widget fall back to fetching the
		 * collection and grouping client-side. Any remaining failure leaves
		 * `aggregateData` null (static props / fallback render).
		 *
		 * @return {Promise<void>}
		 */
		async fetchAggregateSource() {
			const ds = this.dataSource || {}
			const agg = this.aggregateDef
			if (!agg || !ds.schema) {
				this.aggregateData = null
				return
			}
			const metric = agg.metric === 'sum' ? 'sum' : 'count'
			if (metric === 'sum' && !agg.sumField) {
				// eslint-disable-next-line no-console
				console.warn('[CnChartWidget] aggregate.metric "sum" requires aggregate.sumField — skipping.')
				this.aggregateData = null
				return
			}
			const requestKey = this.aggregateKey
			let groups = null
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/aggregations/{register}/{schema}/grouped',
					{ register: ds.register, schema: ds.schema },
				)
				const params = { groupBy: agg.groupBy, metric }
				if (metric === 'sum') params.field = agg.sumField
				const _f = resolveFilterTokens(ds.filter || {}, this.chartTokenCtx())
				if (_f && typeof _f === 'object') {
					for (const [k, v] of Object.entries(_f)) {
						if (v && typeof v === 'object') {
							for (const [op, ov] of Object.entries(v)) params[`filter[${k}][${op}]`] = ov
						} else if (v !== '' && v !== null && v !== undefined) {
							params[`filter[${k}]`] = v
						}
					}
				}
				const res = await axios.get(url, { params })
				groups = (res && res.data && res.data.groups) || []
			} catch (e) {
				// Facet endpoint unavailable → client-side fallback aggregation.
				groups = await this.aggregateFromCollection(ds, agg, metric)
			}
			if (!groups) {
				if (requestKey === this.aggregateKey) this.aggregateData = null
				return
			}
			const built = await this.buildAggregateData(groups, agg)
			// Guard against a stale (slower) response overwriting a newer
			// source signature — mirrors the endpoint-source seq guard.
			if (requestKey === this.aggregateKey) this.aggregateData = built
		},

		/**
		 * Client-side fallback aggregation (Wave 3): fetch the collection and
		 * group it locally — count per `aggregate.groupBy` value, or the sum
		 * of `sumField`. Used only when OpenRegister's `/grouped` facet
		 * endpoint is unavailable; capped at 1000 objects (the fleet's
		 * established client-fetch bound). Returns the same
		 * `[{ key, value }]` group shape the facet returns, or null on
		 * failure.
		 *
		 * @param {object} ds The dataSource block.
		 * @param {object} agg The aggregate block.
		 * @param {string} metric Normalised metric (`count` | `sum`).
		 * @return {Promise<Array<{key: *, value: number}>|null>}
		 */
		async aggregateFromCollection(ds, agg, metric) {
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{register}/{schema}',
					{ register: ds.register, schema: ds.schema },
				)
				const params = { _limit: 1000 }
				const _f = resolveFilterTokens(ds.filter || {}, this.chartTokenCtx())
				if (_f && typeof _f === 'object') {
					for (const [k, v] of Object.entries(_f)) {
						if (v && typeof v === 'object' && !Array.isArray(v)) {
							for (const [op, ov] of Object.entries(v)) params[`${k}[${op}]`] = ov
						} else if (v !== '' && v !== null && v !== undefined) {
							params[k] = v
						}
					}
				}
				const res = await axios.get(url, { params })
				const results = (res && res.data && res.data.results) || []
				const totals = new Map()
				for (const obj of results) {
					const raw = obj && obj[agg.groupBy]
					const key = (raw === null || raw === undefined || raw === '') ? null : raw
					const increment = metric === 'sum' ? (Number(obj && obj[agg.sumField]) || 0) : 1
					totals.set(key, (totals.get(key) || 0) + increment)
				}
				return Array.from(totals.entries()).map(([key, value]) => ({ key, value }))
			} catch (e) {
				return null
			}
		},

		/**
		 * Turn raw `[{ key, value }]` groups into the chart-ready
		 * `aggregateData` blob: sort by value (desc), apply `topN`, fold the
		 * remainder into a translated "Other" bucket when `otherBucket` is
		 * true, resolve reference labels/colours via `labelResolve`, and
		 * shape series/labels per chart family. `rawKeys` keeps the
		 * UNRESOLVED keys index-aligned for drilldown.
		 *
		 * @param {Array<{key: *, value: number}>} groups The raw groups.
		 * @param {object} agg The aggregate block.
		 * @return {Promise<{series: *, categories: string[], labels: string[], rawKeys: string[], colorMap?: Record<string, string>}>}
		 */
		async buildAggregateData(groups, agg) {
			let sorted = [...groups].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
			const topN = Number(agg.topN)
			let other = null
			if (Number.isFinite(topN) && topN > 0 && sorted.length > topN) {
				const rest = sorted.slice(topN)
				sorted = sorted.slice(0, topN)
				if (agg.otherBucket === true) {
					other = {
						key: OTHER_BUCKET_KEY,
						label: t('nextcloud-vue', 'Other'),
						value: rest.reduce((sum, g) => sum + (Number(g.value) || 0), 0),
					}
				}
			}
			let rawKeys = sorted.map((g) => (g.key === null || g.key === undefined ? '' : String(g.key)))
			let labels = rawKeys.map((k) => (k === '' ? '—' : k))
			let colorMap = null
			if (agg.labelResolve && agg.labelResolve.schema) {
				const resolved = await this.resolveAggregateRefs(
					(this.dataSource && this.dataSource.register) || '',
					agg.labelResolve,
					rawKeys,
				)
				// A configured `labelResolve` means the groupBy value IS an
				// opaque reference id, so the raw key is never a usable label —
				// falling back to it renders a bare UUID in the chart. The
				// usual cause is a DANGLING reference (the target object was
				// deleted, or never existed), which resolves to an empty label.
				// Empty keys keep their existing '—' placeholder.
				labels = resolved.map((r, i) => {
					if (r.label) return r.label
					return rawKeys[i] === '' ? labels[i] : t('nextcloud-vue', 'Unknown')
				})
				const withColor = resolved.filter((r) => r.color)
				if (withColor.length > 0) {
					colorMap = {}
					resolved.forEach((r, i) => {
						if (r.color) colorMap[labels[i]] = r.color
					})
				}
			}
			let values = sorted.map((g) => Number(g.value) || 0)
			// Optional: collapse groups that resolve to the SAME label into one
			// bucket (summing their values). Useful when the groupBy field is a
			// per-parent reference — e.g. status types defined per case type, so
			// several distinct "Received" ids should read as a single "Received"
			// category. Drilldown keeps the first contributing key.
			if (agg.mergeByLabel) {
				const order = []
				const acc = {}
				labels.forEach((lab, i) => {
					if (!Object.prototype.hasOwnProperty.call(acc, lab)) {
						acc[lab] = { value: 0, key: rawKeys[i] }
						order.push(lab)
					}
					acc[lab].value += values[i]
				})
				labels = order
				values = order.map((l) => acc[l].value)
				rawKeys = order.map((l) => acc[l].key)
				if (colorMap) {
					const merged = {}
					order.forEach((l) => { if (colorMap[l]) merged[l] = colorMap[l] })
					colorMap = merged
				}
			}
			if (other) {
				rawKeys.push(other.key)
				labels.push(other.label)
				values.push(other.value)
			}
			const base = { rawKeys, labels, categories: labels }
			if (colorMap) base.colorMap = colorMap
			if (['pie', 'donut', 'radialBar'].includes(this.type)) {
				return { ...base, series: values }
			}
			const name = agg.sumField || agg.metric || 'count'
			return { ...base, series: [{ name, data: values }] }
		},

		/**
		 * Resolve reference (uuid) aggregate keys to their referenced
		 * objects' display labels (and optional per-category colours) —
		 * the fkResolve pattern: the SHARED object store first (per-id
		 * cache + in-flight dedup, so 10 slices pointing at 10 clients
		 * resolve once each across the whole page), a direct per-id GET
		 * when no Pinia store is active. Unresolvable ids degrade to an
		 * empty label (the caller keeps the raw key) — a chart never
		 * regresses to a blank slice.
		 *
		 * @param {string} defaultRegister Register used when `labelResolve` omits one.
		 * @param {{register?: string, schema: string, labelField?: string, colorField?: string}} labelResolve The labelResolve block.
		 * @param {string[]} keys The raw group keys (uuids; '' entries skip).
		 * @return {Promise<Array<{label: string, color: string}>>} One entry per key, in order.
		 */
		async resolveAggregateRefs(defaultRegister, labelResolve, keys) {
			const register = labelResolve.register || defaultRegister
			const schema = labelResolve.schema
			const labelField = labelResolve.labelField || 'name'
			const colorField = labelResolve.colorField || ''
			let store = null
			try {
				store = useObjectStore()
			} catch (e) {
				store = null
			}
			const type = store ? resolveObjectOpType(store, { register, schema }) : null
			const fetchViaAxios = async (id) => {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{register}/{schema}/{id}',
					{ register, schema, id },
				)
				const res = await axios.get(url)
				return (res && res.data) || null
			}
			return Promise.all(keys.map(async (id) => {
				if (!id) return { label: '', color: '' }
				try {
					const cached = store && store.objects && store.objects[type] && store.objects[type][id]
					const obj = cached || (store ? await store.fetchObject(type, id) : await fetchViaAxios(id))
					if (!obj || typeof obj !== 'object') return { label: '', color: '' }
					let raw = obj[labelField]
					if (raw === undefined || raw === null || raw === '') {
						raw = obj['@self'] && obj['@self'].name
					}
					const color = colorField && typeof obj[colorField] === 'string' ? obj[colorField] : ''
					return { label: this.displayString(raw), color }
				} catch (e) {
					return { label: '', color: '' }
				}
			}))
		},

		/**
		 * ApexCharts `dataPointSelection` handler backing the declarative
		 * `dataSource.drilldown` (Wave 3, #91): navigate to the configured
		 * route with the clicked category's RAW key in the query
		 * (`{ [filterParam]: rawKey }`). A route starting with `/` is
		 * treated as a PATH, anything else as a route NAME. The folded
		 * "Other" bucket never navigates. Navigation errors (duplicate
		 * route, guards) are swallowed.
		 *
		 * @param {Event} _event The DOM event (unused).
		 * @param {object} _chartContext The ApexCharts instance (unused).
		 * @param {{dataPointIndex: number}} config The selection payload.
		 * @return {void}
		 */
		onDataPointSelection(_event, _chartContext, config) {
			const drill = this.drilldownDef
			if (!drill || !this.$router) return
			const idx = config && config.dataPointIndex
			if (typeof idx !== 'number' || idx < 0) return
			const key = this.drilldownKeys[idx]
			if (key === undefined || key === OTHER_BUCKET_KEY) return
			const query = { [drill.filterParam]: key }
			const location = String(drill.route).startsWith('/')
				? { path: drill.route, query }
				: { name: drill.route, query }
			this.$router.push(location).catch(() => {})
		},

		/**
		 * Resolve reference (uuid) group keys to their referenced objects'
		 * display labels. Fetches each referenced object once and maps its
		 * `labelField` (default `name`) — falling back to the raw key when the
		 * object can't be loaded, so a chart never regresses to a blank bar.
		 *
		 * @param {string} defaultRegister Register to use when the reference omits one.
		 * @param {{ register?: string, schema: string, labelField?: string }} reference Reference descriptor from `groupBy.reference`.
		 * @param {Array<{ key: * }>} groups Raw grouped rows from OpenRegister.
		 * @return {Promise<string[]>} One resolved label per group, in order.
		 */
		async resolveGroupByLabels(defaultRegister, reference, groups) {
			const register = reference.register || defaultRegister
			const schema = reference.schema
			const labelField = reference.labelField || 'name'
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				return await Promise.all(groups.map(async (g) => {
					const key = g.key
					if (key === null || key === undefined || key === '') return '—'
					try {
						const url = generateUrl(
							'/apps/openregister/api/objects/{register}/{schema}/{id}',
							{ register, schema, id: key },
						)
						const res = await axios.get(url)
						const obj = (res && res.data) || {}
						let raw = obj[labelField]
						if (raw === undefined || raw === null || raw === '') {
							raw = obj['@self'] && obj['@self'].name
						}
						return this.displayString(raw) || String(key)
					} catch (e) {
						return String(key)
					}
				}))
			} catch (e) {
				return groups.map((g) => (g.key === null || g.key === undefined ? '—' : String(g.key)))
			}
		},
		/**
		 * Pick a display string from a value that may be a plain string or a
		 * translatable `{ <lang>: value }` map — falls back to the active
		 * Nextcloud language, then its base subtag, then the first available
		 * translation.
		 *
		 * @param {*} value Raw property value (string or per-language map).
		 * @return {string} A display-ready string.
		 */
		displayString(value) {
			if (value === null || value === undefined) return ''
			if (typeof value === 'object' && !Array.isArray(value)) {
				const lang = getLanguage() || ''
				const short = lang.split('-')[0]
				if (value[lang] !== undefined) return String(value[lang])
				if (value[short] !== undefined) return String(value[short])
				const vals = Object.values(value)
				return vals.length ? String(vals[0]) : ''
			}
			return String(value)
		},
		/**
		 * Deep merge two objects (target wins on conflict)
		 * @param {object} base Base object
		 * @param {object} override Override object
		 * @return {object} Merged result
		 */
		deepMerge(base, override) {
			const result = { ...base }
			for (const key of Object.keys(override)) {
				if (
					override[key]
					&& typeof override[key] === 'object'
					&& !Array.isArray(override[key])
					&& base[key]
					&& typeof base[key] === 'object'
					&& !Array.isArray(base[key])
				) {
					result[key] = this.deepMerge(base[key], override[key])
				} else {
					result[key] = override[key]
				}
			}
			return result
		},
	},
}
</script>

<style scoped>
.cn-chart-widget {
	width: 100%;
	min-height: 100px;
}

/* Container-fitting mode (`height` given as a percentage). The root claims the
   full height it is given and lays its children out as a column; the canvas box
   takes what is left, so the chart is sized by the box rather than sizing it.
   `min-height: 0` drops the 100px floor — on a fixed-height surface a floor is
   the thing that produces the overflow it was meant to prevent. */
.cn-chart-widget--fit {
	height: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.cn-chart-widget__canvas {
	min-width: 0;
}

/* `flex: 1 1 0` (not `1 1 auto`) is load-bearing: with an `auto` basis the box
   would grow to its content, i.e. to the chart, and the percentage height would
   resolve against a box the chart itself defined. `overflow: hidden` keeps a
   sub-pixel rounding difference from reintroducing a scrollbar. */
.cn-chart-widget--fit .cn-chart-widget__canvas {
	flex: 1 1 0;
	min-height: 0;
	overflow: hidden;
}

.cn-chart-widget__fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 150px;
	color: var(--color-text-maxcontrast);
}

.cn-chart-widget__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 150px;
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	text-align: center;
	padding: 12px;
}

/* The empty / fallback placeholders carry a 150px floor for the normal
   content-sized case; in fit mode they take the leftover space and centre in it
   instead, since the floor would overflow a short tile. Declared after the base
   rules so the cascade order matches specificity (no-descending-specificity). */
.cn-chart-widget--fit .cn-chart-widget__empty,
.cn-chart-widget--fit .cn-chart-widget__fallback {
	flex: 1 1 0;
	min-height: 0;
}

.cn-chart-widget__error {
	font-size: 14px;
	margin: 0;
}

/* In-widget view switcher pills (views[] prop) — compact segmented row,
   mirroring the dashboard date-range pill styling. */
.cn-chart-widget__views {
	display: flex;
	gap: 4px;
	margin-bottom: 6px;
	justify-content: flex-end;
}

.cn-chart-widget__view-pill {
	padding: 2px 10px;
	border: 1px solid var(--color-border);
	border-radius: 999px;
	background: var(--color-main-background);
	color: var(--color-text-maxcontrast);
	font-size: 12px;
	cursor: pointer;
}

.cn-chart-widget__view-pill--active {
	background: var(--color-primary-element-light, #aad2ed);
	color: var(--color-main-text);
	border-color: var(--color-primary-element, #0082c9);
}

/* ─── ApexCharts HTML chrome ───────────────────────────────────────────────
   Everything apexcharts draws INSIDE the SVG takes its colour from
   `mergedOptions` (foreColor, grid.borderColor, legend.labels.colors, axis
   label styles), so it already follows the Nextcloud theme. Its HTML chrome —
   the hover tooltip, the crosshair axis tooltips, the toolbar menu — does not:
   apexcharts styles those from a stylesheet it injects itself at chart-create
   time (`<style id="apexcharts-css">`) using hardcoded hex values. In dark mode
   the hover tooltip stayed a white box while its text inherited the near-white
   `--color-main-text` — white on white, unreadable.

   `tooltip.theme` is not the fix: both apexcharts themes are hardcoded
   palettes, neither of them Nextcloud's, and choosing between them would need
   JS theme detection that a themed or nldesign install would still get wrong.
   Restyling with tokens means ONE rule set that is correct in light, dark,
   high-contrast and custom themes, because the tokens flip themselves. Both
   theme classes are listed so an `options.tooltip.theme` override cannot drop
   a consumer back onto a hardcoded palette.

   The specificity is deliberate. apexcharts injects its stylesheet when the
   first chart is created, so it lands AFTER the app's CSS and wins every tie —
   each override below therefore carries one more class than the apexcharts rule
   it replaces, and holds even without the scope attribute this block compiles
   with. */
.cn-chart-widget :deep(.apexcharts-tooltip.apexcharts-theme-light),
.cn-chart-widget :deep(.apexcharts-tooltip.apexcharts-theme-dark) {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	color: var(--color-main-text);
	box-shadow: 0 1px 5px var(--color-box-shadow, rgba(0, 0, 0, 0.2));
}

/* The title row is the date/category header ("Aug 26"). Its own background is
   what made it unreadable rather than merely off-theme. */
.cn-chart-widget :deep(.apexcharts-tooltip.apexcharts-theme-light .apexcharts-tooltip-title),
.cn-chart-widget :deep(.apexcharts-tooltip.apexcharts-theme-dark .apexcharts-tooltip-title) {
	background: var(--color-background-hover);
	border-bottom: 1px solid var(--color-border);
	color: var(--color-main-text);
}

/* Crosshair axis tooltips. apexcharts puts light hex values on the BASE class
   here and only overrides them for its dark theme, so the base rule has to be
   replaced too — not just the theme variants. */
.cn-chart-widget :deep(.apexcharts-xaxistooltip),
.cn-chart-widget :deep(.apexcharts-yaxistooltip) {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	color: var(--color-main-text);
}

/* Their pointer arrows are two stacked triangles: `::before` paints the border
   edge, `::after` the fill. Both need the tokens the box above uses, or the
   arrow keeps the old palette and reads as a stray light wedge. */
.cn-chart-widget :deep(.apexcharts-xaxistooltip-bottom)::after,
.cn-chart-widget :deep(.apexcharts-xaxistooltip-top)::after {
	border-bottom-color: var(--color-main-background);
	border-top-color: var(--color-main-background);
}

.cn-chart-widget :deep(.apexcharts-xaxistooltip-bottom)::before,
.cn-chart-widget :deep(.apexcharts-xaxistooltip-top)::before {
	border-bottom-color: var(--color-border);
	border-top-color: var(--color-border);
}

.cn-chart-widget :deep(.apexcharts-yaxistooltip-left)::after,
.cn-chart-widget :deep(.apexcharts-yaxistooltip-right)::after {
	border-left-color: var(--color-main-background);
	border-right-color: var(--color-main-background);
}

.cn-chart-widget :deep(.apexcharts-yaxistooltip-left)::before,
.cn-chart-widget :deep(.apexcharts-yaxistooltip-right)::before {
	border-left-color: var(--color-border);
	border-right-color: var(--color-border);
}

/* Toolbar menu — only reachable with `toolbar: true`, but the same defect: a
   hardcoded `#fff` panel under inherited near-white text. */
.cn-chart-widget :deep(.apexcharts-menu) {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	color: var(--color-main-text);
}

.cn-chart-widget :deep(.apexcharts-menu .apexcharts-menu-item:hover) {
	background: var(--color-background-hover);
}

/* Toolbar icons: `#6e8192` at rest and `#333` on hover, i.e. the hover state
   vanishes against a dark background. One selector per icon class, matching
   apexcharts' own list, to clear its (0,3,1) hover rules. */
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-menu-icon svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-reset-icon svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-selection-icon svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-zoom-icon svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-zoomin-icon svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-zoomout-icon svg) {
	fill: var(--color-text-maxcontrast);
}

.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-menu-icon:hover svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-reset-icon:hover svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-selection-icon:hover svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-zoom-icon:hover svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-zoomin-icon:hover svg),
.cn-chart-widget :deep(.apexcharts-toolbar .apexcharts-zoomout-icon:hover svg) {
	fill: var(--color-main-text);
}
</style>
