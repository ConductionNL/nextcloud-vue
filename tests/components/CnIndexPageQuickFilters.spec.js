/**
 * Tests for `CnIndexPage`'s quick-filter tabs (REQ-MIPFU-1 of
 * `manifest-index-page-followups`).
 *
 * `pages[].config.quickFilters: [{label, filter, default?}]` renders a
 * tab strip above the table; clicking a tab re-fetches with the tab's
 * `filter` merged into the `useListView` fetch — spread AFTER
 * `config.filter` (so the active tab wins) and BEFORE the user's
 * `activeFilters` (which can still narrow within the active tab).
 */

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Task', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Task', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true,
	CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnPageHeader: true,
	CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true,
	CnFormDialog: true, CnAdvancedFormDialog: true, NcLoadingIcon: true, NcEmptyContent: true, CnIcon: true,
}

/**
 * @param {object} propsData Component props.
 * @param {object} [route] Mocked `$route`.
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData, route) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: route || { params: {} }, $router: { push: jest.fn() } },
	})
}

/**
 * Resolve next microtask + lib's await-then-await pattern.
 *
 * @return {Promise<void>}
 */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve))
}

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchSchema.mockClear()
})

describe('CnIndexPage — quick-filter tabs (REQ-MIPFU-1)', () => {
	it('initial fetch carries the default-active tab\'s filter', async () => {
		mountPage({
			title: 'Tasks',
			register: 'app',
			schema: 'task',
			quickFilters: [
				{ label: 'Open', filter: { status: 'open' }, default: true },
				{ label: 'Closed', filter: { status: 'closed' } },
			],
		})
		await flush()
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.status).toBe('open')
	})

	it('without `default:true` the first tab is active on mount', async () => {
		mountPage({
			title: 'Tasks',
			register: 'app',
			schema: 'task',
			quickFilters: [
				{ label: 'All', filter: {} },
				{ label: 'Mine', filter: { assignee: 'me' } },
			],
		})
		await flush()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		// First tab's filter is empty → no `assignee` key
		expect(params.assignee).toBeUndefined()
	})

	it('switching tabs re-fetches with the new tab\'s filter', async () => {
		const wrapper = mountPage({
			title: 'Tasks',
			register: 'app',
			schema: 'task',
			quickFilters: [
				{ label: 'Open', filter: { status: 'open' }, default: true },
				{ label: 'Closed', filter: { status: 'closed' } },
			],
		})
		await flush()
		mockStore.fetchCollection.mockClear()

		wrapper.vm.activeQuickFilterIndex = 1
		await flush()
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.status).toBe('closed')
	})

	it('quick filter wins over a colliding `config.filter`', async () => {
		mountPage({
			title: 'Tasks',
			register: 'app',
			schema: 'task',
			filter: { status: 'open' },
			quickFilters: [
				{ label: 'All', filter: {} },
				{ label: 'Closed', filter: { status: 'closed' }, default: true },
			],
		})
		await flush()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.status).toBe('closed')
	})

	it('emits `quick-filter-change` when the active index changes', async () => {
		const wrapper = mountPage({
			title: 'Tasks',
			register: 'app',
			schema: 'task',
			quickFilters: [
				{ label: 'A', filter: {} },
				{ label: 'B', filter: { x: 1 } },
			],
		})
		await flush()
		await wrapper.vm.onQuickFilterChange(1)
		expect(wrapper.emitted('quick-filter-change')).toBeTruthy()
		expect(wrapper.emitted('quick-filter-change')[0]).toEqual([1])
	})

	it('no `quickFilters` → no tab strip and identical fetch behaviour', async () => {
		const wrapper = mountPage({
			title: 'Tasks',
			register: 'app',
			schema: 'task',
			filter: { status: 'open' },
		})
		await flush()
		expect(wrapper.find('.cn-quick-filter-bar').exists()).toBe(false)
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.status).toBe('open')
	})

	it('tab `filter` resolves `@route.<name>` from $route.params (parity with config.filter)', async () => {
		mountPage(
			{
				title: 'Tasks',
				register: 'app',
				schema: 'task',
				quickFilters: [
					{ label: 'Mine for case', filter: { caseId: '@route.caseId' }, default: true },
				],
			},
			{ params: { caseId: 'case-7' } },
		)
		await flush()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.caseId).toBe('case-7')
	})
})
