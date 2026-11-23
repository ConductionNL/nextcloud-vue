/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { getCanonicalLocale } from '@nextcloud/l10n'

/**
 * The BCP 47 tag dates and numbers are written in: the locale the user chose
 * in Nextcloud (`nl_NL` becomes `nl-NL`), not the browser's.
 *
 * `toLocaleDateString(undefined)` answers in the BROWSER's locale, so a Dutch
 * instance opened in an English browser wrote 10/15/2026. Pass this instead.
 *
 * @return {string|undefined} The tag, or undefined for the runtime default
 *   when Nextcloud names none or Intl does not accept it.
 * @spec openspec/changes/dates-in-the-users-locale/specs/data-display/spec.md#requirement-a-date-reads-in-the-users-nextcloud-locale
 */
export function userLocale() {
	try {
		const tag = getCanonicalLocale()
		return tag && Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0 ? tag : undefined
	} catch {
		return undefined
	}
}
