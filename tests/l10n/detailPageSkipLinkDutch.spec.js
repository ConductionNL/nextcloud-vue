/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The detail page's skip link in Dutch. It read "Skip to In behandeling
 * nemen" on a pipelinq ticket (Zuiddrecht live round 3) because "Skip to" was
 * looked up in the host app's catalogue, which did not carry the fragment.
 * Runs the real @nextcloud/l10n against the shipped catalogue.
 *
 * @spec openspec/changes/detail-page-strings-dutch/specs/detail-page-strings-dutch/spec.md#requirement-the-detail-page-speaks-the-readers-language
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import { registerTranslations } from '../../src/l10n/index.js'

describe('the detail page skip link in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('names the action in Dutch word order', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Skip to {action}', { action: 'In behandeling nemen' })).toBe('Ga naar In behandeling nemen')
	})

	it('asks the library catalogue, not the host, for the skip link', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnDetailPage', 'CnDetailPage.vue'), 'utf8')

		expect(source).toContain("t('nextcloud-vue', 'Skip to {action}'")
		expect(source).not.toContain("effectiveTranslate('Skip to')")
	})
})
