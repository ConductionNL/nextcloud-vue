/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @module utils/libraryTranslate
 */

import { translate as t } from '@nextcloud/l10n'
import { ensureTranslations } from '../l10n/index.js'

/**
 * Translate one of the library's own strings, registering the library's
 * catalogue first when the page never did. The default for a component's
 * injected `cnTranslate` where it can be mounted without an app around it,
 * such as the AI companion hermiq mounts on every Nextcloud page.
 *
 * @param {string} text The English string.
 * @param {object} [vars] Placeholder values.
 * @return {string} The string in the user's language.
 * @spec openspec/changes/ai-companion-library-translate/specs/ai-companion-library-translate/spec.md
 */
export function libraryTranslate(text, vars) {
	ensureTranslations()
	return t('nextcloud-vue', text, vars)
}
