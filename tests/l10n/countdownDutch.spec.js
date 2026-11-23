/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The countdown tile's headline in Dutch (dossiq's Termijn tile read
 * "56 days left" on 10 October 2026). Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/walkthrough-autostart-and-countdown-dutch/specs/walkthrough-autostart-and-countdown-dutch/spec.md#requirement-the-countdown-tile-speaks-dutch
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('countdown headline in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('reads the days left, today and the days overdue in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', '{count} days left', { count: 56 })).toBe('Nog 56 dagen')
		expect(t('nextcloud-vue', '1 day left')).toBe('Nog 1 dag')
		expect(t('nextcloud-vue', 'Due today')).toBe('Vandaag')
		expect(t('nextcloud-vue', '1 day overdue')).toBe('1 dag te laat')
		expect(t('nextcloud-vue', '{count} days overdue', { count: 3 })).toBe('3 dagen te laat')
	})
})
