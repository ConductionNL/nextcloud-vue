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
 * Anchor attributes for a menu URL. An in-app path is resolved through the
 * router, so its href carries the app's base; any other URL goes through
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
		return { href: routeHref(url, router) || url }
	}
	return { href: safeHref(url) }
}

/**
 * Decide if a menu item URL matches the current location. Internal URLs match
 * exactly or as a path prefix; external URLs never match.
 *
 * @param {string|undefined|null} itemUrl the URL stored on the item.
 * @param {{pathname: string, host?: string}} currentLocation the live location bag.
 * @return {boolean} true when the URL is a same-page or prefix match.
 */
export function isActiveItem(itemUrl, currentLocation) {
	if (typeof itemUrl !== 'string' || itemUrl === '') {
		return false
	}
	if (isExternalUrl(itemUrl)) {
		return false
	}
	const pathname = currentLocation && typeof currentLocation.pathname === 'string'
		? currentLocation.pathname
		: '/'
	if (itemUrl === pathname) {
		return true
	}
	if (pathname.startsWith(`${itemUrl}/`)) {
		return true
	}
	return false
}

/**
 * Walk a menu tree and tag every item that is "active" (the deepest URL match)
 * or "in-path" (an ancestor of the deepest match). The longest internal match
 * wins.
 *
 * @param {object} args the arguments object.
 * @param {Array} args.items the menu items array.
 * @param {{pathname: string, host?: string}} args.currentLocation the location bag.
 * @return {{path: Record<string,'active'|'in-path'>, leafKey: string|null}} the map and leaf key.
 */
export function computeActivePath({ items, currentLocation }) {
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
		if (!isActiveItem(url, currentLocation)) {
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
