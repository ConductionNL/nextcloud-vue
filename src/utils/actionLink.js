/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * actionLink — render a menu/bar action that only navigates as a real link.
 *
 * An action descriptor may carry `href` (a URL) or `to` (a vue-router
 * location), each either a value or a function of the item the menu acts on.
 * The rendering component turns it into an `<a href>`; a plain click on an
 * in-app `to` is routed through the router, anything else is the browser's.
 *
 * @module utils/actionLink
 */

import { followLinkClick } from './linkNavigation.js'

/**
 * The href of an in-app router location. A string is a route PATH and goes
 * through the router as well, so a hash-history app gets its `#`.
 *
 * @param {string|object|null|undefined} to A route path or vue-router location.
 * @param {object} [router] The app's router.
 * @return {string} The href, or '' when there is no router or it cannot resolve.
 */
export function routeHref(to, router) {
	if (!to || !router || typeof router.resolve !== 'function') {
		return ''
	}
	// A path string, unlike resolveHref's finished URL; resolved as a string so its query survives.
	try {
		return router.resolve(to).href || ''
	} catch {
		return ''
	}
}

/**
 * The link an action descriptor renders as for one item, or null when it
 * renders as a button: no `href` / `to`, or a `to` the router cannot resolve.
 *
 * @param {object} action The action descriptor (`href`, `to`, `linkTarget`).
 * @param {unknown} item The row / target item a function-valued field is called with.
 * @param {object} [router] The app's router.
 * @return {{href: string, to: (string|object|null), target: (string|undefined)}|null} The link, or null.
 */
export function resolveItemActionLink(action, item, router) {
	if (!action) {
		return null
	}
	const target = action.linkTarget || undefined
	const href = typeof action.href === 'function' ? action.href(item) : action.href
	if (typeof href === 'string' && href.length > 0) {
		return { href, to: null, target }
	}
	const to = typeof action.to === 'function' ? action.to(item) : action.to
	const resolved = routeHref(to, router)
	return resolved ? { href: resolved, to, target } : null
}

/**
 * Click handler for a link from {@link resolveItemActionLink}: a plain click
 * on an in-app link that opens in place goes through the router; a URL, a
 * new-tab target or a modified click is left to the browser.
 *
 * @param {MouseEvent} event The click event.
 * @param {{to: (string|object|null), target: (string|undefined)}} link The resolved link.
 * @param {object} [router] The app's router.
 * @return {boolean} True when the router navigated.
 */
export function followItemActionLink(event, link, router) {
	if (!link || !link.to || (link.target && link.target !== '_self')) {
		return false
	}
	return followLinkClick(event, link.to, router)
}
