/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `autoFit` against a marker set that reloads.
 *
 * A consumer whose markers come from a filter, a poll or a save re-renders
 * them, and every re-render used to re-fit the bounds — so a user who had
 * zoomed into one city was thrown back to the whole country on the next
 * refresh. The fit now stops at the first gesture on the map.
 *
 * The Leaflet mock returns VALID marker bounds, unlike the one in
 * CnMapWidget.spec.js, because `fitToMarkers()` returns early on invalid
 * bounds and `fitBounds` would never be reached at all.
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'

jest.mock('leaflet', () => {
	const lastMapRef = { current: null }
	const makeLayerStub = (kind) => ({
		_kind: kind,
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
		__lastMap: lastMapRef,
		map: jest.fn(() => {
			const m = {
				_added: [],
				on: jest.fn(),
				off: jest.fn(),
				removeLayer: jest.fn(function(layer) {
					this._added = this._added.filter((l) => l !== layer)
				}),
				invalidateSize: jest.fn(),
				getZoom: jest.fn(() => 7),
				fitBounds: jest.fn(),
				locate: jest.fn(),
				removeControl: jest.fn(),
				remove: jest.fn(),
			}
			lastMapRef.current = m
			return m
		}),
		tileLayer: Object.assign(jest.fn(() => makeLayerStub('tile')), {
			wms: jest.fn(() => makeLayerStub('wms')),
		}),
		geoJSON: jest.fn(() => makeLayerStub('geojson')),
		marker: jest.fn(() => makeLayerStub('marker')),
		circleMarker: jest.fn(() => makeLayerStub('circleMarker')),
		icon: jest.fn((opts) => ({ ...opts })),
	}
	L.Control = class {
		constructor(opts) {
			this.options = opts || {}
		}

		addTo(map) {
			map._controls = map._controls || []
			this._container = this.onAdd(map)
			map._controls.push(this)
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
		on: jest.fn(function(el, type, handler) {
			el.addEventListener(type, handler)
			return this
		}),
		disableClickPropagation: jest.fn(),
		disableScrollPropagation: jest.fn(),
	}
	return { __esModule: true, default: L, ...L }
})

jest.mock('leaflet.markercluster', () => ({}), { virtual: true })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function feature(lng, lat) {
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [lng, lat] },
		properties: {},
	}
}

/**
 * Mount the widget with one marker and wait for the first render to settle.
 *
 * @param {object} [propsData] Extra props.
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountWidget(propsData = {}) {
	const wrapper = mount(CnMapWidget, {
		propsData: { center: [52, 5], markers: { features: [feature(5, 52)] }, ...propsData },
	})
	await flush()
	await nextTick()
	await nextTick()
	return wrapper
}

const theMap = () => require('leaflet').default.__lastMap.current

beforeEach(() => {
	const L = require('leaflet').default
	L.__lastMap.current = null
	jest.clearAllMocks()
})

describe('CnMapWidget — autoFit and the user’s own view', () => {
	it('frames the markers on first load', async () => {
		const wrapper = await mountWidget()
		expect(theMap().fitBounds).toHaveBeenCalled()
		wrapper.unmount()
	})

	it('re-frames when the marker set reloads and nobody has touched the map', async () => {
		const wrapper = await mountWidget()
		const map = theMap()
		map.fitBounds.mockClear()

		await wrapper.setProps({ markers: { features: [feature(6, 53), feature(4, 51)] } })
		await flush()
		await nextTick()
		await nextTick()

		expect(map.fitBounds).toHaveBeenCalled()
		wrapper.unmount()
	})

	it.each(['mousedown', 'touchstart', 'wheel', 'keydown'])(
		'keeps the view a %s framed when the marker set reloads',
		async (type) => {
			const wrapper = await mountWidget()
			const map = theMap()
			wrapper.vm.$refs.mapEl.dispatchEvent(new Event(type, { bubbles: true }))
			map.fitBounds.mockClear()

			await wrapper.setProps({ markers: { features: [feature(6, 53), feature(4, 51)] } })
			await flush()
			await nextTick()
			await nextTick()

			expect(map.fitBounds).not.toHaveBeenCalled()
			wrapper.unmount()
		},
	)

	it('still re-frames on request after the user has moved the map', async () => {
		const wrapper = await mountWidget()
		const map = theMap()
		wrapper.vm.$refs.mapEl.dispatchEvent(new Event('wheel', { bubbles: true }))
		map.fitBounds.mockClear()

		wrapper.vm.fitToMarkers()

		expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: [50, 50] })
		wrapper.unmount()
	})

	it('never frames when autoFit is off', async () => {
		const wrapper = await mountWidget({ autoFit: false })
		expect(theMap().fitBounds).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
