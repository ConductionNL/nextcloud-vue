// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { computed, isRef, ref } from 'vue'
import { useGraphQL, selectByPath } from './useGraphQL.js'

/**
 * GraphQL `TimeInterval` enum values, kept in sync with OR's
 * `add-time-bucket-aggregation` spec. Used to validate the
 * manifest's `bucket.interval` field before emission.
 */
const TIME_INTERVALS = ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']

/**
 * GraphQL `AggregationMetric` enum values. `COUNT` is the default
 * server-side; non-count metrics require `metricField`.
 */
const AGGREGATION_METRICS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']

/**
 * Resolve a manifest-driven `dataSource` block into reactive
 * `{ data, loading, error, refetch }`. The shape of `data.value`
 * depends on which form the manifest used:
 *
 * - **Shorthand** (`{ register, schema, filter?, aggregate: 'count' }`)
 *   - Builds `{ <schemaSlug>(filter: …) { totalCount } }` and reads
 *     `totalCount`. Always resolves to `{ count: number }`.
 *
 * - **Bucket shorthand** (`{ register, schema, filter?, bucket: {
 *     field, interval, metric?, metricField?, fromVar, toVar,
 *     staticRange? } }`)
 *   - Builds `{ <schemaSlug>(filter: …, groupBy: { field: "...",
 *     interval: <INTERVAL>, from: $from, to: $to }) { groups { key
 *     value } } }` and resolves to
 *     `{ series: [values…], categories: [keys…] }`.
 *   - `from` / `to` GraphQL variables come from `options.range`
 *     (a `Ref<{ from, to }|null>`) when set, otherwise from
 *     `bucket.staticRange`. If neither is available the query is
 *     skipped (no HTTP request, `data.value` stays null).
 *
 * - **Raw GraphQL** (`{ graphql: { query, variables?, selectors: { … } } }`)
 *   - Issues the supplied query and runs each entry of `selectors`
 *     through `selectByPath`. The map keys become the keys of
 *     `data.value`. Use this when you need richer aggregates than
 *     `count` (chart series, breakdowns, ...).
 *
 * Backwards-compat: when `dataSource` is `null`/`undefined` the
 * composable returns nulls and never queries — callers should also
 * accept static fallback props (`series`, `count`, …).
 *
 * Note on the shorthand: the schema field name in the generated
 * GraphQL is the schema's slug. `singularize` collapses identical
 * singular/plural slugs onto one connection field, so
 * `schema: 'meeting'` yields `meeting(filter: …) { totalCount }`.
 *
 * @param {object|import('vue').Ref<object|null>} dataSource Manifest dataSource block (or null).
 * @param {object} [options] Optional config.
 * @param {import('vue').Ref<{from: string, to: string}|null>|(() => {from: string, to: string}|null)} [options.range]
 *   Reactive date-range source feeding the bucket shorthand's
 *   `fromVar` / `toVar` variables. Typically the consumer wires
 *   `inject('cnDashboardDateRange', ref(null))` into this slot.
 * @return {{ data: import('vue').Ref<object|null>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null>, refetch: () => Promise<void> }}
 *   Reactive resolution state.
 */
export function useDataSource(dataSource, options = {}) {
	const ds = computed(() => (isRef(dataSource) ? dataSource.value : dataSource))
	const range = computed(() => {
		if (!options.range) return null
		const r = options.range
		return isRef(r) ? r.value : (typeof r === 'function' ? r() : r)
	})

	// `bucketError` surfaces synchronous validation issues
	// (unknown interval, missing metricField) without firing a
	// request. We OR this into the GraphQL-side error ref below.
	const bucketError = ref(null)

	const queryAndVars = computed(() => {
		bucketError.value = null
		const s = ds.value
		if (!s) return { query: null, variables: {} }
		// Raw GraphQL form — pass through.
		if (s.graphql?.query) {
			return { query: s.graphql.query, variables: s.graphql.variables ?? {} }
		}
		// Bucket shorthand.
		if (s.bucket && s.schema) {
			try {
				const built = buildBucketQuery({
					schemaSlug: s.schema,
					filter: s.filter,
					bucket: s.bucket,
				})
				const window = range.value || s.bucket.staticRange || null
				if (!window || !window.from || !window.to) {
					// No range available → skip the query.
					return { query: null, variables: {} }
				}
				const variables = {
					[s.bucket.fromVar || 'from']: window.from,
					[s.bucket.toVar || 'to']: window.to,
				}
				return { query: built, variables }
			} catch (e) {
				bucketError.value = e
				return { query: null, variables: {} }
			}
		}
		// Count shorthand.
		if (s.aggregate === 'count' && s.schema) {
			return { query: buildCountQuery(s.schema, s.filter), variables: {} }
		}
		return { query: null, variables: {} }
	})

	const query = computed(() => queryAndVars.value.query)
	const variables = computed(() => queryAndVars.value.variables)
	const selectors = computed(() => resolveSelectors(ds.value))

	const { data: rawData, loading, error: gqlError, refetch } = useGraphQL(query, variables, {
		immediate: false,
	})

	// One-shot bootstrap when the input arrives synchronously. Reactive
	// inputs (refs) are handled by useGraphQL's internal watchers.
	if (query.value) refetch()

	const error = computed(() => bucketError.value || gqlError.value)

	const data = computed(() => {
		if (!rawData.value || !selectors.value) return null
		const out = {}
		for (const [key, path] of Object.entries(selectors.value)) {
			out[key] = selectByPath(rawData.value, path)
		}
		return out
	})

	return { data, loading, error, refetch }
}

function resolveSelectors(dataSource) {
	if (!dataSource) return null
	if (dataSource.graphql?.selectors) return dataSource.graphql.selectors
	if (dataSource.bucket && dataSource.schema) {
		return {
			series: `${dataSource.schema}.groups[].value`,
			categories: `${dataSource.schema}.groups[].key`,
		}
	}
	if (dataSource.aggregate === 'count' && dataSource.schema) {
		return { count: `${dataSource.schema}.totalCount` }
	}
	return null
}

/**
 * Build a `{ <schemaSlug>(filter: {...}) { totalCount } }` query.
 * Inlines the filter as a literal because the OR GraphQL filter
 * input type is per-schema (FooFilterInput) — passing as a variable
 * would require knowing the type name client-side, which we don't.
 *
 * @param {string}      schemaSlug GraphQL field name (typically the schema's slug).
 * @param {object|null} filter     Filter map; `null` / empty omits the arg.
 * @return {string} The GraphQL document.
 */
export function buildCountQuery(schemaSlug, filter) {
	const filterArg = filter && Object.keys(filter).length > 0
		? `(filter: ${stringifyFilter(filter)})`
		: ''
	return `{ ${schemaSlug}${filterArg} { totalCount } }`
}

/**
 * Build a time-bucketed `groupBy` query against OR's auto-generated
 * GraphQL schema. The shape of the emitted document is:
 *
 * ```graphql
 * query($from: String!, $to: String!) {
 *   <schemaSlug>(filter: <filter or omitted>,
 *                groupBy: { field: "<field>", interval: <INTERVAL>,
 *                           from: $from, to: $to,
 *                           metric: <METRIC>,
 *                           metricField: "<metricField>" })
 *   {
 *     groups { key value }
 *   }
 * }
 * ```
 *
 * `interval` / `metric` are normalised case-insensitively against
 * the OR `TimeInterval` and `AggregationMetric` enums. Unknown
 * values, or `metric != count` without a `metricField`, throw —
 * the composable surfaces the error via `error.value` instead of
 * firing a half-formed request.
 *
 * @param {object} input Build inputs.
 * @param {string} input.schemaSlug Schema slug (the GraphQL field name).
 * @param {object|null} [input.filter] Optional filter map.
 * @param {{ field: string, interval: string, metric?: string, metricField?: string, fromVar?: string, toVar?: string, staticRange?: { from: string, to: string } }} input.bucket
 *   Bucket descriptor. `interval` is case-insensitive
 *   (`minute|hour|day|week|month|quarter|year`); `metric` defaults to
 *   `'count'` and accepts `count|sum|avg|min|max` (case-insensitive);
 *   non-count metrics require `metricField`. `fromVar` / `toVar`
 *   default to `'from'` / `'to'`.
 * @return {string} The GraphQL document.
 */
export function buildBucketQuery({ schemaSlug, filter, bucket }) {
	if (!schemaSlug) {
		throw new Error('buildBucketQuery: schemaSlug is required')
	}
	if (!bucket || !bucket.field) {
		throw new Error('buildBucketQuery: bucket.field is required')
	}
	const interval = normaliseInterval(bucket.interval)
	const metric = normaliseMetric(bucket.metric)
	const metricField = bucket.metricField || null
	if (metric !== 'COUNT' && !metricField) {
		throw new Error(`buildBucketQuery: metricField is required for non-count metrics (got metric=${metric})`)
	}
	const fromVar = bucket.fromVar || 'from'
	const toVar = bucket.toVar || 'to'

	const groupByParts = [
		`field: ${JSON.stringify(bucket.field)}`,
		`interval: ${interval}`,
		`from: $${fromVar}`,
		`to: $${toVar}`,
	]
	if (metric !== 'COUNT') {
		groupByParts.push(`metric: ${metric}`)
		groupByParts.push(`metricField: ${JSON.stringify(metricField)}`)
	}

	const args = []
	if (filter && Object.keys(filter).length > 0) {
		args.push(`filter: ${stringifyFilter(filter)}`)
	}
	args.push(`groupBy: { ${groupByParts.join(', ')} }`)

	return `query($${fromVar}: String!, $${toVar}: String!) { `
		+ `${schemaSlug}(${args.join(', ')}) { groups { key value } } }`
}

/**
 * Normalise the manifest `interval` (case-insensitive) to the
 * GraphQL `TimeInterval` enum literal. Throws on unknown values
 * so the composable can surface a clear error before firing the
 * request.
 *
 * @param {string} interval Manifest interval (e.g. `'day'`).
 * @return {string} The enum literal (e.g. `'DAY'`).
 */
function normaliseInterval(interval) {
	if (!interval || typeof interval !== 'string') {
		throw new Error('buildBucketQuery: bucket.interval is required')
	}
	const up = interval.toUpperCase()
	if (!TIME_INTERVALS.includes(up)) {
		throw new Error(`buildBucketQuery: unknown interval "${interval}" (expected one of ${TIME_INTERVALS.join('|')})`)
	}
	return up
}

/**
 * Normalise the manifest `metric` (case-insensitive, defaulting to
 * `'count'`) to the GraphQL `AggregationMetric` enum literal.
 *
 * @param {string} [metric] Manifest metric.
 * @return {string} The enum literal (default `'COUNT'`).
 */
function normaliseMetric(metric) {
	if (metric === undefined || metric === null || metric === '') return 'COUNT'
	if (typeof metric !== 'string') {
		throw new Error(`buildBucketQuery: metric must be a string (got ${typeof metric})`)
	}
	const up = metric.toUpperCase()
	if (!AGGREGATION_METRICS.includes(up)) {
		throw new Error(`buildBucketQuery: unknown metric "${metric}" (expected one of ${AGGREGATION_METRICS.join('|')})`)
	}
	return up
}

/**
 * Stringify a filter object as a GraphQL literal — keys unquoted,
 * values JSON-encoded. Recurses into nested objects.
 *
 * @param {*} value The filter value or sub-tree.
 * @return {string} The GraphQL literal representation.
 */
function stringifyFilter(value) {
	if (value === null || value === undefined) return 'null'
	if (Array.isArray(value)) {
		return '[' + value.map(stringifyFilter).join(', ') + ']'
	}
	if (typeof value === 'object') {
		const parts = []
		for (const [k, v] of Object.entries(value)) {
			parts.push(`${k}: ${stringifyFilter(v)}`)
		}
		return '{' + parts.join(', ') + '}'
	}
	return JSON.stringify(value)
}
