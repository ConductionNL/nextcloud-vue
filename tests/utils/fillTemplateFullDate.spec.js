/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{path|fulldate}` writes a date out in full, weekday first and capitalised
 * (PqEvenement: "Donderdag 12 november 2026, 19:30 tot 21:30").
 *
 * @spec openspec/changes/template-full-date/specs/detail-page-board-look/spec.md
 */
import { fillTemplate, formatFullDate } from '../../src/utils/fillTemplate.js'

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'nl',
	getCanonicalLocale: () => 'nl-NL',
	translate: (_app, s, vars) => s.replace(/\{(\w+)\}/g, (match, key) => (vars && key in vars ? String(vars[key]) : match)),
}))

describe('fulldate', () => {
	it('writes the weekday, the day, the month and the year', () => {
		expect(formatFullDate('2026-11-12T19:30:00')).toBe('Donderdag 12 november 2026')
	})

	it('fills a template, beside the time', () => {
		const event = { startAt: '2026-11-12T19:30:00', endAt: '2026-11-12T21:30:00' }
		expect(fillTemplate('{startAt|fulldate}, {startAt|time} tot {endAt|time}', event)).toBe('Donderdag 12 november 2026, 19:30 tot 21:30')
	})

	it('is empty for a value that is not a date', () => {
		expect(formatFullDate('not a date')).toBe('')
	})
})
