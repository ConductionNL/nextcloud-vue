/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A map of OpenRegister objects narrowed to an area, and a clicked object
 * opening its detail page in a new tab.
 *
 * @spec openspec/changes/map-spatial-filter-and-detail-link/specs/map-spatial-filter-and-detail-link/spec.md#requirement-a-map-can-narrow-its-objects-to-an-area
 * @spec openspec/changes/map-spatial-filter-and-detail-link/specs/map-spatial-filter-and-detail-link/spec.md#requirement-a-clicked-object-opens-its-detail-page
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'
import { featureDetailUrl, spatialFilterRequest } from '@/components/CnMapWidget/spatialFilter.js'

var mockGet = jest.fn()
var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url, params) => '/index.php' + url.replace(/\{(\w+)\}/g, (_m, k) => (params || {})[k]) }))

jest.mock('leaflet', () => {
	const makeLayerStub = () => ({
		addTo: jest.fn(function(map) {
			map._added.push(this)
			return this
		}),
		addLayer: jest.fn(),
		on: jest.fn(),
		bindPopup: jest.fn(),
		bindTooltip: jest.fn(),
		getBounds: jest.fn(() => ({ isValid: () => true })),
		clearLayers: jest.fn(),
	})
	const L = {
		map: jest.fn(() => ({
			_added: [],
			on: jest.fn(),
			off: jest.fn(),
			removeLayer: jest.fn(),
			invalidateSize: jest.fn(),
			getZoom: jest.fn(() => 7),
			fitBounds: jest.fn(),
			locate: jest.fn(),
			removeControl: jest.fn(),
			remove: jest.fn(),
		})),
		tileLayer: Object.assign(jest.fn(() => makeLayerStub()), { wms: jest.fn(() => makeLayerStub()) }),
		geoJSON: jest.fn(() => makeLayerStub()),
		marker: jest.fn(() => makeLayerStub()),
		circleMarker: jest.fn(() => makeLayerStub()),
		icon: jest.fn((opts) => ({ ...opts })),
	}
	L.Control = class {
		constructor(opts) {
			this.options = opts || {}
		}

		addTo(map) {
			this._container = this.onAdd(map)
			return this
		}
	}
	L.Control.extend = (proto) => class extends L.Control {
		constructor(opts) {
			super(opts)
			Object.assign(this, proto)
		}
	}
	L.DomUtil = {
		create: (tag, className, parent) => {
			const el = globalThis.document.createElement(tag)
			if (className) {
				el.className = className
			}
			if (parent) {
				parent.appendChild(el)
			}
			return el
		},
	}
	L.DomEvent = {
		stop: jest.fn(),
		on: jest.fn(function() {
			return this
		}),
		disableClickPropagation: jest.fn(),
		disableScrollPropagation: jest.fn(),
	}
	return { __esModule: true, default: L, ...L }
})

jest.mock('leaflet.markercluster', () => ({}), { virtual: true })

async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const leaflet = () => require('leaflet').default

const POLYGON = { type: 'Polygon', coordinates: [[[5, 52], [5.2, 52], [5.2, 52.2], [5, 52]]] }

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	jest.clearAllMocks()
})

describe('spatialFilterRequest', () => {
	it('turns a bbox into OpenRegister\'s geo.bbox, west south east north', () => {
		expect(spatialFilterRequest({ bbox: [5.1, 52.05, 5.15, 52.1] })).toEqual({ params: { 'geo.bbox': '5.1,52.05,5.15,52.1' } })
	})

	it('turns a radius around a point into geo.near and geo.radius, with the drawn property', () => {
		expect(spatialFilterRequest({ near: [5.12, 52.09], radius: 500 }, 'location')).toEqual({
			params: { 'geo.near': '5.12,52.09', 'geo.radius': '500', 'geo.property': 'location' },
		})
	})

	it('turns a polygon into a geo-search body', () => {
		expect(spatialFilterRequest({ within: POLYGON }, 'grenzen')).toEqual({ body: { geometry: { within: POLYGON }, property: 'grenzen' } })
	})

	it('sends nothing for a filter it cannot read, rather than emptying the map', () => {
		expect(spatialFilterRequest(null)).toBeNull()
		expect(spatialFilterRequest({ bbox: [1, 2, 3] })).toBeNull()
		expect(spatialFilterRequest({ near: [5, 52] })).toBeNull()
		expect(spatialFilterRequest({ near: [5, 52], radius: 0 })).toBeNull()
		expect(spatialFilterRequest({ within: { type: 'Point', coordinates: [5, 52] } })).toBeNull()
	})
})

describe('featureDetailUrl', () => {
	const feature = { properties: { '@self': { id: 'u 1', register: 3, schema: 7 }, slug: 'a/b' } }

	it('fills the template from the object, encoded, with the webroot', () => {
		expect(featureDetailUrl(feature, '/apps/dossiq/#/cases/{id}?s={schema}&n={slug}')).toBe('/index.php/apps/dossiq/#/cases/u%201?s=7&n=a%2Fb')
	})

	it('opens the url the object carries when there is no template', () => {
		expect(featureDetailUrl({ properties: { url: 'https://cloud.example.nl/apps/x/1' } })).toBe('https://cloud.example.nl/apps/x/1')
	})

	it('opens nothing for a token the object cannot fill, an unsafe address, or no address', () => {
		expect(featureDetailUrl(feature, '/apps/x/{missing}')).toBeNull()
		expect(featureDetailUrl({ properties: { url: 'javascript:alert(1)' } })).toBeNull()
		expect(featureDetailUrl({ properties: {} })).toBeNull()
		expect(featureDetailUrl(null, '/apps/x/{id}')).toBeNull()
	})
})

describe('CnMapWidget — an area and a detail link', () => {
	it('asks OpenRegister for the objects in the bbox only', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const w = mount(CnMapWidget, { props: { markers: { dataSource: { register: 'r', schema: 's', spatialFilter: { bbox: [5, 52, 6, 53] } } } } })
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/r/s', { params: { _limit: 500, 'geo.bbox': '5,52,6,53' } })
		w.unmount()
	})

	it('posts a polygon to the geo-search endpoint', async () => {
		mockPost.mockResolvedValue({ data: { results: [] } })
		const w = mount(CnMapWidget, { props: { markers: { geoProperty: 'grenzen', dataSource: { register: 'r', schema: 's', spatialFilter: { within: POLYGON } } } } })
		await flush()
		expect(mockGet).not.toHaveBeenCalled()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/r/s/geo-search', { geometry: { within: POLYGON }, property: 'grenzen' }, { params: { _limit: 500 } })
		w.unmount()
	})

	it('reads the objects again when the area changes', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const w = mount(CnMapWidget, { props: { markers: { dataSource: { register: 'r', schema: 's', spatialFilter: { bbox: [5, 52, 6, 53] } } } } })
		await flush()
		const calls = mockGet.mock.calls.length
		await w.setProps({ markers: { dataSource: { register: 'r', schema: 's', spatialFilter: { near: [5.1, 52.1], radius: 250 } } } })
		await flush()
		expect(mockGet.mock.calls.length).toBeGreaterThan(calls)
		expect(mockGet.mock.calls.at(-1)[1].params).toMatchObject({ 'geo.near': '5.1,52.1', 'geo.radius': '250' })
		w.unmount()
	})

	it('opens a clicked object\'s detail page in a new tab, and still emits marker-click', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ '@self': { id: 'abc' }, latitude: 52.1, longitude: 5.1 }] } })
		const open = jest.spyOn(window, 'open').mockImplementation(() => null)
		const w = mount(CnMapWidget, { props: { markers: { latField: 'latitude', lngField: 'longitude', detailLink: '/apps/x/{id}', dataSource: { register: 'r', schema: 's' } } } })
		await flush()
		const options = leaflet().geoJSON.mock.calls.at(-1)[1]
		const layer = { bindPopup: jest.fn(), bindTooltip: jest.fn(), on: jest.fn() }
		const feature = leaflet().geoJSON.mock.calls.at(-1)[0].features[0]
		options.onEachFeature(feature, layer)
		const click = layer.on.mock.calls.find(([name]) => name === 'click')[1]
		click({ latlng: { lat: 52.1, lng: 5.1 } })
		expect(open).toHaveBeenCalledWith('/index.php/apps/x/abc', '_blank', 'noopener,noreferrer')
		expect(w.emitted('marker-click')).toHaveLength(1)
		open.mockRestore()
		w.unmount()
	})

	it('opens nothing for a click when the object has no address', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ latitude: 52.1, longitude: 5.1 }] } })
		const open = jest.spyOn(window, 'open').mockImplementation(() => null)
		const w = mount(CnMapWidget, { props: { markers: { latField: 'latitude', lngField: 'longitude', dataSource: { register: 'r', schema: 's' } } } })
		await flush()
		const options = leaflet().geoJSON.mock.calls.at(-1)[1]
		const layer = { bindPopup: jest.fn(), bindTooltip: jest.fn(), on: jest.fn() }
		options.onEachFeature(leaflet().geoJSON.mock.calls.at(-1)[0].features[0], layer)
		layer.on.mock.calls.find(([name]) => name === 'click')[1]({ latlng: { lat: 52.1, lng: 5.1 } })
		expect(open).not.toHaveBeenCalled()
		open.mockRestore()
		w.unmount()
	})
})
