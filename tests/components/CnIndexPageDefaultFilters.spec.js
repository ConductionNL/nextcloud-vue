/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContracten opens with "Status: actief en verlopend" as a removable chip:
 * a default filter. `defaultFilters` applies on load when the address names
 * no filter and no saved view, shows on the Active line like any filter, and
 * goes with that chip or with "Clear all". An address that names a filter
 * wins over the defaults.
 *
 * @spec openspec/changes/index-default-filters/specs/index-page/spec.md#requirement-an-index-page-can-open-with-removable-default-filters
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
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

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => ({ uid: 'ada' }),
}))

const { mount } = require('@vue/test-utils')
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
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const DEFAULTS = { status: ['active', 'ending'] }

/**
 * @param {object} query The starting `$route.query`.
 * @param {object} extra More props.
 * @return {{wrapper: object, replace: jest.Mock}} The wrapper and the replace mock.
 */
function mountPage(query, extra = {}) {
	const replace = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Contracts', register: 'dossiq', schema: 'supplierContract', defaultFilters: DEFAULTS, ...extra },
		stubs,
		mocks: {
			$route: { params: {}, query },
			$router: { push: jest.fn(), replace },
		},
	})
	return { wrapper, replace }
}

const settle = () => new Promise((resolve) => setTimeout(resolve))

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage defaultFilters', () => {
	it('sends a default held as one value with the request (DqOrganisaties "Plaats: Zuiddrecht")', async () => {
		const { wrapper } = mountPage({}, { defaultFilters: { 'address.place': 'Zuiddrecht' } })
		await settle()
		const calls = mockStore.fetchCollection.mock.calls
		expect(calls.length).toBeGreaterThan(0)
		expect(calls[calls.length - 1][1]['address.place']).toBe('Zuiddrecht')
		wrapper.unmount()
	})

	it('applies the defaults on load when the address names no filter', async () => {
		const { wrapper } = mountPage({})
		await settle()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ status: ['active', 'ending'] })
		wrapper.unmount()
	})

	it('shows them as a removable chip on the board look', async () => {
		const { wrapper } = mountPage({}, { look: 'board' })
		await settle()
		expect(wrapper.vm.activeFilterChips.map((chip) => chip.key)).toEqual(['status'])
		wrapper.unmount()
	})

	it('lets the address win', async () => {
		const { wrapper } = mountPage({ status: 'ended' })
		await settle()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ status: 'ended' })
		wrapper.unmount()
	})

	it('leaves a saved view to its own filters', async () => {
		const { wrapper } = mountPage({ savedView: 'default:all' })
		await settle()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({})
		wrapper.unmount()
	})

	it('goes with Clear all and leaves the address without it', async () => {
		const { wrapper, replace } = mountPage({})
		await settle()
		wrapper.vm.onClearFilters()
		await settle()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({})
		const calls = replace.mock.calls
		if (calls.length > 0) {
			expect(calls[calls.length - 1][0].query.status).toBeUndefined()
		}
		wrapper.unmount()
	})

	it('does nothing without defaults', async () => {
		const { wrapper } = mountPage({}, { defaultFilters: null })
		await settle()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({})
		wrapper.unmount()
	})
})
