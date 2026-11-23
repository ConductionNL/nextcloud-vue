/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { currentLanguageTag, languageOptions, resolveDefaultToken, timezoneOptions } from '../../src/utils/pickerOptions.js'

// @nextcloud/l10n reads the language from this global (set by Nextcloud).
const original = globalThis._nc_l10n_language
afterEach(() => {
	globalThis._nc_l10n_language = original
})

describe('pickerOptions', () => {
	it('labels languages in the display language and keeps the code', () => {
		const { codes, labels } = languageOptions('nl')
		expect(codes).toContain('nl')
		expect(labels.nl).toBe('Nederlands')
		expect(labels.en).toBe('Engels')
	})

	it('returns the same list object for the same display language', () => {
		expect(languageOptions('en')).toBe(languageOptions('en'))
	})

	it('lists IANA time zones including UTC and Europe/Amsterdam', () => {
		const { codes, labels } = timezoneOptions()
		expect(codes).toContain('UTC')
		expect(codes).toContain('Europe/Amsterdam')
		expect(labels['America/New_York']).toBe('America/New York')
	})

	it('turns the Nextcloud language into a BCP 47 tag', () => {
		globalThis._nc_l10n_language = 'en_GB'
		expect(currentLanguageTag()).toBe('en-GB')
	})

	it('resolves current-language to the user language', () => {
		globalThis._nc_l10n_language = 'nl'
		expect(resolveDefaultToken('current-language', {})).toBe('nl')
	})

	it('fits current-language to a pattern that only takes the primary subtag', () => {
		globalThis._nc_l10n_language = 'en_GB'
		expect(resolveDefaultToken('current-language', { validation: { pattern: '^[a-z]{2}$' } })).toBe('en')
		expect(resolveDefaultToken('current-language', { validation: { pattern: '^[a-z]{2}(-[A-Z]{2})?$' } })).toBe('en-GB')
	})

	it('resolves current-timezone to the runtime time zone', () => {
		expect(resolveDefaultToken('current-timezone')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
	})

	it('returns null for an unknown token', () => {
		expect(resolveDefaultToken('tomorrow')).toBeNull()
	})
})
