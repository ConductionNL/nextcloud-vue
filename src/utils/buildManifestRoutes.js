/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * buildManifestRoutes: the manifest's pages as vue-router route records.
 *
 * Until now every consuming app wrote this by hand:
 *
 *     routes: manifest.pages.map((p) => ({ name: p.id, path: p.route, component: CnPageRenderer }))
 *
 * That one-liner can only ever produce one route per page, which is fine
 * until a page wants a second address for the same surface. The split view
 * needs exactly that: `/cases/split/:id` must mount the SAME index page as
 * `/cases`, because a list that unmounts loses the scroll position the split
 * view exists to keep. Five apps writing the extra record by hand would be
 * five spellings of it within a month, so the library builds them.
 *
 * Every record carries `meta.cnPageId`. CnPageRenderer reads that before it
 * falls back to matching `$route.name === page.id`, so a route whose name is
 * not a page id still resolves to its page instead of rendering nothing.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module utils/buildManifestRoutes
 */

import { routeParamNames } from './routeParams.js'

/**
 * Suffix that turns a page id into the name of its split route.
 *
 * Exported so a caller that needs to push to the split route by name spells
 * it the same way the builder did, rather than re-deriving the convention.
 */
export const SPLIT_ROUTE_SUFFIX = '__split'

/**
 * The route name a page's split view is registered under.
 *
 * @param {string} pageId The manifest page id.
 * @return {string} The split route's name.
 */
export function splitRouteName(pageId) {
	return `${pageId}${SPLIT_ROUTE_SUFFIX}`
}

/**
 * Whether a page declares a working split view.
 *
 * Both halves matter: the key must be there AND `enabled` must be true. A
 * page carrying `splitView: { enabled: false }` is a page that has thought
 * about the split view and decided against it, and it must render exactly
 * as a page that never mentioned it.
 *
 * @param {object} page A manifest page entry.
 * @return {boolean} True when a split route should be emitted.
 */
export function pageHasSplitView(page) {
	return page?.type === 'index' && page?.splitView?.enabled === true
}

/**
 * The path pattern for a page's split route.
 *
 * The param is named `id` unless the page's own path already binds `id`, in
 * which case it is `splitId`. Two params of one name in one path make
 * vue-router keep the last and silently drop the first, which reads as "the
 * split opened the wrong record" and is very hard to trace back to here.
 *
 * @param {string} route The page's own path pattern, e.g. `/cases`.
 * @return {string} The split path, e.g. `/cases/split/:id`.
 */
export function splitRoutePath(route) {
	const base = typeof route === 'string' ? route.replace(/\/+$/, '') : ''
	const param = routeParamNames(base).includes('id') ? 'splitId' : 'id'
	return `${base}/split/:${param}`
}

/**
 * Build the vue-router route records for a manifest.
 *
 * One record per page, plus one extra for every index page declaring
 * `splitView.enabled`. The extra record points at the same component with
 * the same props, so the router swaps the URL without swapping the page.
 *
 * `tabInAddress` needs no record of its own: the tab travels as the `_tab`
 * query parameter on the detail page's existing route. The underscore is not
 * decoration, it is what keeps `resolveQueryFilters` from reading the tab as
 * a filter and sending it to the API.
 *
 * @param {object} manifest The app manifest (v1 or v2; only `pages[]` is read).
 * @param {object} [options] Options.
 * @param {object|Function} [options.component] Component every route mounts. Normally CnPageRenderer.
 * @param {object|Function|boolean} [options.props] `props` for each record, passed straight through to vue-router.
 * @param {(page: object, record: object) => object} [options.decorate] Called with each page and its record; the returned record is used. Lets a host add `beforeEnter`, extra `meta` or a per-page component without re-implementing the builder.
 * @return {Array<object>} Route records, in manifest order, each split route directly after its page.
 *
 * @example
 * import { buildManifestRoutes, CnPageRenderer } from '@conduction/nextcloud-vue'
 *
 * const router = createRouter({
 *   history: createWebHashHistory(),
 *   routes: buildManifestRoutes(manifest, {
 *     component: CnPageRenderer,
 *     props: { manifest, customComponents },
 *   }),
 * })
 */
export function buildManifestRoutes(manifest, options = {}) {
	const pages = Array.isArray(manifest?.pages) ? manifest.pages : []
	const { component = null, props, decorate = null } = options
	const records = []

	for (const page of pages) {
		if (!page || typeof page.id !== 'string' || typeof page.route !== 'string') {
			continue
		}

		records.push(finish(page, {
			name: page.id,
			path: page.route,
			component,
			...(props === undefined ? {} : { props }),
			meta: { cnPageId: page.id },
		}, decorate))

		if (pageHasSplitView(page)) {
			records.push(finish(page, {
				name: splitRouteName(page.id),
				path: splitRoutePath(page.route),
				component,
				...(props === undefined ? {} : { props }),
				meta: {
					cnPageId: page.id,
					cnSplitOf: page.id,
					cnSplitBreakpoint: page.splitView.breakpoint ?? null,
				},
			}, decorate))
		}
	}

	return records
}

/**
 * Hand a record to the caller's `decorate` hook, if there is one.
 *
 * A hook returning nothing keeps the record rather than dropping it: losing
 * a route because a hook forgot to return is a blank page with no error.
 *
 * @param {object} page The page the record was built from.
 * @param {object} record The record.
 * @param {Function|null} decorate The hook, or null.
 * @return {object} The record to register.
 */
function finish(page, record, decorate) {
	if (typeof decorate !== 'function') {
		return record
	}
	return decorate(page, record) || record
}

/**
 * The page id a route resolves to.
 *
 * `meta.cnPageId` first, the route name second. The fallback is what keeps
 * every hand-written router working: an app that still maps its own pages
 * has no `meta`, and its route names are page ids by construction.
 *
 * @param {object} route A vue-router route object (`$route`).
 * @return {string|null} The page id, or null when the route names none.
 */
export function pageIdForRoute(route) {
	const fromMeta = route?.meta?.cnPageId
	if (typeof fromMeta === 'string' && fromMeta !== '') {
		return fromMeta
	}
	const name = route?.name
	return typeof name === 'string' && name !== '' ? name : null
}

/**
 * The record id a split route is showing, if it is a split route at all.
 *
 * @param {object} route A vue-router route object (`$route`).
 * @return {string|null} The id from the path, or null when this is not a split route.
 */
export function splitIdForRoute(route) {
	if (!route?.meta?.cnSplitOf) {
		return null
	}
	const params = route.params || {}
	const id = params.splitId ?? params.id
	return id === undefined || id === null || id === '' ? null : String(id)
}
