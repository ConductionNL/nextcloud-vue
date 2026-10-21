/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest page tab the user cannot see (`adminOnly`, `permission`) asks no
 * count: DqContracten's admin-only "Portaalaccounts" tab must not send a list
 * request for a non-admin.
 */
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn() }))
jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	...jest.requireActual('../../src/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(),
}))

const { getCurrentUser } = require('@nextcloud/auth')
const { fetchListTotal } = require('../../src/utils/fetchFilterCounts.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const TABS = [
	{ label: 'Contracten', route: 'contracts', countFrom: { register: 'dossiq', schema: 'contract' } },
	{ label: 'Portaalaccounts', route: 'supplier-users', adminOnly: true, countFrom: { register: 'dossiq', schema: 'supplierUser' } },
	{ label: 'Leveranciers', route: 'suppliers', permission: 'suppliers.read', countFrom: { register: 'dossiq', schema: 'supplier' } },
]

/**
 * A stand-in `this` for the page tab count methods.
 *
 * @param {object} over Fields to override.
 * @return {object} The context.
 */
function context(over = {}) {
	const c = { pageTabs: TABS, pageTabCounts: {}, cnPermissions: [], ...over }
	c.viewerIsAdmin = () => CnIndexPage.methods.viewerIsAdmin.call(c)
	c.pageTabVisible = (tab) => CnIndexPage.methods.pageTabVisible.call(c, tab)
	Object.defineProperty(c, 'pageTabCountKey', { get: () => CnIndexPage.computed.pageTabCountKey.call(c) })
	return c
}

describe('CnIndexPage page tab counts', () => {
	beforeEach(() => {
		fetchListTotal.mockReset()
		fetchListTotal.mockImplementation(async (register, schema) => ({ contract: 38, supplierUser: 4, supplier: 21 }[schema]))
	})

	it('asks no count for an adminOnly tab a non-admin cannot see', async () => {
		getCurrentUser.mockReturnValue({ uid: 'pieter', isAdmin: false })
		const c = context()
		await CnIndexPage.methods.loadPageTabCounts.call(c)
		expect(fetchListTotal.mock.calls.map((call) => call[1])).toEqual(['contract', 'supplier'])
		expect(c.pageTabCounts).toEqual({ 0: 38, 2: 21 })
	})

	it('asks no count for a tab whose permission the user lacks', async () => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		const c = context({ cnPermissions: ['contracts.read'] })
		await CnIndexPage.methods.loadPageTabCounts.call(c)
		expect(fetchListTotal.mock.calls.map((call) => call[1])).toEqual(['contract', 'supplierUser'])
	})

	it('counts every tab for an admin who holds the permissions', async () => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		const c = context()
		await CnIndexPage.methods.loadPageTabCounts.call(c)
		expect(c.pageTabCounts).toEqual({ 0: 38, 1: 4, 2: 21 })
	})

	it('changes the count key when a tab turns visible, so the counts load again', () => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		const before = context({ cnPermissions: ['contracts.read'] }).pageTabCountKey
		const after = context({ cnPermissions: ['suppliers.read'] }).pageTabCountKey
		expect(before).not.toBe(after)
	})
})
