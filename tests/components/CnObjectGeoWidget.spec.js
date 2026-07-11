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
		props: ['center', 'zoom', 'markers', 'height', 'autoFit', 'ariaLabel'],
		template: '<div class="cn-map-stub" @click="$emit(\'click\', { lat: 51.5, lng: 4.5 })" />',
	},
	NcButton: { template: '<button class="nc-button-stub" @click="$emit(\'click\')"><slot /></button>' },
	NcLoadingIcon: true,
	ContentSave: true,
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
		wrapper.destroy()
	})

	it('parses a Feature, a FeatureCollection, and a plain lat/lng object', () => {
		const wrapper = mountWidget()
		expect(wrapper.vm.parseGeoPoint({ type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } })).toEqual({ lat: 2, lng: 1 })
		expect(wrapper.vm.parseGeoPoint({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [3, 4] } }] })).toEqual({ lat: 4, lng: 3 })
		expect(wrapper.vm.parseGeoPoint({ lat: 5, lng: 6 })).toEqual({ lat: 5, lng: 6 })
		expect(wrapper.vm.parseGeoPoint({ latitude: 7, longitude: 8 })).toEqual({ lat: 7, lng: 8 })
		expect(wrapper.vm.parseGeoPoint(null)).toBeNull()
		expect(wrapper.vm.parseGeoPoint({ type: 'Point', coordinates: ['x', 'y'] })).toBeNull()
		wrapper.destroy()
	})

	it('shows the hint and no marker when the object has no location', () => {
		const wrapper = mountWidget()
		expect(wrapper.vm.activePoint).toBeNull()
		expect(wrapper.vm.mapMarkers).toBeNull()
		expect(wrapper.find('.cn-object-geo-widget__hint').exists()).toBe(true)
		wrapper.destroy()
	})

	it('places a marker and turns dirty on map click', async () => {
		const wrapper = mountWidget()
		wrapper.find('.cn-map-stub').trigger('click')
		await flush()
		expect(wrapper.vm.activePoint).toEqual({ lat: 51.5, lng: 4.5 })
		expect(wrapper.vm.dirty).toBe(true)
		wrapper.destroy()
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
		wrapper.destroy()
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
		wrapper.destroy()
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
		wrapper.destroy()
	})

	it('does not place a marker on click when not editable', async () => {
		const wrapper = mountWidget({ editable: false })
		wrapper.find('.cn-map-stub').trigger('click')
		await flush()
		expect(wrapper.vm.activePoint).toBeNull()
		wrapper.destroy()
	})

	it('tolerates a null object-data prop without throwing', () => {
		const wrapper = mountWidget({ objectData: null, objectId: '', register: '', schema: '' })
		expect(wrapper.vm.resolvedId).toBe('')
		expect(wrapper.vm.savedPoint).toBeNull()
		wrapper.destroy()
	})
})
