/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * How long ago a moment was, as DqMijnWerk's Verder werken says it
 * ("10 min geleden", "vanochtend", "vrijdag"). Runs through the real
 * @nextcloud/l10n and the library's own catalogue.
 *
 * @spec openspec/changes/relative-ago-formatter/specs/relative-ago-formatter/spec.md#requirement-a-template-reads-a-past-moment-as-how-long-ago-it-was
 */
const { registerTranslations } = require('../../src/l10n/index.js')
const { formatAgo } = require('../../src/utils/boardDate.js')
const { fillTemplate } = require('../../src/utils/fillTemplate.js')

// Monday 5 October 2026, 14:30.
const NOW = new Date(2026, 9, 5, 14, 30, 0)
const minutesAgo = (m) => new Date(NOW.getTime() - m * 60000)

function setL10n(language, locale) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = locale
	registerTranslations()
}

afterAll(() => setL10n('en', 'en'))

describe('formatAgo', () => {
	it('reads minutes, hours, then the part of today', () => {
		setL10n('en', 'en')
		expect(formatAgo(minutesAgo(0.5), NOW)).toBe('just now')
		expect(formatAgo(minutesAgo(10), NOW)).toBe('10 min ago')
		expect(formatAgo(minutesAgo(130), NOW)).toBe('2 hours ago')
		expect(formatAgo(new Date(2026, 9, 5, 9, 10), NOW)).toBe('this morning')
		expect(formatAgo(new Date(2026, 9, 5, 19, 0), new Date(2026, 9, 5, 23, 59))).toBe('this evening')
		expect(formatAgo(new Date(2026, 9, 5, 12, 0), new Date(2026, 9, 5, 16, 0))).toBe('this afternoon')
	})

	it('reads yesterday, a weekday within the week, then the short date', () => {
		setL10n('en', 'en')
		expect(formatAgo(new Date(2026, 9, 4, 18, 0), NOW)).toBe('yesterday')
		expect(formatAgo(new Date(2026, 9, 2, 11, 0), NOW)).toBe('Friday')
		expect(formatAgo(new Date(2026, 8, 14, 11, 0), NOW)).toBe('Sep 14')
	})

	it('speaks Dutch for a Dutch reader (DqMijnWerk)', () => {
		setL10n('nl', 'nl')
		expect(formatAgo(minutesAgo(10), NOW)).toBe('10 min geleden')
		expect(formatAgo(new Date(2026, 9, 5, 9, 10), NOW)).toBe('vanochtend')
		expect(formatAgo(new Date(2026, 9, 4, 18, 0), NOW)).toBe('gisteren')
		expect(formatAgo(new Date(2026, 9, 2, 11, 0), NOW)).toBe('vrijdag')
		expect(formatAgo(minutesAgo(70), NOW)).toBe('1 uur geleden')
	})

	it('reads nothing for a value that is not a date', () => {
		expect(formatAgo('not a date', NOW)).toBe('')
		expect(formatAgo(null, NOW)).toBe('')
	})

	it('is a template format', () => {
		setL10n('en', 'en')
		expect(fillTemplate('{viewedAt|ago}', { viewedAt: minutesAgo(10).toISOString() }, NOW)).toBe('10 min ago')
	})
})
