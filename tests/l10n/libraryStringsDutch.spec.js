/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Library strings a Dutch reader met in English on 10 October 2026: the quick
 * filter chip, "(optional)" in form dialogs, and the files browser's New,
 * Size and Modified. Runs the real @nextcloud/l10n, because a mock that
 * returns its input cannot tell a translated string from an untranslated one.
 *
 * @spec openspec/changes/dutch-library-strings-and-files-crumb/specs/dutch-library-strings-and-files-crumb/spec.md#requirement-a-dutch-reader-meets-the-library-in-dutch
 */

import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('library strings in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('gives a Dutch reader the chip, the optional mark and the files browser in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', '{count} more filters', { count: 14 })).toBe('Nog 14 filters')
		expect(t('nextcloud-vue', 'optional')).toBe('optioneel')
		expect(t('nextcloud-vue', 'New')).toBe('Nieuw')
		expect(t('nextcloud-vue', 'Size')).toBe('Grootte')
		expect(t('nextcloud-vue', 'Modified')).toBe('Gewijzigd')
		expect(t('nextcloud-vue', 'Add files')).toBe('Bestanden toevoegen')
		expect(n('nextcloud-vue', '%n file added', '%n files added', 2)).toBe('2 bestanden toegevoegd')
	})
})
