/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * linkNavigation — make navigation behave like a link.
 *
 * A control whose only job is to go somewhere should be a real `<a href>`, so
 * it can be middle-clicked, opened in a new tab and copied. Two helpers cover
 * the two shapes that needs:
 *
 *  - `followLinkClick` for a real `<a href>` that routes inside the app: a
 *    plain click goes through the router, any other click is left to the
 *    browser.
 *  - `openRowTarget` for a surface that cannot be an `<a>` (a table row, a
 *    draggable card): a plain click navigates in place, a ctrl/cmd/shift or
 *    middle click opens the target in a new tab. Bind it to both `@click` and
 *    `@auxclick`, since a middle click fires only the latter.
 *
 * A string target is a finished URL. Pass a router path as `{ path }` so the
 * router adds the app's base (`/index.php/apps/<app>`) to its href.
 *
 * @module utils/linkNavigation
 */

import { isFromNestedControl, isNewTabClick, isNewTabHandled, markNewTabHandled } from './rowAuxClick.js'

/**
 * Whether the browser should handle this click itself (new tab, new window,
 * download) instead of the app navigating in place.
 *
 * @param {MouseEvent|KeyboardEvent|null|undefined} event The click event.
 * @return {boolean} True for a modifier key or a non-primary button.
 */
export function isModifiedClick(event) {
	if (!event) {
		return false
	}
	return Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
		|| (event.button !== undefined && event.button !== 0))
}

/**
 * The href for a navigation target. A string is returned as is, so a router
 * path must be passed as `{ path }` to get the app's base.
 *
 * @param {string|object|null|undefined} target A URL, or a vue-router location.
 * @param {object} [router] The app's router, needed for a location.
 * @return {string} The href, or '' when it cannot be resolved.
 */
export function resolveHref(target, router) {
	if (!target) {
		return ''
	}
	if (typeof target === 'string') {
		return target
	}
	if (!router || typeof router.resolve !== 'function') {
		return ''
	}
	try {
		return router.resolve(target).href || ''
	} catch {
		return ''
	}
}

/**
 * Click handler for a real `<a href>` that routes inside the app. A plain
 * click is routed through the router; a modified click, or one a handler
 * already prevented, is left to the browser.
 *
 * @param {MouseEvent} event The click event.
 * @param {string|object} target The router location the link points at.
 * @param {object} [router] The app's router.
 * @return {boolean} True when the app navigated.
 */
export function followLinkClick(event, target, router) {
	if (!target || !router || typeof router.push !== 'function') {
		return false
	}
	if (event && (event.defaultPrevented || isModifiedClick(event))) {
		return false
	}
	if (event) {
		event.preventDefault()
	}
	// vue-router rejects the promise on a blocked or duplicate navigation.
	router.push(target).catch(() => {})
	return true
}

/**
 * Navigate from a surface that cannot be an `<a>` (a table row, a card),
 * the way a link would: a ctrl/cmd/shift or middle click opens the target
 * in a new tab, a plain click navigates in place.
 *
 * A click that came from a control inside the surface (a button, a link, a
 * checkbox) is left to that control. Opening a new tab marks the event with
 * `preventDefault()`, and an event already marked that way is skipped, so
 * two listeners on the same click never open two tabs.
 *
 * @param {MouseEvent|KeyboardEvent|null|undefined} event The click event.
 * @param {string|object} target A URL, or a vue-router location.
 * @param {object} [router] The app's router, needed for a location.
 * @return {boolean} True when it navigated.
 */
export function openRowTarget(event, target, router) {
	if (!target || isNewTabHandled(event) || isFromNestedControl(event)) {
		return false
	}
	if (isNewTabClick(event)) {
		const href = resolveHref(target, router)
		if (!href) {
			return false
		}
		window.open(href, '_blank', 'noopener,noreferrer')
		markNewTabHandled(event, true)
		return true
	}
	// Only the primary button navigates in place; a right click opens the menu.
	if (event && event.button !== undefined && event.button !== 0) {
		return false
	}
	if (typeof target === 'string') {
		window.location.assign(target)
		return true
	}
	if (!router || typeof router.push !== 'function') {
		return false
	}
	router.push(target).catch(() => {})
	return true
}
