/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { getLanguage } from '@nextcloud/l10n'

/**
 * The reader's language as a BCP 47 tag (`nl`, `pt-BR`), '' when unknown.
 *
 * @return {string}
 */
export function readerLanguage() {
	try {
		return String(getLanguage() || '').replace('_', '-')
	} catch {
		return ''
	}
}

/**
 * A schema property's name in the reader's language: `titles[<language>]`,
 * then `titles[<base language>]` (`nl` for `nl-BE`), then `title`, then the
 * key. OpenRegister keeps `titles` beside `title` (modelling-field-names-per-language).
 *
 * @param {object} prop The property.
 * @param {string} key The property key.
 * @param {string} [language] The language; default the reader's.
 * @return {string} The name.
 * @spec openspec/changes/schema-titles-per-language/specs/schema-titles-per-language/spec.md#requirement-a-field-is-named-in-the-readers-language
 */
export function propertyTitle(prop, key, language = readerLanguage()) {
	const titles = prop && prop.titles && typeof prop.titles === 'object' ? prop.titles : null
	if (titles && language) {
		const exact = titles[language] ?? titles[language.replace('-', '_')]
		if (typeof exact === 'string' && exact !== '') {
			return exact
		}
		const base = titles[language.split('-')[0]]
		if (typeof base === 'string' && base !== '') {
			return base
		}
	}
	return (prop && typeof prop.title === 'string' && prop.title !== '' ? prop.title : '') || key
}
