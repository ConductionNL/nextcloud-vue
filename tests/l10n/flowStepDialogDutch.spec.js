/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow step dialog in Dutch. pl6 PqFlow opened a step on a Dutch
 * instance and read "Advanced: edit as JSON" and "Remove step". Runs the
 * real @nextcloud/l10n; the last test reads every key the dialog
 * translates, so a string added later without Dutch fails here.
 *
 * @spec openspec/changes/case-action-chrome-in-dutch/specs/case-action-chrome-in-dutch/spec.md#requirement-a-dutch-reader-meets-the-action-chrome-in-dutch
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

const FILE = 'src/dialogs/CnFlowNodeEditModal.vue'
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

describe('the flow step dialog in Dutch', () => {
	afterEach(() => setLanguage('en'))

	it('names its controls in Dutch', () => {
		setLanguage('nl')
		expect(t('nextcloud-vue', 'Advanced: edit as JSON')).toBe('Geavanceerd: bewerken als JSON')
		expect(t('nextcloud-vue', 'Remove step')).toBe('Stap verwijderen')
		expect(t('nextcloud-vue', 'This step has no options.')).toBe('Deze stap heeft geen opties.')
	})

	it('control: an English reader keeps the English', () => {
		setLanguage('en')
		expect(t('nextcloud-vue', 'Remove step')).toBe('Remove step')
	})

	it('has Dutch for every string the dialog translates, without an em-dash', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', FILE), 'utf8')
		const keys = [...source.matchAll(KEY)].map((m) => m[1].replace(/\\'/g, '\''))
		expect(keys.length).toBeGreaterThan(0)
		expect(keys.filter((key) => !(key in nl.translations))).toEqual([])
		expect(keys.filter((key) => String(nl.translations[key]).includes('—'))).toEqual([])
	})
})
