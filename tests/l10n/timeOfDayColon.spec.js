/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every app writes a time of day with a colon ("10:00", "10:00 tot 11:00"),
 * in Dutch too. Runs the real @nextcloud/l10n and the library's catalogue.
 *
 * @spec openspec/changes/nl-time-of-day-colon/specs/relative-dates/spec.md#requirement-a-time-of-day-is-written-with-a-colon
 */
import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'
import { formatRelativeDate, formatTimeOfDay } from '../../src/utils/boardDate.js'

const NOW = new Date(2026, 9, 12, 15, 0, 0)

/**
 * @param {string} language The language to read in.
 */
function setLanguage(language) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = language
	registerTranslations()
}

describe('a time of day in Dutch', () => {
	afterEach(() => setLanguage('en'))

	it('🔴 is hours, a colon, then minutes', () => {
		setLanguage('nl')
		expect(t('nextcloud-vue', '{hours}:{minutes}', { hours: '10', minutes: '00' })).toBe('10:00')
		expect(formatTimeOfDay(new Date(2026, 9, 12, 9, 42))).toBe('09:42')
	})

	it('🔴 keeps the colon in a relative date and a time range', () => {
		setLanguage('nl')
		expect(formatRelativeDate(new Date(2026, 9, 12, 9, 42), { now: NOW, withTime: true })).toBe('vandaag, 09:42')
		const range = t('nextcloud-vue', '{from} to {to}', { from: formatTimeOfDay(new Date(2026, 9, 12, 10, 0)), to: formatTimeOfDay(new Date(2026, 9, 12, 11, 0)) })
		expect(range).toBe('10:00 tot 11:00')
	})

	it('is the same in English', () => {
		setLanguage('en')
		expect(formatTimeOfDay(new Date(2026, 9, 12, 9, 42))).toBe('09:42')
	})
})
