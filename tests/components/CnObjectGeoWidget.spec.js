/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectGeoWidget — view/edit an object's `@self.geo` on a map.
 * CnMapWidget (Leaflet) is stubbed so the logic — geo parsing, marker
 * assembly, draft/dirty state, and the PATCH-only-@self.geo save — is
 * exercised without a real map.
 */

import { mount } from '@vue/test-utils'
import CnObjectGeoWidget from '../../src/components/CnObjectGeoWidget/CnObjectGeoWidget.vue'

const stubs = {
	// Render the chrome default + footer slots so the map stub and footer
	// controls are testable. Expose the forwarded markers/center as data-attrs.
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /><slot name="footer" /></div>' },
	CnMapWidget: {
		name: 'CnMapWidget',
		props: ['center', 'zoom', 'markers', 'height', 'autoFit', 'ariaLabel', 'layers', 'basemaps', 'fitControl', 'locateControl', 'fullscreenControl'],
		template: '<div class="cn-map-stub" @click="$emit(\'click\', { lat: 51.5, lng: 4.5 })" />',
	},
	NcButton: { template: '<button class="nc-button-stub" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: {
		name: 'NcTextField',
		props: ['value', 'label'],
		template: '<input class="nc-text-field-stub" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
	},
	NcLoadingIcon: true,
	ContentSave: true,
	Magnify: true,
	MapMarkerOff: true,
}

const flush = async () => {
	await new Promise((resolve) => setTimeout(resolve, 0))
}

function mountWidget(props = {}) {
	return mount(CnObjectGeoWidget, {
		propsData: {
			register: 'reg',
			schema: 'sch',
			objectId: 'obj-1',
			objectData: { '@self': { id: 'obj-1', register: 'reg', schema: 'sch' } },
			...props,
		},
		stubs,
	})
}

describe('CnObjectGeoWidget', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('parses a stored Point geometry into a marker', () => {
		const wrapper = mountWidget({
			objectData: { '@self': { id: 'obj-1', register: 'reg', schema: 'sch', geo: { type: 'Point', coordinates: [4.9, 52.37] } } },
		})
		expect(wrapper.vm.savedPoint).toEqual({ lat: 52.37, lng: 4.9 })
		expect(wrapper.vm.mapMarkers.features[0].geometry).toEqual({ type: 'Point', coordinates: [4.9, 52.37] })
		wrapper.unmount()
	})

	it('parses a Feature, a FeatureCollection, and a plain lat/lng object', () => {
		const wrapper = mountWidget()
		expect(wrapper.vm.parseGeoPoint({ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } })).toEqual({ lat: 2, lng: 1 })
		expect(wrapper.vm.parseGeoPoint({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [3, 4] } }] })).toEqual({ lat: 4, lng: 3 })
		expect(wrapper.vm.parseGeoPoint({ lat: 5, lng: 6 })).toEqual({ lat: 5, lng: 6 })
		expect(wrapper.vm.parseGeoPoint({ latitude: 7, longitude: 8 })).toEqual({ lat: 7, lng: 8 })
		expect(wrapper.vm.parseGeoPoint(null)).toBeNull()
		expect(wrapper.vm.parseGeoPoint({ type: 'Point', coordinates: ['x', 'y'] })).toBeNull()
		wrapper.unmount()
	})

	it('shows the hint and no marker when the object has no location', () => {
		const wrapper = mountWidget()
		expect(wrapper.vm.activePoint).toBeNull()
		expect(wrapper.vm.mapMarkers).toBeNull()
		expect(wrapper.find('.cn-object-geo-widget__hint').exists()).toBe(true)
		wrapper.unmount()
	})

	it('places a marker and turns dirty on map click', async () => {
		const wrapper = mountWidget()
		wrapper.find('.cn-map-stub').trigger('click')
		await flush()
		expect(wrapper.vm.activePoint).toEqual({ lat: 51.5, lng: 4.5 })
		expect(wrapper.vm.dirty).toBe(true)
		wrapper.unmount()
	})

	it('PATCHes only @self.geo (GeoJSON Point) on save', async () => {
		const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
		global.fetch = fetchMock
		const wrapper = mountWidget()
		wrapper.find('.cn-map-stub').trigger('click')
		await flush()
		await wrapper.vm.save()
		await flush()
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, opts] = fetchMock.mock.calls[0]
		expect(String(url)).toContain('/apps/openregister/api/objects/reg/sch/obj-1')
		expect(opts.method).toBe('PATCH')
		expect(JSON.parse(opts.body)).toEqual({ '@self': { geo: { type: 'Point', coordinates: [4.5, 51.5] } } })
		// After save the draft clears and the local geo reflects the new point.
		expect(wrapper.vm.dirty).toBe(false)
		expect(wrapper.vm.savedPoint).toEqual({ lat: 51.5, lng: 4.5 })
		expect(wrapper.emitted('saved')[0][0]).toEqual({ type: 'Point', coordinates: [4.5, 51.5] })
		wrapper.unmount()
	})

	it('clears the location by PATCHing @self.geo = null', async () => {
		const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
		global.fetch = fetchMock
		const wrapper = mountWidget({
			objectData: { '@self': { id: 'obj-1', register: 'reg', schema: 'sch', geo: { type: 'Point', coordinates: [4.9, 52.37] } } },
		})
		await wrapper.vm.clear()
		await flush()
		const [, opts] = fetchMock.mock.calls[0]
		expect(JSON.parse(opts.body)).toEqual({ '@self': { geo: null } })
		expect(wrapper.emitted('saved')[0][0]).toBeNull()
		wrapper.unmount()
	})

	it('surfaces an error and stays dirty when the save fails', async () => {
		global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
		const wrapper = mountWidget()
		wrapper.find('.cn-map-stub').trigger('click')
		await flush()
		await wrapper.vm.save()
		await flush()
		expect(wrapper.find('.cn-object-geo-widget__error').exists()).toBe(true)
		expect(wrapper.vm.dirty).toBe(true)
		wrapper.unmount()
	})

	it('does not place a marker on click when not editable', async () => {
		const wrapper = mountWidget({ editable: false })
		wrapper.find('.cn-map-stub').trigger('click')
		await flush()
		expect(wrapper.vm.activePoint).toBeNull()
		wrapper.unmount()
	})

	it('tolerates a null object-data prop without throwing', () => {
		const wrapper = mountWidget({ objectData: null, objectId: '', register: '', schema: '' })
		expect(wrapper.vm.resolvedId).toBe('')
		expect(wrapper.vm.savedPoint).toBeNull()
		wrapper.unmount()
	})
})

describe('CnObjectGeoWidget — base maps', () => {
	const mapStub = (wrapper) => wrapper.findComponent({ name: 'CnMapWidget' })

	it('sends a single base map and no tile layer by default', () => {
		const wrapper = mountWidget({})
		const map = mapStub(wrapper)
		expect(map.props('basemaps')).toHaveLength(1)
		expect(map.props('basemaps')[0].url).toContain('tile.openstreetmap.org')
		// The basemap owns the background — a stacked tile layer would double up.
		expect(map.props('layers')).toEqual([])
		wrapper.unmount()
	})

	it('puts the selected base map first and offers the rest when switching is allowed', () => {
		const wrapper = mountWidget({ basemap: 'terrain', allowBasemapSwitch: true })
		const basemaps = mapStub(wrapper).props('basemaps')
		expect(basemaps).toHaveLength(3)
		// First entry is the live one on load.
		expect(basemaps[0].id).toBe('terrain')
		expect(basemaps.map((b) => b.id).sort()).toEqual(['humanitarian', 'standard', 'terrain'])
		wrapper.unmount()
	})

	it('yields the background to a consumer-supplied custom tile layer', () => {
		const custom = [{ type: 'tile', url: 'https://pdok.example/{z}/{x}/{y}.png' }]
		const wrapper = mountWidget({ layers: custom, basemap: 'terrain' })
		const map = mapStub(wrapper)
		expect(map.props('basemaps')).toEqual([])
		expect(map.props('layers')).toEqual(custom)
		wrapper.unmount()
	})

	it('forwards the control toggles', () => {
		const wrapper = mountWidget({ fitControl: false, locateControl: false, fullscreenControl: true })
		const map = mapStub(wrapper)
		expect(map.props('fitControl')).toBe(false)
		expect(map.props('locateControl')).toBe(false)
		expect(map.props('fullscreenControl')).toBe(true)
		wrapper.unmount()
	})
})

describe('CnObjectGeoWidget — address search', () => {
	afterEach(() => {
		jest.restoreAllMocks()
		delete global.fetch
	})

	it('is hidden unless both editable and addressSearch are on', () => {
		const readOnly = mountWidget({ editable: false, addressSearch: true })
		expect(readOnly.find('.cn-object-geo-widget__search').exists()).toBe(false)
		readOnly.unmount()

		const off = mountWidget({ editable: true, addressSearch: false })
		expect(off.find('.cn-object-geo-widget__search').exists()).toBe(false)
		off.unmount()

		const on = mountWidget({ editable: true, addressSearch: true })
		expect(on.find('.cn-object-geo-widget__search').exists()).toBe(true)
		on.unmount()
	})

	it('geocodes through Nominatim and maps the results', async () => {
		global.fetch = jest.fn(async () => ({
			ok: true,
			json: async () => ([{ display_name: 'Utrecht, NL', lat: '52.09', lon: '5.12' }]),
		}))
		const wrapper = mountWidget({ editable: true, addressSearch: true })
		wrapper.vm.query = 'utrecht'
		await wrapper.vm.geocode()

		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(global.fetch.mock.calls[0][0]).toContain('nominatim.openstreetmap.org')
		expect(global.fetch.mock.calls[0][0]).toContain('q=utrecht')
		expect(wrapper.vm.results).toEqual([{ label: 'Utrecht, NL', lat: 52.09, lng: 5.12 }])
		wrapper.unmount()
	})

	it('surfaces a message instead of throwing when the lookup fails (e.g. CSP-blocked)', async () => {
		jest.spyOn(console, 'warn').mockImplementation(() => {})
		global.fetch = jest.fn(async () => { throw new Error('blocked by CSP') })
		const wrapper = mountWidget({ editable: true, addressSearch: true })
		wrapper.vm.query = 'utrecht'
		await wrapper.vm.geocode()

		expect(wrapper.vm.results).toEqual([])
		expect(wrapper.vm.searchError).toBeTruthy()
		expect(wrapper.vm.searching).toBe(false)
		wrapper.unmount()
	})

	it('picking a result drafts the point and re-centres the map', async () => {
		const wrapper = mountWidget({ editable: true, addressSearch: true })
		const epochBefore = wrapper.vm.mapEpoch

		wrapper.vm.pickResult({ label: 'Utrecht, NL', lat: 52.09, lng: 5.12 })

		expect(wrapper.vm.draft).toEqual({ lat: 52.09, lng: 5.12 })
		expect(wrapper.vm.dirty).toBe(true)
		expect(wrapper.vm.results).toEqual([])
		// Remount so CnMapWidget re-reads its centre.
		expect(wrapper.vm.mapEpoch).toBe(epochBefore + 1)
		wrapper.unmount()
	})

	it('ignores a picked result on a read-only map', () => {
		const wrapper = mountWidget({ editable: false, addressSearch: true })
		wrapper.vm.pickResult({ label: 'Utrecht, NL', lat: 52.09, lng: 5.12 })
		expect(wrapper.vm.draft).toBeUndefined()
		wrapper.unmount()
	})

	it('does not fire a lookup for a query under three characters', async () => {
		global.fetch = jest.fn()
		const wrapper = mountWidget({ editable: true, addressSearch: true })
		wrapper.vm.onQueryInput('ut')
		// Past the debounce window — still nothing, the query is too short.
		await new Promise((resolve) => setTimeout(resolve, 700))
		expect(wrapper.vm.results).toEqual([])
		expect(global.fetch).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
