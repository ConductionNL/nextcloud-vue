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
			:series="series" />
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
import VueApexCharts from 'vue-apexcharts'

/**
 * CnChartWidget — Chart component for dashboard widgets.
 *
 * Wraps ApexCharts with sensible defaults for Nextcloud theming.
 * Apps must install `apexcharts` and `vue-apexcharts` as dependencies.
 *
 * @example Basic area chart
 * <CnChartWidget
 *   type="area"
 *   :series="[{ name: 'Searches', data: [10, 41, 35, 51] }]"
 *   :categories="['Mon', 'Tue', 'Wed', 'Thu']"
 *   :height="250" />
 *
 * @example Pie chart
 * <CnChartWidget
 *   type="pie"
 *   :series="[44, 55, 13]"
 *   :labels="['Active', 'Pending', 'Closed']" />
 *
 * @example With custom options
 * <CnChartWidget
 *   type="bar"
 *   :series="barSeries"
 *   :options="{ plotOptions: { bar: { horizontal: true } } }" />
 */
export default {
	name: 'CnChartWidget',

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
			default: 'Chart library not available',
		},
	},

	data() {
		return {
			chartComponent: null,
		}
	},

	computed: {
		computedHeight() {
			return this.height
		},
		computedWidth() {
			return this.width
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
			if (!isPieType && this.categories.length > 0) {
				defaults.xaxis = {
					categories: this.categories,
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
			if (isPieType && this.labels.length > 0) {
				defaults.labels = this.labels
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

	created() {
		this.chartComponent = VueApexCharts
	},

	mounted() {
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
	},

	methods: {
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
