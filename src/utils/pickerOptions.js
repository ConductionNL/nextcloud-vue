/**
 * Option lists for the language and time zone pickers, and the defaults a
 * schema can ask for with `x-default`.
 *
 * Both pickers store a code (`nl`, `Europe/Amsterdam`) and show a label in
 * the user's own language, so a person picks "Nederlands" and the record
 * stores `nl`.
 *
 * @module utils/pickerOptions
 */

import { getLanguage } from '@nextcloud/l10n'

/**
 * ISO 639-1 language codes. `Intl` has no list of languages, so the codes
 * live here; the labels come from `Intl.DisplayNames` at runtime.
 *
 * @type {string[]}
 */
export const LANGUAGE_CODES = (''
	+ 'aa ab af ak am an ar as av ay az ba be bg bi bm bn bo br bs '
	+ 'ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu '
	+ 'fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu '
	+ 'hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl '
	+ 'km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh '
	+ 'mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc '
	+ 'oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg '
	+ 'si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl '
	+ 'tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za '
	+ 'zh zu'
).split(' ')

/**
 * A small fallback for runtimes without `Intl.supportedValuesOf`.
 *
 * @type {string[]}
 */
const FALLBACK_TIMEZONES = 'UTC Europe/Amsterdam Europe/Berlin Europe/Brussels Europe/London Europe/Paris America/New_York America/Chicago America/Los_Angeles Asia/Tokyo Australia/Sydney'.split(' ')

/**
 * The user's Nextcloud language as a BCP 47 tag (`en_GB` becomes `en-GB`).
 *
 * @return {string} The tag, `en` when Nextcloud reports nothing.
 */
export function currentLanguageTag() {
	let lang
	try {
		lang = getLanguage()
	} catch {
		lang = ''
	}
	return String(lang || 'en').replace(/_/g, '-')
}

/**
 * The browser's time zone (IANA id).
 *
 * @return {string} The time zone, `UTC` when the runtime does not say.
 */
export function currentTimezone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
	} catch {
		return 'UTC'
	}
}

/**
 * Cached option lists, keyed by display language. Stable identity matters:
 * the form's select matches the chosen option by reference.
 *
 * @type {Map<string, {codes: string[], labels: object}>}
 */
const languageCache = new Map()

/**
 * The language picker's codes and labels, labelled in `displayLanguage`.
 *
 * @spec openspec/changes/form-pickers-from-schema/specs/schema-utilities/spec.md
 * @param {string} [displayLanguage] BCP 47 tag the labels are written in; defaults to the user's language.
 * @return {{codes: string[], labels: object}} Codes sorted by label, and `{ code: label }`.
 */
export function languageOptions(displayLanguage) {
	const locale = displayLanguage || currentLanguageTag()
	if (languageCache.has(locale)) {
		return languageCache.get(locale)
	}
	let names
	try {
		names = new Intl.DisplayNames([locale, 'en'], { type: 'language' })
	} catch {
		names = null
	}
	const labels = {}
	for (const code of LANGUAGE_CODES) {
		let label
		try {
			label = (names && names.of(code)) || code
		} catch {
			label = code
		}
		// `Intl` lower-cases some names ("nederlands" is fine in a sentence,
		// not in a list); capitalise the first letter for the list.
		labels[code] = label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
	}
	const codes = [...LANGUAGE_CODES].sort((a, b) => labels[a].localeCompare(labels[b], locale))
	const result = { codes, labels }
	languageCache.set(locale, result)
	return result
}

/** @type {{codes: string[], labels: object}|null} */
let timezoneCache = null

/**
 * The time zone picker's codes and labels (`Europe/Amsterdam` shows as
 * `Europe/Amsterdam`, underscores as spaces).
 *
 * @spec openspec/changes/form-pickers-from-schema/specs/schema-utilities/spec.md
 * @return {{codes: string[], labels: object}} IANA ids, and `{ id: label }`.
 */
export function timezoneOptions() {
	if (timezoneCache) {
		return timezoneCache
	}
	let codes
	try {
		codes = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
	} catch {
		codes = []
	}
	if (!codes.length) {
		codes = FALLBACK_TIMEZONES
	}
	if (!codes.includes('UTC')) {
		codes = ['UTC', ...codes]
	}
	const labels = {}
	for (const code of codes) {
		labels[code] = code.replace(/_/g, ' ')
	}
	timezoneCache = { codes: [...codes], labels }
	return timezoneCache
}

/**
 * Fit a language tag to the property's `pattern`, if it has one.
 *
 * A schema that stores ISO 639-1 (`^[a-z]{2}$`) cannot take `en-GB`, so the
 * tag falls back to its primary subtag. Without a pattern the full tag stays.
 *
 * @param {string} tag A BCP 47 tag.
 * @param {string|undefined} pattern The property's `pattern`.
 * @return {string} The tag as the schema accepts it.
 */
function fitLanguageTag(tag, pattern) {
	if (!pattern) {
		return tag
	}
	let re
	try {
		re = new RegExp(pattern)
	} catch {
		return tag
	}
	if (re.test(tag)) {
		return tag
	}
	const primary = tag.split('-')[0].toLowerCase()
	return re.test(primary) ? primary : tag
}

/**
 * Resolve an `x-default` token to the value a NEW object starts with.
 *
 * - `current-language`: the user's Nextcloud language (BCP 47, fitted to the
 *   property's `pattern`).
 * - `current-timezone`: the browser's time zone.
 *
 * @spec openspec/changes/form-pickers-from-schema/specs/schema-utilities/spec.md
 * @param {string|null} token The `x-default` value.
 * @param {object} [field] The field descriptor (reads `validation.pattern`).
 * @return {string|null} The value, or null for an unknown token.
 */
export function resolveDefaultToken(token, field = {}) {
	if (token === 'current-language') {
		const pattern = field && field.validation ? field.validation.pattern : undefined
		return fitLanguageTag(currentLanguageTag(), pattern)
	}
	if (token === 'current-timezone') {
		return currentTimezone()
	}
	return null
}
