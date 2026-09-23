import { dropOptionalUnresolved, resolveFilterTokens } from './resolveFilterTokens.js'

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
	if (!filterMap || typeof filterMap !== 'object') {
		return {}
	}
	const out = {}
	for (const [k, v] of Object.entries(filterMap)) {
		if (typeof v === 'string' && v.startsWith('@route.')) {
			out[k] = params[v.slice('@route.'.length)]
		} else if (typeof v === 'string' && v.startsWith(':')) {
			out[k] = params[v.slice(1)]
		} else {
			out[k] = v
		}
	}
	return dropOptionalUnresolved(resolveFilterTokens(out, ctx))
}

/**
 * Parse the `_order` query value — the JSON-encoded ordered array that carries
 * a list's sort through the address, `[{ key, order }, …]`.
 *
 * This is the ONE parser for that value. It used to be three near-copies (here,
 * in `listNavigation`, and privately in `CnPageRenderer`), and a fourth
 * component wrote a different spelling entirely; that drift is what let a saved
 * view's sort be written in a format nothing read.
 *
 * Defensive by design — a hand-edited or truncated param must not break the
 * page, so anything that is not an array of `{ key }` entries yields an empty
 * list. Deliberately uncapped: CnDataTable caps shift+click at three keys as an
 * affordance, but a capped parser would silently drop the third key of a link
 * somebody sent.
 *
 * @param {unknown} raw The raw `_order` query value.
 * @return {Array<{key: string, order: 'asc'|'desc'}>} The sort, or an empty list.
 */
export function parseSortKeys(raw) {
	if (typeof raw !== 'string' || raw === '') {
		return []
	}
	let parsed
	try {
		parsed = JSON.parse(raw)
	} catch {
		return []
	}
	if (!Array.isArray(parsed)) {
		return []
	}
	return parsed
		.filter((k) => k && typeof k.key === 'string' && k.key !== '')
		.map((k) => ({ key: k.key, order: k.order === 'desc' ? 'desc' : 'asc' }))
}

/**
 * Read a persisted multi-column sort back out of `$route.query._order`, so a
 * reload or a shared link reproduces the sort it carried.
 *
 * Shared by CnIndexPage's `useSelfFetchList` and CnLogsPage: both feed the
 * result to `useListView`'s `defaultSortKeys`, and while this lived privately in
 * the former, a `?_order=` link was silently ignored on a logs page.
 *
 * Returns `null` rather than `[]` for nothing, because both callers fall through
 * to a configured default with `||` and an empty array would satisfy it.
 *
 * @param {object|null} route The current `$route` (or null when there is no router).
 * @return {Array<{key: string, order: 'asc'|'desc'}>|null} The restored sort, or null.
 */
export function parseSortKeysFromQuery(route) {
	const keys = parseSortKeys(route && route.query && route.query._order)
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
	if (!query || typeof query !== 'object') {
		return {}
	}
	const out = {}
	for (const [k, v] of Object.entries(query)) {
		if (k.startsWith('_')) {
			continue
		}
		if (v === undefined || v === null || v === '') {
			continue
		}
		out[k] = v
	}
	return dropOptionalUnresolved(resolveFilterTokens(out, ctx))
}
