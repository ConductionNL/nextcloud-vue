/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest page tab can be drawn for an admin only (`adminOnly`) or for a
 * user who holds a `permission` (DqContracten's "Portaalaccounts" tab). The
 * gate only hides the tab; the page behind it enforces access on the server.
 * A hidden tab does not shift the counts of the tabs after it.
 */
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn() }))

const { getCurrentUser } = require('@nextcloud/auth')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const TABS = [
	{ label: 'Contracten', route: 'contracts' },
	{ label: 'Portaalaccounts', route: 'supplier-users', adminOnly: true },
	{ label: 'Leveranciers', route: 'suppliers', permission: 'suppliers.read' },
]

/**
 * The page tabs a context draws.
 *
 * @param {object} over Fields for the stand-in `this`.
 * @return {Array<object>} The drawn tabs.
 */
function tabs(over = {}) {
	const c = {
		pageTabs: TABS,
		pageTabCounts: { 0: 38, 1: 4, 2: 21 },
		cnPermissions: [],
		cnTranslate: (s) => s,
		sourcePageTabs: [],
		...over,
	}
	c.viewerIsAdmin = () => CnIndexPage.methods.viewerIsAdmin.call(c)
	c.pageTabVisible = (tab) => CnIndexPage.methods.pageTabVisible.call(c, tab)
	return CnIndexPage.computed.effectivePageTabs.call(c)
}

describe('CnIndexPage page tab gate', () => {
	it('hides an adminOnly tab from a user who is not an instance admin', () => {
		getCurrentUser.mockReturnValue({ uid: 'pieter', isAdmin: false })
		expect(tabs().map((t) => t.label)).toEqual(['Contracten', 'Leveranciers'])
	})

	it('shows it to an admin, with each tab keeping its own count', () => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		expect(tabs().map((t) => [t.label, t.count])).toEqual([['Contracten', 38], ['Portaalaccounts', 4], ['Leveranciers', 21]])
	})

	it('keeps the counts of the tabs after a hidden one', () => {
		getCurrentUser.mockReturnValue({ uid: 'pieter', isAdmin: false })
		expect(tabs().find((t) => t.label === 'Leveranciers').count).toBe(21)
	})

	it('gates a permission tab on the held permissions, and shows it when none are known', () => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		expect(tabs({ cnPermissions: ['contracts.read'] }).map((t) => t.label)).not.toContain('Leveranciers')
		expect(tabs({ cnPermissions: ['suppliers.read'] }).map((t) => t.label)).toContain('Leveranciers')
		expect(tabs({ cnPermissions: [] }).map((t) => t.label)).toContain('Leveranciers')
	})

	it('hides an adminOnly tab when the user cannot be read', () => {
		getCurrentUser.mockImplementation(() => {
			throw new Error('no user')
		})
		expect(tabs().map((t) => t.label)).not.toContain('Portaalaccounts')
	})
})
