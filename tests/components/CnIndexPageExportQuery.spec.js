/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-export-follows-the-page/tasks.md#task-1
 * @spec openspec/changes/index-export-follows-the-page/tasks.md#task-2
 * @spec openspec/changes/index-export-follows-the-page/tasks.md#task-3
 */
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Contract', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Contract', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { stubLocationMethod } = require('../support/stubLocation.js')

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountPage(propsData, routeQuery = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Contracts', register: 'stackiq', schema: 'contract', allowExport: true, ...propsData },
		stubs,
		mocks: { $route: { params: {}, query: routeQuery }, $router: { push: jest.fn(), replace: jest.fn() } },
	})
}

describe('CnIndexPage export follows the list', () => {
	let assignSpy

	beforeEach(() => {
		assignSpy = stubLocationMethod('assign')
		mockStore.fetchCollection.mockClear()
	})

	afterEach(() => assignSpy.mockRestore())

	it('sends the page filter, the search and no paging', async () => {
		const wrapper = mountPage({ filter: { status: 'Active' }, schema: 'contract' })
		await tick()
		wrapper.vm.list.searchTerm.value = 'gemeente'
		wrapper.vm.onExportClick('excel')
		const url = assignSpy.mock.calls[0][0]
		expect(url).toContain('/apps/openregister/api/objects/stackiq/contract/export')
		expect(url).toContain('format=excel')
		expect(url).toContain('status=Active')
		expect(url).toContain('_search=gemeente')
		expect(url).not.toContain('_limit')
		expect(url).not.toContain('_page')
	})

	it('carries the active quick filter, which the route query does not', async () => {
		const wrapper = mountPage({ quickFilters: [{ label: 'All', filter: {} }, { label: 'Active', filter: { status: 'Active' } }] })
		await tick()
		wrapper.vm.activeQuickFilterIndex = 1
		await tick()
		wrapper.vm.onExportClick('csv')
		expect(assignSpy.mock.calls[0][0]).toContain('status=Active')
	})
})

describe('CnIndexPage export flag', () => {
	const exportable = (extra) => ({ slug: 'case', title: 'Case', properties: {}, ...extra })

	it.each([
		[{}, false],
		[{ exportable: true }, true],
		[{ configuration: { exportable: true } }, true],
		[{ exportable: false, configuration: { exportable: true } }, false],
		[{ exportable: true, configuration: { exportable: false } }, true],
	])('schema %j enables the menu: %s', (extra, expected) => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Cases', register: 'procest', objects: [], schema: exportable(extra), allowExport: true },
			stubs,
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		})
		expect(wrapper.vm.showExportMenu).toBe(expected)
	})
})

describe('CnIndexPage mass export follows the selection or the filter', () => {
	let fetchMock

	beforeEach(() => {
		fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			blob: async () => new Blob(['x']),
			headers: { get: () => null },
		})
		global.fetch = fetchMock
		window.URL.createObjectURL = jest.fn(() => 'blob:x')
		window.URL.revokeObjectURL = jest.fn()
		jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.restoreAllMocks()
		delete global.fetch
	})

	it('sends the list query when nothing is selected', async () => {
		const wrapper = mountPage({ filter: { status: 'Active' } })
		await tick()
		await wrapper.vm.onMassExportConfirm({ format: 'csv' })
		const url = fetchMock.mock.calls[0][0]
		expect(url).toContain('status=Active')
		expect(url).toContain('type=csv')
		expect(url).not.toContain('ids')
		expect(url).not.toContain('_limit')
	})

	it('sends only the selected ids when rows are selected', async () => {
		const wrapper = mountPage({ filter: { status: 'Active' } })
		await tick()
		wrapper.vm.internalSelectedIds = ['a', 'b']
		await wrapper.vm.onMassExportConfirm({ format: 'csv' })
		const url = decodeURIComponent(fetchMock.mock.calls[0][0])
		expect(url).toContain('ids[]=a')
		expect(url).toContain('ids[]=b')
		expect(url).not.toContain('status=Active')
	})

	it('says which rows the dialog will export', async () => {
		const wrapper = mountPage({})
		await tick()
		wrapper.vm.internalSelectedIds = ['a', 'b']
		expect(wrapper.vm.massExportScopeText).toBe('Export 2 selected rows')
		wrapper.vm.internalSelectedIds = []
		expect(wrapper.vm.massExportScopeText).toContain('matching the current filter')
	})
})
