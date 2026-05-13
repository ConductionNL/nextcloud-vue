// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { isRef, ref, watch } from 'vue'

/**
 * Default OpenRegister GraphQL endpoint.
 *
 * Matches the route in openregister/appinfo/routes.php
 * (`graphQL#execute`). Override per consumer if a different
 * register host is in use.
 */
export const OPENREGISTER_GRAPHQL_PATH = '/apps/openregister/api/graphql'

/**
 * Read a dot-path with optional `[]` array hops out of a result object.
 *
 * Selectors look like:
 * - `data.foo.totalCount`               — scalar at a path
 * - `data.foo.edges[].node.value`       — list of values; each `[]` flat-maps
 * - `data.foo.groups[].aggregate.count` — same idea, deeper
 *
 * Lightweight implementation — not a full JSONPath. We avoid pulling
 * `jsonpath-plus` (~6 KB) since the manifest contract only needs
 * dot-paths and `[]` flat-maps.
 *
 * @param {object|null} obj      The object to read from (typically `response.data`).
 * @param {string}      selector The dot-path with optional `[]` segments.
 * @return {*} The resolved value, or `undefined` if any segment is missing.
 */
export function selectByPath(obj, selector) {
	if (obj === null || obj === undefined || typeof selector !== 'string' || selector === '') {
		return undefined
	}
	const segments = selector.split('.')
	let cursor = [obj]
	for (const raw of segments) {
		const isArrayHop = raw.endsWith('[]')
		const key = isArrayHop ? raw.slice(0, -2) : raw
		const next = []
		for (const value of cursor) {
			if (value === null || value === undefined) continue
			const inner = key === '' ? value : value[key]
			if (inner === undefined) continue
			if (isArrayHop) {
				if (Array.isArray(inner)) next.push(...inner)
				continue
			}
			next.push(inner)
		}
		cursor = next
		if (cursor.length === 0) return isArrayHop ? [] : undefined
	}
	if (segments[segments.length - 1].endsWith('[]')) {
		return cursor
	}
	return cursor.length === 1 ? cursor[0] : cursor
}

/**
 * Reactive GraphQL query composable.
 *
 * POSTs `{ query, variables, operationName }` to the OpenRegister
 * GraphQL endpoint and exposes the response as a reactive ref. The
 * lib does NOT cache responses globally — caching is left to the
 * objectStore + liveUpdatesPlugin path; this composable is a thin
 * fetch wrapper for ad-hoc queries (dashboard widget aggregates,
 * future bespoke screens).
 *
 * Re-runs whenever `query` or `variables` change. Errors land in
 * `error.value`; transport errors are wrapped, GraphQL `errors[]`
 * are surfaced verbatim.
 *
 * @param {string|import('vue').Ref<string>} query           GraphQL document.
 * @param {object|import('vue').Ref<object>} [variables]     Variables object.
 * @param {object}                           [options]       Optional config.
 * @param {string}                           [options.endpoint]      Endpoint URL (default OR).
 * @param {string}                           [options.operationName] GraphQL operation name.
 * @param {boolean}                          [options.immediate]     Run on mount (default true).
 * @return {{ data: import('vue').Ref<any>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null>, refetch: () => Promise<void> }}
 *   Reactive query state. `data.value` is the response `data` object
 *   (not the full response envelope).
 */
export function useGraphQL(query, variables, options = {}) {
	const data = ref(null)
	const loading = ref(false)
	const error = ref(null)

	const endpoint = options.endpoint || generateUrl(OPENREGISTER_GRAPHQL_PATH)
	const operationName = options.operationName || null
	const immediate = options.immediate !== false

	const readQuery = () => (isRef(query) ? query.value : query)
	const readVariables = () => (isRef(variables) ? variables.value : variables) || {}

	const refetch = async () => {
		const q = readQuery()
		if (!q) {
			data.value = null
			return
		}
		loading.value = true
		error.value = null
		try {
			const body = { query: q, variables: readVariables() }
			if (operationName) body.operationName = operationName
			const resp = await axios.post(endpoint, body)
			if (resp.data?.errors?.length) {
				error.value = new Error(resp.data.errors.map((e) => e.message).join('; '))
				data.value = resp.data.data ?? null
				return
			}
			data.value = resp.data?.data ?? null
		} catch (e) {
			error.value = e
			data.value = null
		} finally {
			loading.value = false
		}
	}

	if (immediate) refetch()

	if (isRef(query)) watch(query, refetch)
	if (isRef(variables)) watch(variables, refetch, { deep: true })

	return { data, loading, error, refetch }
}
