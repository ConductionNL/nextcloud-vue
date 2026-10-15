/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The label a person reads for one notification rule in their settings.
 *
 * A rule is declared in a schema's `x-openregister-notifications` map under a
 * KEY (`caseAssigned`, `clientUpdated`, `onCreate`). The key is an identifier
 * for a developer. The settings pane used to print it as is, so a person saw
 * "substitutionRegisteredForSubstitute" next to a switch and had to guess.
 *
 * The label is taken from the first source that has one, most specific first:
 *
 *   1. the rule's own words, when OpenRegister passes them on the preference
 *      entry (`label`, then `title`), as a plain string or a per-locale map
 *      like the dialect's `subject` (`{ "nl": "…", "en": "…" }`);
 *   2. the app's own label for the rule, from the `labels` map the app hands
 *      to CnAppRoot (`notificationLabels`), keyed `<schema>.<key>` or `<key>`;
 *   3. the library's wording for the generic object-event keys;
 *   4. the key made readable: `caseAssigned` becomes "Case assigned".
 *
 * The rule's `subject` is used only when it carries no `{{placeholder}}`: it
 * is the notification TITLE template, and "Case "{{title}}" assigned to you"
 * reads worse as a setting than the readable key does.
 *
 * Pure: no store, no fetch, no Vue.
 *
 * @spec openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md
 */

import { humaniseKey } from './humaniseKey.js'

/**
 * Pick the string for the current language out of a string or per-locale map.
 *
 * @param {string|object|null|undefined} value A string, or `{ nl, en, … }`.
 * @param {string} [language] The current language, e.g. `nl` or `de_DE`.
 * @return {string} The resolved text, or '' when there is none.
 */
export function resolveLocalised(value, language = 'en') {
	if (typeof value === 'string') {
		return value.trim()
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return ''
	}
	const lang = String(language || 'en')
	const base = lang.split(/[-_]/)[0]
	for (const candidate of [lang, base, 'en']) {
		if (typeof value[candidate] === 'string' && value[candidate].trim() !== '') {
			return value[candidate].trim()
		}
	}
	const first = Object.values(value).find((text) => typeof text === 'string' && text.trim() !== '')
	return first ? first.trim() : ''
}

/**
 * Make a rule key readable (`caseAssigned` → "Case assigned"); see `humaniseKey`.
 *
 * @param {string} key The rule key.
 * @return {string} A readable sentence-case label, or the key when it has no words.
 */
export function humaniseRuleKey(key) {
	return humaniseKey(key)
}

/**
 * The label for one preference entry.
 *
 * @param {object} entry A preference entry: `{ schema, notification, label?, title?, subject? }`.
 * @param {object} [options] Where else a label may come from.
 * @param {object} [options.labels] App-supplied labels keyed `<schema>.<key>` or `<key>`;
 *   values are strings or per-locale maps.
 * @param {object} [options.known] Library wording for generic keys, keyed by rule key.
 * @param {string} [options.language] The current language.
 * @return {string} The label to show.
 */
export function notificationRuleLabel(entry, { labels = {}, known = {}, language = 'en' } = {}) {
	const key = String(entry?.notification ?? '')
	const schema = String(entry?.schema ?? '')

	for (const field of ['label', 'title']) {
		const own = resolveLocalised(entry?.[field], language)
		if (own) {
			return own
		}
	}

	const map = labels && typeof labels === 'object' ? labels : {}
	for (const lookup of [schema ? `${schema}.${key}` : '', key]) {
		if (lookup && Object.hasOwn(map, lookup)) {
			const fromApp = resolveLocalised(map[lookup], language)
			if (fromApp) {
				return fromApp
			}
		}
	}

	if (known && typeof known[key] === 'string' && known[key]) {
		return known[key]
	}

	const subject = resolveLocalised(entry?.subject, language)
	if (subject && !subject.includes('{{')) {
		return subject
	}

	return humaniseRuleKey(key)
}
