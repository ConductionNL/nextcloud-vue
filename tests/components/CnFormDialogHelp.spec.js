/**
 * Caller-side proof: a schema's `x-help` reaches a real form. Mounts
 * CnIndexPage, opens its create dialog and opens the help.
 *
 * @spec openspec/changes/field-help-in-place/tasks.md#task-3
 */
const schema = {
	title: 'Item',
	properties: {
		title: { type: 'string', title: 'Title', description: 'Short', 'x-help': { nl: 'Uitleg', en: 'The long explanation' } },
		note: { type: 'string', title: 'Note' },
	},
}
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue(schema),
	getSchema: jest.fn(() => schema),
	getError: jest.fn(() => null),
	saveObject: jest.fn(),
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
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcTextField: true,
	NcSelect: true,
	NcNoteCard: true,
	NcPopover: { template: '<div><slot name="trigger" /><slot /></div>' },
}

describe('CnIndexPage create dialog shows x-help', () => {
	it('puts an "About Title" button on the field and opens the help text', async () => {
		const wrapper = mount(CnIndexPage, {
			props: { title: 'Items', register: 'r', schema: 's' },
			global: { stubs, mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } } },
		})
		await new Promise((resolve) => setTimeout(resolve))
		wrapper.vm.openFormDialog(null)
		await new Promise((resolve) => setTimeout(resolve))

		const buttons = wrapper.findAll('.cn-field-helper__trigger')
		expect(buttons).toHaveLength(1)
		expect(buttons[0].attributes('aria-label')).toBe('About Title')
		await buttons[0].trigger('click')
		expect(buttons[0].attributes('aria-expanded')).toBe('true')
		expect(wrapper.find('.cn-field-helper__full').text()).toBe('The long explanation')
	})
})
