/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a marker reload must leave alone.
 *
 * Both render watchers hang off the `cfg` computed, which reads every prop, so
 * a new marker set invalidated the layer watcher too. With `deep: true` Vue
 * calls a handler whenever its effect re-runs — it never compares — so the
 * base tile layer was removed and rebuilt on every refresh, and the map went
 * white until the new tiles arrived.
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
		on: jest.fn(function() {
			return this
		}),
		disableClickPropagation: jest.fn(),
		disableScrollPropagation: jest.fn(),
	}
	return { __esModule: true, default: L, ...L }
})

jest.mock('leaflet.markercluster', () => ({}), { virtual: true })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const TILE_URL = 'https://tiles.example/{z}/{x}/{y}.png'

const feature = (lng, lat) => ({
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [lng, lat] },
	properties: {},
})

/**
 * Mount with one tile layer and one marker, settled.
 *
 * @param {object} [propsData] Extra props.
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountWidget(propsData = {}) {
	const wrapper = mount(CnMapWidget, {
		propsData: {
			center: [52, 5],
			layers: [{ type: 'tile', url: TILE_URL }],
			markers: { features: [feature(5, 52)] },
			...propsData,
		},
	})
	await flush()
	await nextTick()
	await nextTick()
	return wrapper
}

/**
 * Let every watcher and the async marker render settle.
 *
 * @return {Promise<void>} Resolves once settled.
 */
async function settle() {
	await flush()
	await nextTick()
	await nextTick()
}

const leaflet = () => require('leaflet').default

/** @param {object} map The map stub. @return {Array<string>} Kinds currently on it. */
const kindsOn = (map) => map._added.map((l) => l._kind)

/** @param {object} map The map stub. @return {Array<string>} Kinds it was asked to remove. */
const removedKinds = (map) => map.removeLayer.mock.calls.map(([l]) => l && l._kind)

beforeEach(() => {
	leaflet().__lastMap.current = null
	jest.clearAllMocks()
})

describe('CnMapWidget — a marker reload does not rebuild the layers', () => {
	it('leaves the tile layer mounted when only the markers change', async () => {
		const wrapper = await mountWidget()
		const L = leaflet()
		const map = L.__lastMap.current
		expect(kindsOn(map)).toContain('tile')
		L.tileLayer.mockClear()
		map.removeLayer.mockClear()

		await wrapper.setProps({ markers: { features: [feature(6, 53)] } })
		await settle()

		// No new tile layer built, and the mounted one never taken off: the
		// background stays painted, so there is nothing to flash white.
		expect(L.tileLayer).not.toHaveBeenCalled()
		expect(removedKinds(map)).not.toContain('tile')
		expect(kindsOn(map).filter((k) => k === 'tile')).toHaveLength(1)
		wrapper.unmount()
	})

	it('leaves the tile layer mounted when an unrelated prop changes', async () => {
		const wrapper = await mountWidget()
		const L = leaflet()
		L.tileLayer.mockClear()

		await wrapper.setProps({ height: '640px' })
		await settle()

		expect(L.tileLayer).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('does re-render the markers when the marker set changes', async () => {
		const wrapper = await mountWidget()
		const L = leaflet()
		L.geoJSON.mockClear()

		await wrapper.setProps({ markers: { features: [feature(6, 53)] } })
		await settle()

		expect(L.geoJSON).toHaveBeenCalled()
		wrapper.unmount()
	})

	it('does not re-render the markers when an unrelated prop changes', async () => {
		const wrapper = await mountWidget()
		const L = leaflet()
		L.geoJSON.mockClear()

		await wrapper.setProps({ height: '640px' })
		await settle()

		expect(L.geoJSON).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('still rebuilds the layers when the layer set really changes', async () => {
		const wrapper = await mountWidget()
		const L = leaflet()
		L.tileLayer.mockClear()

		await wrapper.setProps({ layers: [{ type: 'tile', url: 'https://other.example/{z}/{x}/{y}.png' }] })
		await settle()

		expect(L.tileLayer).toHaveBeenCalledWith('https://other.example/{z}/{x}/{y}.png', expect.anything())
		wrapper.unmount()
	})

	// Vue 3 props are SHALLOW-reactive: reading `layers[0].url` tracks nothing,
	// so a mutation inside a prop was never observed here — `deep: true` did not
	// buy it, it only made the watchers fire on every unrelated change. Pinned
	// so nobody puts `deep` back believing it helps.
	it('does not see a mutation inside the layers prop', async () => {
		const layers = [{ type: 'tile', url: TILE_URL }]
		const wrapper = await mountWidget({ layers })
		const L = leaflet()
		L.tileLayer.mockClear()

		layers[0].url = 'https://mutated.example/{z}/{x}/{y}.png'
		await settle()

		expect(L.tileLayer).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('does not see a mutation inside the markers prop', async () => {
		const markers = { features: [feature(5, 52)] }
		const wrapper = await mountWidget({ markers })
		const L = leaflet()
		L.geoJSON.mockClear()

		markers.features.push(feature(6, 53))
		await settle()

		expect(L.geoJSON).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
