/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A self-fetch page whose tabs come from `quickFiltersFrom` filters its
 * fetch by the chip that is lit (DqTeamwachtrij: "Woo-verzoek" narrows the
 * queue to Woo cases).
 *
 * @spec openspec/changes/index-quick-filters-from/specs/index-page/spec.md#requirement-quick-filters-can-come-from-a-field-s-values
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

jest.mock('../../src/utils/fetchAggregate.js', () => {
	const actual = jest.requireActual('../../src/utils/fetchAggregate.js')
	return { ...actual, fetchGroupedCounts: () => Promise.resolve([{ key: 'ct-woo', count: 4 }, { key: 'ct-bezwaar', count: 2 }]) }
})

const { mount, flushPromises } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnQuickFilterBar: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

/**
 * Parameters of the most recent collection fetch.
 *
 * @return {object} The query map handed to the store.
 */
function lastFetchParams() {
	const calls = mockStore.fetchCollection.mock.calls
	return calls[calls.length - 1][1] || {}
}

describe('CnIndexPage quickFiltersFrom in self-fetch mode', () => {
	it('narrows the fetch to the chosen generated tab and widens it again on All', async () => {
		const w = mount(CnIndexPage, {
			propsData: {
				title: 'Wachtrij',
				register: 'dossiq',
				schema: 'case',
				filter: { assignee: 'IS NULL' },
				quickFiltersFrom: { field: 'caseType', allLabel: 'Alle typen' },
			},
			stubs,
			mocks: { $route: { query: {}, params: {}, name: 'Queue' }, $router: { push: jest.fn() } },
		})
		await flushPromises()
		expect(w.vm.effectiveQuickFilters.map((tab) => tab.label)).toEqual(['Alle typen', 'ct-woo', 'ct-bezwaar'])

		w.vm.onQuickFilterChange(1)
		await flushPromises()
		expect(lastFetchParams()).toMatchObject({ assignee: 'IS NULL', caseType: 'ct-woo' })

		w.vm.onQuickFilterChange(0)
		await flushPromises()
		expect(lastFetchParams().caseType).toBeUndefined()
		expect(lastFetchParams().assignee).toBe('IS NULL')
	})
})
