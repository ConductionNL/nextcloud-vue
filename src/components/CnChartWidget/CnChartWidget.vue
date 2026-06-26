<!--
  CnChartWidget — Renders charts inside dashboard widgets.

  A thin wrapper around ApexCharts for use in CnDashboardPage widget slots.
  Supports area, line, bar, pie, donut, and radialBar chart types.
  Automatically adapts to the widget container size.

  ApexCharts is loaded as a peer dependency — consuming apps must
  install `apexcharts` and `vue-apexcharts` in their own package.json.
-->
<template>
	<div class="cn-chart-widget">
		<component
			:is="chartComponent"
			v-if="chartComponent"
			ref="chart"
			:type="type"
			:height="computedHeight"
			:width="computedWidth"
			:options="mergedOptions"
			:series="resolvedSeries" />
		<div v-else class="cn-chart-widget__fallback">
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
import { translate as t } from '@nextcloud/l10n'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import VueApexCharts from 'vue-apexcharts'
import { useDataSource } from '../../composables/useDataSource.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'

/** Event-bus channel CnWidgetWrapper's Refresh action broadcasts on. */
const REFRESH_BUS_CHANNEL = 'cn:widget:refresh'

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
		 * Chart height in pixels. Use 'auto' for container-based sizing.
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
		 *
		 * @type {{
		 *   register?: string,
		 *   schema?: string,
		 *   filter?: object,
		 *   aggregate?: 'count',
		 *   bucket?: { field: string, interval: string, metric?: string, metricField?: string, fromVar?: string, toVar?: string, staticRange?: { from: string, to: string } },
		 *   graphql?: { query: string, variables?: object, selectors: object }
		 * }|null}
		 */
		dataSource: {
			type: Object,
			default: null,
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
		// The `bucket` (time) and `groupBy` (category) shorthands are fetched
		// over REST by this component (fetchTimeBucket / fetchGroupBy) against
		// OpenRegister's /timeseries + /grouped aggregation endpoints — the
		// GraphQL bucket path is bypassed. Hide those shapes from useDataSource
		// so it stays a no-op for them (raw `graphql` / `count` still flow
		// through it).
		const dsForGraphql = () => {
			const ds = props.dataSource
			if (ds && (ds.bucket || ds.groupBy)) return null
			return ds
		}
		const { data, refetch } = useDataSource(dsForGraphql, { range })
		return { dsData: data, dsRefetch: refetch }
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
		}
	},

	computed: {
		computedHeight() {
			return this.height
		},
		computedWidth() {
			return this.width
		},
		/**
		 * Series shown to ApexCharts. Pulls from `dsData.series`
		 * when a `dataSource` is configured AND has resolved a
		 * non-undefined value; otherwise falls back to the static
		 * `series` prop. Same fallback rule applies to `categories`
		 * and `labels`.
		 */
		resolvedSeries() {
			const rest = this.bucketData || this.groupByData
			if (rest?.series !== undefined) return rest.series
			const fromDs = this.dsData?.series
			return fromDs !== undefined ? fromDs : this.series
		},
		resolvedCategories() {
			const rest = this.bucketData || this.groupByData
			if (rest?.categories !== undefined) return rest.categories
			const fromDs = this.dsData?.categories
			return fromDs !== undefined ? fromDs : this.categories
		},
		resolvedLabels() {
			const rest = this.bucketData || this.groupByData
			if (rest?.labels !== undefined) return rest.labels
			const fromDs = this.dsData?.labels
			return fromDs !== undefined ? fromDs : this.labels
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
				colors: this.defaultColors,
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
					position: isPieType ? 'bottom' : 'top',
					labels: {
						colors: 'var(--color-main-text, #222)',
					},
				},
				dataLabels: {
					enabled: isPieType,
				},
				tooltip: {
					theme: 'light',
				},
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
			}

			// Add labels for pie/donut
			if (isPieType && this.resolvedLabels.length > 0) {
				defaults.labels = this.resolvedLabels
			}

			// Bar-specific defaults
			if (this.type === 'bar') {
				defaults.plotOptions = {
					bar: {
						horizontal: false,
						columnWidth: '55%',
						borderRadius: 4,
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
	},

	created() {
		this.chartComponent = VueApexCharts
	},

	mounted() {
		this.fetchGroupBy()
		this.fetchTimeBucket()
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
		this._resizeTimer = null
		this._resizeObserver = new ResizeObserver((entries) => {
			const newWidth = entries[0]?.contentRect?.width ?? this.$el.offsetWidth
			if (newWidth === this._lastWidth) return
			this._lastWidth = newWidth
			clearTimeout(this._resizeTimer)
			this._resizeTimer = setTimeout(() => {
				if (this.$refs.chart?.refresh) {
					this.$refs.chart.refresh()
				}
			}, 100)
		})
		this._resizeObserver.observe(this.$el)
	},

	beforeDestroy() {
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
		 * Re-query the chart's dataSource. Exposed as a ref-callable
		 * method (B3 canonical refresh mode) AND invoked by the
		 * `cn:widget:refresh` bus subscription. No-op when the chart has
		 * no dataSource (static series/labels mode).
		 *
		 * @return {void}
		 */
		refresh() {
			if (typeof this.dsRefetch === 'function') {
				this.dsRefetch()
			}
			this.fetchGroupBy()
			this.fetchTimeBucket()
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
				const _f = resolveFilterTokens(ds.filter || {})
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
				const _f = resolveFilterTokens(ds.filter || {})
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
				const keys = groups.map((g) => (g.key === null || g.key === undefined ? '—' : String(g.key)))
				const values = groups.map((g) => Number(g.value) || 0)
				if (['pie', 'donut', 'radialBar'].includes(this.type)) {
					this.groupByData = { series: values, labels: keys, categories: keys }
				} else {
					this.groupByData = { series: [{ name: gb.metricField || gb.metric || 'count', data: values }], categories: keys, labels: keys }
				}
			} catch (e) {
				this.groupByData = null
			}
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

.cn-chart-widget__fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 150px;
	color: var(--color-text-maxcontrast);
}

.cn-chart-widget__error {
	font-size: 14px;
	margin: 0;
}
</style>
