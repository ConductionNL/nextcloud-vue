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
const { ref } = require('vue')
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
 * @param {object} [provide] Extra `provide` entries (e.g. `cnWorkspaceContext`).
 * @return {object} The Vue Test Utils wrapper.
 */
function mountPage(propsData, route, provide) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		provide,
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

	it('Refresh action drives the spinner (effectiveRefreshing) while the self-fetch refetch is in flight', async () => {
		// fetchCollection resolves only when we call `release()`, so we can
		// assert the spinner is on mid-flight and off once it settles.
		let release
		mockStore.fetchCollection.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.effectiveRefreshing).toBe(false)
		const pending = wrapper.vm.onRefreshEvent()
		expect(wrapper.vm.effectiveRefreshing).toBe(true)

		release([])
		await pending
		expect(wrapper.vm.effectiveRefreshing).toBe(false)
	})

	it('consumer-managed mode: effectiveRefreshing mirrors the `refreshing` prop', async () => {
		const wrapper = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision', objects: [], refreshing: true })
		await new Promise((resolve) => setTimeout(resolve))
		expect(wrapper.vm.effectiveRefreshing).toBe(true)
	})
})

/**
 * Regression coverage for the multi-administratie self-fetch bug: the index
 * self-fetch path resolved filter tokens with NO `ctx`, so `@workspace.<key>`
 * could never resolve, and never dropped an unresolved OPTIONAL token — an
 * unset `@workspace.activeAdministrationId?` was sent to the API LITERALLY
 * (`administrationId=%40workspace.activeAdministrationId%3F`) instead of
 * being dropped, hiding every row instead of showing all of them.
 */
describe('CnIndexPage — self-fetch mode: @workspace.<key> filter tokens', () => {
	it('resolves `@workspace.<key>` against the injected cnWorkspaceContext', async () => {
		const workspaceCtx = ref({ activeAdministrationId: 'ADM-001' })
		mountPage(
			{ title: 'Employees', register: 'hrmq', schema: 'employee', filter: { administrationId: '@workspace.activeAdministrationId?' } },
			null,
			{ cnWorkspaceContext: workspaceCtx },
		)
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(params.administrationId).toBe('ADM-001')
	})

	it('DROPS an unresolved OPTIONAL `@workspace.<key>?` token instead of sending it literally', async () => {
		// No cnWorkspaceContext provided at all (mirrors an app that never sets it).
		mountPage(
			{ title: 'Employees', register: 'hrmq', schema: 'employee', filter: { administrationId: '@workspace.activeAdministrationId?' } },
		)
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(Object.prototype.hasOwnProperty.call(params, 'administrationId')).toBe(false)
	})

	it('DROPS the token when cnWorkspaceContext is provided but the key is unset', async () => {
		const workspaceCtx = ref({})
		mountPage(
			{ title: 'Employees', register: 'hrmq', schema: 'employee', filter: { administrationId: '@workspace.activeAdministrationId?' } },
			null,
			{ cnWorkspaceContext: workspaceCtx },
		)
		await new Promise((resolve) => setTimeout(resolve))
		const params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(Object.prototype.hasOwnProperty.call(params, 'administrationId')).toBe(false)
	})

	it('re-fetches reactively when the workspace ctx changes — no reload required', async () => {
		const workspaceCtx = ref({})
		mountPage(
			{ title: 'Employees', register: 'hrmq', schema: 'employee', filter: { administrationId: '@workspace.activeAdministrationId?' } },
			null,
			{ cnWorkspaceContext: workspaceCtx },
		)
		await new Promise((resolve) => setTimeout(resolve))
		expect(mockStore.fetchCollection).toHaveBeenCalledTimes(1)
		let params = mockStore.fetchCollection.mock.calls[0][1] || {}
		expect(Object.prototype.hasOwnProperty.call(params, 'administrationId')).toBe(false)

		// The administration switcher writes into the SAME ref (see hrmq's
		// App.vue / AdministrationSwitcher.vue) — mutate it here the same way.
		workspaceCtx.value = { activeAdministrationId: 'ADM-002' }
		await new Promise((resolve) => setTimeout(resolve))

		expect(mockStore.fetchCollection.mock.calls.length).toBeGreaterThan(1)
		const lastCall = mockStore.fetchCollection.mock.calls[mockStore.fetchCollection.mock.calls.length - 1]
		params = lastCall[1] || {}
		expect(params.administrationId).toBe('ADM-002')
	})
})
