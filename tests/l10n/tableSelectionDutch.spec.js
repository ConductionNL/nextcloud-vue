/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * CnDataTable's strings a Dutch reader met in English on 11 October 2026
 * (finding N-4): the checkbox labels "Select all rows" and "Select row", and
 * with them the other strings of the same component that had no Dutch, the
 * scroll region's name and the "{count} selected" chip of a reference filter.
 * Runs the real @nextcloud/l10n, because a mock that returns its input cannot
 * tell a translated string from an untranslated one. The last test reads
 * every key CnDataTable translates from its source, so a string added later
 * without Dutch fails here too.
 *
 * @spec openspec/changes/dutch-table-selection-labels/specs/dutch-table-selection-labels/spec.md#requirement-a-dutch-reader-meets-the-data-tables-own-strings-in-dutch
 */

import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

describe('CnDataTable strings in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('gives a Dutch reader the selection labels, the scroll region and the selected count in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Select all rows')).toBe('Alle rijen selecteren')
		expect(t('nextcloud-vue', 'Select row')).toBe('Rij selecteren')
		expect(t('nextcloud-vue', 'Scrollable table')).toBe('Scrollbare tabel')
		expect(t('nextcloud-vue', '{title} — scrollable table', { title: 'Zaken' })).toBe('Zaken, scrollbare tabel')
		expect(n('nextcloud-vue', '{count} selected', '{count} selected', 3, { count: 3 })).toBe('3 geselecteerd')
	})

	it('has Dutch for every string CnDataTable translates', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnDataTable', 'CnDataTable.vue'), 'utf8')
		const singular = [...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
		const plural = [...source.matchAll(/\bn\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
		expect(singular.length).toBeGreaterThan(10)
		expect(singular.filter((key) => !(key in nl.translations))).toEqual([])
		expect(plural.filter((key) => !(key in nl.plurals))).toEqual([])
	})
})
