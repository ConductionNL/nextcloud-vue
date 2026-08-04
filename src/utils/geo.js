/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading an OpenRegister object's location.
 *
 * Objects store their location on `@self.geo` as a GeoJSON **Point** geometry
 * (`{ type: 'Point', coordinates: [lng, lat] }` — note GeoJSON is lng-first).
 * Reading is deliberately tolerant, because the value can arrive in several shapes
 * depending on who wrote it: a bare Point geometry, a Feature, a FeatureCollection,
 * or a plain `{lat, lng}` / `{latitude, longitude}` object.
 *
 * This lives here rather than inside a component because two surfaces need it —
 * CnObjectGeoWidget (one object, editable) and CnMapWidget (many objects, plotted).
 * Duplicating the parser would let them disagree about what a valid location is.
 */

/**
 * Build a `{ lat, lng }` when both values are finite numbers, else null.
 *
 * Guards the whole module: a NaN or a string sneaking through here would surface as
 * an invisible marker or a Leaflet exception far from the cause.
 *
 * @param {*} lat Candidate latitude.
 * @param {*} lng Candidate longitude.
 * @return {?{lat: number, lng: number}} The point, or null when either is not finite.
 */
export function finitePoint(lat, lng) {
	// `Number(null)` and `Number('')` are BOTH 0 — and 0 is finite. Passing them
	// through would plant a marker at (0, 0), in the Gulf of Guinea, for every object
	// whose coordinates are simply absent. Reject the empty shapes before coercing.
	if (!isNumeric(lat) || !isNumeric(lng)) return null

	const latNum = Number(lat)
	const lngNum = Number(lng)
	if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null
	return { lat: latNum, lng: lngNum }
}

/**
 * Whether a value is a real number or a numeric string — excluding the empty shapes
 * (`null`, `undefined`, `''`, `[]`) that `Number()` silently turns into 0.
 *
 * @param {*} value The candidate.
 * @return {boolean} True when it can be safely coerced to a coordinate.
 */
function isNumeric(value) {
	if (typeof value === 'number') return Number.isFinite(value)
	if (typeof value !== 'string') return false
	return value.trim() !== '' && Number.isFinite(Number(value))
}

/**
 * Read a location out of whatever shape it was stored in.
 *
 * Accepts a Point geometry, a Feature, a FeatureCollection (first feature wins), or a
 * plain lat/lng object. Returns null for anything it cannot make sense of — callers
 * skip those rather than plotting a marker at (0, 0).
 *
 * @param {*} geo The raw value (typically `object['@self'].geo`).
 * @return {?{lat: number, lng: number}} The point, or null.
 */
export function parseGeoPoint(geo) {
	if (!geo || typeof geo !== 'object') return null

	// FeatureCollection → first feature.
	if (geo.type === 'FeatureCollection' && Array.isArray(geo.features) && geo.features.length) {
		return parseGeoPoint(geo.features[0])
	}
	// Feature → its geometry.
	if (geo.type === 'Feature' && geo.geometry) {
		return parseGeoPoint(geo.geometry)
	}
	// Point geometry → coordinates are [lng, lat], NOT [lat, lng].
	if (geo.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
		const [lng, lat] = geo.coordinates
		return finitePoint(lat, lng)
	}
	// Plain lat/lng shapes.
	return finitePoint(
		geo.lat ?? geo.latitude,
		geo.lng ?? geo.lon ?? geo.longitude,
	)
}

/**
 * Turn an OpenRegister object into a GeoJSON Point Feature, or null when it has no
 * usable location.
 *
 * Looks at `@self.geo` first (where the geo widget writes it). Falls back to plain
 * lat/lng fields on the object itself, so a schema that models coordinates as its own
 * properties still plots without having to migrate to `@self.geo`.
 *
 * @param {object} obj The OpenRegister object.
 * @param {object} [options] Options.
 * @param {string} [options.latField] Property holding latitude, for the fallback.
 * @param {string} [options.lngField] Property holding longitude, for the fallback.
 * @return {?object} A GeoJSON Feature whose `properties` is the object, or null.
 */
export function objectToGeoFeature(obj, options = {}) {
	if (!obj || typeof obj !== 'object') return null

	const self = obj['@self'] || {}
	let point = parseGeoPoint(self.geo)

	if (!point) {
		const { latField, lngField } = options
		if (latField && lngField) {
			point = finitePoint(obj[latField], obj[lngField])
		}
	}
	if (!point) return null

	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
		properties: { ...obj },
	}
}
