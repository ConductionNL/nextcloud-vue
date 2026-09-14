/**
 * The index sidebar must be fed the LIVE facet buckets, not the manifest's
 * sidebar config.
 *
 * `resolvedSidebar` is the `sidebar` prop, which a manifest-driven host fills
 * from `pages[].config.sidebar`. Its documented `facets` key carries "live
 * facet data" — the shape CnIndexSidebar's `facetData` prop consumes — so it is
 * a data channel a consumer-managed page fills, not a declaration of which
 * facets exist (that comes from the schema, via `filtersFromSchema`).
 *
 * In self-fetch mode nobody fills it: the page fetches the collection itself
 * and OpenRegister returns the buckets alongside the rows, where they land in
 * the store. Handing the sidebar `resolvedSidebar.facets` there means handing
 * it the manifest config, so every facet renders "No results" while the
 * response body carries the buckets. `folderSidebarFacetValues` already reads
 * the store first; these two sites did not.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Case', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Case', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const CnIndexSidebarStub = {
	name: 'CnIndexSidebar',
	template: '<div class="cn-index-sidebar-stub" />',
	props: ['open', 'schema', 'title', 'icon', 'searchValue', 'visibleColumns', 'activeFilters', 'columnGroups', 'facetData', 'showMetadata'],
}

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: CnIndexSidebarStub,
	CnPageHeader: true,
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

// What OpenRegister answered for this query: the complete bucket set for every
// facetable property, computed with the pagination parameters removed.
const liveFacets = {
	assignedGroup: {
		values: [
			{ value: 'team-permits', count: 12, label: 'Team Permits' },
			{ value: 'team-objections', count: 4, label: 'Team Objections' },
		],
	},
	status: {
		values: [{ value: 'open', count: 9, label: 'Open' }],
	},
}

/**
 * Mount a self-fetch index page with an embedded sidebar.
 *
 * @param {object} extra Extra props merged over the defaults.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			register: 'dossiq',
			schema: 'zaak',
			sidebar: { enabled: true },
			...extra,
		},
		stubs,
		mocks: { $route: { params: {} }, $router: { push: jest.fn() } },
	})
}

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
	mockStore.facets = {}
})

describe('CnIndexPage feeds the index sidebar live facets', () => {
	it('hands the embedded sidebar the store facets in self-fetch mode', async () => {
		mockStore.facets = { 'dossiq-zaak': liveFacets }
		const wrapper = mountPage()
		await new Promise((resolve) => setTimeout(resolve))

		const sidebar = wrapper.findComponent({ name: 'CnIndexSidebar' })
		expect(sidebar.exists()).toBe(true)
		expect(sidebar.props('facetData')).toEqual(liveFacets)
	})

	it('hands the hoisted sidebar props the store facets too', async () => {
		mockStore.facets = { 'dossiq-zaak': liveFacets }
		const wrapper = mountPage()
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.hoistedSidebarProps.facetData).toEqual(liveFacets)
	})

	it('does not leak another collection\'s facets', async () => {
		mockStore.facets = { 'dossiq-zaaktype': liveFacets }
		const wrapper = mountPage()
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.hoistedSidebarProps.facetData).toEqual({})
	})

	it('consumer-managed mode keeps the `sidebar.facets` prop as the channel', async () => {
		// An `objects` prop means the consumer fetches, so the store holds
		// nothing for this page and the prop is the only source there is.
		mockStore.facets = { 'dossiq-zaak': { status: { values: [{ value: 'stale', count: 1 }] } } }
		const wrapper = mountPage({
			objects: [{ id: 'a', title: 'Alpha' }],
			sidebar: { enabled: true, facets: liveFacets },
		})
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.hoistedSidebarProps.facetData).toEqual(liveFacets)
	})

	it('consumer-managed mode with no facets passed shows none', async () => {
		const wrapper = mountPage({
			objects: [{ id: 'a', title: 'Alpha' }],
			sidebar: { enabled: true },
		})
		await new Promise((resolve) => setTimeout(resolve))

		expect(wrapper.vm.hoistedSidebarProps.facetData).toEqual({})
	})
})
