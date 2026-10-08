/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The label lookup of an app whose manifest carries translations.
 *
 * Labels are written once, in the manifest's `i18n.sourceLanguage`, and
 * `i18n.labels[<language>]` maps the text as written to its translation. The
 * lookup, per label:
 *
 *  1. when the language is not the source language: the manifest's translation
 *     for the language, then for its base (`en_GB` falls back to `en`);
 *  2. otherwise the host's `translate(text, vars)`, whose answer is the text
 *     itself when it has no translation;
 *  3. the text as written.
 *
 * The fallback is per label, never per page. The manifest is read through a
 * getter on every call, so an edit to the working copy shows at once.
 *
 * @module utils/manifestTranslate
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-2
 */

/**
 * The base of a language code: `en_GB` and `en-GB` give `en`.
 *
 * @param {string} language A Nextcloud language code.
 * @return {string} The part before the region.
 */
export function baseLanguage(language) {
	return String(language || '').split(/[-_]/)[0]
}

/**
 * Fill `{name}` placeholders from `vars`, as Nextcloud's `t()` does.
 *
 * @param {string} text The text.
 * @param {object} [vars] Values by placeholder name.
 * @return {string} The text with the placeholders filled.
 */
function fill(text, vars) {
	if (!vars || typeof vars !== 'object') {
		return text
	}
	return text.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : match))
}

/**
 * Build the lookup the root provides as `cnTranslate`.
 *
 * @param {object} options Options.
 * @param {() => (object|null|undefined)} options.getManifest The live manifest (the editor's working copy while editing).
 * @param {() => string} options.getLanguage The language to show.
 * @param {(text: string, vars?: object) => string} [options.translate] The host's translate.
 * @return {Function} `(text, vars) => string`, with `lookup`, `fellBack` and `sourceLanguage` attached.
 */
export function createManifestTranslate({ getManifest, getLanguage, translate }) {
	const host = typeof translate === 'function' ? translate : (text) => text

	const i18n = () => {
		const block = getManifest() && getManifest().i18n
		return block && typeof block === 'object' ? block : null
	}

	const lookup = (text, vars) => {
		if (typeof text !== 'string' || text === '') {
			return { text, fellBack: false }
		}
		const block = i18n()
		const language = String(getLanguage() || '')
		const source = block ? block.sourceLanguage : null
		const inSource = !block || language === source || baseLanguage(language) === baseLanguage(source)
		if (block && !inSource && block.labels) {
			for (const candidate of [language, baseLanguage(language)]) {
				const table = block.labels[candidate]
				if (table && typeof table[text] === 'string' && table[text] !== '') {
					return { text: fill(table[text], vars), fellBack: false }
				}
			}
		}
		const answer = host(text, vars)
		const shown = typeof answer === 'string' && answer !== '' ? answer : fill(text, vars)
		return { text: shown, fellBack: !!block && !inSource && shown === fill(text, vars) }
	}

	const translateLabel = (text, vars) => lookup(text, vars).text
	translateLabel.lookup = lookup
	translateLabel.fellBack = (text, vars) => lookup(text, vars).fellBack
	Object.defineProperty(translateLabel, 'sourceLanguage', { get: () => (i18n() ? i18n().sourceLanguage : '') })
	return translateLabel
}

/**
 * The `lang` attribute for a label: the manifest's source language when the
 * label fell back to its written text in another language, else null.
 *
 * @param {Function|null} translate The injected `cnTranslate`.
 * @param {string} text The label as written.
 * @return {string|null} The language code, or null.
 */
export function labelLang(translate, text) {
	if (translate && typeof translate.fellBack === 'function' && translate.fellBack(text)) {
		return translate.sourceLanguage || null
	}
	return null
}
