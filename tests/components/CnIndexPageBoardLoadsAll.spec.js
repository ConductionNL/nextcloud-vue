// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * A self-fetching index page in board view loads every matching row: it asks
 * for BOARD_PAGE_SIZE rows instead of the table's page, adds the next batch on
 * "Load more" instead of replacing the page, counts what it holds of what
 * matches, and hands the table its own page size back on leaving the board.
 *
 * @spec openspec/changes/board-loads-every-row/specs/board-view/spec.md#requirement-the-index-board-shows-every-matching-row
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it; reactive
// so rows written after mount reach the footer.
const mockStore = require('vue').reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Zaak', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Zaak', properties: {} })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { BOARD_PAGE_SIZE } = require('../../src/components/CnIndexPage/useSelfFetchList.js')

const flush = () => new Promise((resolve) => setTimeout(resolve))
const fetchCollection = mockStore.fetchCollection

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnBoardView: true,
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

/**
 * @param {object} propsData Props.
 * @return {object} The wrapper.
 */
function mountPage(propsData) {
	return mount(CnIndexPage, {
		propsData: { title: 'Zaken', register: 'dossiq', schema: 'case', viewModes: ['table', 'board'], ...propsData },
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(() => Promise.resolve()) } },
	})
}

/**
 * @return {Array<object>} The `_limit`s of every fetch so far.
 */
function limits() {
	return fetchCollection.mock.calls.map((call) => (call[1] || {})._limit)
}

beforeEach(() => {
	fetchCollection.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage — the board view loads every row', () => {
	it('opens in board view with one fetch of BOARD_PAGE_SIZE rows', async () => {
		mountPage({ viewMode: 'board' })
		await flush()

		expect(BOARD_PAGE_SIZE).toBe(500)
		expect(limits()).toEqual([BOARD_PAGE_SIZE])
	})

	it('switches to the board at BOARD_PAGE_SIZE and back to the table page size', async () => {
		const wrapper = mountPage({ pagination: { limit: 25 } })
		await flush()
		expect(limits()).toEqual([25])

		wrapper.vm.onViewModeChange('board')
		await flush()
		expect(limits()).toEqual([25, BOARD_PAGE_SIZE])

		wrapper.vm.onViewModeChange('table')
		await flush()
		expect(limits()).toEqual([25, BOARD_PAGE_SIZE, 25])
	})

	it('counts what it holds of what matches and adds the next batch on Load more', async () => {
		const wrapper = mountPage({ viewMode: 'board' })
		await flush()
		const type = fetchCollection.mock.calls[0][0]
		mockStore.collections = { [type]: [{ id: 'a' }, { id: 'b' }] }
		mockStore.pagination = { [type]: { total: 3, page: 1, pages: 2, limit: BOARD_PAGE_SIZE } }
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-index-board-load-count"]').text()).toBe('Showing 2 of 3')
		expect(wrapper.find('[data-testid="cn-index-board-load-more"]').exists()).toBe(true)
		expect(wrapper.vm.isPaged).toBe(true)

		fetchCollection.mockClear()
		await wrapper.find('[data-testid="cn-index-board-load-more"]').trigger('click')
		await flush()

		const [, params, options] = fetchCollection.mock.calls[0]
		expect(params).toMatchObject({ _limit: BOARD_PAGE_SIZE, _page: 2 })
		expect(options).toMatchObject({ append: true })
	})

	it('offers no Load more once every row is loaded', async () => {
		const wrapper = mountPage({ viewMode: 'board' })
		await flush()
		const type = fetchCollection.mock.calls[0][0]
		mockStore.collections = { [type]: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
		mockStore.pagination = { [type]: { total: 3, page: 2, pages: 2, limit: BOARD_PAGE_SIZE } }
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-index-board-load-count"]').text()).toBe('Showing 3 of 3')
		expect(wrapper.find('[data-testid="cn-index-board-load-more"]').exists()).toBe(false)
		expect(wrapper.vm.isPaged).toBe(false)
	})

	it('leaves a host-fed board on its pages', async () => {
		const wrapper = mountPage({ register: '', schema: { title: 'Zaak', properties: {} }, objects: [{ id: 'a' }], viewMode: 'board', pagination: { total: 40, page: 1, pages: 2, limit: 20 } })
		await flush()

		expect(fetchCollection).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-index-board-load"]').exists()).toBe(false)
		wrapper.vm.onBoardLoadMore()
		expect(wrapper.emitted('page-changed')).toEqual([[2]])
	})
})
