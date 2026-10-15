/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The stages widget and the lifecycle actions in Dutch. A Dutch handler moved
 * a case in Zuiddrecht live round 3 (14 October 2026) and read the toast
 * "Moved to Beoordeling" in English. Runs the real @nextcloud/l10n, because a
 * mock that returns its input cannot tell a translated string from an
 * untranslated one. The last test reads every key both components translate
 * from their source, so a string added later without Dutch fails here too.
 *
 * @spec openspec/changes/stages-and-lifecycle-dutch/specs/stages-and-lifecycle-dutch/spec.md#requirement-a-dutch-reader-meets-the-stages-and-lifecycle-strings-in-dutch
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

const COMPONENTS = [
	['CnStagesWidget', /\b(?:this\.tr|t\(\s*'nextcloud-vue'\s*,)\s*\(?\s*'((?:[^'\\]|\\.)*)'/g],
	['CnLifecycleActions', /\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g],
]

describe('stages and lifecycle strings in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('tells a Dutch reader where the record moved to', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Moved to {state}', { state: 'Beoordeling' })).toBe('Verplaatst naar Beoordeling')
		expect(t('nextcloud-vue', 'Moved {title} to {state}', { title: 'Zaak 2026-0117', state: 'Besluit' })).toBe('Zaak 2026-0117 verplaatst naar Besluit')
		expect(t('nextcloud-vue', 'Moved to {stage}', { stage: 'Besluit' })).toBe('Verplaatst naar Besluit')
		expect(t('nextcloud-vue', 'The move could not be made')).toBe('De verplaatsing is niet gelukt')
	})

	it.each(COMPONENTS)('has Dutch for every string %s translates', (name, pattern) => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', name, `${name}.vue`), 'utf8')
		const keys = [...source.matchAll(pattern)].map((m) => m[1])
		expect(keys.length).toBeGreaterThan(3)
		expect(keys.filter((key) => !(key in nl.translations))).toEqual([])
	})
})
