/**
 * Tests for the opt-in `map` view mode on CnIndexPage (change:
 * cnindexpage-map-viewmode).
 *
 * Covers: the map render branch replaces table/cards; the map segment is
 * gated on opt-in; markers are built from the current filtered rows using
 * `mapConfig` (no dataSource.url); rows without geometry are skipped; and a
 * marker click emits the same `@row-click` payload as a table row-click.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory can reference the var.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	objects: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Item', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Item', properties: {} })),
	saveObject: jest.fn().mockResolvedValue({ id: '1' }),
	deleteObject: jest.fn().mockResolvedValue(true),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
	getPagination: jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 })),
	setSearchTerm: jest.fn(),
	getSearchTerm: jest.fn(() => ''),
	getFacets: jest.fn(() => ({})),
	_options: { baseUrl: '/apps/openregister/api/objects' },
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { toRaw } = require('vue')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnMapWidget: true,
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
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const ROWS = [
	{ id: 'a', title: 'Alpha', lat: 52.09, lng: 5.12 },
	{ id: 'b', title: 'Bravo', lat: 51.44, lng: 5.47 },
]

const MAP_CONFIG = { latField: 'lat', lngField: 'lng', popupField: 'title' }

/**
 * Mount helper for the map-view tests.
 *
 * @param {object} propsData Component props (merged over the manual-mode defaults).
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Items', objects: ROWS, ...propsData },
		stubs,
		mocks: {
			$route: { params: {}, query: {}, name: 'items' },
			$router: { push: jest.fn(), replace: jest.fn() },
		},
	})
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe('CnIndexPage map view mode', () => {
	it('renders CnMapWidget and NOT the table/cards when viewMode="map"', () => {
		const wrapper = mountPage({ viewMode: 'map', mapConfig: MAP_CONFIG })
		expect(wrapper.findComponent({ name: 'CnMapWidget' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'CnCardGrid' }).exists()).toBe(false)
		wrapper.unmount()
	})

	it('does not offer the map segment when the page has not opted in', () => {
		const wrapper = mountPage({ viewMode: 'table' })
		expect(wrapper.vm.showMapSegment).toBe(false)
		wrapper.unmount()
	})

	it('offers the map segment when mapConfig is non-empty', () => {
		const wrapper = mountPage({ viewMode: 'table', mapConfig: MAP_CONFIG })
		expect(wrapper.vm.showMapSegment).toBe(true)
		wrapper.unmount()
	})

	it('respects an explicit viewModes whitelist that excludes map even with mapConfig', () => {
		const wrapper = mountPage({ mapConfig: MAP_CONFIG, viewModes: ['table', 'cards'] })
		expect(wrapper.vm.showMapSegment).toBe(false)
		wrapper.unmount()
	})

	it('builds one inline marker per resolvable row and never passes a dataSource.url', () => {
		const wrapper = mountPage({ viewMode: 'map', mapConfig: MAP_CONFIG })
		const markers = wrapper.vm.mapMarkers
		expect(markers.features).toHaveLength(2)
		// GeoJSON is [lng, lat].
		expect(markers.features[0].geometry.coordinates).toEqual([5.12, 52.09])
		// rowKey is stashed on the feature for click-parity.
		expect(markers.features[0].properties.id).toBe('a')
		expect(markers.dataSource).toBeUndefined()
		wrapper.unmount()
	})

	it('narrows the plotted markers when the displayed set narrows', async () => {
		const wrapper = mountPage({ viewMode: 'map', mapConfig: MAP_CONFIG })
		expect(wrapper.vm.mapMarkers.features).toHaveLength(2)
		await wrapper.setProps({ objects: [ROWS[0]] })
		expect(wrapper.vm.mapMarkers.features).toHaveLength(1)
		wrapper.unmount()
	})

	it('skips rows without finite geometry without throwing', () => {
		const rows = [
			{ id: 'a', title: 'Alpha', lat: 52.09, lng: 5.12 },
			{ id: 'x', title: 'NoGeo' },
			{ id: 'y', title: 'BadGeo', lat: 'nope', lng: null },
		]
		const wrapper = mountPage({ viewMode: 'map', objects: rows, mapConfig: MAP_CONFIG })
		expect(() => wrapper.vm.mapMarkers).not.toThrow()
		expect(wrapper.vm.mapMarkers.features).toHaveLength(1)
		expect(wrapper.vm.mapMarkers.features[0].properties.id).toBe('a')
		wrapper.unmount()
	})

	it('resolves a GeoJSON Point geoField (dotted @self path) over lat/lngField', () => {
		const rows = [{ id: 'a', '@self': { geo: { type: 'Point', coordinates: [4.9, 52.3] } } }]
		const wrapper = mountPage({
			viewMode: 'map',
			objects: rows,
			mapConfig: { geoField: '@self.geo' },
		})
		expect(wrapper.vm.mapMarkers.features).toHaveLength(1)
		expect(wrapper.vm.mapMarkers.features[0].geometry.coordinates).toEqual([4.9, 52.3])
		wrapper.unmount()
	})

	it('parses a JSON-encoded string geoField (OpenRegister metadata shape)', () => {
		const rows = [{ id: 'a', geometry: '{"type":"Point","coordinates":[5.29,52.13]}' }]
		const wrapper = mountPage({ viewMode: 'map', objects: rows, mapConfig: { geoField: 'geometry' } })
		expect(wrapper.vm.mapMarkers.features).toHaveLength(1)
		expect(wrapper.vm.mapMarkers.features[0].geometry.coordinates).toEqual([5.29, 52.13])
		wrapper.unmount()
	})

	it('skips an unparseable string geoField without throwing', () => {
		const rows = [{ id: 'a', geometry: 'not json' }]
		const wrapper = mountPage({ viewMode: 'map', objects: rows, mapConfig: { geoField: 'geometry' } })
		expect(() => wrapper.vm.mapMarkers).not.toThrow()
		expect(wrapper.vm.mapMarkers.features).toHaveLength(0)
		wrapper.unmount()
	})

	it('emits @row-click with the same payload for a marker click as a table row-click', () => {
		// selectable:false so a click navigates (emits row-click) rather than toggling selection.
		const wrapper = mountPage({ viewMode: 'map', mapConfig: MAP_CONFIG, selectable: false })
		// A direct row-click on ROWS[1].
		wrapper.vm.onRowClick(ROWS[1])
		const rowClickPayload = wrapper.emitted('row-click')[0][0]

		// A marker click resolved back through its feature's rowKey.
		const feature = wrapper.vm.mapMarkers.features[1]
		wrapper.vm.onMarkerClick({ feature })
		const markerClickPayload = wrapper.emitted('row-click')[1][0]

		// Compare the raw targets: `onRowClick` was called with the fixture row
		// directly, while the marker path resolves the row out of reactive
		// state and so emits a Proxy around it. `toBe` on the raws keeps the
		// point of the test — both entry points emit THE SAME row object, not
		// two equal-looking ones.
		expect(toRaw(markerClickPayload)).toBe(toRaw(rowClickPayload))
		expect(markerClickPayload.id).toBe('b')
		wrapper.unmount()
	})
})
