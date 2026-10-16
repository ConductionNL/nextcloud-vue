/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The confirm dialog, the action buttons, the dispatcher and the Buildiq edit
 * button in Dutch. The Zuiddrecht rehearsal (15 October 2026) showed "Are you
 * sure you want to continue?", "Confirm", "Action failed." and "Edit with
 * Buildiq" on a Dutch instance. Runs the real @nextcloud/l10n; the last test
 * reads every key these files translate, so a string added later without
 * Dutch fails here.
 *
 * @spec openspec/changes/case-action-chrome-in-dutch/specs/case-action-chrome-in-dutch/spec.md#requirement-a-dutch-reader-meets-the-action-chrome-in-dutch
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

const FILES = [
	'src/dialogs/CnConfirmDialog.vue',
	'src/dialogs/CnTransitionInputDialog.vue',
	'src/dialogs/CnWriteConfirmDialog.vue',
	'src/components/CnActionButtons/CnActionButtons.vue',
	'src/components/CnBuildiqEditButton/CnBuildiqEditButton.vue',
	'src/components/CnDetailPage/CnDetailPage.vue',
	'src/utils/actionsDispatcher.js',
]

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

describe('the action chrome in Dutch', () => {
	afterEach(() => setLanguage('en'))

	it('asks a Dutch reader in Dutch', () => {
		setLanguage('nl')
		expect(t('nextcloud-vue', 'Are you sure you want to continue?')).toBe('Weet je zeker dat je wilt doorgaan?')
		expect(t('nextcloud-vue', 'Confirm')).toBe('Bevestigen')
		expect(t('nextcloud-vue', 'Action failed.')).toBe('De actie is mislukt.')
		expect(t('nextcloud-vue', 'Edit with Buildiq')).toBe('Bewerken met Buildiq')
	})

	it('control: an English reader keeps the English', () => {
		setLanguage('en')
		expect(t('nextcloud-vue', 'Confirm')).toBe('Confirm')
	})

	it.each(FILES)('has Dutch for every string %s translates', (file) => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8')
		const keys = [...source.matchAll(KEY)].map((m) => m[1].replace(/\\'/g, '\''))
		expect(keys.length).toBeGreaterThan(0)
		expect(keys.filter((key) => !(key in nl.translations))).toEqual([])
	})
})
