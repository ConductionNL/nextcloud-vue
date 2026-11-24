/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/map-image-from-record/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'

jest.mock('leaflet', () => {
	const calls = { mapOptions: null, overlay: null, fitBounds: null, circleMarkers: [], map: null, tile: 0 }
	const stub = () => ({ addTo: jest.fn(function() {
		return this
	}), on: jest.fn(), bindPopup: jest.fn(), bindTooltip: jest.fn() })
	const L = {
		__calls: calls,
		CRS: { Simple: { simple: true } },
		map: jest.fn((_el, opts) => {
			calls.mapOptions = opts
			const handlers = {}
			const m = {
				_handlers: handlers,
				on: jest.fn((evt, cb) => {
					handlers[evt] = cb
				}),
				off: jest.fn(),
				removeLayer: jest.fn(),
				invalidateSize: jest.fn(),
				getBounds: jest.fn(() => ({ getNorth: () => 0, getSouth: () => -1, getEast: () => 1, getWest: () => 0 })),
				getZoom: jest.fn(() => 0),
				fitBounds: jest.fn((b) => {
					calls.fitBounds = b
				}),
				getBoundsZoom: jest.fn(() => -1),
				setMinZoom: jest.fn(),
				setMaxZoom: jest.fn(),
				remove: jest.fn(),
			}
			calls.map = m
			return m
		}),
		imageOverlay: jest.fn((url, bounds) => {
			calls.overlay = { url, bounds }
			return stub()
		}),
		tileLayer: Object.assign(jest.fn(() => {
			calls.tile += 1
			return stub()
		}), { wms: jest.fn(() => stub()) }),
		geoJSON: jest.fn((data, opts) => {
			const layer = { ...stub(), getBounds: () => ({ isValid: () => false }) }
			;(data.features || []).forEach((f) => opts.pointToLayer && opts.pointToLayer(f, { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }))
			return layer
		}),
		circleMarker: jest.fn((latlng) => {
			calls.circleMarkers.push(latlng)
			return stub()
		}),
		marker: jest.fn(() => stub()),
		icon: jest.fn(() => ({})),
	}
	return { __esModule: true, default: L, ...L }
})

jest.mock('leaflet.markercluster', () => ({}), { virtual: true })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountMap(props = {}) {
	return mount(CnMapWidget, { propsData: { center: [52, 5], ...props } })
}

function leaflet() {
	return require('leaflet').default
}

beforeEach(() => {
	const calls = leaflet().__calls
	Object.assign(calls, { mapOptions: null, overlay: null, fitBounds: null, circleMarkers: [], tile: 0 })
	calls.circleMarkers.length = 0
	jest.clearAllMocks()
})

const LAYER = { type: 'image', url: '@object.image', width: '@object.width', height: '@object.height' }
const RECORD = {
	id: 'm1',
	image: { title: 'valley.png', downloadUrl: '/remote.php/dav/files/gm/valley.png', accessUrl: '/s/abc/download' },
	width: 2400,
	height: 1600,
}

describe('CnMapWidget image layer from the record', () => {
	it('shows the record\'s picture at the record\'s size', async () => {
		mountMap({ layers: [LAYER], objectId: 'm1', objectData: RECORD })
		await flush()
		const { mapOptions, overlay } = leaflet().__calls
		expect(mapOptions.crs).toEqual(leaflet().CRS.Simple)
		expect(overlay.url).toBe('/remote.php/dav/files/gm/valley.png')
		expect(overlay.bounds).toEqual([[-1600, 0], [0, 2400]])
	})

	it('waits for the record before it opens the map', async () => {
		const wrapper = mountMap({ layers: [LAYER], objectId: 'm1', objectData: null })
		await flush()
		expect(leaflet().map).not.toHaveBeenCalled()

		await wrapper.setProps({ objectData: RECORD })
		await flush()
		expect(leaflet().map).toHaveBeenCalledTimes(1)
		expect(leaflet().__calls.mapOptions.crs).toEqual(leaflet().CRS.Simple)
		expect(leaflet().__calls.overlay.url).toBe('/remote.php/dav/files/gm/valley.png')
	})

	it('shows another record\'s picture on the open map', async () => {
		const wrapper = mountMap({ layers: [LAYER], objectId: 'm1', objectData: RECORD })
		await flush()
		await wrapper.setProps({ objectData: { ...RECORD, image: '/img/north.png', width: 800, height: 600 } })
		await flush()
		expect(leaflet().map).toHaveBeenCalledTimes(1)
		expect(leaflet().__calls.overlay.url).toBe('/img/north.png')
		expect(leaflet().__calls.overlay.bounds).toEqual([[-600, 0], [0, 800]])
	})

	it('refuses an unsafe picture url from the record', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountMap({ layers: [LAYER], objectId: 'm1', objectData: { ...RECORD, image: 'javascript:alert(1)' } })
		await flush()
		expect(leaflet().imageOverlay).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('keeps a literal picture as it was', async () => {
		mountMap({ layers: [{ type: 'image', url: '/img/aldmoor.png', width: 2400, height: 1600 }] })
		await flush()
		expect(leaflet().__calls.overlay.url).toBe('/img/aldmoor.png')
	})
})
