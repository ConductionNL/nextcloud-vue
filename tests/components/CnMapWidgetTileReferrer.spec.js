/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the `referrerPolicy` CnMapWidget puts on every tile layer.
 *
 * Nextcloud sends `Referrer-Policy: no-referrer` on every page and Leaflet draws a
 * tile as a plain `<img>`, so tile requests left to the document policy carry no
 * `Referer`. OpenStreetMap's CDN answers those with an "App is not following the
 * tile usage policy" image and an `x-blocked` header — it is served as a normal
 * 200 PNG, so the map paints a grey grid rather than raising an error, which is
 * why the failure reads as an empty map instead of a broken one.
 *
 * An `<img>`-level policy overrides the document's, which is the whole fix.
 */
import { shallowMount } from '@vue/test-utils'
import CnMapWidget from '../../src/components/CnMapWidget/CnMapWidget.vue'

/**
 * Records the options object Leaflet is handed for each created layer.
 *
 * @param {Array<object>} created Array each `{ url, opts }` pair is pushed onto.
 * @return {object} The fake Leaflet namespace.
 */
function fakeLeaflet(created) {
	const layer = { addTo() {
		return this
	}, on() {
		return this
	}, remove() {} }
	const tileLayer = (url, opts) => {
		created.push({ url, opts })
		return layer
	}
	tileLayer.wms = (url, opts) => {
		created.push({ url, opts })
		return layer
	}
	return {
		tileLayer,
		geoJSON: () => layer,
		// `remove` matters: two basemaps make renderBasemaps store a layers control,
		// and the real Leaflet that finishes loading after the test calls
		// removeControl() on whatever it finds there.
		control: { layers: () => ({ addTo() {}, remove() {} }) },
	}
}

function widgetWith(propsData, created) {
	const w = shallowMount(CnMapWidget, { propsData, mocks: { t: (_a, s) => s } })
	w.vm.L = fakeLeaflet(created)
	w.vm.map = { addLayer() {}, removeLayer() {} }
	return w
}

const POLICY = 'strict-origin-when-cross-origin'

describe('CnMapWidget — tile referrer policy', () => {
	it('sets it on the OpenStreetMap fallback, the basemap nothing configures', () => {
		const created = []
		widgetWith({}, created).vm.renderBasemaps()

		expect(created).toHaveLength(1)
		expect(created[0].opts.referrerPolicy).toBe(POLICY)
	})

	it('sets it on every configured basemap, not just the first', () => {
		const created = []
		widgetWith({
			basemaps: [
				{ name: 'Standard', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
				{ name: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
			],
		}, created).vm.renderBasemaps()

		expect(created).toHaveLength(2)
		// The second is the one the layer switcher swaps in — it is loaded from the
		// same refererless document, so a policy on the first alone fixes nothing.
		expect(created.map((c) => c.opts.referrerPolicy)).toEqual([POLICY, POLICY])
	})

	it('sets it on a `tile` entry declared in `layers`', () => {
		const created = []
		widgetWith({
			layers: [{ type: 'tile', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' }],
		}, created).vm.renderLayers()

		expect(created).toHaveLength(1)
		expect(created[0].opts.referrerPolicy).toBe(POLICY)
	})

	it('sets it on a WMS layer too', () => {
		const created = []
		widgetWith({
			layers: [{ type: 'wms', url: 'https://geo.example.org/wms' }],
		}, created).vm.renderLayers()

		expect(created).toHaveLength(1)
		expect(created[0].opts.referrerPolicy).toBe(POLICY)
	})

	it('lets a consumer override it, including to the no-op `no-referrer`', () => {
		const created = []
		// An internal tile server behind the same firewall may want no referrer at
		// all; the default must be a default, not a policy the consumer cannot undo.
		widgetWith({
			basemaps: [{
				name: 'Internal',
				url: 'https://tiles.internal/{z}/{x}/{y}.png',
				options: { referrerPolicy: 'no-referrer' },
			}],
		}, created).vm.renderBasemaps()

		expect(created[0].opts.referrerPolicy).toBe('no-referrer')
	})

	it('preserves the options a consumer did set alongside the default', () => {
		const created = []
		widgetWith({
			basemaps: [{
				name: 'Standard',
				url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				attribution: '© OpenStreetMap contributors',
				options: { maxZoom: 19 },
			}],
		}, created).vm.renderBasemaps()

		expect(created[0].opts.maxZoom).toBe(19)
		expect(created[0].opts.attribution).toBe('© OpenStreetMap contributors')
		expect(created[0].opts.referrerPolicy).toBe(POLICY)
	})
})
