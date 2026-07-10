/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * kbSearchProviders — the pluggable knowledge-base search PROVIDER seam
 * (#91 Wave 3). CnKbSearchWidget resolves its `content.provider` key
 * against this registry the same way column formatters resolve against
 * `cnFormatters`: a consumer registry (passed to CnAppRoot as
 * `kbSearchProviders`) spread OVER the library built-ins, so an app adds
 * (or overrides) a provider without touching the widget.
 *
 * The LIB ships ONE built-in provider, `default` — the pre-existing
 * endpoint search (GET the configured `endpoint` with the query param,
 * `space` / `tags` / `limit` passed through). An app that talks to a
 * bespoke backend (the xwiki proxy, an external KB API) registers its own
 * provider key; the xwiki client itself stays app-side — the library ships
 * the seam, not the client.
 *
 * A provider is an object:
 *
 * ```js
 * {
 *   // Run a search; resolve an array of articles. `opts` carries the
 *   // widget's config (endpoint, queryParam, space, tags, limit, …).
 *   async search(query, opts) { return [{ id, title, url?, summary? }] },
 *   // Optional: whether result links open in a new tab (external KB).
 *   externalOpen: true,
 * }
 * ```
 *
 * An article is `{ id?, title, url?, summary?|excerpt?|body? }`. Providers
 * MUST reject (throw) on failure so the widget can show its
 * unavailable-fallback — they never surface a partial/garbage list.
 *
 * @module utils/kbSearchProviders
 */

import { buildHeaders, prefixUrl } from './headers.js'

/**
 * Normalise an assortment of likely response shapes into an article list:
 * a bare array, `{ results }`, `{ items }`, or `{ articles }`.
 *
 * @param {*} data The raw response body.
 * @return {Array<object>} The article list (possibly empty).
 */
export function normaliseKbResults(data) {
	if (Array.isArray(data)) return data
	if (data && Array.isArray(data.results)) return data.results
	if (data && Array.isArray(data.items)) return data.items
	if (data && Array.isArray(data.articles)) return data.articles
	return []
}

/**
 * The built-in `default` provider: GET the configured `endpoint` with the
 * query param and the optional `space` / `tags` / `limit` filters. This is
 * the widget's pre-existing behaviour, now behind the provider seam.
 *
 * Uses the same-origin `fetch` + `buildHeaders` transport (so it works
 * without axios in tests) via `prefixUrl`. Rejects on a non-OK response so
 * the widget shows its fallback.
 *
 * @type {{search: (function(string, object): Promise<Array<object>>)}}
 */
export const defaultKbProvider = {
	/**
	 * @param {string} query The search text.
	 * @param {{endpoint?: string, queryParam?: string, space?: string, tags?: (string|string[]), limit?: number}} opts The widget config.
	 * @return {Promise<Array<object>>} The article list.
	 */
	async search(query, opts) {
		const o = opts || {}
		const endpoint = o.endpoint || '/apps/openregister/api/integrations/xwiki/search'
		const queryParam = o.queryParam || 'q'
		const limit = typeof o.limit === 'number' ? o.limit : 8
		const params = new URLSearchParams()
		params.set(queryParam, query)
		params.set('limit', String(limit))
		if (o.space) params.set('space', String(o.space))
		if (o.tags !== undefined && o.tags !== null && o.tags !== '') {
			const tags = Array.isArray(o.tags) ? o.tags.join(',') : String(o.tags)
			if (tags) params.set('tags', tags)
		}
		const url = prefixUrl(`${endpoint}?${params.toString()}`)
		const response = await fetch(url, { headers: buildHeaders() })
		if (!response.ok) throw new Error(`kb search returned ${response.status}`)
		const data = await response.json()
		return normaliseKbResults(data)
	},
}

/**
 * Built-in provider registry — merged UNDER any consumer-registered
 * providers by CnAppRoot's `cnKbSearchProviders` provide.
 *
 * @type {Record<string, object>}
 */
export const BUILT_IN_KB_PROVIDERS = {
	default: defaultKbProvider,
}

/**
 * Resolve a provider by key against a merged registry, falling back to the
 * built-in `default` when the key is unknown/empty.
 *
 * @param {string} [key] The `content.provider` key.
 * @param {object} [registry] The merged provider registry (built-ins + consumer).
 * @return {object|null} The resolved provider, or null when even `default` is missing.
 */
export function resolveKbProvider(key, registry) {
	const reg = registry || BUILT_IN_KB_PROVIDERS
	const provider = reg[key || 'default'] || reg.default || BUILT_IN_KB_PROVIDERS.default
	return provider || null
}
