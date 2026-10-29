/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * When something is due, as PqDashboard's Terugbelverzoeken says it: the time
 * today ("13:00"), "morgen", the weekday later this week ("woensdag"), then
 * the board's short date.
 *
 * @spec openspec/changes/soon-date-format/specs/soon-date-format/spec.md#requirement-a-template-reads-a-coming-moment-as-when-it-is-due
 */
const { registerTranslations } = require('../../src/l10n/index.js')
const { formatSoon } = require('../../src/utils/boardDate.js')
const { fillTemplate } = require('../../src/utils/fillTemplate.js')

// Monday 5 October 2026, 09:30.
const NOW = new Date(2026, 9, 5, 9, 30, 0)
const at = (days, hours, minutes = 0) => new Date(2026, 9, 5 + days, hours, minutes, 0)

function setL10n(language, locale) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = locale
	registerTranslations()
}

afterAll(() => setL10n('en', 'en'))

describe('formatSoon', () => {
	it('reads the time today, tomorrow, the weekday this week, then the short date', () => {
		setL10n('nl', 'nl')
		expect(formatSoon(at(0, 13), NOW)).toBe('13:00')
		expect(formatSoon(at(1, 10), NOW)).toBe('morgen')
		expect(formatSoon(at(2, 11), NOW)).toBe('woensdag')
		expect(formatSoon(at(6, 11), NOW)).toBe('zondag')
		expect(formatSoon(at(7, 11), NOW)).toBe('12 okt')
	})

	it('reads an earlier moment today as its time, and an earlier day as its short date', () => {
		setL10n('nl', 'nl')
		expect(formatSoon(at(0, 8, 15), NOW)).toBe('08:15')
		expect(formatSoon(at(-1, 16), NOW)).toBe('gisteren')
		expect(formatSoon(at(-3, 16), NOW)).toBe('2 okt')
	})

	it('is a template format', () => {
		setL10n('en', 'en')
		expect(fillTemplate('{deadline|soon}', { deadline: at(1, 10).toISOString() }, NOW)).toBe('tomorrow')
		expect(fillTemplate('{deadline|soon}', { deadline: '' }, NOW)).toBe('')
	})
})
