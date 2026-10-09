/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexPage with a `collectionUrl` lists rows of several register/schema
 * pairs; a row of another pair than the page's opens, saves and deletes
 * through its own pair.
 */

const rowA = { id: 'a', title: 'Publication', '@self': { id: 'a', register: 19, schema: 24 } }
const rowB = { id: 'b', name: 'Rule', '@self': { id: 'b', register: 19, schema: 202 } }

const { reactive } = require('vue')

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it; reactive so the list sees fetched rows.
const mockStore = reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn((type, schema, register, slugs) => {
		mockStore.objectTypeRegistry[type] = { schema, register, ...slugs }
	}),
	fetchCollection: jest.fn(async (type) => {
		mockStore.collections = { ...mockStore.collections, [type]: [rowA, rowB] }
		return [rowA, rowB]
	}),
	fetchSchema: jest.fn(async (type) => (type === '19-202'
		? { id: 202, title: 'Rule', properties: { name: { type: 'string' } } }
		: { id: 24, slug: 'publication', title: 'Publication', properties: {} })),
	getSchema: jest.fn(() => null),
	getRegister: jest.fn(() => null),
	fetchRegister: jest.fn(async () => null),
	getError: jest.fn(() => null),
	saveObject: jest.fn(async (type, data) => ({ ...data })),
	deleteObject: jest.fn(async () => true),
	deleteObjects: jest.fn(async (type, ids) => ({ successfulIds: ids, failedIds: [] })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubNames = ['CnDataTable', 'CnCardGrid', 'CnPagination', 'CnActionsBar', 'CnContextMenu', 'CnRowActions', 'CnIndexSidebar', 'CnPageHeader', 'CnMassDeleteDialog', 'CnMassCopyDialog', 'CnMassExportDialog', 'CnMassImportDialog', 'CnDeleteDialog', 'CnCopyDialog', 'CnFormDialog', 'CnAdvancedFormDialog', 'NcLoadingIcon', 'NcEmptyContent', 'CnIcon']
const stubs = {
	...Object.fromEntries(stubNames.map((n) => [n, true])),
	CnFormDialog: { template: '<div />', methods: { setResult() {}, setValidationErrors() {} } },
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * Mount the page.
 *
 * @param {object} [props] Extra props.
 * @return {Promise<object>} The wrapper, after the first fetch.
 */
async function mountPage(props = {}) {
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Publications', register: '19', schema: '24', collectionUrl: '/x/api/cat', ...props },
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn() } },
	})
	await flush()
	await flush()
	return wrapper
}

beforeEach(() => {
	jest.clearAllMocks()
	mockStore.collections = {}
	mockStore.objectTypeRegistry = {}
})

describe('CnIndexPage — collectionUrl', () => {
	it('registers the list under its own key, carrying the collection URL', async () => {
		await mountPage()
		const [type, schema, register, slugs] = mockStore.registerObjectType.mock.calls[0]
		expect(type).not.toBe('19-24')
		expect([schema, register]).toEqual(['24', '19'])
		expect(slugs.collectionUrl).toBe('/x/api/cat')
	})

	it('opens a row of another pair with that pair\'s schema and register', async () => {
		const wrapper = await mountPage()
		await wrapper.vm.openFormDialog(rowB)
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('19-202', '202', '19', expect.any(Object))
		expect(mockStore.fetchSchema).toHaveBeenCalledWith('19-202')
		expect(wrapper.vm.formSchema.title).toBe('Rule')
		expect(wrapper.vm.formRegister).toBe('19')

		wrapper.vm.closeFormDialog()
		expect(wrapper.vm.rowFormTarget).toBeNull()
		expect(wrapper.vm.formSchema).toBe(wrapper.vm.effectiveSchema)
	})

	it('opens a row of the page\'s own pair with the page schema', async () => {
		const wrapper = await mountPage()
		wrapper.vm.openFormDialog(rowA)
		expect(wrapper.vm.rowFormTarget).toBeNull()
		expect(wrapper.vm.showFormDialogVisible).toBe(true)
	})

	it('saves an edited row of another pair through that pair', async () => {
		const wrapper = await mountPage()
		await wrapper.vm.openFormDialog(rowB)
		await wrapper.vm.onFormConfirm({ id: 'b', name: 'Changed' })
		expect(mockStore.saveObject).toHaveBeenCalledWith('19-202', { id: 'b', name: 'Changed' })
	})

	it('deletes rows through their own pairs, one request per pair', async () => {
		const wrapper = await mountPage()
		await wrapper.vm.selfActions.handleSingleDelete('b')
		expect(mockStore.deleteObject).toHaveBeenCalledWith('19-202', 'b')

		await wrapper.vm.selfActions.handleMassDelete(['a', 'b'])
		const types = mockStore.deleteObjects.mock.calls.map(([type, ids]) => [type, ids])
		expect(types).toContainEqual(['19-202', ['b']])
		expect(types.find(([, ids]) => ids.includes('a'))[0]).not.toBe('19-202')
	})

	it('matches a slug register to the rows\' register id', async () => {
		mockStore.getRegister.mockImplementation((type) => (type.startsWith('pubs-') ? { id: 19, slug: 'pubs' } : null))
		const wrapper = await mountPage({ register: 'pubs' })
		const pageType = mockStore.registerObjectType.mock.calls[0][0]
		expect(mockStore.fetchRegister).toHaveBeenCalledWith(pageType)

		wrapper.vm.openFormDialog(rowA)
		expect(wrapper.vm.rowFormTarget).toBeNull()
		mockStore.getRegister.mockReset()
	})

	it('keeps a selected row of another pair on its pair after it leaves the page', async () => {
		const wrapper = await mountPage()
		const pageType = mockStore.registerObjectType.mock.calls[0][0]
		mockStore.collections = { [pageType]: [rowA] }
		await flush()
		expect(wrapper.vm.effectiveObjects.map((o) => o.id)).toEqual(['a'])

		await wrapper.vm.selfActions.handleMassDelete(['a', 'b'])
		const types = mockStore.deleteObjects.mock.calls.map(([type, ids]) => [type, ids])
		expect(types).toContainEqual(['19-202', ['b']])
	})

	it('does not open the form when the row\'s schema cannot be loaded', async () => {
		const wrapper = await mountPage()
		mockStore.fetchSchema.mockImplementationOnce(async () => {
			throw new Error('404')
		})
		await wrapper.vm.openFormDialog(rowB)
		expect(wrapper.vm.showFormDialogVisible).toBe(false)
		expect(wrapper.vm.rowFormTarget).toBeNull()
	})

	it('mounts with objects and a collectionUrl without touching the row cache', async () => {
		const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
		const warns = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = await mountPage({ objects: [rowA, rowB] })
		expect(wrapper.vm.collectionRowsById.size).toBe(0)
		const watcherErrors = [...errors.mock.calls, ...warns.mock.calls].filter((args) => String(args[0]).includes('watcher'))
		expect(watcherErrors).toEqual([])
		errors.mockRestore()
		warns.mockRestore()
	})

	it('without collectionUrl, every row stays on the page\'s pair', async () => {
		const wrapper = await mountPage({ collectionUrl: '' })
		expect(mockStore.registerObjectType.mock.calls[0][0]).toBe('19-24')
		expect(mockStore.registerObjectType.mock.calls[0][3]).not.toHaveProperty('collectionUrl')
		wrapper.vm.openFormDialog(rowB)
		expect(wrapper.vm.rowFormTarget).toBeNull()
		await wrapper.vm.selfActions.handleSingleDelete('b')
		expect(mockStore.deleteObject).toHaveBeenCalledWith('19-24', 'b')
	})
})
