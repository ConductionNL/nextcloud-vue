/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Build-time trim of the English catalogue, shared by rollup.config.js and
 * rollup.config.vue3.mjs.
 *
 * l10n/en.json maps 3007 of its 3008 strings to themselves. @nextcloud/l10n
 * returns the source string for a key it does not find, so those entries
 * change nothing at runtime, yet every app bundle carried them (176 KB
 * minified). The source file stays complete: parity checks and translators
 * read it as the list of keys. Only the shipped module drops the identity
 * entries. `plurals` stays whole, because pluralEntries() reads the English
 * plural msgid from it.
 */

import fs from 'fs'

const EN_CATALOGUE = /[\\/]l10n[\\/]en\.json$/

/**
 * Drop the translations that equal their key.
 *
 * @param {object} catalogue A parsed `{ translations, plurals }` catalogue.
 * @return {object} A new catalogue without the identity translations.
 */
export function withoutIdentityEntries(catalogue) {
	const translations = {}
	for (const [key, value] of Object.entries(catalogue.translations || {})) {
		if (value !== key) {
			translations[key] = value
		}
	}
	return { ...catalogue, translations }
}

/**
 * Rollup plugin: load l10n/en.json without its identity entries.
 *
 * @return {import('rollup').Plugin} The plugin; place it before `json()`.
 */
export function trimEnglishCatalogue() {
	return {
		name: 'trim-english-catalogue',
		load(id) {
			if (!EN_CATALOGUE.test(id)) {
				return null
			}
			const catalogue = JSON.parse(fs.readFileSync(id, 'utf8'))
			return JSON.stringify(withoutIdentityEntries(catalogue))
		},
	}
}
