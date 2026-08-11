import { resolveFilterTokens, dropOptionalUnresolved } from './resolveFilterTokens.js'

/**
 * Resolve a page base/quick filter map at fetch time.
 *
 * Two grammars are applied, in order:
 *  1. Route-param interpolation — `@route.<name>` / `:<name>` string values are
 *     replaced with the matching `$route.params` entry.
 *  2. The shared fetch-time `@`-token grammar (via `resolveFilterTokens`):
 *     `@me` (current user), `@today`/`@today±Nd`, `@monthStart`/`@quarterStart`/
 *     `@yearStart`, etc. — the same tokens widget/KPI filters use — so a page
 *     base filter can scope to the signed-in user (e.g. `{ assignee: '@me' }`)
 *     or a relative date window without a bespoke wrapper. `@workspace.<key>` /
 *     `@config.<key>` tokens resolve too, against the `ctx` the caller supplies
 *     (the page-level `cnWorkspaceContext`/`cnAppConfig` bags — see
 *     `useSelfFetchList`) — the same grammar `CnObjectListWidget` uses. An
 *     UNRESOLVED OPTIONAL token (`@workspace.<key>?`) is dropped from the
 *     result (see `dropOptionalUnresolved`) so an unset selection shows all
 *     rows instead of sending the literal token string to the API. Literals
 *     and unknown strings pass through unchanged.
 *
 * @param {object} filterMap The configured filter map.
 * @param {object} params The current `$route.params`.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] Token-resolution
 *   context for `@workspace.<key>` / `@config.<key>` / `@objectId` / `@object.<field>` tokens.
 * @return {object} The resolved filter map.
 */
export function resolveFilterMap(filterMap, params, ctx) {
	if (!filterMap || typeof filterMap !== 'object') return {}
	const out = {}
	for (const [k, v] of Object.entries(filterMap)) {
		if (typeof v === 'string' && v.startsWith('@route.')) out[k] = params[v.slice('@route.'.length)]
		else if (typeof v === 'string' && v.startsWith(':')) out[k] = params[v.slice(1)]
		else out[k] = v
	}
	return dropOptionalUnresolved(resolveFilterTokens(out, ctx))
}

/**
 * Extract deep-link filters from `$route.query`. Lets a widget/link navigate to
 * `/cases?caseType=X&status=Y` and land the list pre-filtered. Reserved
 * underscore-prefixed list params (`_search`, `_page`, `_limit`, `_order`) are
 * skipped; everything else is passed through to the fetch (scalars + arrays, so
 * `?status[]=a&status[]=b` becomes an IN match). Merged BELOW the page's
 * `config.filter` so a page's own scoping still wins on a key collision.
 *
 * @param {object} query The `$route.query` object.
 * @return {object} The query-derived filter map.
 */
export function resolveQueryFilters(query) {
	if (!query || typeof query !== 'object') return {}
	const out = {}
	for (const [k, v] of Object.entries(query)) {
		if (k.startsWith('_')) continue
		if (v === undefined || v === null || v === '') continue
		out[k] = v
	}
	return out
}
