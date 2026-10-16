/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The reports page in Dutch, as board PqReports reads: every string
 * CnReportsPage translates has a Dutch entry in the library catalogue, and
 * the board's own words come out of it. Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import en from '../../l10n/en.json'
import { registerTranslations } from '../../src/l10n/index.js'

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnReportsPage', 'CnReportsPage.vue'), 'utf8')
const keys = [...new Set([...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]))]

describe('reports page in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('has Dutch and English for every string the page translates', () => {
		expect(keys.length).toBeGreaterThanOrEqual(10)
		expect(keys.filter((key) => !(key in nl.translations))).toEqual([])
		expect(keys.filter((key) => !(key in en.translations))).toEqual([])
	})

	it('reads the board\'s words', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'All categories')).toBe('Alle categorieën')
		expect(t('nextcloud-vue', 'Opens its own page')).toBe('Opent een eigen pagina')
		expect(t('nextcloud-vue', 'Missing a report?')).toBe('Mis je een rapportage?')
		expect(t('nextcloud-vue', 'Categories')).toBe('Categorieën')
	})
})
