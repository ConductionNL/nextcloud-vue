/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Three library strings dossiq's boards draw that had no Dutch:
 * "No contacts linked" (CnContactsCard, CnContactsTab; DqZaakBetrokkenen),
 * "No relations yet" (CnRelatedObjectsWidget; DqZaakGerelateerd) and
 * "Period" (CnDashboardPage's date-range control; DqProcesanalyse). Runs the
 * real @nextcloud/l10n, because a mock that returns its input cannot tell a
 * translated string from an untranslated one.
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('empty states and the period control in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('reads Dutch for a Dutch reader', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		expect(t('nextcloud-vue', 'No contacts linked')).toBe('Geen contacten gekoppeld')
		expect(t('nextcloud-vue', 'No relations yet')).toBe('Nog geen relaties')
		expect(t('nextcloud-vue', 'Period')).toBe('Periode')
	})
})
