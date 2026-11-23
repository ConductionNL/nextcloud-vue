/**
 * The strings the action model and the case surfaces add reach a Dutch reader
 * in Dutch. Runs the real @nextcloud/l10n, because a mock that returns its
 * input cannot tell a translated string from an untranslated one.
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('case surface translations', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('gives a Dutch reader the new labels in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'More')).toBe('Meer')
		expect(t('nextcloud-vue', 'To do')).toBe('Nog doen')
		expect(t('nextcloud-vue', 'Due soon')).toBe('Bijna te laat')
		expect(t('nextcloud-vue', 'Partly public')).toBe('Deels openbaar')
		expect(t('nextcloud-vue', 'Administration')).toBe('Beheer')
		expect(t('nextcloud-vue', '{reviewed} of {total} reviewed', { reviewed: 2, total: 5 })).toBe('2 van 5 beoordeeld')
	})

	it('leaves an English reader the source strings', () => {
		expect(t('nextcloud-vue', '{reviewed} of {total} reviewed', { reviewed: 2, total: 5 })).toBe('2 of 5 reviewed')
	})
})
