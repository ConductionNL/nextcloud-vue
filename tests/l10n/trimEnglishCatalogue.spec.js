/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The shipped English catalogue drops the strings that translate to
 * themselves (176 KB -> 6 KB in dist/esm/l10n/en.json.js), while
 * l10n/en.json stays the complete list of keys.
 */

import { register, translate } from '@nextcloud/l10n'
import fs from 'fs'
import path from 'path'
import { trimEnglishCatalogue, withoutIdentityEntries } from '../../rollup.l10n.mjs'

const EN = path.join(__dirname, '../../l10n/en.json')

describe('withoutIdentityEntries', () => {
	it('drops translations equal to their key and keeps the rest', () => {
		const out = withoutIdentityEntries({
			translations: { Save: 'Save', 'Task deadline': 'Deadline' },
			plurals: { '%n day': ['%n day', '%n days'] },
		})
		expect(out.translations).toEqual({ 'Task deadline': 'Deadline' })
		expect(out.plurals).toEqual({ '%n day': ['%n day', '%n days'] })
	})

	it('does not mutate its input', () => {
		const input = { translations: { Save: 'Save' } }
		withoutIdentityEntries(input)
		expect(input.translations).toEqual({ Save: 'Save' })
	})

	it('keeps every non-identity English translation and every plural', () => {
		const full = JSON.parse(fs.readFileSync(EN, 'utf8'))
		const trimmed = withoutIdentityEntries(full)
		for (const [key, value] of Object.entries(full.translations)) {
			if (value !== key) {
				expect(trimmed.translations[key]).toBe(value)
			}
		}
		expect(trimmed.plurals).toEqual(full.plurals)
		expect(Object.keys(trimmed.translations).length).toBeLessThan(Object.keys(full.translations).length / 10)
	})

	it('changes no English string at runtime', () => {
		const full = JSON.parse(fs.readFileSync(EN, 'utf8'))
		register('cn-trim-test', withoutIdentityEntries(full).translations)
		for (const key of Object.keys(full.translations).slice(0, 200)) {
			expect(translate('cn-trim-test', key)).toBe(full.translations[key])
		}
	})
})

describe('trimEnglishCatalogue (rollup plugin)', () => {
	it('loads only l10n/en.json, trimmed', () => {
		const plugin = trimEnglishCatalogue()
		const loaded = JSON.parse(plugin.load(EN))
		expect(loaded.translations).toEqual(withoutIdentityEntries(JSON.parse(fs.readFileSync(EN, 'utf8'))).translations)
		expect(plugin.load(path.join(__dirname, '../../l10n/nl.json'))).toBeNull()
		expect(plugin.load('/x/src/index.js')).toBeNull()
	})
})
