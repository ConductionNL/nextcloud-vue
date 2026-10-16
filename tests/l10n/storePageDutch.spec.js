/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The store page in Dutch, as board PqStore reads: every string CnStorePage
 * translates has a Dutch and an English entry in the library catalogue, and
 * the board's own words come out of it. Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/screens-store-page-pq-board/specs/store-page/spec.md#requirement-the-store-page-draws-board-pqstore
 */

import { n, translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import en from '../../l10n/en.json'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnStorePage', 'CnStorePage.vue'), 'utf8')
const keys = [...new Set([...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]))]

describe('store page in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('has Dutch and English for every string the page translates', () => {
		expect(keys.length).toBeGreaterThanOrEqual(20)
		expect(keys.filter((key) => !(key in nl.translations))).toEqual([])
		expect(keys.filter((key) => !(key in en.translations))).toEqual([])
		expect(nl.plurals['%n update is ready.']).toHaveLength(2)
	})

	it('reads the board\'s words', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Updates available')).toBe('Updates beschikbaar')
		expect(t('nextcloud-vue', 'Installed from this store')).toBe('Geïnstalleerd uit deze store')
		expect(t('nextcloud-vue', 'Check now')).toBe('Nu controleren')
		expect(t('nextcloud-vue', 'Version {version}, {latest} is out', { version: '2.0.1', latest: '2.1.0' })).toBe('Versie 2.0.1, 2.1.0 is uit')
		expect(n('nextcloud-vue', '%n update is ready.', '%n updates are ready.', 2)).toBe('2 updates staan klaar.')
	})
})
