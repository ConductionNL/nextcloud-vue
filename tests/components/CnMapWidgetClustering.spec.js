/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Clustering, against a plugin that behaves like the real one.
 *
 * The existing CnMapWidget spec asserts that `leaflet.markercluster` is
 * imported when `clustering: true`, and it passes. It has always passed, and
 * clustering has never run in any app, because the mock it asserts against
 * puts `markerClusterGroup` on the Leaflet namespace itself. The real plugin
 * does no such thing: it exports nothing, and writes `L.MarkerClusterGroup`
 * and `L.markerClusterGroup` onto the GLOBAL `L` instead. CnMapWidget imports
 * Leaflet as an ES module and keeps it on `this.L`, so there was no global for
 * the plugin to attach to and `L.markerClusterGroup` stayed undefined even on
 * the day the import resolved.
 *
 * So this file mocks the plugin the way the real file behaves: read the
 * global, attach to it, and throw if it is not there, which is exactly the
 * ReferenceError the real `L.FeatureGroup.extend(...)` raises. The assertion
 * is then about clustering rather than about an import having happened.
 *
 * The Leaflet mock here deliberately does NOT pre-install
 * `markerClusterGroup`. Everything the widget needs to mount is present and
 * nothing else, so the only way the assertion can pass is the plugin actually
 * having run.
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
		getBounds: jest.fn(() => ({ isValid: () => false })),
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
		FeatureGroup: { extend: jest.fn(() => function ClusterGroup() {}) },
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
	L.control = Object.assign(jest.fn(), {
		layers: jest.fn(() => ({ addTo: jest.fn() })),
	})
	L.DomUtil = {
		create: jest.fn((tag, className, parent) => {
			const el = globalThis.document.createElement(tag)
			if (className) {
				el.className = className
			}
			if (parent) {
				parent.appendChild(el)
			}
			return el
		}),
	}
	const domEvent = {
		on: jest.fn(() => domEvent),
		stop: jest.fn(),
		disableClickPropagation: jest.fn(),
		disableScrollPropagation: jest.fn(),
	}
	L.DomEvent = domEvent
	return { __esModule: true, default: L, ...L }
})

// The plugin, behaving like the file on disk: no exports, a global `L` read at
// evaluation time, and a hard failure when that global is absent.
jest.mock('leaflet.markercluster', () => {
	const global_ = globalThis.L
	if (!global_) {
		throw new ReferenceError('L is not defined')
	}
	global_.MarkerClusterGroup = global_.FeatureGroup.extend({})
	global_.markerClusterGroup = () => ({
		_kind: 'cluster',
		addLayer: jest.fn(),
		addTo: jest.fn(function(map) {
			map._added.push(this)
			return this
		}),
		getBounds: jest.fn(() => ({ isValid: () => false })),
	})
	return {}
}, { virtual: true })

jest.mock('leaflet/dist/leaflet.css', () => ({}), { virtual: true })
jest.mock('leaflet.markercluster/dist/MarkerCluster.css', () => ({}), { virtual: true })
jest.mock('leaflet.markercluster/dist/MarkerCluster.Default.css', () => ({}), { virtual: true })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const FEATURES = [
	{ type: 'Feature', geometry: { type: 'Point', coordinates: [5.1, 52.1] }, properties: { title: 'A' } },
	{ type: 'Feature', geometry: { type: 'Point', coordinates: [5.2, 52.2] }, properties: { title: 'B' } },
]

/**
 * Mount the widget with clustering asked for.
 *
 * @return {object} The wrapper.
 */
function mountClustered() {
	return mount(CnMapWidget, {
		propsData: {
			center: [52, 5],
			clustering: true,
			markers: { features: FEATURES, popupField: 'title' },
		},
	})
}

describe('CnMapWidget clustering', () => {
	beforeEach(() => {
		delete globalThis.window.L
		jest.clearAllMocks()
	})

	afterEach(() => {
		delete globalThis.window.L
	})

	it('publishes Leaflet as the global the plugin attaches to', async () => {
		const wrapper = mountClustered()
		await flush()
		await nextTick()
		await flush()
		await nextTick()

		// The plugin has a global to attach to, and attached to it. Identity
		// against `require('leaflet')` is not asserted: Jest's interop hands a
		// dynamic import its own namespace copy, so that would test the test
		// runner rather than the widget.
		expect(globalThis.window.L).toBeDefined()
		expect(typeof globalThis.window.L.markerClusterGroup).toBe('function')
		wrapper.unmount()
	})

	it('groups the markers under a cluster layer', async () => {
		const wrapper = mountClustered()
		await flush()
		await nextTick()
		await flush()
		await nextTick()

		const L = require('leaflet').default
		expect(typeof L.markerClusterGroup).toBe('function')

		const map = L.__lastMap.current
		expect(map._added.some((layer) => layer._kind === 'cluster')).toBe(true)
		expect(map._added.some((layer) => layer._kind === 'geojson')).toBe(false)
		wrapper.unmount()
	})
})
