/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow pages, the setup wizard and the stepper in Dutch
 * (nl-flow-wizard-strings): DqFlow and DqInstellen showed them in English.
 * Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/nl-flow-wizard-strings/specs/l10n/spec.md#requirement-a-new-library-string-has-dutch
 */

import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('flow, wizard and stepper strings in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('gives a Dutch reader the wizard, the stepper and the flow editor in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', '{context}, step {step} of {total}', { context: 'Instellen', step: 2, total: 4 })).toBe('Instellen, stap 2 van 4')
		expect(t('nextcloud-vue', 'completed')).toBe('afgerond')
		expect(t('nextcloud-vue', 'Set up this app')).toBe('Deze app instellen')
		expect(t('nextcloud-vue', 'This flow cannot run yet.')).toBe('Deze flow kan nog niet draaien.')
		expect(t('nextcloud-vue', 'New flow')).toBe('Nieuwe flow')
		expect(n('nextcloud-vue', 'Showing %n flow', 'Showing %n flows', 3)).toBe('3 flows')
	})
})
