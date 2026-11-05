/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * map-layer-toggles (DqZaakLocatie "Kaartlagen": "Luchtfoto (PDOK)",
 * "Omgevingsplan (WMS)"): switches under the map add and remove a layer.
 *
 * @spec openspec/changes/map-layer-toggles/specs/map-layer-toggles/spec.md#requirement-a-map-can-offer-layers-to-switch-on-and-off
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnMapWidget from '../../src/components/CnMapWidget/CnMapWidget.vue'

const TOGGLES = [
	{ id: 'luchtfoto', label: 'Aerial photo (PDOK)', layer: { type: 'tile', url: 'https://service.pdok.nl/luchtfoto/{z}/{x}/{y}.jpeg' } },
	{ id: 'plan', label: 'Zoning plan (WMS)', on: false, layer: { type: 'wms', url: 'https://service.pdok.nl/omgevingsplan/wms', options: { layers: 'plan' } } },
]

/**
 * @param {object} content The widget content.
 * @return {{w: object, created: Array<string>}} The widget and the layer urls Leaflet was asked for.
 */
function widget(content) {
	const created = []
	const layer = { addTo() {
		return this
	}, on() {
		return this
	} }
	const tileLayer = (url) => {
		created.push(url)
		return layer
	}
	tileLayer.wms = (url) => {
		created.push(url)
		return layer
	}
	const w = shallowMount(CnMapWidget, {
		props: { content, basemaps: [{ name: 'PDOK', url: 'https://base/{z}/{x}/{y}.png' }] },
		global: { provide: { cnTranslate: (key) => ({ 'Aerial photo (PDOK)': 'Luchtfoto (PDOK)' }[key] ?? key) } },
	})
	w.vm.L = { tileLayer, geoJSON: () => layer, control: { layers: () => ({ addTo() {} }) } }
	w.vm.map = { addLayer() {}, removeLayer() {}, removeControl() {} }
	return { w, created }
}

describe('CnMapWidget layer toggles', () => {
	it('draws a Map layers fieldset with a switch per toggle, translated, in its starting state', async () => {
		const { w } = widget({ layerToggles: TOGGLES, layerTogglesTitle: 'Kaartlagen' })
		await flushPromises()
		expect(w.find('legend').text()).toBe('Kaartlagen')
		const boxes = w.findAll('[data-testid^="cn-map-layer-toggle-"]')
		expect(boxes.map((b) => b.element.checked)).toEqual([true, false])
		expect(w.find('[data-testid="cn-map-layer-toggles"]').text()).toContain('Luchtfoto (PDOK)')
	})

	it('mounts the layers that are on, and a switch adds or removes one', async () => {
		const { w, created } = widget({ layerToggles: TOGGLES })
		w.vm.renderLayers()
		expect(created).toContain('https://service.pdok.nl/luchtfoto/{z}/{x}/{y}.jpeg')
		expect(created).not.toContain('https://service.pdok.nl/omgevingsplan/wms')
		created.length = 0
		await w.find('[data-testid="cn-map-layer-toggle-plan"]').setValue(true)
		await flushPromises()
		expect(created).toContain('https://service.pdok.nl/omgevingsplan/wms')
		created.length = 0
		await w.find('[data-testid="cn-map-layer-toggle-luchtfoto"]').setValue(false)
		await flushPromises()
		expect(created).not.toContain('https://service.pdok.nl/luchtfoto/{z}/{x}/{y}.jpeg')
	})

	it('draws no fieldset without toggles', () => {
		expect(widget({}).w.find('[data-testid="cn-map-layer-toggles"]').exists()).toBe(false)
	})
})
