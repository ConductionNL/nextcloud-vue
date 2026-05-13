/**
 * Tests for CnIndexPage's self-fetch mode (REQ-MISF-3 / REQ-MISF-4 of the
 * `manifest-index-self-fetch` change). When `register` + `schema` are set and
 * the caller passes NO `objects` prop (the manifest `type:"index"` path),
 * CnIndexPage drives the list via `useListView` against the object store —
 * registering the `${register}-${schema}` type and fetching the collection,
 * with `pages[].config.filter` interpolated from `$route.params` as a fixed
 * filter. Passing `objects` keeps the existing consumer-managed behaviour
 * (no store touched).
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
	CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true,
	CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnPageHeader: true,
	CnMassDeleteDialog: true, CnMassCopyDialog: true, CnMassExportDialog: true,
	CnMassImportDialog: true, CnDeleteDialog: true, CnCopyDialog: true,
	CnFormDialog: true, CnAdvancedFormDialog: true, NcLoadingIcon: true, NcEmptyContent: true, CnIcon: true,
}

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @param {object} [route] Mocked `$route` (defaults to `{ params: {} }`).
 * @return {object} The Vue Test Utils wrapper.
 */
function mountPage(propsData, route) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: route || { params: {} }, $router: { push: jest.fn() } },
	})
}

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchSchema.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage — self-fetch mode', () => {
	it('register + schema (string) + no objects → registers the type and fetches the collection', async () => {
		mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.registerObjectType).toHaveBeenCalled()
		const [type] = mockStore.registerObjectType.mock.calls[0]
		expect(type).toBe('decidesk-decision')
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		expect(mockStore.fetchCollection.mock.calls[0][0]).toBe('decidesk-decision')
	})

	it('passing an `objects` prop keeps the consumer-managed path (no store touched)', async () => {
		mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision', objects: [{ id: '1', title: 'A' }] })
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
	})

	it('`filter` with "@route.<name>" is interpolated from $route.params and applied as a fixed filter', async () => {
		mountPage(
			{ title: 'Submissions', register: 'pipelinq', schema: 'intakeSubmission', filter: { intakeForm: '@route.id', archived: false } },
			{ params: { id: 'form-7' } },
		)
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.intakeForm).toBe('form-7')
		expect(params.archived).toBe(false)
	})

	it('no `register`/`schema` (and no `objects`) → not self-fetch, no store touched', async () => {
		mountPage({ title: 'Bare', schema: { title: 'X', properties: {} } })
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
	})
})
