// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * A saved view as a place: its route, its presentation and its pin.
 *
 * Until now a saved view was a setting you reapplied. It lived behind a
 * dropdown on the page, it left no trace in the address, and the only way to
 * send someone the lens you built was to describe it. A page that declares
 * `savedViewPlaces` changes three things and nothing else:
 *
 * 1. Every view of that page gets an address, `/<route>/<routeBase>/:viewId`.
 * 2. The view's own presentation config decides how it opens, so the person
 *    who follows the link sees the shape the view was built in.
 * 3. A pinned view hangs under that page's navigation entry, never beside it.
 *
 * All of this is pure: the functions here read a page, a view or a menu and
 * return a value. The fetching, the routing and the rendering stay in the
 * components, so every rule below can be read and tested without a browser.
 *
 * The view objects are OpenRegister's (`GET /apps/openregister/api/views`).
 * Two of their fields matter here and both are spelled the way OpenRegister
 * spells them, because a near-miss on a field name is a feature that quietly
 * does nothing: `presentation` (`{ viewType, kanban?, calendar? }`, defaulted
 * to `table` server-side) and `favoredBy` (the user ids that pinned it).
 *
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 * @module utils/savedViewPlaces
 */

import { routeParamNames } from './routeParams.js'

/** Suffix that turns a page id into the name of its saved-view route. */
export const SAVED_VIEW_ROUTE_SUFFIX = '__view'

/** The path segment between a page's route and the view id, by default. */
export const DEFAULT_SAVED_VIEW_ROUTE_BASE = 'views'

/** How many pinned views the navigation renders under one entry, by default. */
export const DEFAULT_PINNED_VIEW_CAP = 5

/**
 * The query key that carried a view before the view had a route.
 *
 * Links with it were already sent, so it keeps working: on a page that
 * declares places it redirects to the view route, which leaves one canonical
 * address rather than two that drift (ADR-052).
 */
export const LEGACY_VIEW_QUERY_KEY = 'view'

/**
 * The presentations the view config can name, mapped onto the index page's
 * own view-mode vocabulary.
 *
 * OpenRegister stores `viewType`, CnIndexPage renders `viewMode`, and the two
 * words were coined in different repositories for the same thing. Translating
 * in one place beats every caller guessing whether `kanban` or `board` is the
 * spelling that renders.
 */
export const PRESENTATION_VIEW_MODES = Object.freeze({
	table: 'table',
	cards: 'cards',
	kanban: 'board',
	board: 'board',
	calendar: 'calendar',
	map: 'map',
})

/**
 * Whether a page declares that its saved views are places.
 *
 * Both halves matter, as they do for the split view: the key must be there
 * AND `enabled` must be true, so a page carrying `{ enabled: false }` renders
 * exactly like a page that never named the key.
 *
 * @param {object} page A manifest page entry.
 * @return {boolean} True when this page's views are places.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function pageHasSavedViewPlaces(page) {
	return page?.type === 'index' && page?.savedViewPlaces?.enabled === true
}

/**
 * The route name a page's saved views are registered under.
 *
 * @param {string} pageId The manifest page id.
 * @return {string} The view route's name.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function savedViewRouteName(pageId) {
	return `${pageId}${SAVED_VIEW_ROUTE_SUFFIX}`
}

/**
 * The path segment a page puts between its own route and the view id.
 *
 * @param {object} page A manifest page entry.
 * @return {string} The segment, without slashes.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function savedViewRouteBase(page) {
	const declared = page?.savedViewPlaces?.routeBase
	if (typeof declared !== 'string') {
		return DEFAULT_SAVED_VIEW_ROUTE_BASE
	}
	const trimmed = declared.replace(/^\/+|\/+$/g, '').trim()
	return trimmed === '' ? DEFAULT_SAVED_VIEW_ROUTE_BASE : trimmed
}

/**
 * The path pattern for a page's saved-view route.
 *
 * The param is named `viewId` unless the page's own path already binds that
 * name, in which case it is `savedViewId`. Two params of one name in one path
 * make vue-router keep the last and drop the first without a word, which
 * reads as "the wrong view opened" and is very hard to trace back to here.
 *
 * @param {string} route The page's own path pattern, e.g. `/cases`.
 * @param {string} [routeBase] The segment between them, default `views`.
 * @return {string} The view path, e.g. `/cases/views/:viewId`.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function savedViewRoutePath(route, routeBase = DEFAULT_SAVED_VIEW_ROUTE_BASE) {
	const base = typeof route === 'string' ? route.replace(/\/+$/, '') : ''
	const param = routeParamNames(base).includes('viewId') ? 'savedViewId' : 'viewId'
	return `${base}/${routeBase}/:${param}`
}

/**
 * The view a route is showing, if it is a saved-view route at all.
 *
 * @param {object} route A vue-router route object (`$route`).
 * @return {string|null} The view id, or null when this is not a view route.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function viewIdForRoute(route) {
	if (!route?.meta?.cnSavedViewOf) {
		return null
	}
	const params = route.params || {}
	const id = params.viewId ?? params.savedViewId
	return id === undefined || id === null || id === '' ? null : String(id)
}

/**
 * The view route to send a person to for a given view.
 *
 * @param {object} page The page the view belongs to.
 * @param {object|string|number} view The view, or its id.
 * @return {{ name: string, params: object }|null} A vue-router target, or null when the page declares no places.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function savedViewRouteTarget(page, view) {
	if (!pageHasSavedViewPlaces(page)) {
		return null
	}
	const raw = (view && typeof view === 'object') ? (view.id ?? view.uuid) : view
	if (raw === undefined || raw === null || raw === '') {
		return null
	}
	const param = routeParamNames(String(page.route || '')).includes('viewId') ? 'savedViewId' : 'viewId'
	return { name: savedViewRouteName(page.id), params: { [param]: String(raw) } }
}

/**
 * The view mode a view opens in, given what the host can actually render.
 *
 * Three answers in one call, because a caller that gets only the winner has
 * no way to say why: `viewMode` is what opens, `offered` is what the mode
 * switcher may show, and `warnings` is what should be logged once.
 *
 * A view naming a presentation the host has not registered falls through to
 * the next one it offers rather than failing the page. A page that renders
 * nothing is indistinguishable from a broken backend, and the person who
 * opened the link cannot tell which they are looking at; a table where a
 * board was asked for is legible and says so in the console.
 *
 * @param {object|null|undefined} view The View API object (reads `presentation`).
 * @param {Array<string>} [registered] The view modes the host page offers, e.g. `['table', 'cards']`.
 * @return {{ viewMode: string|null, offered: Array<string>, warnings: Array<string> }} What opens, what is offered, and what to say about it.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function resolveViewPresentation(view, registered = []) {
	const offered = (Array.isArray(registered) ? registered : []).filter((mode) => typeof mode === 'string' && mode !== '')
	const presentation = (view && typeof view === 'object' && !Array.isArray(view)) ? view.presentation : null
	const declared = []

	if (presentation && typeof presentation === 'object' && !Array.isArray(presentation)) {
		if (typeof presentation.viewType === 'string' && presentation.viewType !== '') {
			declared.push(presentation.viewType)
		}
		if (Array.isArray(presentation.viewTypes)) {
			for (const type of presentation.viewTypes) {
				if (typeof type === 'string' && type !== '' && !declared.includes(type)) {
					declared.push(type)
				}
			}
		}
	}

	const warnings = []
	for (const type of declared) {
		const mode = PRESENTATION_VIEW_MODES[type] ?? type
		if (offered.includes(mode)) {
			return { viewMode: mode, offered, warnings }
		}
		warnings.push(`CnIndexPage: the view asks for the "${type}" presentation, which this page does not render`)
	}

	// Nothing the view named is renderable here, so the page's own first mode
	// opens. `null` rather than a guessed 'table': the caller knows its own
	// default and a second guess here is a second source of truth.
	return { viewMode: offered.length > 0 ? offered[0] : null, offered, warnings }
}

/**
 * Whether a user has pinned a view.
 *
 * Pinning writes OpenRegister's existing `favoredBy`, rather than a second
 * boolean meaning almost the same thing, which is how two sources of truth
 * for one intention get born.
 *
 * @param {object|null|undefined} view The View API object.
 * @param {string|null|undefined} userId The signed-in NC user id.
 * @return {boolean} True when this user pinned this view.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function isPinnedView(view, userId) {
	if (!view || typeof view !== 'object' || typeof userId !== 'string' || userId === '') {
		return false
	}
	const pinned = Array.isArray(view.favoredBy) ? view.favoredBy : []
	return pinned.map(String).includes(userId)
}

/**
 * The `favoredBy` list a pin or an unpin writes back.
 *
 * Returned rather than mutated, and idempotent in both directions: pinning a
 * view twice leaves one entry, unpinning one nobody pinned leaves the list
 * alone.
 *
 * @param {object|null|undefined} view The View API object.
 * @param {string} userId The signed-in NC user id.
 * @param {boolean} pinned The state to write.
 * @return {Array<string>} The new `favoredBy` list.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function togglePinnedBy(view, userId, pinned) {
	const current = (Array.isArray(view?.favoredBy) ? view.favoredBy : []).map(String)
	if (typeof userId !== 'string' || userId === '') {
		return current
	}
	const without = current.filter((id) => id !== userId)
	return pinned ? [...without, userId] : without
}

/**
 * The navigation children a page's pinned views contribute.
 *
 * Children, never top-level entries: an app's navigation budget is declared
 * by the app (ADR-097), and a user who pins eight views must not be able to
 * spend it. Past `pinnedCap` the rest are left to the page itself, which
 * lists them all, so nothing is hidden and nothing is unbounded.
 *
 * @param {object} page The manifest page.
 * @param {Array<object>} views The views visible to this user.
 * @param {string} userId The signed-in NC user id.
 * @return {Array<object>} Menu children, in the views' own order.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function pinnedViewNavChildren(page, views, userId) {
	if (!pageHasSavedViewPlaces(page)) {
		return []
	}
	const cap = Number.isInteger(page.savedViewPlaces?.pinnedCap) ? page.savedViewPlaces.pinnedCap : DEFAULT_PINNED_VIEW_CAP
	const children = []
	for (const view of Array.isArray(views) ? views : []) {
		if (!isPinnedView(view, userId)) {
			continue
		}
		const target = savedViewRouteTarget(page, view)
		if (!target) {
			continue
		}
		children.push({
			id: `${page.id}-view-${view.id}`,
			label: typeof view.name === 'string' && view.name !== '' ? view.name : String(view.id),
			route: target.name,
			params: target.params,
			icon: 'BookmarkOutline',
		})
		if (children.length >= cap) {
			break
		}
	}
	return children
}

/**
 * The menu with every page's pinned views hanging under it.
 *
 * The entry a view hangs under is `navGroup` when the page names one, and
 * otherwise the entry that points at the page. A page declaring places whose
 * entry is nowhere in the menu contributes nothing: an entry invented here
 * would be the top-level entry this whole function exists to avoid.
 *
 * @param {Array<object>} menu The manifest's `menu[]`.
 * @param {object} options Options.
 * @param {object} options.manifest The manifest (read for `pages[]`).
 * @param {Array<object>} options.views The views visible to this user.
 * @param {string} options.userId The signed-in NC user id.
 * @return {Array<object>} The menu, with pinned views as children. The input is not mutated.
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */
export function withPinnedViewChildren(menu, { manifest, views, userId } = {}) {
	const items = Array.isArray(menu) ? menu : []
	const pages = (Array.isArray(manifest?.pages) ? manifest.pages : []).filter(pageHasSavedViewPlaces)
	if (pages.length === 0 || !Array.isArray(views) || views.length === 0) {
		return items
	}

	const byEntry = new Map()
	for (const page of pages) {
		const children = pinnedViewNavChildren(page, views, userId)
		if (children.length === 0) {
			continue
		}
		const entryId = page.savedViewPlaces.navGroup
		const key = typeof entryId === 'string' && entryId !== '' ? `id:${entryId}` : `route:${page.id}`
		byEntry.set(key, [...(byEntry.get(key) || []), ...children])
	}
	if (byEntry.size === 0) {
		return items
	}

	return items.map((item) => {
		const extra = byEntry.get(`id:${item?.id}`) || byEntry.get(`route:${item?.route}`)
		if (!extra) {
			return item
		}
		return { ...item, children: [...(Array.isArray(item.children) ? item.children : []), ...extra] }
	})
}
