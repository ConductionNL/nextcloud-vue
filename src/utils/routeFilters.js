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
 * Read a persisted multi-column sort back out of `$route.query._order` (the
 * JSON-encoded ordered array `CnIndexPage.persistSortToRoute` writes), so a
 * reload or a shared link reproduces the sort it carried.
 *
 * Shared by CnIndexPage's `useSelfFetchList` and CnLogsPage: both feed the
 * result to `useListView`'s `defaultSortKeys`, and while this lived privately in
 * the former, a `?_order=` link was silently ignored on a logs page.
 *
 * Defensive by design — a hand-edited or truncated param must not break the
 * page: anything that is not a non-empty array of `{ key }` entries returns
 * null, which callers read as "no persisted sort, use the configured default".
 *
 * @param {object|null} route The current `$route` (or null when there is no router).
 * @return {Array<{key: string, order: 'asc'|'desc'}>|null} The restored sort, or null.
 */
export function parseSortKeysFromQuery(route) {
	const raw = route && route.query && route.query._order
	if (typeof raw !== 'string' || raw === '') return null
	let parsed
	try {
		parsed = JSON.parse(raw)
	} catch (e) {
		return null
	}
	if (!Array.isArray(parsed) || parsed.length === 0) return null
	const keys = parsed
		.filter((k) => k && typeof k.key === 'string')
		.map((k) => ({ key: k.key, order: k.order === 'desc' ? 'desc' : 'asc' }))
	return keys.length > 0 ? keys : null
}

/**
 * Extract deep-link filters from `$route.query`. Lets a widget/link navigate to
 * `/cases?caseType=X&status=Y` and land the list pre-filtered. Reserved
 * underscore-prefixed list params (`_search`, `_page`, `_limit`, `_order`) are
 * skipped; everything else is passed through to the fetch (scalars + arrays, so
 * `?status[]=a&status[]=b` becomes an IN match). Merged BELOW the page's
 * `config.filter` so a page's own scoping still wins on a key collision.
 *
 * The values go through the SAME `@`-token grammar a page's `config.filter`
 * gets (see `resolveFilterMap`), so `?assignee=@me` scopes to the signed-in
 * user and `?due=@today` to today. Without that, a `menu[].query` preset
 * carrying a token sent the LITERAL string `@me` to the API and the entry
 * silently listed nothing — which is exactly the shape ADR-097 Decision 5
 * asks apps to replace a duplicate index page with.
 *
 * @param {object} query The `$route.query` object.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] Token-resolution
 *   context, the same bag `resolveFilterMap` takes.
 * @return {object} The query-derived filter map.
 */
export function resolveQueryFilters(query, ctx) {
	if (!query || typeof query !== 'object') return {}
	const out = {}
	for (const [k, v] of Object.entries(query)) {
		if (k.startsWith('_')) continue
		if (v === undefined || v === null || v === '') continue
		out[k] = v
	}
	return dropOptionalUnresolved(resolveFilterTokens(out, ctx))
}
