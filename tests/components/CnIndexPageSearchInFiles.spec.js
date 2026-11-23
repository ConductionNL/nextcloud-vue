const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `searchInFiles` on CnIndexPage: the switch, the `_content_search` key, the
 * `contentSearch=1` route state, and the "Found in {file}" line.
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
	getSchema: jest.fn(() => ({ title: 'Permit', properties: {} })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const { resolveQueryFilters } = require('../../src/utils/routeFilters.js')

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: { template: '<div><slot name="after-search" /></div>' },
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountPage(props = {}, route = { query: {}, params: {} }) {
	return mount(CnIndexPage, {
		propsData: { register: 'zaken', schema: 'permit', ...props },
		stubs,
		mocks: { $route: route, $router: { replace: jest.fn(() => Promise.resolve()) } },
	})
}

const lastParams = () => mockStore.fetchCollection.mock.calls.at(-1)[1] || {}

describe('searchInFiles', () => {
	beforeEach(() => mockStore.fetchCollection.mockClear())

	it('declares the prop off by default', () => {
		expect(CnIndexPage.props.searchInFiles.default).toBe(false)
		expect(CnIndexPage.props.searchInFiles.type).toBe(Boolean)
	})

	it('keeps contentSearch out of the record filters', () => {
		expect(resolveQueryFilters({ contentSearch: '1', status: 'open', _search: 'x' })).toEqual({ status: 'open' })
	})

	it('renders no switch and sends no key without the prop', async () => {
		const w = mountPage()
		await flush()
		w.vm.list.searchTerm.value = 'asbest'
		await w.vm.list.refresh(1)
		expect(w.find('[data-testid="cn-index-content-search"]').exists()).toBe(false)
		expect(lastParams()._content_search).toBeUndefined()
	})

	it('sends _content_search=true only with the switch on AND a term', async () => {
		const w = mountPage({ searchInFiles: true })
		await flush()
		expect(w.find('[data-testid="cn-index-content-search"]').exists()).toBe(true)
		w.vm.onContentSearchToggle(true)
		await flush()
		expect(lastParams()._content_search).toBeUndefined()
		expect(w.find('[data-testid="cn-index-content-search-note"]').text()).toContain('limited to the best 50')
		w.vm.list.searchTerm.value = 'asbest'
		await w.vm.list.refresh(1)
		expect(lastParams()._content_search).toBe('true')
		expect(lastParams()._search).toBe('asbest')
		w.vm.onContentSearchToggle(false)
		await flush()
		expect(lastParams()._content_search).toBeUndefined()
	})

	it('writes contentSearch=1 to the route and restores it from there', async () => {
		const w = mountPage({ searchInFiles: true })
		await flush()
		w.vm.onContentSearchToggle(true)
		const replaced = w.vm.$router.replace.mock.calls.at(-1)[0]
		expect(replaced.query.contentSearch).toBe('1')

		const restored = mountPage({ searchInFiles: true }, { query: { contentSearch: '1', _search: 'asbest' }, params: {} })
		await flush()
		expect(restored.vm.contentSearch).toBe(true)
		expect(lastParams()._content_search).toBe('true')
	})
})

describe('CnDataTable matched file line', () => {
	const columns = [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }]
	const mountTable = (rows) => mount(CnDataTable, { propsData: { columns, rows } })

	it('names the file under the title of a row found through it', () => {
		const w = mountTable([{ id: 1, title: 'Permit', status: 'open', '@self': { matchedFile: 'Inspectierapport.pdf' } }])
		expect(w.find('[data-testid="cn-row-matched-file"]').text()).toBe('Found in Inspectierapport.pdf')
	})

	it('renders no line for a field match', () => {
		const w = mountTable([{ id: 1, title: 'Permit', status: 'open', '@self': {} }, { id: 2, title: 'B', status: 'open' }])
		expect(w.find('[data-testid="cn-row-matched-file"]').exists()).toBe(false)
	})
})
