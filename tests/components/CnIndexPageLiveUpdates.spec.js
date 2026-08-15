/**
 * Tests for CnIndexPage's live collection updates in self-fetch mode
 * (manifest-live-updates).
 *
 * When `register` + `schema` are set and no `objects` prop is passed (the
 * manifest `type:"index"` path), the page subscribes to the collection
 * scope via the object store's live-updates `subscribe(type)` action on
 * mount and releases the subscription on unmount. The `subscribe` prop
 * (manifest: `pages[].config.subscribe: false`) is the opt-out. In
 * consumer-managed mode (an `objects` prop was passed) nothing subscribes,
 * and a store without live-updates support (no `subscribe` action) is a
 * silent no-op.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Decision', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Decision', properties: {} })),
	subscribe: jest.fn().mockResolvedValue({ _livePlugin: true, eventKey: 'or-collection-decidesk-decision' }),
	unsubscribe: jest.fn(),
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
 * @return {object} The Vue Test Utils wrapper.
 */
function mountPage(propsData) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: { params: {} }, $router: { push: jest.fn() } },
	})
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
	jest.clearAllMocks()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
	mockStore.subscribe.mockResolvedValue({ _livePlugin: true, eventKey: 'or-collection-decidesk-decision' })
})

describe('CnIndexPage — live collection updates (self-fetch mode)', () => {
	it('subscribes to the collection scope on mount and unsubscribes on unmount', async () => {
		const w = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
		await flush()

		expect(mockStore.subscribe).toHaveBeenCalledTimes(1)
		// Collection form: type slug only, no object id.
		expect(mockStore.subscribe).toHaveBeenCalledWith('decidesk-decision', undefined)

		w.unmount()
		await flush()
		expect(mockStore.unsubscribe).toHaveBeenCalledTimes(1)
	})

	it('subscribe:false (manifest config.subscribe) opts out', async () => {
		const w = mountPage({ title: 'Archive', register: 'decidesk', schema: 'decision', subscribe: false })
		await flush()
		// The list still self-fetches — only the live subscription is skipped.
		expect(mockStore.fetchCollection).toHaveBeenCalled()
		expect(mockStore.subscribe).not.toHaveBeenCalled()
		w.unmount()
	})

	it('consumer-managed mode (objects prop) never subscribes', async () => {
		const w = mountPage({
			title: 'Decisions',
			register: 'decidesk',
			schema: 'decision',
			objects: [{ id: '1', title: 'A' }],
		})
		await flush()
		expect(mockStore.subscribe).not.toHaveBeenCalled()
		w.unmount()
		await flush()
		expect(mockStore.unsubscribe).not.toHaveBeenCalled()
	})

	it('no register/schema (host-driven page) stays fully inert', async () => {
		const w = mountPage({ title: 'Plain', objects: [] })
		await flush()
		expect(mockStore.subscribe).not.toHaveBeenCalled()
		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
		w.unmount()
	})

	it('a store without live-updates support is a silent no-op', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const original = mockStore.subscribe
		delete mockStore.subscribe
		try {
			const w = mountPage({ title: 'Decisions', register: 'decidesk', schema: 'decision' })
			await flush()
			// Self-fetch still works; no subscription warning was emitted.
			expect(mockStore.fetchCollection).toHaveBeenCalled()
			const subscriptionWarns = warnSpy.mock.calls.filter(
				(c) => String(c[0]).includes('useObjectSubscription'),
			)
			expect(subscriptionWarns).toHaveLength(0)
			w.unmount()
		} finally {
			mockStore.subscribe = original
			warnSpy.mockRestore()
		}
	})
})
