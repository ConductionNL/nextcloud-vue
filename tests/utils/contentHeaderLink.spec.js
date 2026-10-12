/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { contentHeaderLink } from '../../src/utils/contentHeaderLink.js'

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
