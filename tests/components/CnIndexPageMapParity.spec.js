// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * The index map does what an app's own map page did: markers coloured by a
 * field, every matching row plotted, and a line saying how many it placed.
 *
 * @spec openspec/changes/index-map-parity/specs/index-page/spec.md
 */

const mockStore = require('vue').reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Zaak', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Zaak', properties: {} })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const mockFetchReferenceObjects = jest.fn()
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({
	...jest.requireActual('../../src/utils/boardReferenceColumns.js'),
	fetchReferenceObjects: (...args) => mockFetchReferenceObjects(...args),
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve))
const fetchCollection = mockStore.fetchCollection

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnKanbanView: true,
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

const point = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] })

/**
 * @param {object} propsData Props.
 * @return {object} The wrapper.
 */
function mountManual(propsData) {
	return mount(CnIndexPage, {
		propsData: { title: 'Zaken', viewMode: 'map', ...propsData },
		stubs,
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(() => Promise.resolve()) } },
	})
}

/**
 * @param {object} propsData Props.
 * @return {object} The wrapper.
 */
function mountSelf(propsData) {
	return mountManual({ register: 'dossiq', schema: 'case', viewModes: ['table', 'cards'], ...propsData })
}

/** @return {Array<number>} The `_limit` of every fetch so far. */
function limits() {
	return fetchCollection.mock.calls.map((call) => (call[1] || {})._limit)
}

beforeEach(() => {
	fetchCollection.mockClear()
	mockFetchReferenceObjects.mockReset()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage map — marker colour', () => {
	it('colours each marker by the field through colorMap', () => {
		const wrapper = mountManual({
			objects: [{ id: 'a', status: 'open', geometry: point(5, 52) }, { id: 'b', status: 'new', geometry: point(4, 51) }],
			mapConfig: { geoField: 'geometry', markerColor: { field: 'status', colorMap: { open: '#0b71ab' } } },
		})
		const [a, b] = wrapper.vm.mapMarkers.features
		expect(a.properties.markerColor).toBe('#0b71ab')
		expect(b.properties.markerColor).toBeUndefined()
		wrapper.unmount()
	})

	it('reads the colour off the row the field references', async () => {
		mockFetchReferenceObjects.mockResolvedValue([{ id: 'st-1', colour: 'green' }])
		const wrapper = mountManual({
			register: 'dossiq',
			objects: [{ id: 'a', status: 'st-1', geometry: point(5, 52) }],
			mapConfig: {
				geoField: 'geometry',
				markerColor: { field: 'status', source: { schema: 'statusType', colorField: 'colour' }, colorMap: { green: '#39870c' } },
			},
		})
		await flush()
		expect(mockFetchReferenceObjects).toHaveBeenCalledWith(expect.objectContaining({ register: 'dossiq', schema: 'statusType' }))
		expect(wrapper.vm.mapMarkers.features[0].properties.markerColor).toBe('#39870c')
		wrapper.unmount()
	})
})

describe('CnIndexPage map — the count line', () => {
	const rows = [
		{ id: 'a', geometry: point(5, 52) },
		{ id: 'b', geometry: point(4, 51) },
		{ id: 'c' },
	]

	it('says how many rows it placed of how many match', () => {
		const wrapper = mountManual({ objects: rows, mapConfig: { geoField: 'geometry', count: true } })
		expect(wrapper.find('[data-testid="cn-index-map-count-line"]').text()).toBe('Showing 2 of 3 located')
		wrapper.unmount()
	})

	it('takes the app template', () => {
		const wrapper = mountManual({ objects: rows, mapConfig: { geoField: 'geometry', count: 'Showing {located} of {total} located cases' } })
		expect(wrapper.vm.mapCountLine).toBe('Showing 2 of 3 located cases')
		wrapper.unmount()
	})

	it('draws nothing without the key, or outside the map', async () => {
		const wrapper = mountManual({ objects: rows, mapConfig: { geoField: 'geometry' } })
		expect(wrapper.find('[data-testid="cn-index-map-count"]').exists()).toBe(false)
		await wrapper.setProps({ mapConfig: { geoField: 'geometry', count: true } })
		wrapper.vm.onViewModeChange('table')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.mapCountLine).toBe('')
		wrapper.unmount()
	})
})

describe('CnIndexPage map — plot every matching row', () => {
	it('loads at the plotAll limit when it opens on the map', async () => {
		mountSelf({ mapConfig: { geoField: 'geometry', plotAll: 300 } })
		await flush()
		expect(limits()).toEqual([300])
	})

	it('raises the page size on the map and gives the table its own back', async () => {
		const wrapper = mountSelf({ viewMode: 'table', pagination: { limit: 25 }, mapConfig: { geoField: 'geometry', plotAll: true } })
		await flush()
		expect(limits()).toEqual([25])

		wrapper.vm.onViewModeChange('map')
		await flush()
		expect(limits()).toEqual([25, 500])

		wrapper.vm.onViewModeChange('table')
		await flush()
		expect(limits()).toEqual([25, 500, 25])
		wrapper.unmount()
	})

	it('keeps the page size without plotAll', async () => {
		const wrapper = mountSelf({ viewMode: 'table', pagination: { limit: 25 }, mapConfig: { geoField: 'geometry' } })
		await flush()
		wrapper.vm.onViewModeChange('map')
		await flush()
		expect(limits()).toEqual([25])
		wrapper.unmount()
	})

	it('says so when more rows match than the limit', async () => {
		const wrapper = mountSelf({ mapConfig: { geoField: 'geometry', plotAll: 2 } })
		await flush()
		const type = fetchCollection.mock.calls[0][0]
		mockStore.collections = { [type]: [{ id: 'a', geometry: point(5, 52) }, { id: 'b', geometry: point(4, 51) }] }
		mockStore.pagination = { [type]: { total: 5, page: 1, pages: 3, limit: 2 } }
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-index-map-cap"]').text()).toBe('The map shows the first 2 of 5. Narrow the filters to see the rest.')

		mockStore.pagination = { [type]: { total: 2, page: 1, pages: 1, limit: 2 } }
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-index-map-cap"]').exists()).toBe(false)
		wrapper.unmount()
	})
})
