/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading an OpenRegister object's location.
 *
 * This parser is shared by CnObjectGeoWidget (one object, editable) and CnMapWidget
 * (many objects, plotted). Duplicating it would let the two disagree about what a
 * valid location is — one plotting a marker the other refuses to show.
 *
 * The invariant that matters most: an unusable location returns null so the caller
 * SKIPS the object. Coercing it to 0 would plant a marker in the Gulf of Guinea, and
 * a confidently wrong marker is worse than an absent one.
 */
import { finitePoint, objectToGeoFeature, parseGeoGeometry, parseGeoPoint } from '../../src/utils/geo.js'

describe('finitePoint', () => {
	it('accepts finite numbers, including 0 and negatives', () => {
		expect(finitePoint(52.13, 5.29)).toEqual({ lat: 52.13, lng: 5.29 })
		expect(finitePoint(0, 0)).toEqual({ lat: 0, lng: 0 })
		expect(finitePoint(-33.86, 151.2)).toEqual({ lat: -33.86, lng: 151.2 })
	})

	it('accepts numeric strings (APIs return them)', () => {
		expect(finitePoint('52.13', '5.29')).toEqual({ lat: 52.13, lng: 5.29 })
	})

	it('rejects anything not finite — never coerces to 0', () => {
		expect(finitePoint(null, 5)).toBeNull()
		expect(finitePoint(undefined, undefined)).toBeNull()
		expect(finitePoint(NaN, 5)).toBeNull()
		expect(finitePoint('nope', 5)).toBeNull()
		expect(finitePoint(52, '')).toBeNull()
	})
})

describe('parseGeoPoint', () => {
	// GeoJSON is lng-first. Getting this backwards puts Dutch objects in Somalia.
	it('reads a Point geometry, honouring lng-first coordinates', () => {
		expect(parseGeoPoint({ type: 'Point', coordinates: [5.29, 52.13] }))
			.toEqual({ lat: 52.13, lng: 5.29 })
	})

	it('unwraps a Feature', () => {
		expect(parseGeoPoint({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [5.29, 52.13] },
		})).toEqual({ lat: 52.13, lng: 5.29 })
	})

	it('unwraps a FeatureCollection (first feature wins)', () => {
		expect(parseGeoPoint({
			type: 'FeatureCollection',
			features: [
				{ type: 'Feature', geometry: { type: 'Point', coordinates: [5.29, 52.13] } },
				{ type: 'Feature', geometry: { type: 'Point', coordinates: [4.9, 52.37] } },
			],
		})).toEqual({ lat: 52.13, lng: 5.29 })
	})

	it('accepts plain lat/lng shapes', () => {
		expect(parseGeoPoint({ lat: 52.13, lng: 5.29 })).toEqual({ lat: 52.13, lng: 5.29 })
		expect(parseGeoPoint({ latitude: 52.13, longitude: 5.29 })).toEqual({ lat: 52.13, lng: 5.29 })
		expect(parseGeoPoint({ lat: 52.13, lon: 5.29 })).toEqual({ lat: 52.13, lng: 5.29 })
	})

	it('returns null for junk rather than a (0,0) marker', () => {
		expect(parseGeoPoint(null)).toBeNull()
		expect(parseGeoPoint('somewhere')).toBeNull()
		expect(parseGeoPoint({})).toBeNull()
		expect(parseGeoPoint({ type: 'Point', coordinates: [] })).toBeNull()
		expect(parseGeoPoint({ type: 'Polygon', coordinates: [[[0, 0]]] })).toBeNull()
	})
})

describe('objectToGeoFeature', () => {
	it('builds a Feature from @self.geo and keeps the object as properties', () => {
		const obj = { id: 7, name: 'Barn', '@self': { geo: { type: 'Point', coordinates: [5.29, 52.13] } } }
		const feature = objectToGeoFeature(obj)

		expect(feature.type).toBe('Feature')
		expect(feature.geometry).toEqual({ type: 'Point', coordinates: [5.29, 52.13] })
		// The popup reads from properties, so the whole object must survive.
		expect(feature.properties.name).toBe('Barn')
	})

	it('falls back to latField/lngField so a schema modelling its own coords still plots', () => {
		const obj = { id: 8, name: 'Field', lat: 52.5, lng: 6.1 }
		const feature = objectToGeoFeature(obj, { latField: 'lat', lngField: 'lng' })

		expect(feature.geometry.coordinates).toEqual([6.1, 52.5])
	})

	it('prefers @self.geo over the fallback fields', () => {
		const obj = {
			'@self': { geo: { type: 'Point', coordinates: [5.29, 52.13] } },
			lat: 1,
			lng: 1,
		}
		expect(objectToGeoFeature(obj, { latField: 'lat', lngField: 'lng' }).geometry.coordinates)
			.toEqual([5.29, 52.13])
	})

	it('returns null for an object with no usable location — it must be SKIPPED, not plotted at 0,0', () => {
		expect(objectToGeoFeature({ id: 9, name: 'Nowhere' })).toBeNull()
		expect(objectToGeoFeature({ id: 9, '@self': {} })).toBeNull()
		expect(objectToGeoFeature({ id: 9, '@self': { geo: null } })).toBeNull()
		expect(objectToGeoFeature(null)).toBeNull()
	})
})

describe('objectToGeoFeature with a geoProperty', () => {
	const polygon = { type: 'Polygon', coordinates: [[[5, 52], [5.1, 52], [5.1, 52.1], [5, 52]]] }

	it('plots the geometry the property holds, of any type', () => {
		expect(objectToGeoFeature({ id: 1, area: polygon }, { geoProperty: 'area' }).geometry).toEqual(polygon)
		const line = { type: 'LineString', coordinates: [[5, 52], [5.2, 52.2]] }
		expect(objectToGeoFeature({ route: { type: 'Feature', geometry: line } }, { geoProperty: 'route' }).geometry).toEqual(line)
	})

	it('reads a point-shaped value, lng first', () => {
		expect(objectToGeoFeature({ spot: { lat: 52.1, lng: 5.1 } }, { geoProperty: 'spot' }).geometry)
			.toEqual({ type: 'Point', coordinates: [5.1, 52.1] })
	})

	it('falls back to @self.geo when the property is empty', () => {
		const obj = { area: null, '@self': { geo: { type: 'Point', coordinates: [5.29, 52.13] } } }
		expect(objectToGeoFeature(obj, { geoProperty: 'area' }).geometry.coordinates).toEqual([5.29, 52.13])
	})

	it('keeps the object as the properties', () => {
		expect(objectToGeoFeature({ id: 7, area: polygon }, { geoProperty: 'area' }).properties).toEqual({ id: 7, area: polygon })
	})
})

describe('parseGeoGeometry', () => {
	it('refuses what is not a usable geometry', () => {
		expect(parseGeoGeometry(null)).toBeNull()
		expect(parseGeoGeometry({ type: 'Polygon', coordinates: [] })).toBeNull()
		expect(parseGeoGeometry({ type: 'Circle', coordinates: [1, 2] })).toBeNull()
		expect(parseGeoGeometry({ type: 'Point', coordinates: ['x', 'y'] })).toBeNull()
	})
})
