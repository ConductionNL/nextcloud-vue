/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `autoFit` against a marker set that reloads.
 *
 * A consumer whose markers come from a filter, a poll or a save re-renders
 * them, and every re-render used to re-fit the bounds — so a user who had
 * zoomed into one city was thrown back to the whole country on the next
 * refresh. The fit now stops at the first gesture that actually MOVED the map.
 *
 * The gesture alone is not enough, and the flag is one-way: with
 * `scrollWheelZoom` off, scrolling the page past the map is a wheel event on
 * the container, and tabbing through it is a keydown. Either one counting would
 * mean a stray scroll on page load disables re-framing for the whole session.
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
				_handlers: {},
				on: jest.fn(function(type, handler) {
					(this._handlers[type] = this._handlers[type] || []).push(handler)
					return this
				}),
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

/**
 * Raw input on the map container — what arms the hand-over.
 *
 * @param {object} wrapper The mounted widget.
 * @param {string} type The event type.
 * @return {void}
 */
function gesture(wrapper, type) {
	wrapper.vm.$refs.mapEl.dispatchEvent(new Event(type, { bubbles: true }))
}

/**
 * The map reporting that its view actually moved — what commits it.
 *
 * @param {object} map The Leaflet map stub.
 * @return {void}
 */
function settle(map) {
	for (const handler of map._handlers.moveend || []) {
		handler()
	}
}

/**
 * Hand the widget a fresh marker set and let both render watchers run.
 *
 * @param {object} wrapper The mounted widget.
 * @return {Promise<void>}
 */
async function reloadMarkers(wrapper) {
	await wrapper.setProps({ markers: { features: [feature(6, 53), feature(4, 51)] } })
	await flush()
	await nextTick()
	await nextTick()
}

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
			gesture(wrapper, type)
			settle(map)
			map.fitBounds.mockClear()

			await reloadMarkers(wrapper)

			expect(map.fitBounds).not.toHaveBeenCalled()
			wrapper.unmount()
		},
	)

	it.each(['wheel', 'keydown'])(
		'keeps re-framing after a %s that moved nothing',
		async (type) => {
			// The page scrolled past the map, or the reader tabbed through it.
			const wrapper = await mountWidget()
			const map = theMap()
			gesture(wrapper, type)
			map.fitBounds.mockClear()

			await reloadMarkers(wrapper)

			expect(map.fitBounds).toHaveBeenCalled()
			wrapper.unmount()
		},
	)

	it('does not count the view change its own re-frame causes', async () => {
		// A stray gesture that moved nothing must not be committed by the NEXT
		// programmatic fit — the flag is one-way, so that would be permanent.
		const wrapper = await mountWidget()
		const map = theMap()
		gesture(wrapper, 'wheel')

		wrapper.vm.fitToMarkers()
		settle(map)
		map.fitBounds.mockClear()

		await reloadMarkers(wrapper)

		expect(map.fitBounds).toHaveBeenCalled()
		wrapper.unmount()
	})

	it('still re-frames on request after the user has moved the map', async () => {
		const wrapper = await mountWidget()
		const map = theMap()
		gesture(wrapper, 'wheel')
		settle(map)
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
