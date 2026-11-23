/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Spatial filters and detail links for a map that plots OpenRegister objects.
 *
 * `markers.dataSource.spatialFilter` narrows the objects to an area, through
 * OpenRegister's geo filters:
 *   - `{ bbox: [west, south, east, north] }` → `GET ?geo.bbox=w,s,e,n`
 *   - `{ near: [lon, lat], radius: meters }` → `GET ?geo.near=lon,lat&geo.radius=m`
 *   - `{ within: <GeoJSON Polygon|MultiPolygon> }` → `POST …/geo-search`
 * The map's `markers.geoProperty`, when set, is sent as `geo.property` so the
 * filter reads the same property the map draws.
 *
 * `markers.detailLink` is the address a clicked feature opens in a new tab: a
 * template whose `{id}`, `{register}`, `{schema}` and `{<property>}` tokens are
 * filled from the object. Without a template, a `url` the object carries (the
 * address OpenRegister's deep-link registry stamps) is opened instead. An
 * app-absolute path gets the instance's webroot.
 */

import { prefixUrl } from '../../utils/headers.js'
import { safeHref } from '../../utils/safeHref.js'

const POLYGON_TYPES = ['Polygon', 'MultiPolygon']

/**
 * Whether every entry is a finite number and there are `length` of them.
 *
 * @param {unknown} list The value.
 * @param {number} length The expected length.
 * @return {boolean}
 */
function isNumberTuple(list, length) {
	return Array.isArray(list) && list.length === length && list.every((n) => Number.isFinite(Number(n)) && n !== '' && n !== null)
}

/**
 * The OpenRegister request a spatial filter makes, or null when there is no
 * usable filter. A malformed filter is ignored rather than sent, so a typo in
 * a widget's config never empties the map with a 422.
 *
 * @param {object|null|undefined} spatialFilter The `dataSource.spatialFilter` block.
 * @param {string} [geoProperty] The property the map draws, sent as `geo.property`.
 * @return {{params: object}|{body: object}|null} Query params for the listing, or a geo-search body.
 * @spec openspec/changes/map-spatial-filter-and-detail-link/specs/map-spatial-filter-and-detail-link/spec.md#requirement-a-map-can-narrow-its-objects-to-an-area
 */
export function spatialFilterRequest(spatialFilter, geoProperty) {
	if (!spatialFilter || typeof spatialFilter !== 'object') {
		return null
	}
	const property = typeof geoProperty === 'string' && geoProperty !== '' ? { 'geo.property': geoProperty } : {}

	const within = spatialFilter.within
	if (within && typeof within === 'object' && POLYGON_TYPES.includes(within.type) && Array.isArray(within.coordinates)) {
		const body = { geometry: { within } }
		if (property['geo.property']) {
			body.property = property['geo.property']
		}
		return { body }
	}
	if (isNumberTuple(spatialFilter.bbox, 4)) {
		return { params: { 'geo.bbox': spatialFilter.bbox.map(Number).join(','), ...property } }
	}
	if (isNumberTuple(spatialFilter.near, 2) && Number(spatialFilter.radius) > 0) {
		return {
			params: {
				'geo.near': spatialFilter.near.map(Number).join(','),
				'geo.radius': String(Number(spatialFilter.radius)),
				...property,
			},
		}
	}
	return null
}

/**
 * The value a detail-link token reads from an object.
 *
 * @param {object} object The feature's properties (the OpenRegister object).
 * @param {string} token The token name.
 * @return {unknown}
 */
function tokenValue(object, token) {
	const self = object['@self'] && typeof object['@self'] === 'object' ? object['@self'] : {}
	if (token === 'id') {
		return self.id ?? object.id ?? object.uuid
	}
	if (token === 'register' || token === 'schema') {
		return self[token] ?? object[token]
	}
	return object[token]
}

/**
 * The address a clicked feature opens, or null when it has none. A template
 * with a token the object cannot fill gives null, so a click never opens a
 * half-built address.
 *
 * @param {object|null} feature The clicked GeoJSON feature.
 * @param {string} [template] The `markers.detailLink` template.
 * @return {string|null} A safe href, or null.
 * @spec openspec/changes/map-spatial-filter-and-detail-link/specs/map-spatial-filter-and-detail-link/spec.md#requirement-a-clicked-object-opens-its-detail-page
 */
export function featureDetailUrl(feature, template) {
	const object = feature && feature.properties && typeof feature.properties === 'object' ? feature.properties : null
	if (object === null) {
		return null
	}
	let href = null
	if (typeof template === 'string' && template !== '') {
		let missing = false
		href = template.replace(/\{([\w@.-]+)\}/g, (_match, token) => {
			const value = tokenValue(object, token)
			if (value === undefined || value === null || value === '' || typeof value === 'object') {
				missing = true
				return ''
			}
			return encodeURIComponent(String(value))
		})
		if (missing) {
			return null
		}
	} else if (typeof object.url === 'string' && object.url !== '') {
		href = object.url
	}
	if (href === null) {
		return null
	}
	const safe = safeHref(href)
	return safe === '#' ? null : prefixUrl(safe)
}
