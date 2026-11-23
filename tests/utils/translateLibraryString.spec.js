/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A library string an app's catalogue lacks reads in the library's own
 * translation (r31: the AI button read "Open AI chat" in dossiq in Dutch).
 *
 * @spec openspec/changes/library-string-host-fallback/specs/i18n/spec.md
 */
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => (app === 'nextcloud-vue' && text === 'Open AI chat' ? 'AI-chat openen' : text),
	translatePlural: (app, one, many, n) => (n === 1 ? one : many),
	getLanguage: () => 'nl',
	getLocale: () => 'nl',
}))
jest.mock('../../src/l10n/index.js', () => ({ ensureTranslations: () => {} }))

const { translateLibraryString } = require('../../src/utils/libraryTranslate.js')

describe('translateLibraryString', () => {
	it('falls back to the library when the host answers the English back', () => {
		expect(translateLibraryString((text) => text, 'Open AI chat')).toBe('AI-chat openen')
	})

	it('keeps the host translation when it has one', () => {
		expect(translateLibraryString(() => 'AI-gesprek', 'Open AI chat')).toBe('AI-gesprek')
	})
})
