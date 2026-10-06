// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * CnIndexPage in self-fetch mode when a fetch fails. The object store keeps
 * the previous rows and pagination on a failed fetch (an HTTP 400 for a search
 * term the server rejects, say), so the page must show an error state rather
 * than results and a count for an earlier query, and drop it again on the next
 * successful fetch. Only the latest request decides. Host-controlled mode is
 * untouched.
 */

const { reactive } = require('vue')

const TYPE = 'woo-publication'

// What the "server" does for each call: receives the call's `options.outcome`
// sink and returns the rows, writing the store the way the real one does.
const mockServer = jest.fn()

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it. Reactive,
// like the real Pinia store, so the page re-renders on its writes. Like the
// real `fetchCollection`, a call clears `errors[type]` when it STARTS and a
// success leaves `errors[type]` alone.
const mockStore = reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn((type, params, options = {}) => {
		mockStore.errors = { ...mockStore.errors, [type]: null }
		return mockServer(options.outcome)
	}),
	fetchSchema: jest.fn(),
	getSchema: jest.fn(() => ({ title: 'Publication', properties: {} })),
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
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const ROWS = [{ id: '1', title: 'Besluit (2025)' }, { id: '2', title: 'Verzoek 2026' }]

/**
 * A success as the real `fetchCollection` records it: rows and pagination
 * written, `errors[type]` untouched.
 *
 * @param {Array<object>} rows The rows the server returned.
 * @param {object} [outcome] The call's `options.outcome` sink.
 * @return {Array<object>} The rows.
 */
function succeed(rows, outcome) {
	mockStore.collections = { ...mockStore.collections, [TYPE]: rows }
	mockStore.pagination = { ...mockStore.pagination, [TYPE]: { total: rows.length, page: 1, pages: 1, limit: 20 } }
	if (outcome) {
		outcome.error = null
	}
	return rows
}

/**
 * A failure as the real `fetchCollection` records it: an error on the store,
 * an empty return, and the previous rows and pagination left in place.
 *
 * @param {object} [outcome] The call's `options.outcome` sink.
 * @return {Array} An empty array.
 */
function fail(outcome) {
	const failure = { status: 400, message: 'Invalid search query' }
	mockStore.errors = { ...mockStore.errors, [TYPE]: failure }
	if (outcome) {
		outcome.error = failure
	}
	return []
}

/**
 * Settle pending promises and re-renders.
 *
 * @return {Promise<void>}
 */
function flush() {
	return new Promise((resolve) => setTimeout(resolve))
}

/**
 * @param {object} [props] Extra CnIndexPage props.
 * @return {object} The mounted wrapper.
 */
function mountPage(props = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Publications', register: 'woo', schema: 'publication', ...props },
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn() } },
	})
}

/**
 * @param {object} wrapper The page wrapper.
 * @return {boolean} Whether the fetch-error state is rendered.
 */
function hasErrorState(wrapper) {
	return wrapper.find('[data-testid="cn-index-page-fetch-error"]').exists()
}

/**
 * A server response the test settles by hand.
 *
 * @param {(outcome: object) => Array} respond `succeed` or `fail`, bound to rows as needed.
 * @return {{settle: Function}} Call `settle()` to deliver the response.
 */
function heldResponse(respond) {
	const held = {}
	mockServer.mockImplementationOnce((outcome) => new Promise((resolve) => {
		held.settle = () => resolve(respond(outcome))
	}))
	return held
}

beforeEach(() => {
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
	mockStore.facets = {}
	mockStore.errors = {}
	mockStore.registerObjectType.mockReset()
	mockStore.fetchSchema.mockReset().mockResolvedValue({ title: 'Publication', properties: {} })
	mockStore.fetchCollection.mockClear()
	mockServer.mockReset().mockImplementation(async (outcome) => succeed(ROWS, outcome))
})

describe('CnIndexPage — failed self-fetch', () => {
	it('shows the error state instead of the previous rows and counter', async () => {
		const wrapper = mountPage()
		await flush()
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toHaveLength(2)
		expect(wrapper.findComponent({ name: 'CnActionsBar' }).props('pagination').total).toBe(2)

		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		await wrapper.vm.list.refresh(1)
		await flush()

		expect(hasErrorState(wrapper)).toBe(true)
		expect(wrapper.find('[data-testid="cn-index-page-fetch-error"]').attributes('role')).toBe('status')
		expect(wrapper.findComponent({ name: 'CnDataTable' }).exists()).toBe(false)
		expect(wrapper.vm.effectiveObjects).toEqual([])
		const pagination = wrapper.findComponent({ name: 'CnActionsBar' }).props('pagination')
		expect(pagination.total).toBe(0)
		expect(pagination.pages).toBe(1)
		// The server's own message is not shown to the user.
		expect(wrapper.text()).not.toContain('Invalid search query')
	})

	it('clears the error state on the next successful fetch', async () => {
		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		const wrapper = mountPage()
		await flush()
		expect(hasErrorState(wrapper)).toBe(true)

		await wrapper.vm.list.refresh(1)
		await flush()

		expect(hasErrorState(wrapper)).toBe(false)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toHaveLength(2)
		expect(wrapper.findComponent({ name: 'CnActionsBar' }).props('pagination').total).toBe(2)
	})

	it('shows the loader, not the error state, while a refetch after a failure is loading', async () => {
		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		const wrapper = mountPage()
		await flush()
		expect(hasErrorState(wrapper)).toBe(true)

		let finish
		mockServer.mockImplementationOnce((outcome) => {
			mockStore.loading = { ...mockStore.loading, [TYPE]: true }
			return new Promise((resolve) => {
				finish = () => {
					mockStore.loading = { ...mockStore.loading, [TYPE]: false }
					resolve(succeed(ROWS, outcome))
				}
			})
		})
		const pending = wrapper.vm.list.refresh(1)
		await flush()
		expect(wrapper.find('.cn-index-page__loading').exists()).toBe(true)
		expect(hasErrorState(wrapper)).toBe(false)

		finish()
		await pending
		await flush()
		expect(wrapper.find('.cn-index-page__loading').exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toHaveLength(2)
	})

	it('lets only the latest request decide when responses settle out of order', async () => {
		const wrapper = mountPage()
		await flush()

		// An older request that fails after a newer one has succeeded.
		let older = heldResponse(fail)
		let newer = heldResponse((outcome) => succeed(ROWS, outcome))
		let pOlder = wrapper.vm.list.refresh(1)
		let pNewer = wrapper.vm.list.refresh(1)
		newer.settle()
		await pNewer
		older.settle()
		await pOlder
		await flush()
		expect(hasErrorState(wrapper)).toBe(false)

		// An older request that fails after a newer one started but before it
		// succeeded: the store's shared error is left set, the newer one won.
		older = heldResponse(fail)
		newer = heldResponse((outcome) => succeed(ROWS, outcome))
		pOlder = wrapper.vm.list.refresh(1)
		pNewer = wrapper.vm.list.refresh(1)
		older.settle()
		await pOlder
		newer.settle()
		await pNewer
		await flush()
		expect(mockStore.errors[TYPE]).not.toBeNull()
		expect(hasErrorState(wrapper)).toBe(false)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toHaveLength(2)

		// An older request that succeeds after a newer one has failed.
		older = heldResponse((outcome) => succeed(ROWS, outcome))
		newer = heldResponse(fail)
		pOlder = wrapper.vm.list.refresh(1)
		pNewer = wrapper.vm.list.refresh(1)
		newer.settle()
		await pNewer
		older.settle()
		await pOlder
		await flush()
		expect(hasErrorState(wrapper)).toBe(true)
		expect(wrapper.vm.effectiveObjects).toEqual([])
	})

	it('points at the search when a search term is set, and at trying later when none is', async () => {
		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		const wrapper = mountPage()
		await flush()
		const description = () => wrapper.find('[data-testid="cn-index-page-fetch-error"]')
			.findComponent({ name: 'NcEmptyContent' }).attributes('description')
		expect(description()).toBe('Try again later.')

		wrapper.vm.list.searchTerm.value = 'verzoek (2026'
		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		await wrapper.vm.list.refresh(1)
		await flush()
		expect(description()).toBe('Change the search or try again.')
	})

	it('clears the error state when a live-update refetch succeeds, and keeps it when one fails', async () => {
		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		const wrapper = mountPage()
		await flush()
		expect(hasErrorState(wrapper)).toBe(true)

		// The live-updates plugin calls the store directly, outside refresh().
		mockServer.mockImplementationOnce(async (outcome) => fail(outcome))
		await mockStore.fetchCollection(TYPE, {})
		await flush()
		expect(hasErrorState(wrapper)).toBe(true)

		await mockStore.fetchCollection(TYPE, {})
		await flush()
		expect(hasErrorState(wrapper)).toBe(false)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toHaveLength(2)
	})

	it('leaves host-controlled mode unaffected', async () => {
		mockStore.errors = { [TYPE]: { status: 400, message: 'Invalid search query' } }
		const wrapper = mountPage({ objects: ROWS, pagination: { total: 2, page: 1, pages: 1, limit: 20 } })
		await flush()

		expect(mockStore.fetchCollection).not.toHaveBeenCalled()
		expect(hasErrorState(wrapper)).toBe(false)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toHaveLength(2)
		expect(wrapper.findComponent({ name: 'CnActionsBar' }).props('pagination').total).toBe(2)
	})
})
