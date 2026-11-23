/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The base maps the map widget form offers. Each entry has the same shape as a
 * `basemaps[]` item of CnMapWidget (`name`, `url`, `attribution`, `options`), so
 * a chosen preset is stored as an ordinary base map and renders on any version.
 *
 * The PDOK tiles are the Dutch government's open base maps, served in
 * EPSG:3857 so Leaflet's default projection draws them. A consuming app must
 * allow `service.pdok.nl` in its Content-Security-Policy `img-src`.
 */

const PDOK_ATTRIBUTION = 'Kaartgegevens © <a href="https://www.kadaster.nl">Kadaster</a>'

export const BASEMAP_PRESETS = Object.freeze([
	Object.freeze({
		id: 'osm',
		name: 'OpenStreetMap',
		url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: '© OpenStreetMap contributors',
		options: Object.freeze({ maxZoom: 19 }),
	}),
	Object.freeze({
		id: 'pdok-brt',
		name: 'PDOK BRT achtergrondkaart',
		url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',
		attribution: PDOK_ATTRIBUTION,
		options: Object.freeze({ maxZoom: 19 }),
	}),
	Object.freeze({
		id: 'pdok-brt-grijs',
		name: 'PDOK BRT achtergrondkaart grijs',
		url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png',
		attribution: PDOK_ATTRIBUTION,
		options: Object.freeze({ maxZoom: 19 }),
	}),
	Object.freeze({
		id: 'pdok-brt-pastel',
		name: 'PDOK BRT achtergrondkaart pastel',
		url: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/pastel/EPSG:3857/{z}/{x}/{y}.png',
		attribution: PDOK_ATTRIBUTION,
		options: Object.freeze({ maxZoom: 19 }),
	}),
	Object.freeze({
		id: 'pdok-luchtfoto',
		name: 'PDOK luchtfoto',
		url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',
		attribution: PDOK_ATTRIBUTION,
		options: Object.freeze({ maxZoom: 19 }),
	}),
])

/**
 * The stored base map for a preset id, as a plain `basemaps[]` item.
 *
 * @param {string} id The preset id.
 * @return {{name: string, url: string, attribution: string, options: object}|null} The base map, or null.
 */
export function basemapFromPreset(id) {
	const preset = BASEMAP_PRESETS.find((entry) => entry.id === id)
	if (!preset) {
		return null
	}
	return { name: preset.name, url: preset.url, attribution: preset.attribution, options: { ...preset.options } }
}

/**
 * The preset a stored base map came from, matched on its tile URL.
 *
 * @param {object|undefined} basemap A `basemaps[]` item.
 * @return {string|null} The preset id, or null for a custom base map.
 */
export function presetOf(basemap) {
	const url = basemap && basemap.url
	const preset = BASEMAP_PRESETS.find((entry) => entry.url === url)
	return preset ? preset.id : null
}
