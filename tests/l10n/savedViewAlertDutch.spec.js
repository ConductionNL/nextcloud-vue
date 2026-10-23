/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * CnSavedViewAlertWidget in Dutch as DqZoekresultaten draws it: the alert
 * fires from the threshold on (`operator: 'gte'`), so the switch reads
 * "Melden vanaf een aantal" and the line under it "12 of meer". Runs the real
 * @nextcloud/l10n, because a mock that returns its input cannot tell a
 * translated string from an untranslated one.
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('CnSavedViewAlertWidget strings in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('names the switch and its line the way the board does', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Tell me above a number')).toBe('Melden vanaf een aantal')
		expect(t('nextcloud-vue', 'A message to you when there are {threshold} or more', { threshold: 12 })).toBe('Bericht aan u als er 12 of meer zijn')
		expect(t('nextcloud-vue', 'Threshold')).toBe('Grens')
	})
})
