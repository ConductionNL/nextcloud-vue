/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An address that carries `@myTeam` (`/cases?assignedGroup=@myTeam`, a shared
 * link or a bookmark) opens the list on the reader's team once the team is
 * read, as a saved view on `@myTeam` does. On :8080 the token stayed literal:
 * the Active line read "Team: @myTeam" and the list was empty.
 *
 * @spec openspec/changes/route-my-team-token-resolves/specs/index-page/spec.md#requirement-an-address-carrying-myteam-opens-on-the-readers-team
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Case', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Case', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { registerMyTeamSource } = require('../../src/utils/myTeam.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnPageHeader: true, NcLoadingIcon: true, NcEmptyContent: true, CnIcon: true, NcSelect: true }

/**
 * @param {object} query The route query.
 * @return {Promise<object>} The page.
 */
async function pageAt(query) {
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'dossiq', schema: 'case' },
		stubs,
		mocks: { $route: { params: {}, query }, $router: { push: jest.fn(), replace: jest.fn(async () => {}) } },
	})
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
	return wrapper
}

afterEach(() => registerMyTeamSource(null))

describe('an address carrying @myTeam', () => {
	it('filters on the team once it is read', async () => {
		registerMyTeamSource(() => Promise.resolve('zuiddrecht-woo-en-informatie'))
		const w = await pageAt({ isFinalStatus: 'false', assignedGroup: '@myTeam' })
		expect(w.vm.list.activeFilters.value).toEqual({ isFinalStatus: 'false', assignedGroup: 'zuiddrecht-woo-en-informatie' })
	})

	it('drops the team for a reader in none', async () => {
		registerMyTeamSource(() => Promise.resolve(''))
		const w = await pageAt({ assignedGroup: '@myTeam' })
		expect(w.vm.list.activeFilters.value).toEqual({})
	})
})
