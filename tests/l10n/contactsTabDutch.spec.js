/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The contacts tab's empty state in Dutch: DqZaakBetrokkenen (r25b) showed
 * "Link a contact from your address book." in English under the Dutch title.
 * Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/board-contacts-in-card/specs/contacts/spec.md
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('contacts tab empty state in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('reads both lines in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'No contacts linked')).toBe('Geen contacten gekoppeld')
		expect(t('nextcloud-vue', 'Link a contact from your address book.')).toBe('Koppel een contact uit je adresboek.')
	})
})
