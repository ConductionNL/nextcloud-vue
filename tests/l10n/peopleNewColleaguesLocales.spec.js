/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The people widget's New colleagues strings (CnPeopleWidget,
 * CnPeopleWidgetForm) read in every shipped language, not only English and
 * Dutch: LaunchPad ships 37 locales and its spec asks for the New colleagues
 * list and form in each of them. Runs the real @nextcloud/l10n through
 * registerTranslations, so an untranslated string shows as its English key.
 *
 * @spec openspec/changes/people-new-colleagues/specs/people-widget/spec.md
 */

import { translate as t } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import { registerTranslations } from '../../src/l10n/index.js'

const KEYS = [
	'The administrator has not set a start date field.',
	'Starts {weekday}',
	'Selection',
	'People by filter',
	'New colleagues',
	'Started in the last (days, 1–90)',
	'Starts within (days, 0–30)',
	'Must be between {min} and {max}',
]

const L10N = path.join(__dirname, '../../l10n')
const LOCALES = fs.readdirSync(L10N).filter((file) => file.endsWith('.json')).map((file) => file.slice(0, -5))

describe('New colleagues strings in every shipped locale', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('ships the 37 locales LaunchPad ships', () => {
		expect(LOCALES).toHaveLength(37)
	})

	it.each(LOCALES.filter((locale) => locale !== 'en'))('%s carries every New colleagues string with its placeholders', (locale) => {
		const catalogue = JSON.parse(fs.readFileSync(path.join(L10N, `${locale}.json`), 'utf8')).translations
		for (const key of KEYS) {
			expect(typeof catalogue[key]).toBe('string')
			expect(catalogue[key]).not.toBe('')
			const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
			expect(placeholders(catalogue[key])).toEqual(placeholders(key))
		}
	})

	it('reads the weekday line in German for a German reader', () => {
		globalThis._nc_l10n_language = 'de'
		registerTranslations()
		expect(t('nextcloud-vue', 'Starts {weekday}', { weekday: 'Montag' })).toBe('Beginnt am Montag')
		expect(t('nextcloud-vue', 'New colleagues')).toBe('Neue Kolleginnen und Kollegen')
	})
})
