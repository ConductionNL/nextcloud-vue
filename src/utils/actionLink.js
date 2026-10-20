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
 * A manifest `headerActions[]` entry may carry `href` too; the page turns it
 * into the final URL with {@link headerActionAsLink} before it renders.
 *
 * @module utils/actionLink
 */

import { generateUrl, getRootUrl } from '@nextcloud/router'
import { followLinkClick } from './linkNavigation.js'

/** An absolute URL a manifest link may name, matching the schema's lowercase pattern. */
const ABSOLUTE_HREF = /^(?:https?:\/\/|mailto:|tel:)/

/** An instance path that already names a Nextcloud entry point, so generateUrl() must not add `/index.php`. */
const ROUTED_PATH = /^\/(?:index\.php|remote\.php|public\.php|ocs)(?:[/?#]|$)/

/** Bad hrefs already warned about, so a recomputing page warns once per value. */
const warnedHrefs = new Set()

/**
 * Entries whose function handler was dropped for their href, warned about
 * once. Keyed by `id`, else by the declared href and label (behind a NUL, so
 * no real id collides), so entries without an id each get their own warning
 * and a recomputing page does not repeat it.
 */
const warnedHandlers = new Set()

/**
 * The URL a manifest `href` points at: an absolute `http(s)`, `mailto:` or
 * `tel:` URL as written, `//host/...` as written, an instance path that
 * names an entry point (`/index.php/`, `/remote.php/`, `/public.php/`,
 * `/ocs/`) under `getRootUrl()` (as written when it already starts with the
 * root), any other instance path (leading `/`) through `generateUrl()`.
 *
 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-href-resolves-to-a-url-on-this-instance-or-an-allowed-scheme
 * @param {unknown} href The manifest `href`.
 * @return {string} The URL, or '' for anything else (a relative path, another scheme).
 */
export function resolveManifestHref(href) {
	if (typeof href !== 'string') {
		return ''
	}
	const value = href.trim()
	if (ABSOLUTE_HREF.test(value) || value.startsWith('//')) {
		return value
	}
	const root = getRootUrl()
	if (root && value.startsWith(root) && ROUTED_PATH.test(value.slice(root.length))) {
		return value
	}
	if (ROUTED_PATH.test(value)) {
		return root + value
	}
	if (value.startsWith('/')) {
		return generateUrl(value)
	}
	return ''
}

/**
 * A manifest header action in its link form. An entry with `href` gets the
 * resolved URL and an anchor `target` (`_blank` when the manifest says so,
 * else `_self`), and loses its `handler`: a link only navigates. Its
 * `children` are resolved the same way. An `href` that resolves to nothing is
 * dropped with a warning, along with a handler name, so the page renders its
 * usual button for the entry (an index or reports page still emits
 * `header-action` for it); a function `handler` (JS composition) is kept
 * then and still runs. An entry with nothing to resolve, a function-valued
 * `href` included, is returned as is. When the `href` does resolve, a
 * function `handler` is dropped like any other, with a one-time warning.
 *
 * @spec openspec/changes/header-action-href/specs/header-action-href/spec.md#requirement-a-header-action-with-href-is-a-link-that-runs-and-emits-nothing
 * @param {object} entry The manifest header action.
 * @return {object} The entry, or a copy in link form.
 */
export function headerActionAsLink(entry) {
	if (!entry || typeof entry !== 'object') {
		return entry
	}
	let resolved = entry
	if (Array.isArray(entry.children)) {
		const children = entry.children.map(headerActionAsLink)
		if (children.some((child, index) => child !== entry.children[index])) {
			resolved = { ...entry, children }
		}
	}
	if (typeof entry.href !== 'string' || entry.href === '') {
		return resolved
	}
	const { href: declared, ...withoutHref } = resolved
	const { handler: _handler, ...rest } = withoutHref
	const href = resolveManifestHref(declared)
	if (!href) {
		if (!warnedHrefs.has(declared)) {
			warnedHrefs.add(declared)
			// eslint-disable-next-line no-console
			console.warn(`headerActions[].id "${entry.id}": href "${declared}" is neither an http(s), mailto or tel URL nor an instance path starting with "/"; the entry renders without a link`)
		}
		return typeof entry.handler === 'function' ? withoutHref : rest
	}
	const handlerKey = entry.id ?? `\u0000${declared}|${entry.label ?? ''}`
	if (typeof entry.handler === 'function' && !warnedHandlers.has(handlerKey)) {
		warnedHandlers.add(handlerKey)
		// eslint-disable-next-line no-console
		console.warn(`headerActions[].id "${entry.id}": an entry with href never runs a handler, so its function handler is dropped`)
	}
	return { ...rest, href, target: entry.target === '_blank' ? '_blank' : '_self' }
}

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
 * Hand-rolled rather than `NcActionRouter` / `NcButton :to`: the menus and
 * bars using it must still emit their own events on click, and without an
 * installed router `NcButton :to` falls back to a button that goes nowhere,
 * while an `<a href>` still navigates.
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
