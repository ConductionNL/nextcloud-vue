/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The selection entries of the Actions menu and the selection strip read the
 * board's Dutch (DcVergaderingen, DcBesluiten): "Selectie kopiëren",
 * "Selectie verwijderen" and "Selectie opheffen", not "Geselecteerde ...".
 * Runs the real @nextcloud/l10n, because a mock that returns its input cannot
 * tell a translated string from an untranslated one.
 */

import { translate as t } from '@nextcloud/l10n'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

describe('Selection wording in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('reads the board wording for the selection entries', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Copy selected')).toBe('Selectie kopiëren')
		expect(t('nextcloud-vue', 'Delete selected')).toBe('Selectie verwijderen')
		expect(t('nextcloud-vue', 'Clear selection')).toBe('Selectie opheffen')
	})

	it('has no "Geselecteerde ..." entry left in the Dutch catalogue', () => {
		const values = Object.values(nl.translations).filter((value) => typeof value === 'string')
		expect(values.filter((value) => value.startsWith('Geselecteerde '))).toEqual([])
	})
})
