// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>

/**
 * routeParams — build `router.push()` params for opening one object on a
 * named route, using the param name that route actually declares.
 *
 * A manifest names its own params: buildiq writes
 * `/applications/:objectId`, other apps write `/meetings/:id`. Pushing a
 * hardcoded `{ id }` at a `:objectId` route makes vue-router discard the
 * param and then throw `Missing required param "objectId"`, so the row click
 * dies in an unhandled error instead of navigating.
 */

/**
 * The param names a route path declares, in order.
 *
 * @param {string} path A vue-router path (e.g. `/builder/:slug/schemas/:schemaId`).
 * @return {Array<string>} Param names without the colon; empty when the path declares none.
 */
export function routeParamNames(path) {
	if (typeof path !== 'string') return []
	return (path.match(/:[A-Za-z0-9_]+/g) || []).map((token) => token.slice(1))
}

/**
 * The path registered for a named route, read off the router.
 *
 * @param {object} router The vue-router instance.
 * @param {string} name The route name.
 * @return {string|null} The path, or null when the router cannot be asked.
 */
export function routePathFor(router, name) {
	if (!router || typeof router.getRoutes !== 'function') return null
	const record = (router.getRoutes() || []).find((r) => r && r.name === name)
	return typeof record?.path === 'string' ? record.path : null
}

/**
 * Params for opening `id` on the route at `path`.
 *
 * The id fills the path's LAST param — the most specific segment, which is
 * the object in every shape we route to (`/applications/:objectId`,
 * `/builder/:slug/schemas/:schemaId`). Earlier params are carried over from
 * the current route, so a nested detail page keeps its parent's context.
 *
 * @param {string|null} path The target route's path, or null when unknown.
 * @param {string|number} id The object id.
 * @param {object} [currentParams] `$route.params` of the page being left.
 * @return {object} Params for `router.push()`. `{ id }` when `path` is
 *   unknown, preserving the pre-existing behaviour for routes that are not
 *   in the manifest.
 */
export function buildRouteParams(path, id, currentParams = {}) {
	if (typeof path !== 'string') return { id: String(id) }
	const names = routeParamNames(path)
	if (names.length === 0) return {}
	const params = {}
	for (const name of names.slice(0, -1)) {
		if (currentParams?.[name] !== undefined) params[name] = currentParams[name]
	}
	params[names[names.length - 1]] = String(id)
	return params
}
