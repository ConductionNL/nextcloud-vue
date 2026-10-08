/**
 * Tests for CnIndexPage.onPageSizeEvent — a page-size pick on a self-fetch
 * (manifest) index page refetches the list at the new size. The event alone
 * left the select changing and the table not, because a manifest page has no
 * host listening for `page-size-changed`.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Decision', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Decision', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
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

function mountPage(propsData) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(() => Promise.resolve()) } },
	})
}

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage — page size on a self-fetch page', () => {
	it('refetches page 1 at the picked size and still emits page-size-changed', async () => {
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await new Promise((resolve) => setTimeout(resolve))
		mockStore.fetchCollection.mockClear()

		wrapper.vm.onPageSizeEvent(50)
		await new Promise((resolve) => setTimeout(resolve))

		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params._limit).toBe(50)
		expect(params._page).toBe(1)
		expect(wrapper.emitted('page-size-changed')).toEqual([[50]])
	})

	it('consumer-managed mode only emits — the host fetches', async () => {
		const wrapper = mountPage({ title: 'Decisions', schema: { title: 'X', properties: {} }, objects: [] })
		await new Promise((resolve) => setTimeout(resolve))

		wrapper.vm.onPageSizeEvent(50)
		await new Promise((resolve) => setTimeout(resolve))

		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
		expect(wrapper.emitted('page-size-changed')).toEqual([[50]])
	})
})
