// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import { computed, isRef } from 'vue'
import { selectByPath, useGraphQL } from './useGraphQL.js'

/**
 * Resolve a manifest-driven `dataSource` block into reactive
 * `{ data, loading, error, refetch }`. The shape of `data.value`
 * depends on which form the manifest used:
 *
 * - **Shorthand** (`{ register, schema, filter?, aggregate: 'count' }`)
 *   - Builds `{ <schemaSlug>(filter: …) { totalCount } }` and reads
 *     `totalCount`. Always resolves to `{ count: number }`.
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
 * @return {{ data: import('vue').Ref<object|null>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null>, refetch: () => Promise<void> }}
 *   Reactive resolution state.
 */
export function useDataSource(dataSource) {
	const ds = computed(() => (isRef(dataSource) ? dataSource.value : dataSource))

	const query = computed(() => buildQuery(ds.value))
	const variables = computed(() => ds.value?.graphql?.variables ?? {})
	const selectors = computed(() => resolveSelectors(ds.value))

	const { data: rawData, loading, error, refetch } = useGraphQL(query, variables, {
		immediate: false,
	})

	// One-shot bootstrap when the input arrives synchronously. Reactive
	// inputs (refs) are handled by useGraphQL's internal watchers.
	if (query.value) refetch()

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

function buildQuery(dataSource) {
	if (!dataSource) return null
	if (dataSource.graphql?.query) return dataSource.graphql.query
	if (dataSource.aggregate === 'count' && dataSource.schema) {
		return buildCountQuery(dataSource.schema, dataSource.filter)
	}
	return null
}

function resolveSelectors(dataSource) {
	if (!dataSource) return null
	if (dataSource.graphql?.selectors) return dataSource.graphql.selectors
	if (dataSource.aggregate === 'count' && dataSource.schema) {
		return { count: `${dataSource.schema}.totalCount` }
	}
	return null
}

/**
 * GraphQL Name production — matches identifiers valid as unquoted field
 * names and argument names in a GraphQL document.
 *
 * Callers that build GraphQL literals with inline keys MUST validate
 * every key through this regex before interpolation, otherwise an
 * attacker-controlled key can break out of the filter literal and inject
 * arbitrary query text against the OR GraphQL endpoint.
 *
 * @see https://spec.graphql.org/October2021/#sec-Names
 */
const GRAPHQL_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Assert that `name` is a valid GraphQL identifier. Throws a TypeError
 * if `name` contains characters outside the GraphQL Name production so
 * that injection payloads fail loudly rather than silently breaking the
 * query structure.
 *
 * @param {string} name  The identifier to validate.
 * @param {string} label Human-readable label for the error message.
 * @throws {TypeError} When `name` is not a valid GraphQL identifier.
 */
function assertGraphQLName(name, label) {
	if (typeof name !== 'string' || !GRAPHQL_NAME_RE.test(name)) {
		const msg = `[useDataSource] ${label} must be a valid GraphQL identifier (letters, digits, underscores; must not start with a digit). Got: ${JSON.stringify(name)}`
		throw new TypeError(msg)
	}
}

/**
 * Build a `{ <schemaSlug>(filter: {...}) { totalCount } }` query.
 * Inlines the filter as a literal because the OR GraphQL filter
 * input type is per-schema (FooFilterInput) — passing as a variable
 * would require knowing the type name client-side, which we don't.
 *
 * ⚠ Security: `schemaSlug` and every filter-object key are validated
 * against the GraphQL Name production (`/^[A-Za-z_][A-Za-z0-9_]*$/`)
 * before interpolation. NEVER call this function with user-controlled
 * values — always use manifest-authored, statically-known field names.
 *
 * @param {string}      schemaSlug GraphQL field name (typically the schema's slug).
 * @param {object|null} filter     Filter map; `null` / empty omits the arg.
 * @return {string} The GraphQL document.
 * @throws {TypeError} When `schemaSlug` or any filter key is not a valid GraphQL identifier.
 */
export function buildCountQuery(schemaSlug, filter) {
	assertGraphQLName(schemaSlug, 'schemaSlug')
	const filterArg = filter && Object.keys(filter).length > 0
		? `(filter: ${stringifyFilter(filter)})`
		: ''
	return `{ ${schemaSlug}${filterArg} { totalCount } }`
}

/**
 * Stringify a filter object as a GraphQL literal — keys unquoted,
 * values JSON-encoded. Recurses into nested objects.
 *
 * ⚠ Security: every object key is validated against the GraphQL Name
 * production before interpolation. NEVER pass user-controlled keys —
 * always use manifest-authored, statically-known field names.
 *
 * @param {*} value The filter value or sub-tree.
 * @return {string} The GraphQL literal representation.
 * @throws {TypeError} When any object key is not a valid GraphQL identifier.
 */
function stringifyFilter(value) {
	if (value === null || value === undefined) return 'null'
	if (Array.isArray(value)) {
		return '[' + value.map(stringifyFilter).join(', ') + ']'
	}
	if (typeof value === 'object') {
		const parts = []
		for (const [k, v] of Object.entries(value)) {
			assertGraphQLName(k, `filter key "${k}"`)
			parts.push(`${k}: ${stringifyFilter(v)}`)
		}
		return '{' + parts.join(', ') + '}'
	}
	return JSON.stringify(value)
}
