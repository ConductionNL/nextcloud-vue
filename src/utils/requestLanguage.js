/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * requestLanguage: the language an OpenRegister read asks for with `?_lang=`.
 * It is the page's `<html lang>`, which Nextcloud sets from the user's
 * language, and `en` when the page has none. `getLanguage()` from
 * @nextcloud/l10n is not used for this: without a `lang` attribute it falls
 * back to the browser's language (`en-US`), which is not a language
 * OpenRegister was asked to translate into.
 *
 * @module utils/requestLanguage
 */

/**
 * The `_lang` value for an OpenRegister read.
 *
 * @return {string} The page language, or 'en'.
 */
export function requestLanguage() {
	const lang = typeof document !== 'undefined' ? String(document.documentElement.lang || '').trim() : ''
	return lang !== '' ? lang : 'en'
}
