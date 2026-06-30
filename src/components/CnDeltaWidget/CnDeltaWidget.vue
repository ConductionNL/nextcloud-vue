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
				<NcLoadingIcon v-if="loading" :size="22" />
				<span v-else-if="error" class="cn-delta-widget__error" :title="error">—</span>
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

			<div v-if="!loading && !error && content.caption" class="cn-delta-widget__caption">
				{{ content.caption }}
			</div>
		</div>
	</component>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import TrendingUp from 'vue-material-design-icons/TrendingUp.vue'
import TrendingDown from 'vue-material-design-icons/TrendingDown.vue'
import TrendingNeutral from 'vue-material-design-icons/TrendingNeutral.vue'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { fetchAggregateValue } from '../../utils/fetchAggregate.js'
import widgetLink from '../../mixins/widgetLink.js'

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

	props: {
		/**
		 * The widget's persisted configuration blob. An optional `route`
		 * (vue-router location) or `link` (external href) turns the whole
		 * tile into a click-through target (see the widgetLink mixin).
		 * @type {{label?: string, icon?: string, iconColor?: string, caption?: string, route?: (object|string), link?: string, format?: {style?: string, currency?: string, decimals?: number, prefix?: string, suffix?: string}, source?: {register?: string, schema?: string, metric?: string, field?: string, goodDirection?: ('up'|'down'), current?: {filter?: object}, previous?: {filter?: object}}}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
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
		/** The current value, number-formatted per content.format. */
		formattedCurrent() {
			return this.formatNumber(this.current)
		},
		/** Percentage change current vs previous, or null when not computable. */
		deltaPct() {
			const prev = Number(this.previous)
			const cur = Number(this.current)
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
		/** Green when the change is in the configured good direction, else red. */
		deltaColor() {
			if (this.deltaPct === null || Math.abs(this.deltaPct) < 0.05) return 'var(--color-text-maxcontrast)'
			const good = (this.content.source && this.content.source.goodDirection) || 'up'
			const rising = this.deltaPct > 0
			const isGood = good === 'up' ? rising : !rising
			return isGood ? 'var(--color-success)' : 'var(--color-error)'
		},
		/** Stable signature so the watcher only refetches on real change. */
		sourceKey() {
			return JSON.stringify(this.content.source || {})
		},
	},

	watch: {
		sourceKey() {
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
			if (value === null || value === undefined) return '—'
			const fmt = this.content.format || {}
			const decimals = Number.isFinite(fmt.decimals) ? fmt.decimals : 0
			const num = Number(value)
			if (!Number.isFinite(num)) return String(value)
			let body
			if (fmt.style === 'currency') {
				body = new Intl.NumberFormat(undefined, { style: 'currency', currency: fmt.currency || 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
			} else if (fmt.style === 'percent') {
				body = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num) + '%'
			} else {
				body = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
			}
			return `${fmt.prefix || ''}${body}${fmt.suffix || ''}`
		},
		/**
		 * Fetch the current and previous aggregates from OpenRegister.
		 *
		 * @return {Promise<void>}
		 */
		async fetchValues() {
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
				const [cur, prev] = await Promise.all([
					fetchAggregateValue({ ...base, filter: (s.current && s.current.filter) || {} }),
					fetchAggregateValue({ ...base, filter: (s.previous && s.previous.filter) || {} }),
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
