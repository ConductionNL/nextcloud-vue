/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/map-image-layer/tasks.md#task-2
 * @spec openspec/changes/map-image-layer/tasks.md#task-3
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
const IMAGE = { type: 'image', url: '/img/aldmoor.png', width: 2400, height: 1600 }

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

describe('CnMapWidget image layer', () => {
	it('creates the map on flat coordinates and overlays the picture', async () => {
		mountMap({ layers: [IMAGE] })
		await flush()
		const { mapOptions, overlay, fitBounds } = leaflet().__calls
		expect(mapOptions.crs).toEqual(leaflet().CRS.Simple)
		expect(overlay.url).toBe('/img/aldmoor.png')
		expect(overlay.bounds).toEqual([[-1600, 0], [0, 2400]])
		expect(fitBounds).toEqual([[-1600, 0], [0, 2400]])
		expect(mapOptions.maxBounds).toEqual([[-1760, -240], [160, 2640]])
	})

	it('a geographic map keeps the default CRS', async () => {
		mountMap({ layers: [{ type: 'tile', url: 'https://x/{z}/{x}/{y}.png' }] })
		await flush()
		expect(leaflet().__calls.mapOptions.crs).toBeUndefined()
		expect(leaflet().imageOverlay).not.toHaveBeenCalled()
	})

	it('skips other layers beside the picture with a warning and adds no basemap', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountMap({ layers: [IMAGE, { type: 'tile', url: 'https://x/{z}/{x}/{y}.png' }] })
		await flush()
		expect(leaflet().__calls.tile).toBe(0)
		expect(warn.mock.calls.some(([m]) => String(m).includes('skipped on an image map'))).toBe(true)
		warn.mockRestore()
	})

	it('refuses an unsafe picture url', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountMap({ layers: [{ ...IMAGE, url: 'javascript:alert(1)' }] })
		await flush()
		expect(leaflet().imageOverlay).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('emits { x, y } in whole pixels, clamped, on a click', async () => {
		const wrapper = mountMap({ layers: [IMAGE] })
		await flush()
		leaflet().__calls.map._handlers.click({ latlng: { lat: -610.4, lng: 820.6 } })
		leaflet().__calls.map._handlers.click({ latlng: { lat: 50, lng: 99999 } })
		expect(wrapper.emitted('click')[0][0]).toEqual({ x: 821, y: 610 })
		expect(wrapper.emitted('click')[1][0]).toEqual({ x: 2400, y: 0 })
	})

	it('a geographic map still emits { lat, lng }', async () => {
		const wrapper = mountMap({ layers: [{ type: 'tile', url: 'https://x/{z}/{x}/{y}.png' }] })
		await flush()
		leaflet().__calls.map._handlers.click({ latlng: { lat: 52.1, lng: 5.2 } })
		expect(wrapper.emitted('click')[0][0]).toEqual({ lat: 52.1, lng: 5.2 })
	})

	it('places markers by xField and yField and counts rows with no position', async () => {
		const wrapper = mountMap({
			layers: [IMAGE],
			markers: {
				xField: 'px',
				yField: 'py',
				dataSource: { url: '/api/places' },
			},
		})
		global.fetch = jest.fn().mockResolvedValue({ json: async () => [{ name: 'Aldmoor city', px: 820, py: 610 }, { name: 'Nowhere', px: 5 }] })
		await wrapper.vm.renderMarkers()
		await flush()
		expect(leaflet().__calls.circleMarkers).toEqual([{ lat: -610, lng: 820 }])
		expect(wrapper.vm.unplottedCount).toBe(1)
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-map-unplotted"]').text()).toBe('1 places have no position')
	})

	it('reads x and y by default', async () => {
		const wrapper = mountMap({ layers: [IMAGE], markers: { features: [{ type: 'Feature', properties: { x: 10, y: 20 } }] } })
		await wrapper.vm.renderMarkers()
		await flush()
		expect(leaflet().__calls.circleMarkers).toEqual([{ lat: -20, lng: 10 }])
	})
})
