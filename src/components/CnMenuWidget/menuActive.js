/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Helpers for the menu widget's active-item detection.
 *
 * `isActiveItem` decides whether a single URL "matches" the current page URL:
 * external URLs (http/https) never match `window.location` (that would cause
 * false positives on unrelated hosts); internal URLs match exactly or as a
 * path prefix.
 *
 * `computeActivePath` walks a (possibly nested) `items` array and returns
 * `{path, leafKey}` where `path` maps dotted-string keys (`'0'`, `'1.2'`) to
 * `'active'` (deepest leaf match) or `'in-path'` (ancestor of the active leaf).
 *
 * `menuLinkAttrs` builds an item's anchor attributes.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */

import { routeHref } from '../../utils/actionLink.js'
import { safeHref } from '../../utils/safeHref.js'

/**
 * Whether a URL string should be considered external (http/https).
 *
 * @param {string} url the URL or path.
 * @return {boolean} true when the URL has an absolute http(s) scheme.
 */
export function isExternalUrl(url) {
	return typeof url === 'string' && /^https?:\/\//i.test(url)
}

/**
 * Whether a menu URL is a path inside the app, to be routed: no scheme
 * (`https:`, `mailto:`, `javascript:`) and not protocol-relative.
 *
 * @param {string} url the URL or path.
 * @return {boolean} true for an in-app path.
 */
export function isRouterPath(url) {
	return typeof url === 'string' && url !== ''
		&& !url.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(url)
}

/**
 * The base the app's router is mounted under (`/index.php/apps/<app>`),
 * without a trailing slash; '' without a router or a base.
 *
 * @param {object} [router] the app's router.
 * @return {string} the base.
 * @spec openspec/changes/menu-widget-links-under-router-base/specs/menu-widget-links-under-router-base/spec.md#requirement-a-menu-url-that-carries-the-apps-base-is-a-path-in-the-app
 */
export function routerBase(router) {
	const base = router?.options?.history?.base
	return typeof base === 'string' ? base.replace(/\/+$/, '') : ''
}

/**
 * A path below a base: `/index.php/apps/dossiq/settings` below
 * `/index.php/apps/dossiq` is `/settings`. A path that does not start with the
 * base is returned as it is.
 *
 * @param {string} url the path.
 * @param {string} base the base, without a trailing slash.
 * @return {string} the path below the base.
 */
function stripBase(url, base) {
	if (!base || typeof url !== 'string' || !url.startsWith(base)) {
		return url
	}
	const rest = url.slice(base.length)
	if (rest === '') {
		return '/'
	}
	if (rest[0] === '/') {
		return rest
	}
	return rest[0] === '?' || rest[0] === '#' ? `/${rest}` : url
}

/**
 * The route path of an in-app menu URL. A URL that already carries the
 * router's base (`/index.php/apps/dossiq/settings/case-types`) is the same
 * page as its path below the base (`/settings/case-types`); any other URL is
 * returned as it is.
 *
 * @param {string} url the item's URL.
 * @param {object} [router] the app's router.
 * @return {string} the URL as a route path.
 * @spec openspec/changes/menu-widget-links-under-router-base/specs/menu-widget-links-under-router-base/spec.md#requirement-a-menu-url-that-carries-the-apps-base-is-a-path-in-the-app
 */
export function toRoutePath(url, router) {
	return isRouterPath(url) ? stripBase(url, routerBase(router)) : url
}

/**
 * Anchor attributes for a menu URL. An in-app path is resolved through the
 * router, so its href carries the app's base once; any other URL goes through
 * safeHref, and an external one opens in a new tab.
 *
 * @param {string} url the item's URL.
 * @param {object} [router] the app's router.
 * @return {{href: string, target?: string, rel?: string}} the anchor attributes.
 */
export function menuLinkAttrs(url, router) {
	if (isExternalUrl(url)) {
		return { href: safeHref(url), target: '_blank', rel: 'noopener noreferrer' }
	}
	if (isRouterPath(url)) {
		return { href: routeHref(toRoutePath(url, router), router) || url }
	}
	return { href: safeHref(url) }
}

/**
 * Whether a path is the current path or a path below it.
 *
 * @param {string} itemPath the item's path.
 * @param {string} pathname the current path.
 * @return {boolean} true on an exact or prefix match.
 */
function matchesPath(itemPath, pathname) {
	return itemPath === pathname || pathname.startsWith(`${itemPath}/`)
}

/**
 * Decide if a menu item URL matches the current location. Internal URLs match
 * exactly or as a path prefix; external URLs never match. Under a router base
 * an item matches by its route path too, whether it was written with the base
 * or without it.
 *
 * @param {string|undefined|null} itemUrl the URL stored on the item.
 * @param {{pathname: string, host?: string}} currentLocation the live location bag.
 * @param {string} [base] the router's base, without a trailing slash.
 * @return {boolean} true when the URL is a same-page or prefix match.
 * @spec openspec/changes/menu-widget-links-under-router-base/specs/menu-widget-links-under-router-base/spec.md#requirement-the-open-page-is-the-active-item-under-a-router-base
 */
export function isActiveItem(itemUrl, currentLocation, base = '') {
	if (typeof itemUrl !== 'string' || itemUrl === '') {
		return false
	}
	if (isExternalUrl(itemUrl)) {
		return false
	}
	const pathname = currentLocation && typeof currentLocation.pathname === 'string'
		? currentLocation.pathname
		: '/'
	if (matchesPath(itemUrl, pathname)) {
		return true
	}
	if (!base || !pathname.startsWith(base)) {
		return false
	}
	return matchesPath(stripBase(itemUrl, base), stripBase(pathname, base))
}

/**
 * Walk a menu tree and tag every item that is "active" (the deepest URL match)
 * or "in-path" (an ancestor of the deepest match). The longest internal match
 * wins.
 *
 * @param {object} args the arguments object.
 * @param {Array} args.items the menu items array.
 * @param {{pathname: string, host?: string}} args.currentLocation the location bag.
 * @param {string} [args.base] the router's base, without a trailing slash.
 * @return {{path: Record<string,'active'|'in-path'>, leafKey: string|null}} the map and leaf key.
 */
export function computeActivePath({ items, currentLocation, base = '' }) {
	const path = {}
	if (!Array.isArray(items)) {
		return { path, leafKey: null }
	}

	const candidates = []
	const walk = (list, prefix) => {
		list.forEach((item, idx) => {
			const key = prefix === '' ? `${idx}` : `${prefix}.${idx}`
			candidates.push({ key, url: item?.url, item })
			if (Array.isArray(item?.children) && item.children.length > 0) {
				walk(item.children, key)
			}
		})
	}
	walk(items, '')

	let bestKey = null
	let bestLen = -1
	candidates.forEach(({ key, url }) => {
		if (!isActiveItem(url, currentLocation, base)) {
			return
		}
		const len = typeof url === 'string' ? url.length : 0
		if (len > bestLen) {
			bestLen = len
			bestKey = key
		}
	})

	if (bestKey !== null) {
		path[bestKey] = 'active'
		const parts = bestKey.split('.')
		for (let i = 1; i < parts.length; i++) {
			const ancestorKey = parts.slice(0, i).join('.')
			if (path[ancestorKey] !== 'active') {
				path[ancestorKey] = 'in-path'
			}
		}
	}

	return { path, leafKey: bestKey }
}
