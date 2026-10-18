/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * DqInstellingen draws a connection's state as "Aan / Uit / Fout"; the
 * `connectionStatus` formatter drew the full "Geconfigureerd / Niet
 * geconfigureerd / Uitgeschakeld". With `formatterOptions.short` it draws the
 * three short labels. Runs the real @nextcloud/l10n.
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'
import { formatConnectionStatus } from '../../src/utils/builtInFormatters.js'

describe('connectionStatus short labels', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('folds the seven states into On, Off and Error', () => {
		const short = (value) => formatConnectionStatus(value, {}, {}, { short: true })
		expect(['configured', 'limited', 'simulated'].map(short)).toEqual(['On', 'On', 'On'])
		expect(['unconfigured', 'disabled', 'unavailable'].map(short)).toEqual(['Off', 'Off', 'Off'])
		expect(short('error')).toBe('Error')
		expect(short('later-state')).toBe('later-state')
	})

	it('reads Aan, Uit and Fout for a Dutch reader, and keeps the full labels without the option', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		const short = (value) => formatConnectionStatus(value, {}, {}, { short: true })
		expect([short('configured'), short('disabled'), short('error')]).toEqual(['Aan', 'Uit', 'Fout'])
		expect(formatConnectionStatus('configured')).toBe(t('nextcloud-vue', 'Configured'))
	})
})
