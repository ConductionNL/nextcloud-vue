const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Personal lenses and the star column on CnIndexPage.
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-3
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
	fetchSchema: jest.fn(),
	getSchema: jest.fn(() => ({ title: 'Ticket', properties: { title: { type: 'string' } } })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

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
	CnFavouriteToggle: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountPage(props = {}) {
	return mount(CnIndexPage, {
		propsData: { register: 'pipelinq', schema: 'ticket', ...props },
		stubs,
		mocks: { $route: { query: {}, params: {} }, $router: { replace: jest.fn(() => Promise.resolve()) } },
	})
}

const lastParams = () => mockStore.fetchCollection.mock.calls.at(-1)[1] || {}

describe('personalLenses', () => {
	beforeEach(() => mockStore.fetchCollection.mockClear())

	it('declares the props with defaults', () => {
		expect(CnIndexPage.props.personalLenses.default()).toEqual([])
		expect(CnIndexPage.props.showFavouriteColumn.default).toBe(false)
	})

	it('adds no tabs and no column without them', async () => {
		const w = mountPage()
		await flush()
		expect(w.vm.effectiveQuickFilters).toBeNull()
		expect(w.vm.renderedColumns.some((c) => c.key === '__favourite')).toBe(false)
	})

	it('appends the lenses after the own quick filters, in order', async () => {
		const own = [{ label: 'Open', filter: { status: 'open' }, default: true }]
		const w = mountPage({ quickFilters: own, personalLenses: ['favourite', 'recent', 'watching'] })
		await flush()
		expect(w.vm.effectiveQuickFilters.map((t) => t.label)).toEqual(['Open', 'Favourites', 'Recent', 'Following'])
	})

	it('puts All first when the page has no quick filters, so no lens is on at mount', async () => {
		const w = mountPage({ personalLenses: ['favourite'] })
		await flush()
		expect(w.vm.effectiveQuickFilters.map((t) => t.label)).toEqual(['All', 'Favourites'])
		expect(w.vm.activeQuickFilterIndex).toBe(0)
		expect(lastParams()._favourite).toBeUndefined()
	})

	it('combines a lens with the own filters in the list query', async () => {
		const w = mountPage({ filter: { status: 'open' }, personalLenses: ['favourite'] })
		await flush()
		w.vm.onQuickFilterChange(1)
		await flush()
		expect(lastParams()._favourite).toBe(true)
		expect(lastParams().status).toBe('open')
	})

	it('sends _recent and turns column sorting off while Recent is active', async () => {
		const w = mountPage({ personalLenses: ['recent'], columns: [{ key: 'title', label: 'Title', sortable: true }] })
		await flush()
		expect(w.vm.renderedColumns.find((c) => c.key === 'title').sortable).toBe(true)
		w.vm.onQuickFilterChange(1)
		await flush()
		expect(lastParams()._recent).toBe(true)
		expect(w.vm.recentLensActive).toBe(true)
		expect(w.vm.renderedColumns.find((c) => c.key === 'title').sortable).toBe(false)
	})

	it('sends _watching for the Following lens', async () => {
		const w = mountPage({ personalLenses: ['watching'] })
		await flush()
		w.vm.onQuickFilterChange(1)
		await flush()
		expect(lastParams()._watching).toBe(true)
	})
})

describe('the unread lens', () => {
	it('adds the Unread quick filter and sends _unread', async () => {
		mockStore.fetchCollection.mockClear()
		const w = mountPage({ personalLenses: ['unread'] })
		await flush()
		expect(w.vm.effectiveQuickFilters.map((t) => t.label)).toEqual(['All', 'Unread'])
		w.vm.onQuickFilterChange(1)
		await flush()
		expect(lastParams()._unread).toBe(true)
	})
})

describe('showFavouriteColumn', () => {
	it('adds a first, unsortable star column', async () => {
		const w = mountPage({ showFavouriteColumn: true, columns: [{ key: 'title', label: 'Title' }] })
		await flush()
		const cols = w.vm.renderedColumns
		expect(cols[0]).toMatchObject({ key: '__favourite', sortable: false })
		expect(cols[1].key).toBe('title')
	})
})
