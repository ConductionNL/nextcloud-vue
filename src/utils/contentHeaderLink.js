/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * contentHeaderLink — the text link a widget's content asks its card header
 * to carry: `content.headerLink`, or the shorter `viewAllRoute` (with an
 * optional `viewAllLabel`) that an inbox-style widget uses for its "View all".
 *
 * @module utils/contentHeaderLink
 */

/**
 * The header link a widget's `content` declares, in the shape
 * CnWidgetWrapper's `headerLink` takes, or null when it declares none.
 * The label is left as written: the wrapper translates it.
 *
 * `viewAllRoute` is a route name, or a location `{ name, params?, query? }`.
 *
 * @param {object|null|undefined} content The widget's content.
 * @return {{label: string, route?: string, params?: object, query?: object, href?: string}|null}
 */
export function contentHeaderLink(content) {
	if (!content || typeof content !== 'object') {
		return null
	}
	const declared = content.headerLink
	if (declared && typeof declared === 'object' && typeof declared.label === 'string' && declared.label !== '') {
		return declared
	}
	const view = content.viewAllRoute
	const name = typeof view === 'string' ? view : (view && typeof view === 'object' ? view.name : '')
	if (typeof name !== 'string' || name === '') {
		return null
	}
	const link = {
		label: typeof content.viewAllLabel === 'string' && content.viewAllLabel !== '' ? content.viewAllLabel : 'View all',
		route: name,
	}
	if (view && typeof view === 'object') {
		if (view.params && typeof view.params === 'object') {
			link.params = view.params
		}
		if (view.query && typeof view.query === 'object') {
			link.query = view.query
		}
	}
	return link
}

/**
 * The header link a widget DEFINITION declares: `headerLink` on the
 * definition itself, else what its content asks for (see contentHeaderLink).
 *
 * @param {object|null|undefined} widget A widget definition.
 * @return {{label: string, route?: string, params?: object, query?: object, href?: string}|null}
 */
export function widgetHeaderLink(widget) {
	if (!widget || typeof widget !== 'object') {
		return null
	}
	const declared = widget.headerLink
	if (declared && typeof declared === 'object' && typeof declared.label === 'string' && declared.label !== '') {
		return declared
	}
	return contentHeaderLink(widget.content)
}

/**
 * How to draw a header link: the tag and its attributes. A `route` is a
 * `router-link` (only when a router is mounted), an `href` a plain anchor.
 * An empty tag means there is nothing usable to draw.
 *
 * @param {object|null|undefined} link A link `{ label, route?, params?, query?, href? }`.
 * @param {boolean} hasRouter Whether a router is mounted.
 * @return {{tag: string, attrs: object}}
 */
export function headerLinkTarget(link, hasRouter) {
	if (!link || typeof link.label !== 'string' || link.label === '') {
		return { tag: '', attrs: {} }
	}
	if (link.route && hasRouter) {
		const to = { name: link.route }
		if (link.params && typeof link.params === 'object') {
			to.params = link.params
		}
		if (link.query && typeof link.query === 'object') {
			to.query = link.query
		}
		return { tag: 'router-link', attrs: { to } }
	}
	if (typeof link.href === 'string' && link.href !== '') {
		return { tag: 'a', attrs: { href: link.href } }
	}
	return { tag: '', attrs: {} }
}
