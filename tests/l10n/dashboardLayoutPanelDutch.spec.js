/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The dashboard layout panel in Dutch (board PqMijnWerkIndelen). Runs the
 * real @nextcloud/l10n, and reads every key the panel and its header button
 * translate from their source, so a string added later without Dutch fails.
 *
 * @spec openspec/changes/dashboard-layout-panel/specs/dashboard-page/spec.md#requirement-a-user-arranges-the-page-in-a-side-panel
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

describe('dashboard layout panel in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('reads as the board does', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Arrange page')).toBe('Pagina indelen')
		expect(t('nextcloud-vue', 'Arrange this page')).toBe('Deze pagina indelen')
		expect(t('nextcloud-vue', 'Back to default')).toBe('Terug naar standaard')
		expect(t('nextcloud-vue', 'Save layout')).toBe('Indeling opslaan')
		expect(t('nextcloud-vue', '{name} moved to position {position} of {total}', { name: 'Urgent', position: 1, total: 3 })).toBe('Urgent staat nu op plaats 1 van 3')
	})

	it('has Dutch for every string the panel translates', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnDashboardLayoutPanel', 'CnDashboardLayoutPanel.vue'), 'utf8')
		const keys = [...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
		expect(keys.length).toBeGreaterThanOrEqual(8)
		expect([...new Set([...keys, 'Arrange page'])].filter((key) => !(key in nl.translations))).toEqual([])
	})
})
