/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's short date ("5 okt") and waiting time ("3 dagen", "4 uur").
 * Runs through the real @nextcloud/l10n and the library's own catalogue, so
 * a missing Dutch plural or a language/locale mix-up shows here.
 *
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md
 */
const { registerTranslations } = require('../../src/l10n/index.js')
const { ageInDays, boardDateLocale, formatAge, formatBoardDate, resolveAgeVariant, shownAgeDays } = require('../../src/utils/boardDate.js')

const NOW = new Date(2026, 9, 9, 15, 0, 0)
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600000)

function setL10n(language, locale) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = locale
	registerTranslations()
}

afterAll(() => setL10n('en', 'en'))

describe('boardDateLocale', () => {
	it('takes the language when the locale is another language (a Dutch UI on the en_US default locale)', () => {
		setL10n('nl', 'en_US')
		expect(boardDateLocale()).toBe('nl')
	})

	it('keeps a regional locale of the same language', () => {
		setL10n('nl', 'nl_BE')
		expect(boardDateLocale()).toBe('nl-BE')
	})

	it('falls back to the locale when no language is set', () => {
		setL10n(undefined, 'de_DE')
		expect(boardDateLocale()).toBe('de-DE')
	})
})

describe('formatBoardDate', () => {
	it('writes day and short month in Dutch, without the year in the current year', () => {
		expect(formatBoardDate('2026-10-05', NOW, 'nl')).toBe('5 okt')
		expect(formatBoardDate('2026-10-30T09:00:00', NOW, 'nl')).toBe('30 okt')
	})

	it('adds the year outside the current year', () => {
		expect(formatBoardDate('2024-02-14', NOW, 'nl')).toBe('14 feb 2024')
	})

	it('reads the user language by default, so a Dutch UI on an en_US locale still says okt', () => {
		setL10n('nl', 'en_US')
		expect(formatBoardDate('2026-10-05', NOW)).toBe('5 okt')
	})

	it('returns an empty string for no date', () => {
		expect(formatBoardDate(null, NOW, 'nl')).toBe('')
		expect(formatBoardDate('garbage', NOW, 'nl')).toBe('')
	})
})

describe('formatAge', () => {
	describe('in Dutch', () => {
		beforeAll(() => setL10n('nl', 'nl_NL'))

		it('counts hours under a day', () => {
			expect(formatAge(hoursAgo(4), NOW)).toBe('4 uur')
			expect(formatAge(hoursAgo(0.2), NOW)).toBe('1 uur')
			expect(formatAge(hoursAgo(23.5), NOW)).toBe('23 uur')
		})

		it('counts whole calendar days after that', () => {
			expect(formatAge(hoursAgo(25), NOW)).toBe('1 dag')
			expect(formatAge(new Date(2026, 9, 7, 9, 0), NOW)).toBe('2 dagen')
			expect(formatAge('2026-10-06', NOW)).toBe('3 dagen')
		})

		it('reads a future date as no wait, and no date as nothing', () => {
			expect(formatAge(hoursAgo(-5), NOW)).toBe('0 uur')
			expect(formatAge(null, NOW)).toBe('')
			expect(formatAge('garbage', NOW)).toBe('')
		})
	})

	it('speaks English for an English reader', () => {
		setL10n('en', 'en_US')
		expect(formatAge(hoursAgo(1), NOW)).toBe('1 hour')
		expect(formatAge(hoursAgo(4), NOW)).toBe('4 hours')
		expect(formatAge('2026-10-08', NOW)).toBe('1 day')
		expect(formatAge('2026-10-06', NOW)).toBe('3 days')
	})
})

describe('age days and the threshold', () => {
	it('counts calendar days, and shows 0 under a day', () => {
		expect(ageInDays('2026-10-06', NOW)).toBe(3)
		expect(shownAgeDays(hoursAgo(20), NOW)).toBe(0)
		expect(shownAgeDays(hoursAgo(25), NOW)).toBe(1)
		expect(shownAgeDays(null, NOW)).toBeNull()
	})

	it('turns three days or more red, as PqTickets draws "3 dagen"', () => {
		const rules = [{ op: 'gte', value: 3, variant: 'error' }]
		expect(resolveAgeVariant('2026-10-06', rules, NOW)).toBe('error')
		expect(resolveAgeVariant('2026-10-07', rules, NOW)).toBe('')
		expect(resolveAgeVariant(hoursAgo(4), rules, NOW)).toBe('')
	})

	it('accepts danger as error, ignores an unknown variant and no rules', () => {
		expect(resolveAgeVariant('2026-10-01', [{ op: 'gte', value: 3, variant: 'danger' }], NOW)).toBe('error')
		expect(resolveAgeVariant('2026-10-01', [{ op: 'gte', value: 3, variant: 'magenta' }], NOW)).toBe('')
		expect(resolveAgeVariant('2026-10-01', undefined, NOW)).toBe('')
		expect(resolveAgeVariant(null, [{ op: 'gte', value: 0, variant: 'error' }], NOW)).toBe('')
	})
})
