/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Dates read in the user's Nextcloud locale, not the browser's. The
 * Zuiddrecht rehearsal (nl_NL instance, English browser) showed 10/15/2026.
 *
 * @spec openspec/changes/dates-in-the-users-locale/specs/data-display/spec.md#requirement-a-date-reads-in-the-users-nextcloud-locale
 */
import { formatValue } from '../../src/utils/schema.js'
import { userLocale } from '../../src/utils/userLocale.js'

/**
 * Set the Nextcloud locale the l10n helpers read.
 *
 * @param {string} locale The Nextcloud locale, e.g. nl_NL.
 */
function setLocale(locale) {
	globalThis._nc_l10n_locale = locale
}

afterAll(() => setLocale('en'))

describe('userLocale', () => {
	it('answers the Nextcloud locale as a BCP 47 tag', () => {
		setLocale('nl_NL')
		expect(userLocale()).toBe('nl-NL')
	})

	it('writes a date the Dutch way on a Dutch locale', () => {
		setLocale('nl_NL')
		expect(formatValue('2026-10-15', { type: 'string', format: 'date' })).toBe('15-10-2026')
	})

	it('control: the same date on an American locale reads the American way', () => {
		setLocale('en_US')
		expect(formatValue('2026-10-15', { type: 'string', format: 'date' })).toBe('10/15/2026')
	})
})
