// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Pure helpers for CnIndexPage's saved-views feature (saved-views-ui).
 *
 * OpenRegister ships a saved-search Views backend
 * (`/apps/openregister/api/views`, ViewsController + ViewService); these
 * helpers translate between the three state shapes involved:
 *
 * 1. **Route query** — CnIndexPage's existing deep-link contract: every
 *    `$route.query` key NOT starting with `_` is a fetch filter
 *    (see `useSelfFetchList.resolveQueryFilters`); `_`-prefixed keys are
 *    reserved list params. This module adds `_search`, `_sortKey` and
 *    `_sortOrder` as reserved keys for view application.
 * 2. **View state** — the normalized internal object
 *    `{ filters, search, sortKey, sortOrder }`.
 * 3. **OR View payload** — the `POST/PUT /api/views` body whose opaque
 *    `query` field round-trips through OpenRegister unchanged.
 *
 * All functions are pure and defensive: malformed input degrades to the
 * empty/default state, never throws.
 *
 * @module utils/savedViewHelpers
 */

/** The default (empty) view state. @return {object} A fresh empty state. */
function emptyState() {
	return { filters: {}, search: '', sortKey: null, sortOrder: 'asc' }
}

/**
 * Extract the current view state from a `$route.query`-shaped object.
 *
 * Non-underscore-prefixed keys become `filters` entries (values passed
 * through as-is, including arrays from `?status[]=a&status[]=b` deep
 * links). Reserved keys map onto the dedicated state fields: `_search`,
 * `_sortKey`, `_sortOrder`. Other reserved keys (`_page`, `_limit`, …)
 * are ignored — pagination is never part of a saved view.
 *
 * @param {object|null|undefined} query The `$route.query` object.
 * @return {{ filters: object, search: string, sortKey: ?string, sortOrder: string }} The normalized view state.
 */
export function extractViewStateFromRouteQuery(query) {
	const state = emptyState()
	if (!query || typeof query !== 'object' || Array.isArray(query)) {
		return state
	}
	for (const [key, value] of Object.entries(query)) {
		if (key.startsWith('_')) {
			continue
		}
		if (value === undefined || value === null || value === '') {
			continue
		}
		state.filters[key] = value
	}
	if (typeof query._search === 'string' && query._search !== '') {
		state.search = query._search
	}
	if (typeof query._sortKey === 'string' && query._sortKey !== '') {
		state.sortKey = query._sortKey
		state.sortOrder = query._sortOrder === 'desc' ? 'desc' : 'asc'
	}
	return state
}

/**
 * Build a fresh route-query object that APPLIES a view state.
 *
 * Spreads `state.filters` (skipping null/undefined/empty-string values),
 * then sets the reserved keys only when meaningful: `_search` for a
 * non-empty search term, `_sortKey`/`_sortOrder` for an active sort.
 * Deliberately omits `_page` — applying a view is a full state replace
 * that implicitly resets pagination (the caller `$router.replace`s the
 * whole query, dropping any existing `_page`).
 *
 * @param {{ filters?: object, search?: string, sortKey?: ?string, sortOrder?: string }} state The view state to serialize.
 * @return {object} A plain object suitable for `$router.replace({ query })`.
 */
export function buildRouteQueryFromViewState(state) {
	const query = {}
	const src = (state && typeof state === 'object') ? state : {}
	const filters = (src.filters && typeof src.filters === 'object' && !Array.isArray(src.filters)) ? src.filters : {}
	for (const [key, value] of Object.entries(filters)) {
		if (value === undefined || value === null || value === '') {
			continue
		}
		query[key] = value
	}
	if (typeof src.search === 'string' && src.search !== '') {
		query._search = src.search
	}
	if (src.sortKey) {
		query._sortKey = String(src.sortKey)
		query._sortOrder = src.sortOrder === 'desc' ? 'desc' : 'asc'
	}
	return query
}

/**
 * Build the exact `POST /apps/openregister/api/views` (and PUT) request
 * body for persisting a view. The `query` field is OpenRegister's opaque
 * JSON blob — ViewsController stores `$data['query']` verbatim when it is
 * an array/object, so the shape below round-trips unchanged and
 * {@link extractViewState} is its inverse.
 *
 * @param {object} options Payload options.
 * @param {string} options.name Required view name.
 * @param {string} [options.description] Optional description.
 * @param {boolean} [options.isPublic] Share the view with other users.
 * @param {boolean} [options.isDefault] Mark as the user's default view.
 * @param {{ filters?: object, search?: string, sortKey?: ?string, sortOrder?: string }} options.state The view state to persist.
 * @param {string} [options.scope] The pages this view belongs to, from {@link savedViewScope}; omitted when empty.
 * @param {string} [options.register] The page's register, written as OpenRegister's own `registers` list.
 * @param {object|string} [options.schema] The page's schema (slug or object), written as OpenRegister's own `schemas` list.
 * @return {object} The request body for the OR views API.
 */
export function buildViewCreatePayload({ name, description, isPublic, isDefault, state, scope, register, schema } = {}) {
	const src = (state && typeof state === 'object') ? state : {}
	const query = {
		filters: (src.filters && typeof src.filters === 'object' && !Array.isArray(src.filters)) ? src.filters : {},
		search: (typeof src.search === 'string') ? src.search : '',
		sort: src.sortKey
			? { key: String(src.sortKey), order: src.sortOrder === 'desc' ? 'desc' : 'asc' }
			: null,
	}
	if (typeof scope === 'string' && scope !== '') {
		query.scope = scope
	}
	if (typeof register === 'string' && register !== '') {
		query.registers = [register]
	}
	const slug = schemaSlug(schema)
	if (slug !== '') {
		query.schemas = [slug]
	}
	return {
		name,
		description: description || '',
		isPublic: !!isPublic,
		isDefault: !!isDefault,
		query,
	}
}

/**
 * The slug of a schema given as a slug or as a schema object.
 *
 * @param {object|string|null|undefined} schema The page's `schema` prop.
 * @return {string} The slug, or the empty string.
 */
export function schemaSlug(schema) {
	if (typeof schema === 'string') {
		return schema
	}
	if (schema && typeof schema === 'object' && typeof schema.slug === 'string') {
		return schema.slug
	}
	return ''
}

/**
 * The key naming which pages share a view.
 *
 * A view is a set of filters over one schema's fields, so by default every
 * page over the same register and schema shares it and no other page sees
 * it: three case indexes share their views, the organisations index does
 * not. `savedViewsScope` on a page overrides that, for pages that should
 * share views although they read different sources, or keep them apart
 * although they read the same one.
 *
 * @param {object} page The page.
 * @param {string} [page.scope] The explicit `savedViewsScope`, when set.
 * @param {string} [page.register] The page's register.
 * @param {object|string} [page.schema] The page's schema, slug or object.
 * @return {string} The scope key, or the empty string for a page with no source.
 */
export function savedViewScope({ scope, register, schema } = {}) {
	if (typeof scope === 'string' && scope !== '') {
		return scope
	}
	const slug = schemaSlug(schema)
	if (typeof register === 'string' && register !== '' && slug !== '') {
		return `${register}/${slug}`
	}
	return ''
}

/**
 * Whether a saved view belongs on a page.
 *
 * A view saved with a `scope` is shown where the scope matches. A view that
 * names `schemas` (OpenRegister's own search UI writes those) is shown on a
 * page over one of them. A view that says neither, saved before views were
 * scoped, is shown everywhere as it always was: hiding it would lose the
 * view, and nothing can tell which page it was made on.
 *
 * @param {object|null|undefined} view The View API object.
 * @param {object} page The page, as {@link savedViewScope} takes it.
 * @return {boolean} True when the view is shown on this page.
 */
export function viewMatchesScope(view, page = {}) {
	const query = view && typeof view === 'object' ? view.query : null
	if (!query || typeof query !== 'object' || Array.isArray(query)) {
		return true
	}
	if (typeof query.scope === 'string' && query.scope !== '') {
		return query.scope === savedViewScope(page)
	}
	if (Array.isArray(query.schemas) && query.schemas.length > 0) {
		const slug = schemaSlug(page.schema)
		if (slug === '' || !query.schemas.map(String).includes(slug)) {
			return false
		}
		if (Array.isArray(query.registers) && query.registers.length > 0 && page.register) {
			return query.registers.map(String).includes(String(page.register))
		}
		return true
	}
	return true
}

/**
 * Normalize a View API object (as returned by `GET /api/views`) back into
 * the internal view state. Accepts either a full view object (reads its
 * `query` property) or a raw query blob directly. Every field degrades
 * defensively: missing/null/malformed `query`, non-object `filters`,
 * malformed `sort` all yield the empty/default state — never throws.
 *
 * @param {object|null|undefined} view The View API object (or its raw `query` blob).
 * @return {{ filters: object, search: string, sortKey: ?string, sortOrder: string }} The normalized view state.
 */
export function extractViewState(view) {
	const state = emptyState()
	if (!view || typeof view !== 'object' || Array.isArray(view)) {
		return state
	}
	// Full view object (has a `query` key) or a raw query blob itself.
	const query = (Object.hasOwn(view, 'query')) ? view.query : view
	if (!query || typeof query !== 'object' || Array.isArray(query)) {
		return state
	}
	if (query.filters && typeof query.filters === 'object' && !Array.isArray(query.filters)) {
		for (const [key, value] of Object.entries(query.filters)) {
			if (value === undefined || value === null || value === '') {
				continue
			}
			state.filters[key] = value
		}
	}
	if (typeof query.search === 'string') {
		state.search = query.search
	}
	const sort = query.sort
	if (sort && typeof sort === 'object' && !Array.isArray(sort) && sort.key) {
		state.sortKey = String(sort.key)
		state.sortOrder = sort.order === 'desc' ? 'desc' : 'asc'
	}
	return state
}

/**
 * Whether the given view is owned by the given user. Drives the delete
 * affordance in CnSavedViewsControl — OpenRegister scopes destroy() to the
 * owner server-side (a foreign id 404s), so this only hides the button for
 * views the API would refuse to delete anyway.
 *
 * @param {object|null|undefined} view The View API object.
 * @param {string|null|undefined} currentUserId The signed-in NC user id.
 * @return {boolean} True when the view belongs to the current user.
 */
export function isOwnView(view, currentUserId) {
	return !!view && !!currentUserId && view.owner === currentUserId
}
