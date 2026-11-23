/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The "All" lens reads "Alles", as every Dq board writes it (DqZoekresultaten,
 * DqZaken, DqContacten), not "Alle". Runs the real @nextcloud/l10n, because a
 * mock that returns its input cannot tell a translated string from an
 * untranslated one.
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('The All lens in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('reads "Alles"', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'All')).toBe('Alles')
	})
})
