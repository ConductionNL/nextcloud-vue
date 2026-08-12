/**
 * Tests for CnLogsPage's store-backed list mode.
 *
 * A logs page used to call `fetchCollection(type)` with no params at all: it
 * ignored `$route.query`, so a "View logs" deep link like
 * `/jobs/logs?jobId=<uuid>` listed EVERY log row in the register, and it had
 * no paging or sorting. It now drives the list through `useListView`, which
 * merges the query-derived filters, the manifest `filter`, `_limit`, `_page`
 * and `_order` into every request.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	errors: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Job log', properties: { message: { type: 'string' } } }),
	getSchema: jest.fn(() => ({ title: 'Job log', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnLogsPage = require('../../src/components/CnLogsPage/CnLogsPage.vue').default

const stubs = {
	CnDataTable: true,
	CnPagination: true,
	CnPageHeader: true,
	CnDetailGrid: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcDialog: true,
	NcButton: true,
}

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @param {object} [route] Mocked `$route` (defaults to an empty query + params).
 * @param {object} [provide] Injected bags (`cnWorkspaceContext` / `cnAppConfig`)
 *   for the `filter` prop's token grammar.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountPage(propsData, route, provide) {
	return mount(CnLogsPage, {
		propsData: { register: 'openconnector', schema: 'job_log', ...propsData },
		stubs,
		mocks: { $route: route || { query: {}, params: {} }, $router: { push: jest.fn() } },
		...(provide ? { provide } : {}),
	})
}

/** Flush pending microtasks so useListView's onMounted fetch settles. */
const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * The params object of the Nth `fetchCollection` call.
 *
 * @param {number} [n] Call index (default 0).
 * @return {object} The params argument.
 */
const paramsOfCall = (n = 0) => mockStore.fetchCollection.mock.calls[n][1]

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.fetchSchema.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
	mockStore.errors = {}
})

describe('CnLogsPage — store-backed list', () => {
	it('registers the object type positionally and fetches the collection', async () => {
		mountPage()
		await flush()
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('openconnector-job_log', 'job_log', 'openconnector')
		expect(mockStore.fetchCollection.mock.calls[0][0]).toBe('openconnector-job_log')
	})

	it('fetches exactly once on mount (the composable owns the initial fetch)', async () => {
		mountPage()
		await flush()
		expect(mockStore.fetchCollection).toHaveBeenCalledTimes(1)
	})

	it('applies a ?jobId= deep link as a filter — the "View logs" row action case', async () => {
		mountPage({}, { query: { jobId: 'a279eb76-d619-4359-ade7-bc6725ee0457' }, params: {} })
		await flush()
		expect(paramsOfCall()).toMatchObject({ jobId: 'a279eb76-d619-4359-ade7-bc6725ee0457' })
	})

	it('does NOT forward reserved underscore-prefixed query params as filters', async () => {
		mountPage({}, { query: { jobId: 'j-1', _page: '3', _search: 'boom' }, params: {} })
		await flush()
		const params = paramsOfCall()
		expect(params.jobId).toBe('j-1')
		expect(params._page).toBe(1)
		expect(params._search).toBeUndefined()
	})

	it('`filter` wins over a colliding query key', async () => {
		mountPage({ filter: { jobId: 'from-config' } }, { query: { jobId: 'from-query' }, params: {} })
		await flush()
		expect(paramsOfCall().jobId).toBe('from-config')
	})

	it('resolves a "@route.<param>" token in `filter` from $route.params', async () => {
		mountPage({ filter: { jobId: '@route.id' } }, { query: {}, params: { id: 'job-42' } })
		await flush()
		expect(paramsOfCall().jobId).toBe('job-42')
	})

	it('sortKey + sortOrder become the initial _order', async () => {
		mountPage({ sortKey: 'created', sortOrder: 'desc' })
		await flush()
		expect(paramsOfCall()._order).toEqual({ created: 'desc' })
	})

	it('sends no _order when sortKey is unset (server ordering preserved)', async () => {
		mountPage()
		await flush()
		expect(paramsOfCall()._order).toBeUndefined()
	})

	it('pagination.limit becomes _limit', async () => {
		mountPage({ pagination: { limit: 50 } })
		await flush()
		expect(paramsOfCall()._limit).toBe(50)
	})

	it('a header sort re-fetches at page 1 with the new _order, keeping the filter', async () => {
		// Rows must exist or the empty-state renders instead of the table.
		mockStore.collections['openconnector-job_log'] = [{ id: '1' }]
		const wrapper = mountPage({ pagination: { limit: 50 } }, { query: { jobId: 'j-1' }, params: {} })
		await flush()
		wrapper.findComponent({ name: 'CnDataTable' }).vm.$emit('sort', { key: 'level', order: 'asc', keys: [{ key: 'level', order: 'asc' }] })
		await flush()
		expect(mockStore.fetchCollection).toHaveBeenCalledTimes(2)
		expect(paramsOfCall(1)).toMatchObject({ jobId: 'j-1', _page: 1, _order: { level: 'asc' } })
	})

	it('a page change re-fetches with _page, keeping the filter', async () => {
		mockStore.pagination['openconnector-job_log'] = { total: 120, page: 1, pages: 3, limit: 50 }
		mockStore.collections['openconnector-job_log'] = [{ id: '1' }]
		const wrapper = mountPage({}, { query: { jobId: 'j-1' }, params: {} })
		await flush()
		wrapper.findComponent({ name: 'CnPagination' }).vm.$emit('page-changed', 2)
		await flush()
		expect(paramsOfCall(1)).toMatchObject({ jobId: 'j-1', _page: 2 })
	})

	it('a $route.query change re-fetches exactly once with the new filter', async () => {
		const route = { query: { jobId: 'j-1' }, params: {} }
		const wrapper = mountPage({}, route)
		await flush()
		expect(mockStore.fetchCollection).toHaveBeenCalledTimes(1)

		route.query = { jobId: 'j-2' }
		wrapper.vm.$forceUpdate()
		await wrapper.vm.$nextTick()
		// The watcher is on the reactive `$route.query` reference; drive it the
		// way a router push would by reassigning and letting the watcher run.
		await wrapper.vm.$options.watch['$route.query'].handler.call(wrapper.vm)
		await flush()
		expect(mockStore.fetchCollection).toHaveBeenCalledTimes(2)
		expect(paramsOfCall(1).jobId).toBe('j-2')
	})

	it('surfaces a store-recorded fetch error (fetchCollection never throws)', async () => {
		// Set before mount: this fake store is a plain object, so a later write
		// would not be tracked. The real store is reactive.
		mockStore.errors['openconnector-job_log'] = 'Request failed with status code 500'
		const wrapper = mountPage()
		await flush()
		expect(wrapper.vm.error).toBe('Request failed with status code 500')
	})

	// The error block is a SIBLING of the loading/empty/table chain, not a branch
	// of it, so a failed fetch — which leaves the collection empty — rendered the
	// empty state AND the error state: "no log entries" stacked above "could not
	// load log entries". Asserting the `error` computed (above) cannot catch that;
	// only the render can.
	//
	// CnDataTable is deliberately NOT stubbed in these three. The first version of
	// this fix guarded only the empty branch, so `v-else` caught the same state and
	// mounted CnDataTable with zero rows — which renders its own empty row from the
	// same `emptyText`, reproducing the contradiction inside the table. A stubbed
	// table renders nothing, so the assertion passed against the broken markup.
	const realTableStubs = { ...stubs }
	delete realTableStubs.CnDataTable

	/**
	 * Mount with a REAL CnDataTable so an empty table row is observable.
	 *
	 * @return {object} The wrapper.
	 */
	const mountWithRealTable = () => mount(CnLogsPage, {
		propsData: { register: 'openconnector', schema: 'job_log' },
		stubs: realTableStubs,
		mocks: { $route: { query: {}, params: {} }, $router: { push: jest.fn() } },
	})

	it('renders the error state ALONE on a failed fetch — no empty block, no empty table', async () => {
		mockStore.errors['openconnector-job_log'] = 'Request failed with status code 500'
		const wrapper = mountWithRealTable()
		await flush()
		expect(wrapper.find('.cn-logs-page__error').exists()).toBe(true)
		expect(wrapper.find('.cn-logs-page__empty').exists()).toBe(false)
		// The table must not mount at all: an empty CnDataTable says "No log
		// entries to show", contradicting the error directly above it.
		expect(wrapper.find('table').exists()).toBe(false)
		expect(wrapper.find('.cn-table-empty').exists()).toBe(false)
	})

	it('still renders the empty state when the fetch succeeded with no rows', async () => {
		const wrapper = mountWithRealTable()
		await flush()
		expect(wrapper.find('.cn-logs-page__empty').exists()).toBe(true)
		expect(wrapper.find('.cn-logs-page__error').exists()).toBe(false)
		expect(wrapper.find('table').exists()).toBe(false)
	})

	// An error over a still-populated collection is the one case where both
	// surfaces are correct: stale rows stay readable with the failure beneath them.
	it('keeps the table AND the error when a refresh fails over existing rows', async () => {
		mockStore.collections['openconnector-job_log'] = [{ id: '1', message: 'boot' }]
		mockStore.errors['openconnector-job_log'] = 'Request failed with status code 500'
		const wrapper = mountWithRealTable()
		await flush()
		expect(wrapper.find('table').exists()).toBe(true)
		expect(wrapper.find('.cn-logs-page__error').exists()).toBe(true)
		expect(wrapper.find('.cn-logs-page__empty').exists()).toBe(false)
	})

	// `resolveFilterMap` takes a third `ctx` argument for the `@workspace.<key>` /
	// `@config.<key>` tokens the `filter` prop documents. CnLogsPage passed none,
	// and `resolveFilterValue` returns an unresolvable token VERBATIM — so the
	// literal string "@workspace.selectedClient" went to OpenRegister as a
	// property filter and the table came back empty with no error.
	describe('filter-prop token context', () => {
		it('resolves @workspace.<key> from the injected workspace bag', async () => {
			mountPage(
				{ filter: { client: '@workspace.selectedClient' } },
				undefined,
				{ cnWorkspaceContext: { selectedClient: 'acme' } },
			)
			await flush()
			expect(paramsOfCall(0).client).toBe('acme')
		})

		it('resolves @config.<key> from the injected app-config bag', async () => {
			mountPage(
				{ filter: { tenant: '@config.tenantId' } },
				undefined,
				{ cnAppConfig: { tenantId: 't-1' } },
			)
			await flush()
			expect(paramsOfCall(0).tenant).toBe('t-1')
		})

		// With no bag provided, the grammar's own rules apply — and they differ by
		// token form, which is the part worth pinning. A REQUIRED token passes
		// through verbatim on purpose, so a downstream consumer can fall back to a
		// literal default; only the OPTIONAL `?` form is dropped. Wiring the ctx
		// does not (and should not) change either.
		it('passes a required token through verbatim when the bag is absent', async () => {
			mountPage({ filter: { client: '@workspace.selectedClient' } })
			await flush()
			expect(paramsOfCall(0).client).toBe('@workspace.selectedClient')
		})

		it('drops an optional token entirely when the bag is absent', async () => {
			mountPage({ filter: { client: '@workspace.selectedClient?' } })
			await flush()
			expect('client' in paramsOfCall(0)).toBe(false)
		})

		// `fixedFilters` is a plain getter read at fetch time, so Vue does not
		// track the bag; without the signature watchers the token resolved once on
		// mount and the list never re-scoped.
		it('re-fetches when the workspace bag changes', async () => {
			const wrapper = mountPage(
				{ filter: { client: '@workspace.selectedClient' } },
				undefined,
				{ cnWorkspaceContext: { selectedClient: 'acme' } },
			)
			await flush()
			expect(mockStore.fetchCollection).toHaveBeenCalledTimes(1)
			await wrapper.vm.$options.watch.workspaceSignature.call(wrapper.vm)
			await flush()
			expect(mockStore.fetchCollection).toHaveBeenCalledTimes(2)
		})
	})

	it('lets CnDataTable derive columns from the loaded schema when none are configured', async () => {
		const wrapper = mountPage()
		await flush()
		expect(wrapper.vm.tableSchema).toEqual({ title: 'Job log', properties: { message: { type: 'string' } } })
		expect(wrapper.vm.resolvedColumns).toEqual([])
	})

	it('forwards fixedLayout to the table, defaulting to the auto layout', async () => {
		mockStore.collections['openconnector-job_log'] = [{ id: '1' }]
		const auto = mountPage()
		await flush()
		expect(auto.findComponent({ name: 'CnDataTable' }).props('fixedLayout')).toBe(false)

		const fixed = mountPage({ fixedLayout: true })
		await flush()
		expect(fixed.findComponent({ name: 'CnDataTable' }).props('fixedLayout')).toBe(true)
	})

	it('a configured `columns` list still wins over the schema', async () => {
		const wrapper = mountPage({ columns: [{ key: 'message', label: 'Message' }] })
		await flush()
		expect(wrapper.vm.resolvedColumns).toEqual([{ key: 'message', label: 'Message' }])
	})

	it('falls back to the legacy default columns when the schema fails to load', async () => {
		mockStore.fetchSchema.mockResolvedValueOnce(null)
		const wrapper = mountPage()
		await flush()
		expect(wrapper.vm.resolvedColumns.map((c) => c.key))
			.toEqual(['timestamp', 'actor', 'action', 'target', 'details'])
	})

	it('a partial `store` prop falls back to the legacy unfiltered fetch rather than throwing', async () => {
		const partial = {
			collections: { 'openconnector-job_log': [{ id: '1' }] },
			registerObjectType: jest.fn(),
			fetchCollection: jest.fn().mockResolvedValue([]),
		}
		const wrapper = mountPage({ store: partial })
		await flush()
		expect(partial.fetchCollection).toHaveBeenCalledWith('openconnector-job_log')
		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
		expect(wrapper.vm.rows).toEqual([{ id: '1' }])
	})
})
