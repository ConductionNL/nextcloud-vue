/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnMapWidget's basemap fallback.
 *
 * `basemaps` used to be strictly opt-in and defaulted to `[]`, so a map configured
 * without one mounted Leaflet, drew its zoom controls, and added no tile layer at
 * all — a grey box that reads as broken, not as empty. Widgets already saved on a
 * dashboard have no `basemaps` in their content, so a default on the registry entry
 * alone cannot heal them; the fallback has to live at render time.
 */
import { shallowMount } from '@vue/test-utils'
import CnMapWidget from '../../src/components/CnMapWidget/CnMapWidget.vue'

/**
 * Records every tileLayer(url) Leaflet is asked to create.
 * @param created
 */
function fakeLeaflet(created) {
	const layer = { addTo() { return this }, on() { return this }, remove() {} }
	const tileLayer = (url) => { created.push(url); return layer }
	tileLayer.wms = (url) => { created.push(url); return layer }
	return {
		tileLayer,
		geoJSON: () => layer,
		control: { layers: () => ({ addTo() {} }) },
	}
}

function widgetWith(propsData, created) {
	const w = shallowMount(CnMapWidget, { propsData, mocks: { t: (_a, s) => s } })
	w.vm.L = fakeLeaflet(created)
	w.vm.map = { addLayer() {}, removeLayer() {} }
	return w
}

describe('CnMapWidget — basemap fallback', () => {
	it('falls back to OpenStreetMap when no basemap is configured, so the map is not grey', () => {
		const created = []
		widgetWith({}, created).vm.renderBasemaps()

		expect(created).toHaveLength(1)
		expect(created[0]).toContain('tile.openstreetmap.org')
	})

	it('heals a map widget already saved without a `basemaps` key', () => {
		const created = []
		// Exactly what an existing dashboard row deserialises to.
		widgetWith({ basemaps: [], layers: [] }, created).vm.renderBasemaps()

		expect(created[0]).toContain('tile.openstreetmap.org')
	})

	it('does NOT stack OSM under a consumer’s own tile layer', () => {
		const created = []
		widgetWith({
			layers: [{ type: 'tile', url: 'https://service.pdok.nl/{z}/{x}/{y}.png' }],
		}, created).vm.renderBasemaps()

		// renderLayers() draws the PDOK tiles; renderBasemaps() must add nothing.
		expect(created).toHaveLength(0)
	})

	it('honours an explicitly configured basemap over the fallback', () => {
		const created = []
		widgetWith({
			basemaps: [{ name: 'PDOK', url: 'https://service.pdok.nl/{z}/{x}/{y}.png' }],
		}, created).vm.renderBasemaps()

		expect(created).toEqual(['https://service.pdok.nl/{z}/{x}/{y}.png'])
	})
})
