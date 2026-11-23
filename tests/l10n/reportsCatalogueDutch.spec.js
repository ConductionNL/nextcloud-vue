/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The reports catalogue in Dutch: its category filter's "all" option, the
 * filter label and the empty text (board PqReports draws "Alle categorieën").
 * Runs the real @nextcloud/l10n; the last test reads every key the page
 * translates from its source, so a string added later without Dutch fails.
 *
 * @spec openspec/changes/reports-catalogue-dutch/specs/reports-catalogue-dutch/spec.md#requirement-the-reports-catalogue-reads-dutch-for-a-dutch-reader
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

describe('reports catalogue in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('names the category filter and its options as the board does', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'All categories')).toBe('Alle categorieën')
		expect(t('nextcloud-vue', 'Category')).toBe('Categorie')
		expect(t('nextcloud-vue', 'Reports')).toBe('Rapporten')
		expect(t('nextcloud-vue', 'No reports in this category.')).toBe('Geen rapporten in deze categorie.')
	})

	it('has Dutch for every string the page translates', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnReportsPage', 'CnReportsPage.vue'), 'utf8')
		const keys = [...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])

		expect(keys.length).toBeGreaterThanOrEqual(4)
		expect([...new Set(keys)].filter((key) => !(key in nl.translations))).toEqual([])
	})
})
