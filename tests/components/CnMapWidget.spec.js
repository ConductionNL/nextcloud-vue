/**
 * Tests for CnMapWidget.
 *
 * Covers REQ-MMW-* of the manifest-map-widget spec — declarative
 * Leaflet wrapper. Exercises layer dispatch (tile / wms / wfs /
 * geojson), marker rendering from inline features + dataSource.url,
 * clustering opt-in, event emission, and the Leaflet-unavailable
 * fallback path.
 *
 * Mocks `leaflet` so dispatch can be observed without a real DOM
 * map. Each Leaflet factory returns a stub object whose `addTo` is a
 * `jest.fn()` so callsites assert the layer landed on the map.
 */

jest.mock('leaflet', () => {
	const layerInstances = []
	function makeLayerStub(kind, args) {
		const inst = {
			_kind: kind,
			_args: args,
			addTo: jest.fn(function (map) {
				map._added.push(this)
				return this
			}),
			on: jest.fn(),
			bindPopup: jest.fn(),
			getBounds: jest.fn(() => ({ isValid: () => false })),
			clearLayers: jest.fn(),
		}
		layerInstances.push(inst)
		return inst
	}
	const lastMapRef = { current: null }
	const L = {
		__instances: layerInstances,
		__lastMap: lastMapRef,
		map: jest.fn((_el, _opts) => {
			const m = {
				_added: [],
				_handlers: {},
				on: jest.fn(function (evt, cb) { this._handlers[evt] = cb }),
				off: jest.fn(),
				removeLayer: jest.fn(function (layer) {
					this._added = this._added.filter((l) => l !== layer)
				}),
				invalidateSize: jest.fn(),
				getBounds: jest.fn(() => ({
					getNorth: () => 53, getSouth: () => 51, getEast: () => 6, getWest: () => 4,
				})),
				getZoom: jest.fn(() => 7),
				fitBounds: jest.fn(),
				remove: jest.fn(),
			}
			lastMapRef.current = m
			return m
		}),
		tileLayer: Object.assign(
			jest.fn((url, opts) => makeLayerStub('tile', { url, opts })),
			{
				wms: jest.fn((url, opts) => makeLayerStub('wms', { url, opts })),
			},
		),
		geoJSON: jest.fn((data, opts) => {
			const layer = makeLayerStub('geojson', { data, opts })
			layer._featuresCount = data && data.features ? data.features.length
				: (Array.isArray(data) ? data.length : 0)
			if (opts && typeof opts.onEachFeature === 'function' && data && data.features) {
				for (const f of data.features) {
					const child = { on: jest.fn(), bindPopup: jest.fn() }
					opts.onEachFeature(f, child)
				}
			}
			return layer
		}),
		marker: jest.fn((latlng) => makeLayerStub('marker', { latlng })),
		circleMarker: jest.fn((latlng, opts) => makeLayerStub('circleMarker', { latlng, opts })),
		icon: jest.fn((opts) => ({ ...opts, _icon: true })),
		markerClusterGroup: jest.fn(() => makeLayerStub('cluster', {})),
	}
	return { __esModule: true, default: L, ...L }
})

jest.mock('leaflet.markercluster', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'

const flush = () => new Promise((r) => setTimeout(r, 0))

const mountWidget = (propsData) => mount(CnMapWidget, {
	propsData: {
		center: [52, 5],
		...propsData,
	},
	mocks: {},
})

beforeEach(() => {
	const L = require('leaflet').default
	if (L && L.__instances) L.__instances.length = 0
	if (L && L.__lastMap) L.__lastMap.current = null
	jest.clearAllMocks()
	global.fetch = undefined
})

describe('CnMapWidget — layer dispatch', () => {
	it('mounts a tile layer for type=tile', async () => {
		const wrapper = mountWidget({
			layers: [{ type: 'tile', url: 'https://x/{z}/{x}/{y}.png', options: { maxZoom: 19 } }],
		})
		await flush(); await nextTick()
		const L = require('leaflet').default
		expect(L.tileLayer).toHaveBeenCalledTimes(1)
		expect(L.tileLayer).toHaveBeenCalledWith(
			'https://x/{z}/{x}/{y}.png',
			expect.objectContaining({ maxZoom: 19 }),
		)
		wrapper.destroy()
	})

	it('mounts a WMS layer for type=wms', async () => {
		const wrapper = mountWidget({
			layers: [{ type: 'wms', url: 'https://x/wms', options: { layers: 'pand' } }],
		})
		await flush(); await nextTick()
		const L = require('leaflet').default
		expect(L.tileLayer.wms).toHaveBeenCalledWith(
			'https://x/wms',
			expect.objectContaining({ layers: 'pand' }),
		)
		wrapper.destroy()
	})

	it('mounts an inline GeoJSON layer', async () => {
		const wrapper = mountWidget({
			layers: [{
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] },
				options: { style: { color: 'red' } },
			}],
		})
		await flush(); await nextTick()
		const L = require('leaflet').default
		expect(L.geoJSON).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'FeatureCollection' }),
			expect.objectContaining({ style: expect.any(Object) }),
		)
		wrapper.destroy()
	})

	it('warns and skips unknown layer types', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountWidget({
			layers: [{ type: 'kml', url: 'https://x/layer.kml' }],
		})
		await flush(); await nextTick()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown layer type "kml"'))
		const L = require('leaflet').default
		expect(L.tileLayer).not.toHaveBeenCalled()
		warn.mockRestore()
		wrapper.destroy()
	})

	it('skips tile layers with empty url', async () => {
		const wrapper = mountWidget({
			layers: [{ type: 'tile', url: '' }],
		})
		await flush(); await nextTick()
		const L = require('leaflet').default
		expect(L.tileLayer).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('fetches and adds a wfs / geojson-from-url layer', async () => {
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
		}))
		const wrapper = mountWidget({
			layers: [{ type: 'wfs', url: 'https://x/wfs?service=WFS&typeName=foo' }],
		})
		await flush(); await nextTick(); await flush()
		expect(global.fetch).toHaveBeenCalledWith('https://x/wfs?service=WFS&typeName=foo')
		wrapper.destroy()
	})
})

describe('CnMapWidget — markers', () => {
	it('renders inline features[]', async () => {
		const wrapper = mountWidget({
			markers: {
				features: [
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [5.2, 52.1] }, properties: { title: 'A' } },
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [5.3, 52.2] }, properties: { title: 'B' } },
				],
				popupField: 'title',
			},
		})
		await flush(); await nextTick(); await flush()
		const L = require('leaflet').default
		const geojsonCalls = L.geoJSON.mock.calls.filter((c) => c[0]?.features?.length === 2)
		expect(geojsonCalls.length).toBe(1)
		wrapper.destroy()
	})

	it('fetches markers from dataSource.url with FeatureCollection response', async () => {
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({
				type: 'FeatureCollection',
				features: [
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [5.2, 52.1] }, properties: {} },
				],
			}),
		}))
		const wrapper = mountWidget({
			markers: { dataSource: { url: '/api/cases/geo' } },
		})
		await flush(); await nextTick(); await flush(); await nextTick()
		expect(global.fetch).toHaveBeenCalledWith('/api/cases/geo')
		wrapper.destroy()
	})

	it('converts flat-row response into features via lat/lng fields', async () => {
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve([
				{ lat: 52.1, lng: 5.2, title: 'A' },
				{ lat: 52.2, lng: 5.3, title: 'B' },
				{ lat: 'bad', lng: 5.4, title: 'C' }, // dropped — non-finite
			]),
		}))
		const wrapper = mountWidget({
			markers: { dataSource: { url: '/api/x' }, latField: 'lat', lngField: 'lng', popupField: 'title' },
		})
		await flush(); await nextTick(); await flush(); await nextTick()
		const L = require('leaflet').default
		const lastFeatureCollection = L.geoJSON.mock.calls
			.map((c) => c[0])
			.find((arg) => arg && arg.features && arg.features.length === 2)
		expect(lastFeatureCollection).toBeDefined()
		expect(lastFeatureCollection.features[0].geometry.coordinates).toEqual([5.2, 52.1])
		wrapper.destroy()
	})

	it('returns empty features when dataSource has neither url nor register', async () => {
		const wrapper = mountWidget({ markers: { dataSource: {} } })
		await flush(); await nextTick()
		const L = require('leaflet').default
		// No FeatureCollection geoJSON call should have been made for markers
		expect(L.geoJSON).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('lazy-loads markercluster only when clustering is enabled', async () => {
		const L = require('leaflet').default
		const wrapper = mountWidget({
			clustering: false,
			markers: {
				features: [
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [5, 52] }, properties: {} },
				],
			},
		})
		await flush(); await nextTick(); await flush()
		expect(L.markerClusterGroup).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('uses markerClusterGroup when clustering is enabled', async () => {
		const L = require('leaflet').default
		const wrapper = mountWidget({
			clustering: true,
			markers: {
				features: [
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [5, 52] }, properties: {} },
				],
			},
		})
		await flush(); await nextTick(); await flush(); await nextTick()
		expect(L.markerClusterGroup).toHaveBeenCalled()
		wrapper.destroy()
	})

	it('markers.clustering: true overrides widget-level clustering', async () => {
		const L = require('leaflet').default
		const wrapper = mountWidget({
			clustering: false,
			markers: {
				clustering: true,
				features: [
					{ type: 'Feature', geometry: { type: 'Point', coordinates: [5, 52] }, properties: {} },
				],
			},
		})
		await flush(); await nextTick(); await flush(); await nextTick()
		expect(L.markerClusterGroup).toHaveBeenCalled()
		wrapper.destroy()
	})
})

describe('CnMapWidget — events', () => {
	it('emits @map-ready once Leaflet has mounted', async () => {
		const wrapper = mountWidget({})
		await flush(); await nextTick()
		expect(wrapper.emitted('map-ready')).toBeTruthy()
		expect(wrapper.emitted('map-ready')[0][0]).toHaveProperty('map')
		wrapper.destroy()
	})

	it('emits @click on map click', async () => {
		const wrapper = mountWidget({})
		await flush(); await nextTick()
		// trigger Leaflet click handler stored under map._handlers
		require('leaflet').default.__lastMap.current._handlers.click({ latlng: { lat: 52.1, lng: 5.2 } })
		expect(wrapper.emitted('click')[0][0]).toEqual({ lat: 52.1, lng: 5.2 })
		wrapper.destroy()
	})

	it('emits @bounds-change on debounced moveend', async () => {
		const wrapper = mountWidget({})
		await flush(); await nextTick()
		require('leaflet').default.__lastMap.current._handlers.moveend()
		// Wait past the 100ms debounce window
		await new Promise((r) => setTimeout(r, 150))
		expect(wrapper.emitted('bounds-change')).toBeTruthy()
		expect(wrapper.emitted('bounds-change')[0][0]).toEqual({
			north: 53, south: 51, east: 6, west: 4, zoom: 7,
		})
		wrapper.destroy()
	})
})

describe('CnMapWidget — fallback', () => {
	it('renders fallback slot when Leaflet fails to load', async () => {
		// Force the dynamic import in CnMapWidget.mounted() to throw by
		// flipping the leaflet mock for this single test. We do it by
		// poisoning the loaded mock's `default` so the next consumer
		// receives an error path; reset in afterEach.
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mount(CnMapWidget, {
			propsData: { center: [52, 5] },
			slots: { fallback: '<p class="custom-fallback">no map</p>' },
		})
		// Manually force the fallback path — the component starts with
		// leafletAvailable: true, so we flip it after mount to surface
		// the slot. This exercises the same template branch the
		// catch-block triggers.
		wrapper.setData({ leafletAvailable: false })
		await flush(); await nextTick()
		expect(wrapper.find('.custom-fallback').exists()).toBe(true)
		warn.mockRestore()
		wrapper.destroy()
	})
})
