<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="aggregates.length > 0" class="cn-summary-aggregates" data-testid="cn-summary-aggregates">
		<div
			v-for="(agg, i) in resolvedChips"
			:key="i"
			class="cn-summary-aggregates__chip"
			:data-testid="`cn-summary-aggregate-${i}`">
			<span class="cn-summary-aggregates__value">
				<NcLoadingIcon v-if="agg.loading" :size="16" />
				<template v-else>{{ agg.display }}</template>
			</span>
			<span class="cn-summary-aggregates__label">{{ agg.label }}</span>
		</div>
	</div>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import { fetchAggregateValue } from '../../utils/fetchAggregate.js'

/**
 * CnSummaryAggregates — declarative count/sum/avg stat chips for a
 * `type:"detail"` page header.
 *
 * Each entry runs ONE aggregation (via OpenRegister's ad-hoc `/value`
 * endpoint — the `runAdhocByRef` contract) over a related schema, scoped to
 * the current detail-page object through `@objectId` / `@object.<field>`
 * filter tokens, and shows the result as a small labelled chip. Lets a detail
 * page surface "12 open cases / €4.2k outstanding" without per-app code.
 *
 * Mounted by `CnDetailPage` when the manifest page config declares
 * `summaryAggregates`. Reads the detail page's `cnObjectContext` inject so the
 * filter tokens resolve against the live object.
 *
 * Example config (consumed by CnDetailPage):
 * ```js
 * summaryAggregates: [
 *   { label: 'Open cases', register: 'pipelinq', schema: 'case', metric: 'count', filter: { client: '@objectId', status: 'open' } },
 *   { label: 'Outstanding', register: 'pipelinq', schema: 'invoice', metric: 'sum', field: 'amount', filter: { client: '@objectId', paid: false }, format: 'currency' },
 * ]
 * ```
 */
export default {
	name: 'CnSummaryAggregates',

	components: { NcLoadingIcon },

	inject: {
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage. Resolves `@objectId` / `@object.<field>` tokens
		 * in each aggregate's filter. Null on surfaces that don't provide one.
		 */
		cnObjectContext: { default: null },
	},

	props: {
		/**
		 * The aggregate descriptors.
		 * @type {Array<{label: string, register: string, schema: string, metric?: string, field?: string, filter?: object, format?: string}>}
		 */
		aggregates: {
			type: Array,
			default: () => [],
		},
	},

	data() {
		return {
			/** Per-aggregate fetched values, keyed by index. */
			values: {},
			/** Per-aggregate loading flags, keyed by index. */
			loadingMap: {},
		}
	},

	computed: {
		/** The unwrapped object context (or null). */
		objectCtx() {
			const c = this.cnObjectContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * The chips with their fetched value formatted for display.
		 *
		 * @return {Array<{label: string, display: (string|number), loading: boolean}>}
		 */
		resolvedChips() {
			return this.aggregates.map((agg, i) => {
				const raw = this.values[i]
				return {
					label: agg.label || '',
					display: this.formatChip(raw, agg.format),
					loading: !!this.loadingMap[i],
				}
			})
		},
		/**
		 * A stable signature of the aggregate query set + the object id it is
		 * scoped to, so the watcher only refetches on a real change.
		 *
		 * @return {string}
		 */
		sourceKey() {
			return JSON.stringify({
				aggs: this.aggregates,
				objectId: this.objectCtx ? this.objectCtx.objectId : null,
			})
		},
	},

	watch: {
		sourceKey: {
			immediate: true,
			handler() {
				this.fetchAll()
			},
		},
	},

	methods: {
		/**
		 * Format a fetched value for the chip. Defaults to a thousands-grouped
		 * number; `format: 'currency'` renders a EUR amount, `format: 'number'`
		 * forces numeric grouping.
		 *
		 * @param {number|null} raw The fetched value.
		 * @param {string} [format] Optional format key (`currency` | `number`).
		 * @return {string|number}
		 */
		formatChip(raw, format) {
			if (raw === null || raw === undefined) return '—'
			if (format === 'currency') {
				const num = Number(raw)
				if (Number.isNaN(num)) return String(raw)
				return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(num)
			}
			if (typeof raw === 'number') return raw.toLocaleString()
			return raw
		},

		/**
		 * Fetch every aggregate, scoping the filter tokens to the current object.
		 *
		 * @return {Promise<void>}
		 */
		async fetchAll() {
			const ctx = this.objectCtx || {}
			await Promise.all(this.aggregates.map((agg, i) => this.fetchOne(agg, i, ctx)))
		},

		/**
		 * Fetch one aggregate value into `values[i]`.
		 *
		 * @param {object} agg The aggregate descriptor.
		 * @param {number} i The index in the list.
		 * @param {object} ctx The object context for token resolution.
		 * @return {Promise<void>}
		 */
		async fetchOne(agg, i, ctx) {
			if (!agg.register || !agg.schema) {
				this.values[i] = null
				return
			}
			this.loadingMap[i] = true
			try {
				const value = await fetchAggregateValue({
					register: agg.register,
					schema: agg.schema,
					metric: agg.metric || 'count',
					field: agg.field,
					filter: agg.filter || {},
				}, ctx)
				this.values[i] = value
			} catch (e) {
				this.values[i] = null
			} finally {
				this.loadingMap[i] = false
			}
		},
	},
}
</script>

<style scoped>
.cn-summary-aggregates {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin: 0 0 4px;
}

.cn-summary-aggregates__chip {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding: 6px 12px;
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-background-hover);
	min-width: 72px;
}

.cn-summary-aggregates__value {
	font-size: 1.25em;
	font-weight: 600;
	line-height: 1.2;
	color: var(--color-main-text);
}

.cn-summary-aggregates__label {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}
</style>
