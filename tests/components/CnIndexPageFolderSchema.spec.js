/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `folderSidebar` folder that declares `schema` (and optionally `register`)
 * switches which register and schema CnIndexPage lists; "All" or a folder
 * without `schema` restores the page's own. Selection and open dialogs reset
 * on the switch, and the live-update subscription follows the active type.
 */
const { reactive } = require('vue')

const mockStore = reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn(() => Promise.resolve([])),
	fetchSchema: jest.fn((type) => Promise.resolve({ title: type, properties: {} })),
	getSchema: jest.fn(() => ({ title: 'S', properties: {} })),
	subscribe: jest.fn(() => Promise.resolve({ type: 'h' })),
	unsubscribe: jest.fn(() => Promise.resolve()),
})

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
	CnFormDialog: true,
	CnFolderSidebar: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const FOLDERS = [
	{ id: 'people', name: 'People' },
	{ id: 'orgs', name: 'Organisations', schema: 'kvkCompany' },
	{ id: 'other', name: 'Other register', schema: 'asset', register: 'inventory' },
]

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountPage(folders = FOLDERS) {
	return mount(CnIndexPage, {
		propsData: {
			register: 'dossiq',
			schema: 'brpPerson',
			folderSidebar: { source: 'custom', folders, filterField: 'kind' },
		},
		stubs,
		mocks: { $route: { query: {}, params: {} }, $router: { replace: jest.fn(() => Promise.resolve()) } },
	})
}

const lastFetchType = () => mockStore.fetchCollection.mock.calls.at(-1)[0]

describe('CnIndexPage folder schema', () => {
	beforeEach(() => {
		mockStore.fetchCollection.mockClear()
		mockStore.fetchSchema.mockClear()
		mockStore.registerObjectType.mockClear()
		mockStore.subscribe.mockClear()
		mockStore.unsubscribe.mockClear()
	})

	it('loads the page schema first', async () => {
		const w = mountPage()
		await flush()
		expect(lastFetchType()).toBe('dossiq-brpPerson')
		expect(w.vm.selfObjectType).toBe('dossiq-brpPerson')
	})

	it('switches to the folder schema, registered under the page register by default', async () => {
		const w = mountPage()
		await flush()
		w.vm.onFolderSelect('orgs')
		await flush()
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('dossiq-kvkCompany', 'kvkCompany', 'dossiq', expect.any(Object))
		expect(lastFetchType()).toBe('dossiq-kvkCompany')
		expect(mockStore.fetchSchema).toHaveBeenCalledWith('dossiq-kvkCompany')
		expect(w.vm.selfObjectType).toBe('dossiq-kvkCompany')
	})

	it('uses the folder register when it names one', async () => {
		const w = mountPage()
		await flush()
		w.vm.onFolderSelect('other')
		await flush()
		expect(lastFetchType()).toBe('inventory-asset')
	})

	it('restores the page schema on All and on a folder without schema', async () => {
		const w = mountPage()
		await flush()
		w.vm.onFolderSelect('orgs')
		await flush()
		w.vm.onFolderSelect(null)
		await flush()
		expect(lastFetchType()).toBe('dossiq-brpPerson')
		w.vm.onFolderSelect('orgs')
		await flush()
		w.vm.onFolderSelect('people')
		await flush()
		expect(lastFetchType()).toBe('dossiq-brpPerson')
	})

	it('moves the live-update subscription to the active type and releases the old one', async () => {
		const w = mountPage()
		await flush()
		expect(mockStore.subscribe).toHaveBeenLastCalledWith('dossiq-brpPerson', undefined)
		w.vm.onFolderSelect('orgs')
		await flush()
		expect(mockStore.unsubscribe).toHaveBeenCalled()
		expect(mockStore.subscribe).toHaveBeenLastCalledWith('dossiq-kvkCompany', undefined)
	})

	it('clears the selection and closes open dialogs on a schema switch', async () => {
		const w = mountPage()
		await flush()
		await w.setData({ internalSelectedIds: ['1', '2'], showFormDialogVisible: true, showSingleDeleteDialog: true, actionTargetItem: { id: '1' } })
		w.vm.onFolderSelect('orgs')
		expect(w.vm.internalSelectedIds).toEqual([])
		expect(w.vm.showFormDialogVisible).toBe(false)
		expect(w.vm.showSingleDeleteDialog).toBe(false)
		expect(w.vm.actionTargetItem).toBeNull()
	})

	it('leaves a folder without schema exactly as before: a filter, no type change, selection kept', async () => {
		const w = mountPage()
		await flush()
		await w.setData({ internalSelectedIds: ['1'] })
		mockStore.registerObjectType.mockClear()
		w.vm.onFolderSelect('people')
		await flush()
		expect(w.vm.selfObjectType).toBe('dossiq-brpPerson')
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
		expect(w.vm.internalSelectedIds).toEqual(['1'])
		expect(w.emitted('filter-change')[0][0]).toEqual({ key: 'kind', values: ['people'] })
	})
})
