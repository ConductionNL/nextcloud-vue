/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { getLanguage } from '@nextcloud/l10n'

/**
 * The user's Nextcloud language as a bare code (`nl_NL` reads `nl`), or ''.
 *
 * @return {string} The code.
 */
function userLanguage() {
	try {
		return String(getLanguage() || '').split(/[-_]/)[0].toLowerCase()
	} catch {
		return ''
	}
}

/**
 * The text of a value that may be a language map (`{ nl: 'Ontvangst', en:
 * 'Intake' }`), in the user's Nextcloud language, then Dutch, then English,
 * then the first text it holds. A plain value comes back as text; anything
 * else as ''.
 *
 * @param {(string|number|object|null|undefined)} value The value.
 * @return {string} The text.
 * @spec openspec/changes/grouped-cards-widget/specs/grouped-cards-widget/spec.md#requirement-a-widget-draws-groups-of-cards-from-an-endpoint
 */
export function languageMapText(value) {
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value)
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return ''
	}
	const language = userLanguage()
	for (const key of [language, 'nl', 'en']) {
		if (key && typeof value[key] === 'string' && value[key] !== '') {
			return value[key]
		}
	}
	const first = Object.values(value).find((text) => typeof text === 'string' && text !== '')
	return first || ''
}
