/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A map on a record's page that plots the objects pointing at the record:
 * the filter names the record, an empty answer and a failed one each say so,
 * (0, 0) is not a place, and a save elsewhere reads the markers again.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-map-can-plot-the-objects-that-point-at-a-record
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnMapWidget from '@/components/CnMapWidget/CnMapWidget.vue'

var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url, params) => '/index.php' + url.replace(/\{(\w+)\}/g, (_m, k) => params[k]) }))
jest.mock('@nextcloud/event-bus', () => {
	const subscribers = {}
	return {
		__esModule: true,
		__subscribers: subscribers,
		subscribe: (name, fn) => { subscribers[name] = fn },
		unsubscribe: (name) => { delete subscribers[name] },
		emit: (name, payload) => subscribers[name] && subscribers[name](payload),
	}
})

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

async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const CONTENT = {
	markers: {
		dataSource: { register: 'x', schema: 'location', filter: { item: '@objectId' } },
		latField: 'latitude',
		lngField: 'longitude',
	},
	emptyText: 'No locations linked to this item yet',
	errorText: 'The locations could not be loaded.',
	refreshOn: 'x:location:saved',
	refreshMatch: 'itemId',
}

const leaflet = () => require('leaflet').default

function mountMap() {
	return mount(CnMapWidget, { props: { content: CONTENT, objectId: 'r-1', objectData: { id: 'r-1' } } })
}

beforeEach(() => {
	mockGet.mockReset()
	jest.clearAllMocks()
})

describe('CnMapWidget — the places of a record', () => {
	it('asks only for the objects that point at the record', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const w = mountMap()
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/x/location', { params: { item: 'r-1', _limit: 500 } })
		w.unmount()
	})

	it('says the record has no places, rather than drawing an empty map that says nothing', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const w = mountMap()
		await flush()
		expect(w.find('[data-testid="cn-map-markers-empty"]').text()).toBe('No locations linked to this item yet')
		w.unmount()
	})

	it('says a failed read failed, as an alert', async () => {
		mockGet.mockRejectedValue(new Error('500'))
		const w = mountMap()
		await flush()
		const line = w.find('[data-testid="cn-map-markers-failed"]')
		expect(line.text()).toBe('The locations could not be loaded.')
		expect(line.attributes('role')).toBe('alert')
		w.unmount()
	})

	it('does not plot a place at (0, 0)', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ latitude: 0, longitude: 0 }, { latitude: 52.1, longitude: 5.1 }] } })
		const w = mountMap()
		await flush()
		const plotted = leaflet().geoJSON.mock.calls.at(-1)[0].features
		expect(plotted).toHaveLength(1)
		expect(plotted[0].geometry.coordinates).toEqual([5.1, 52.1])
		w.unmount()
	})

	it('reads the markers again when a place of this record is saved, and only then', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const w = mountMap()
		await flush()
		const calls = mockGet.mock.calls.length
		require('@nextcloud/event-bus').__subscribers['x:location:saved']({ itemId: 'other' })
		await flush()
		expect(mockGet.mock.calls.length).toBe(calls)
		require('@nextcloud/event-bus').__subscribers['x:location:saved']({ itemId: 'r-1' })
		await flush()
		expect(mockGet.mock.calls.length).toBe(calls + 1)
		w.unmount()
	})
})
