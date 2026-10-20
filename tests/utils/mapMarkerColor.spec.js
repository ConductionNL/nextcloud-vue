/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The colour of an index map's marker, from a field of its row.
 *
 * @spec openspec/changes/index-map-parity/specs/index-page/spec.md#requirement-a-marker-can-take-its-colour-from-a-field
 */
import { markerColorOf, normalizeMarkerColor, resolveCssColor } from '../../src/utils/mapMarkerColor.js'

describe('mapMarkerColor', () => {
	it('needs a field', () => {
		expect(normalizeMarkerColor(null)).toBeNull()
		expect(normalizeMarkerColor({ colorMap: {} })).toBeNull()
	})

	it('maps the field value through colorMap, else the default', () => {
		const rule = normalizeMarkerColor({ field: 'status', colorMap: { open: '#0b71ab' }, default: '#696969' })
		expect(markerColorOf({ status: 'open' }, rule)).toBe('#0b71ab')
		expect(markerColorOf({ status: 'closed' }, rule)).toBe('#696969')
		expect(markerColorOf({}, rule)).toBe('#696969')
	})

	it('reads the field under @self too', () => {
		const rule = normalizeMarkerColor({ field: 'kind', colorMap: { a: 'red' } })
		expect(markerColorOf({ '@self': { kind: 'a' } }, rule)).toBe('red')
	})

	it('follows a reference to the colour on the referenced row', () => {
		const rule = normalizeMarkerColor({
			field: 'status',
			source: { schema: 'statusType', colorField: 'colour' },
			colorMap: { blue: 'var(--nl-color-blue, #0b71ab)' },
		})
		const refs = new Map([['st-1', { id: 'st-1', colour: 'blue' }], ['st-2', { id: 'st-2', colour: '#123456' }]])
		expect(markerColorOf({ status: 'st-1' }, rule, refs)).toBe('var(--nl-color-blue, #0b71ab)')
		expect(markerColorOf({ status: { id: 'st-2' } }, rule, refs)).toBe('#123456')
		expect(markerColorOf({ status: 'st-9' }, rule, refs)).toBe('')
	})

	it('drops a colour that could break out of a style', () => {
		const rule = normalizeMarkerColor({ field: 'x', colorMap: { a: 'red;background:url(x)', b: 'url(evil)' } })
		expect(markerColorOf({ x: 'a' }, rule)).toBe('')
		expect(markerColorOf({ x: 'b' }, rule)).toBe('')
	})

	it('resolves var() to the custom property, else its fallback', () => {
		document.documentElement.style.setProperty('--test-map-colour', '#abcdef')
		expect(resolveCssColor('var(--test-map-colour, #000)')).toBe('#abcdef')
		expect(resolveCssColor('var(--not-set, #0b71ab)')).toBe('#0b71ab')
		expect(resolveCssColor('#112233')).toBe('#112233')
	})
})
