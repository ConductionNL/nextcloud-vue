// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { translatePlural as n } from '@nextcloud/l10n'

/**
 * A page's `countSubtitle` for a total ("19 cases"). A string goes through
 * the app's translate; `{ singular, plural }` takes the form for the total
 * through the app's plural translation, or by `total === 1` without an app
 * id. `{total}` (and `{shown}` when given) are filled in.
 *
 * @param {string|{singular: string, plural: string}} subtitle The declared line.
 * @param {number} total The total.
 * @param {object} [options] Options.
 * @param {number|null} [options.shown] The rows shown, or null to leave `{shown}` alone.
 * @param {(text: string) => string} [options.translate] The app's translate.
 * @param {string} [options.appId] The app id, for its plural forms.
 * @return {string} The line, '' for a declaration without both forms.
 * @spec openspec/changes/index-count-plural/specs/index-header/spec.md#requirement-the-count-line-takes-a-singular-and-a-plural-form
 */
export function countLine(subtitle, total, options = {}) {
	const shown = options.shown === undefined ? null : options.shown
	const tr = typeof options.translate === 'function' ? options.translate : (text) => text
	const fill = (text) => {
		const out = String(text).replace('{total}', String(total))
		return shown === null ? out : out.replace('{shown}', String(shown))
	}
	if (typeof subtitle === 'string') {
		return fill(tr(subtitle))
	}
	const singular = subtitle && typeof subtitle.singular === 'string' ? subtitle.singular : ''
	const plural = subtitle && typeof subtitle.plural === 'string' ? subtitle.plural : ''
	if (singular === '' || plural === '') {
		return ''
	}
	if (typeof options.appId === 'string' && options.appId !== '') {
		const vars = shown === null ? { total } : { total, shown }
		return n(options.appId, singular, plural, total, vars)
	}
	return fill(tr(total === 1 ? singular : plural))
}
