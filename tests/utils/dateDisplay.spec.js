/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A relative date never hides the date.
 *
 * The load-bearing assertion is not that "3 days ago" renders. It is that the
 * exact date is in the accessible name AND the tooltip whenever it does,
 * because "3 dagen geleden" against a statutory term is the reading hazard
 * this option would otherwise introduce.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { formatDateForDisplay } from '../../src/utils/dateDisplay.js'

const NOW = new Date('2026-09-14T12:00:00Z')
const THREE_DAYS_AGO = new Date('2026-09-11T12:00:00Z')

describe('formatDateForDisplay — absolute', () => {
	it('shows the date, and says the same thing three ways', () => {
		const shown = formatDateForDisplay(THREE_DAYS_AGO, { mode: 'absolute', locale: 'en-GB' })

		expect(shown.text).toBe(shown.title)
		expect(shown.text).toBe(shown.accessibleName)
		expect(shown.text).toContain('2026')
	})

	it('is the default, so a caller that names no mode gets the unambiguous one', () => {
		expect(formatDateForDisplay(THREE_DAYS_AGO, { locale: 'en-GB' }).text)
			.toBe(formatDateForDisplay(THREE_DAYS_AGO, { mode: 'absolute', locale: 'en-GB' }).text)
	})

	it('carries the ISO form, so a caller can put it in a datetime attribute', () => {
		expect(formatDateForDisplay(THREE_DAYS_AGO).iso).toBe('2026-09-11T12:00:00.000Z')
	})
})

describe('formatDateForDisplay — relative', () => {
	it('reads relatively', () => {
		expect(formatDateForDisplay(THREE_DAYS_AGO, { mode: 'relative', locale: 'en-GB', now: NOW }).text)
			.toBe('3 days ago')
	})

	it('puts the exact date in the tooltip', () => {
		const shown = formatDateForDisplay(THREE_DAYS_AGO, { mode: 'relative', locale: 'en-GB', now: NOW })

		expect(shown.title).toContain('2026')
		expect(shown.title).not.toBe(shown.text)
	})

	it('puts the exact date in the accessible name too, so a screen reader is not left with the relative form', () => {
		const shown = formatDateForDisplay(THREE_DAYS_AGO, { mode: 'relative', locale: 'en-GB', now: NOW })

		expect(shown.accessibleName).toContain('3 days ago')
		expect(shown.accessibleName).toContain('2026')
	})

	it('never renders a relative date without its absolute date, at any distance', () => {
		// The property, not one example: a term is a term whether it runs in
		// hours or in months, and the hazard is the same at every distance.
		const distances = ['2026-09-14T11:30:00Z', '2026-09-13T12:00:00Z', '2026-08-14T12:00:00Z', '2025-09-14T12:00:00Z', '2026-09-20T12:00:00Z']

		for (const at of distances) {
			const shown = formatDateForDisplay(at, { mode: 'relative', locale: 'en-GB', now: NOW })
			expect(shown.title).toContain('202')
			expect(shown.accessibleName).toContain('202')
		}
	})

	it('reads a future date as future', () => {
		expect(formatDateForDisplay('2026-09-17T12:00:00Z', { mode: 'relative', locale: 'en-GB', now: NOW }).text)
			.toBe('in 3 days')
	})

	it('picks the largest unit that fits', () => {
		expect(formatDateForDisplay('2026-08-14T12:00:00Z', { mode: 'relative', locale: 'en-GB', now: NOW }).text)
			.toContain('month')
	})
})

describe('formatDateForDisplay — what is not a date', () => {
	it.each([[null], [undefined], ['']])('answers %p with null', (value) => {
		expect(formatDateForDisplay(value)).toBeNull()
	})

	it('answers an unparseable string with null rather than "Invalid Date"', () => {
		expect(formatDateForDisplay('not a date')).toBeNull()
	})

	it('takes a Date, a string and a timestamp alike', () => {
		const iso = '2026-09-11T12:00:00.000Z'

		expect(formatDateForDisplay(new Date(iso)).iso).toBe(iso)
		expect(formatDateForDisplay(iso).iso).toBe(iso)
		expect(formatDateForDisplay(Date.parse(iso)).iso).toBe(iso)
	})
})
