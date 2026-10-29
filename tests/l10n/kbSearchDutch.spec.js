/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The knowledge base search in Dutch. pipelinq's werkplek (board PqWerkplekKlant)
 * showed "Search the knowledge base" to a Dutch reader, because none of the
 * widget's strings had Dutch.
 *
 * @spec openspec/changes/nl-flow-wizard-strings/specs/l10n/spec.md#requirement-a-new-library-string-has-dutch
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

const FILE = 'src/components/CnKbSearchWidget/CnKbSearchWidget.vue'
const KEY = /\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g

/**
 * Switch the l10n runtime to one language.
 *
 * @param {string} language The language.
 */
function setLanguage(language) {
	globalThis._nc_l10n_language = language
	registerTranslations()
}

describe('the knowledge base search in Dutch', () => {
	afterEach(() => setLanguage('en'))

	it('labels the search for a Dutch reader as the board does', () => {
		setLanguage('nl')
		expect(t('nextcloud-vue', 'Search the knowledge base')).toBe('Zoek in de kennisbank')
		expect(t('nextcloud-vue', 'Suggested from the active summary')).toBe('Voorgesteld op basis van de samenvatting')
	})

	it('control: an English reader keeps the English', () => {
		setLanguage('en')
		expect(t('nextcloud-vue', 'Search the knowledge base')).toBe('Search the knowledge base')
	})

	it('has Dutch for every string the widget translates', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', FILE), 'utf8')
		const keys = [...source.matchAll(KEY)].map((m) => m[1].replace(/\\'/g, '\''))
		expect(keys.length).toBeGreaterThan(0)
		expect(keys.filter((key) => !(key in nl.translations))).toEqual([])
	})
})
