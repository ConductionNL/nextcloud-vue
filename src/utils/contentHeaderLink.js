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

import { resolveDeepTokens } from './resolveFilterTokens.js'

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
 * A view-all the widget draws under its own content
 * (`viewAllPlacement: "footer"`) is not a header link.
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
	const content = widget.content
	if (content && content.viewAllPlacement === 'footer' && !content.headerLink) {
		return null
	}
	return contentHeaderLink(content)
}

/**
 * How to draw a header link: the tag and its attributes. A `tab` is a
 * `#<tab>` anchor that opens that tab of the same page, a `route` a
 * `router-link` (only when a router is mounted), an `href` a plain anchor.
 * An empty tag means there is nothing usable to draw.
 *
 * @spec openspec/changes/header-link-switches-tab/specs/header-link/spec.md#requirement-a-header-link-can-open-another-tab-of-the-page
 * @param {object|null|undefined} link A link `{ label, tab?, route?, params?, query?, href? }`.
 * @param {boolean} hasRouter Whether a router is mounted.
 * @return {{tag: string, attrs: object}}
 */
export function headerLinkTarget(link, hasRouter) {
	if (!link || typeof link.label !== 'string' || link.label === '') {
		return { tag: '', attrs: {} }
	}
	if (typeof link.tab === 'string' && link.tab !== '') {
		return { tag: 'a', attrs: { href: `#${encodeURIComponent(link.tab)}` } }
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

/**
 * A header link with the `@objectId` and `@object.<path>` tokens in its
 * `params` and `query` resolved against the record the page shows
 * (`{ route: 'WorkflowDefinitionDetail', params: { id: '@object.workflowDefinition' } }`).
 * A link whose route params do not all resolve is no link: the record does
 * not name the page it would open.
 *
 * @param {object|null|undefined} link A link `{ label, route?, params?, query?, href? }`.
 * @param {{objectId?: (string|number), object?: object}} ctx The record.
 * @return {object|null} The link with its tokens resolved, or null.
 * @spec openspec/changes/header-link-param-tokens/specs/header-link-param-tokens/spec.md#requirement-a-header-links-route-params-read-the-record
 */
export function resolveHeaderLink(link, ctx) {
	if (!link || typeof link !== 'object') {
		return null
	}
	if (!link.params && !link.query) {
		return link
	}
	const out = { ...link }
	if (link.params && typeof link.params === 'object') {
		out.params = resolveDeepTokens(link.params, ctx || {})
		const filled = Object.values(out.params).every((value) => value !== null && value !== undefined && value !== '' && !(typeof value === 'string' && value.startsWith('@')))
		if (!filled) {
			return null
		}
	}
	if (link.query && typeof link.query === 'object') {
		out.query = resolveDeepTokens(link.query, ctx || {})
	}
	return out
}
