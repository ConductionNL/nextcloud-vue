/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { contentHeaderLink, headerLinkTarget, widgetHeaderLink } from '../../src/utils/contentHeaderLink.js'

describe('contentHeaderLink', () => {
	it('returns an explicit headerLink as written', () => {
		const headerLink = { label: 'All', route: 'Cases' }
		expect(contentHeaderLink({ headerLink, viewAllRoute: 'Other' })).toBe(headerLink)
	})

	it('builds the link from viewAllRoute (name or location) and viewAllLabel', () => {
		expect(contentHeaderLink({ viewAllRoute: 'Tasks' })).toEqual({ label: 'View all', route: 'Tasks' })
		expect(contentHeaderLink({ viewAllRoute: { name: 'Tasks', params: { a: 1 }, query: { q: 'x' } }, viewAllLabel: 'All' }))
			.toEqual({ label: 'All', route: 'Tasks', params: { a: 1 }, query: { q: 'x' } })
	})

	it('returns null for nothing usable', () => {
		expect(contentHeaderLink(null)).toBeNull()
		expect(contentHeaderLink({})).toBeNull()
		expect(contentHeaderLink({ viewAllRoute: {} })).toBeNull()
		expect(contentHeaderLink({ headerLink: { route: 'x' } })).toBeNull()
	})
})

describe('widgetHeaderLink', () => {
	it('prefers the definition\'s own headerLink over its content', () => {
		const own = { label: 'All sales invoices', route: 'AccountsReceivable' }
		expect(widgetHeaderLink({ headerLink: own, content: { headerLink: { label: 'Other', route: 'X' } } })).toBe(own)
	})

	it('falls back to what the content asks for', () => {
		expect(widgetHeaderLink({ content: { viewAllRoute: 'Tasks' } })).toEqual({ label: 'View all', route: 'Tasks' })
	})

	it('draws no header link for a view-all the widget puts in its footer (DqZaakTaken tab strip)', () => {
		expect(widgetHeaderLink({ content: { viewAllRoute: 'Tasks', viewAllPlacement: 'footer' } })).toBeNull()
		const declared = { label: 'Elsewhere', route: 'X' }
		expect(widgetHeaderLink({ content: { headerLink: declared, viewAllRoute: 'Tasks', viewAllPlacement: 'footer' } })).toBe(declared)
	})

	it('returns null without a widget or a usable link', () => {
		expect(widgetHeaderLink(null)).toBeNull()
		expect(widgetHeaderLink({ headerLink: { route: 'x' } })).toBeNull()
	})
})

describe('headerLinkTarget', () => {
	it('makes a route a router link with params and query, when a router is mounted', () => {
		expect(headerLinkTarget({ label: 'All', route: 'Cases', params: { id: 1 }, query: { q: 'x' } }, true))
			.toEqual({ tag: 'router-link', attrs: { to: { name: 'Cases', params: { id: 1 }, query: { q: 'x' } } } })
	})

	it('makes an href an anchor, and a route without a router nothing', () => {
		expect(headerLinkTarget({ label: 'Docs', href: 'https://example.org' }, false)).toEqual({ tag: 'a', attrs: { href: 'https://example.org' } })
		expect(headerLinkTarget({ label: 'All', route: 'Cases' }, false)).toEqual({ tag: '', attrs: {} })
		expect(headerLinkTarget(null, true)).toEqual({ tag: '', attrs: {} })
	})
})
