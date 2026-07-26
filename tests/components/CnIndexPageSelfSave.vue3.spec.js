/**
 * Regression: a manifest `type:"index"` page in self-fetch mode
 * (register+schema, no `objects` prop) must POST on create under Vue 3 —
 * `onFormConfirm` → `selfActions.handleFormSave` → `store.saveObject`.
 */
const mockStore = {
	collections: {}, loading: {}, pagination: {}, facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Source', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Source', properties: {} })),
	getError: jest.fn(() => null),
	saveObject: jest.fn().mockResolvedValue({ id: 'new-1', name: 'x' }),
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

describe('CnIndexPage self-fetch save (Vue 3)', () => {
	it('onFormConfirm in self-fetch mode calls store.saveObject (POST)', async () => {
		mockStore.saveObject.mockClear()
		const wrapper = mount(CnIndexPage, {
			props: { title: 'Sources', register: 'oc', schema: 'source' },
			global: { stubs, mocks: { $route: { params: {} }, $router: { push: jest.fn() } } },
		})
		await new Promise((r) => setTimeout(r))
		await wrapper.vm.onFormConfirm({ name: 'my-source' })
		expect(mockStore.saveObject).toHaveBeenCalledWith('oc-source', { name: 'my-source' })
	})
})
