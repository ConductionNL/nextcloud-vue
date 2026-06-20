<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<component
		:is="linkTag"
		class="cn-gauge-widget"
		:class="{ 'cn-gauge-widget--linked': isLinked }"
		v-bind="linkAttrs">
		<div class="cn-gauge-widget__head">
			<span v-if="content.label" class="cn-gauge-widget__label">{{ content.label }}</span>
			<span class="cn-gauge-widget__pct" :style="{ color: barColor }">
				<NcLoadingIcon v-if="loading" :size="16" />
				<span v-else-if="error" :title="error">—</span>
				<template v-else>{{ pctLabel }}</template>
			</span>
		</div>

		<div class="cn-gauge-widget__track">
			<div
				class="cn-gauge-widget__fill"
				:style="{ width: fillWidth, backgroundColor: barColor }" />
		</div>

		<div v-if="!loading && !error" class="cn-gauge-widget__foot">
			<span class="cn-gauge-widget__value">{{ formattedValue }}</span>
			<span class="cn-gauge-widget__target">/ {{ formattedTarget }}</span>
		</div>
	</component>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import { fetchAggregateValue } from '../../utils/fetchAggregate.js'
import widgetLink from '../../mixins/widgetLink.js'

/**
 * CnGaugeWidget — an abstract utilization / progress-to-target gauge.
 *
 * Reads a `value` scalar from OpenRegister's aggregation `/value` endpoint and
 * compares it against a `target` (either a static number or a second
 * aggregate), rendering the ratio as a labelled progress bar whose fill
 * percentage and colour reflect utilization. Optional warning / danger
 * thresholds recolour the bar (e.g. green under 80%, amber 80–100%, red over
 * 100%). Use it for budget burn, quota usage, pipeline coverage, SLA capacity,
 * etc. Editable in-app like every catalog widget (ADR-041).
 *
 * Resolved by its registry type key `gauge`; reference it from a manifest
 * placement `{ id, type: 'gauge', content: { label, source, target, ... } }`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   label: 'Pipeline coverage',
 *   format: { style: 'currency', currency: 'EUR', decimals: 0 },
 *   source: { register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', filter: { status: 'open' } },
 *   target: { kind: 'static', value: 500000 },
 *   thresholds: { warn: 80, danger: 100, invert: false },
 * }
 * ```
 */
export default {
	name: 'CnGaugeWidget',

	components: {
		NcLoadingIcon,
	},

	mixins: [widgetLink],

	props: {
		/**
		 * The widget's persisted configuration blob. An optional `route`
		 * (vue-router location) or `link` (external href) turns the whole
		 * tile into a click-through target (see the widgetLink mixin).
		 * @type {{label?: string, route?: (object|string), link?: string, format?: {style?: string, currency?: string, decimals?: number, prefix?: string, suffix?: string}, source?: {register?: string, schema?: string, metric?: string, field?: string, filter?: object}, target?: {kind?: ('static'|'aggregate'), value?: number, metric?: string, field?: string, filter?: object}, thresholds?: {warn?: number, danger?: number, invert?: boolean}}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			value: null,
			target: null,
			loading: false,
			error: '',
		}
	},

	computed: {
		/** Utilization ratio (0–n) of value to target, or null. */
		ratio() {
			const t = Number(this.target)
			const v = Number(this.value)
			if (!Number.isFinite(t) || t === 0 || !Number.isFinite(v)) return null
			return v / t
		},
		/** Percentage label, e.g. "83%". */
		pctLabel() {
			if (this.ratio === null) return '—'
			return Math.round(this.ratio * 100) + '%'
		},
		/** Bar fill width, clamped to 100%. */
		fillWidth() {
			if (this.ratio === null) return '0%'
			return Math.min(100, Math.max(0, this.ratio * 100)) + '%'
		},
		/** Bar colour from the threshold bands (invert flips good/bad). */
		barColor() {
			if (this.ratio === null) return 'var(--color-primary-element)'
			const th = this.content.thresholds || {}
			const pct = this.ratio * 100
			const warn = Number.isFinite(th.warn) ? th.warn : 80
			const danger = Number.isFinite(th.danger) ? th.danger : 100
			let level
			if (pct >= danger) level = 'danger'
			else if (pct >= warn) level = 'warn'
			else level = 'ok'
			if (th.invert) level = level === 'ok' ? 'danger' : level === 'danger' ? 'ok' : 'warn'
			if (level === 'danger') return 'var(--color-error)'
			if (level === 'warn') return 'var(--color-warning)'
			return 'var(--color-success)'
		},
		/** The value, number-formatted per content.format. */
		formattedValue() {
			return this.formatNumber(this.value)
		},
		/** The target, number-formatted per content.format. */
		formattedTarget() {
			return this.formatNumber(this.target)
		},
		/** Stable signature so the watcher only refetches on real change. */
		sourceKey() {
			return JSON.stringify({ s: this.content.source || {}, t: this.content.target || {} })
		},
	},

	watch: {
		sourceKey() {
			this.fetchAll()
		},
	},

	mounted() {
		this.fetchAll()
	},

	methods: {
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
		 * Fetch the value and resolve the target (static or aggregate).
		 *
		 * @return {Promise<void>}
		 */
		async fetchAll() {
			const s = this.content.source || {}
			if (!s.register || !s.schema) {
				this.value = null
				this.target = null
				this.error = ''
				return
			}
			this.loading = true
			this.error = ''
			try {
				const tgt = this.content.target || {}
				const valuePromise = fetchAggregateValue(s)
				const targetPromise = (tgt.kind === 'aggregate')
					? fetchAggregateValue({ register: s.register, schema: s.schema, metric: tgt.metric, field: tgt.field, filter: tgt.filter || {} })
					: Promise.resolve(Number(tgt.value))
				const [v, t] = await Promise.all([valuePromise, targetPromise])
				this.value = v
				this.target = t
			} catch (e) {
				this.error = (e && e.message) || 'error'
				this.value = null
				this.target = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-gauge-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 10px 4px;
}

/* Whole-tile click target when the widget declares a `route`/`link`. */
.cn-gauge-widget--linked {
	cursor: pointer;
	text-decoration: none;
	color: inherit;
	border-radius: var(--border-radius-large, 8px);
	transition: background-color 0.1s ease-in-out;
}

.cn-gauge-widget--linked:hover {
	background-color: var(--color-background-hover);
}

.cn-gauge-widget--linked:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-gauge-widget__head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
}

.cn-gauge-widget__label {
	font-size: 0.95em;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-gauge-widget__pct {
	font-size: 1.2em;
	font-weight: 700;
}

.cn-gauge-widget__track {
	width: 100%;
	height: 10px;
	border-radius: 5px;
	background: var(--color-background-dark);
	overflow: hidden;
}

.cn-gauge-widget__fill {
	height: 100%;
	border-radius: 5px;
	transition: width 0.3s ease;
}

.cn-gauge-widget__foot {
	display: flex;
	align-items: baseline;
	gap: 6px;
	font-size: 0.9em;
}

.cn-gauge-widget__value {
	font-weight: 700;
	color: var(--color-main-text);
}

.cn-gauge-widget__target {
	color: var(--color-text-maxcontrast);
}
</style>
