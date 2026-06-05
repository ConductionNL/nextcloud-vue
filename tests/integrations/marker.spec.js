/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for the shared `stripMarker` helper (ADR-019).
 *
 * Covers:
 *  - bracketed `[or:{uuid}]` marker stripped from anywhere in the string;
 *  - bare `or:{uuid}` marker (no brackets) also stripped;
 *  - `null` / `undefined` / non-string input returns `''`;
 *  - non-marker content with "or:" prefix is preserved;
 *  - whitespace is collapsed cleanly.
 */

const { stripMarker, isMarkerOnly } = require('../../src/integrations/utils/marker.js')

describe('stripMarker', () => {
	it('strips a bracketed marker at the start', () => {
		expect(stripMarker('[or:1fc4dc2e-08f1-49bb-aca5-4d49a425a261] verification poll'))
			.toBe('verification poll')
	})

	it('strips a bracketed marker at the end', () => {
		expect(stripMarker('Field office [or:obj-1]')).toBe('Field office')
	})

	it('strips a bare or:{uuid} marker (no brackets)', () => {
		// Real-world: maps_favorites.category = 'or:a270fe68-...'
		expect(stripMarker('or:a270fe68-df45-4427-8cb9-3c33eefc2e88'))
			.toBe('')
	})

	it('strips a bare marker embedded in surrounding text', () => {
		expect(stripMarker('office or:a270fe68-df45-4427-8cb9-3c33eefc2e88'))
			.toBe('office')
	})

	it('returns "" for null / undefined / empty', () => {
		expect(stripMarker(null)).toBe('')
		expect(stripMarker(undefined)).toBe('')
		expect(stripMarker('')).toBe('')
	})

	it('coerces non-string input to string', () => {
		expect(stripMarker(42)).toBe('42')
	})

	it('preserves legitimate "or:" prefixes that are not UUIDs', () => {
		// Poll option labels like "or:choice" must NOT be eaten.
		expect(stripMarker('or:choice')).toBe('or:choice')
	})

	it('collapses internal whitespace', () => {
		expect(stripMarker('  Field   office  [or:abc12345-foo]  '))
			.toBe('Field office')
	})
})

describe('isMarkerOnly', () => {
	it('returns true when the string is just a bracketed marker', () => {
		expect(isMarkerOnly('[or:abc12345-aaaa-bbbb-cccc-dddddddddddd]')).toBe(true)
	})

	it('returns true when the string is just a bare marker', () => {
		expect(isMarkerOnly('or:a270fe68-df45-4427-8cb9-3c33eefc2e88')).toBe(true)
	})

	it('returns false when there is content alongside the marker', () => {
		expect(isMarkerOnly('Field office [or:obj-1]')).toBe(false)
	})

	it('returns false for empty / null', () => {
		expect(isMarkerOnly('')).toBe(false)
		expect(isMarkerOnly(null)).toBe(false)
	})
})
