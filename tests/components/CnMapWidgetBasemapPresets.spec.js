/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The base map presets: the PDOK tile sources and OpenStreetMap, stored as
 * ordinary `basemaps[]` items so any version of the widget renders them.
 */
import { BASEMAP_PRESETS, basemapFromPreset, presetOf } from '@/components/CnMapWidget/basemapPresets.js'

describe('base map presets', () => {
	it('offers OpenStreetMap and the PDOK tile sources in EPSG:3857', () => {
		expect(BASEMAP_PRESETS.map((preset) => preset.id)).toEqual(['osm', 'pdok-brt', 'pdok-brt-grijs', 'pdok-brt-pastel', 'pdok-luchtfoto'])
		for (const preset of BASEMAP_PRESETS.filter((entry) => entry.id.startsWith('pdok'))) {
			expect(preset.url).toMatch(/^https:\/\/service\.pdok\.nl\/.+\/EPSG:3857\/\{z\}\/\{x\}\/\{y\}\.(png|jpeg)$/)
			expect(preset.attribution).toContain('Kadaster')
		}
	})

	it('stores a preset in the shape of a basemaps item, without the id', () => {
		expect(basemapFromPreset('pdok-brt')).toEqual({
			name: 'PDOK BRT achtergrondkaart',
			url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
			attribution: 'Kaartgegevens © <a href="https://www.kadaster.nl">Kadaster</a>',
			options: { maxZoom: 19 },
		})
		expect(basemapFromPreset('nope')).toBeNull()
	})

	it('recognises a stored base map by its tile URL, and a custom one as none', () => {
		expect(presetOf(basemapFromPreset('pdok-luchtfoto'))).toBe('pdok-luchtfoto')
		expect(presetOf({ url: 'https://tiles.example.org/{z}/{x}/{y}.png' })).toBeNull()
		expect(presetOf(undefined)).toBeNull()
	})
})
