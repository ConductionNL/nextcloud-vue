/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Why a personal lens (Recent, later Following) came back empty.
 *
 * OpenRegister reports per asked lens, at response level, whether it could
 * answer: `@self.lenses.<lens> = { available, reason }` (openregister#4514,
 * `read-history-on-audit-trail`). `available: false` always comes with an
 * empty page. These helpers read that report and turn it into the short
 * explanation a list shows in place of its generic empty text.
 *
 * The lens name is a key, so a later lens (`watching`) only needs copy.
 *
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
 */
import { translate as t } from '@nextcloud/l10n'

/**
 * Built-in explanations per lens and reason. Object-neutral: the library
 * does not know whether the app lists cases, tickets or documents. An app
 * says it in its own words through `lensReasonTexts`.
 *
 * @return {Object<string, Object<string, string>>} Lens name to reason to text.
 */
function builtInTexts() {
	return {
		recent: {
			'audit-trail-disabled': t('nextcloud-vue', 'This server does not keep track of what you open.'),
			anonymous: t('nextcloud-vue', 'Log in to see what you opened recently.'),
			'read-history-unavailable': t('nextcloud-vue', 'Your recent items are not available right now.'),
		},
	}
}

/**
 * The lens reports of a list response body: `@self.lenses`, or `{}` when the
 * body carries none (every response before openregister#4514, and every
 * response that did not ask for a lens).
 *
 * @param {object|null|undefined} body A parsed list response.
 * @return {Object<string, {available: boolean, reason: (string|null)}>} The reports, keyed by lens name.
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-a-list-response-carries-the-report-of-the-lenses-it-was-asked-for
 */
export function readLensReports(body) {
	const lenses = body && typeof body === 'object' && body['@self'] && typeof body['@self'] === 'object'
		? body['@self'].lenses
		: null
	return lenses && typeof lenses === 'object' && !Array.isArray(lenses) ? lenses : {}
}

/**
 * The explanation for the first lens that reports `available: false` with a
 * reason there is text for, or `''` when there is none (no report, every lens
 * available, or a reason nobody wrote text for). The caller then shows its
 * own empty text, as before.
 *
 * App text wins over built-in text; within app text, `<lens>.<reason>` wins
 * over `<reason>`.
 *
 * @param {object|null|undefined} reports The lens reports (see `readLensReports`).
 * @param {Object<string, string>|null} [overrides] App text keyed `<lens>.<reason>` or `<reason>`.
 * @return {string} The explanation, or an empty string.
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
 */
export function lensUnavailableText(reports, overrides = null) {
	if (!reports || typeof reports !== 'object') {
		return ''
	}
	const own = overrides && typeof overrides === 'object' ? overrides : {}
	const builtIn = builtInTexts()
	for (const [lens, report] of Object.entries(reports)) {
		if (!report || typeof report !== 'object' || report.available !== false) {
			continue
		}
		const reason = typeof report.reason === 'string' ? report.reason : ''
		if (reason === '') {
			continue
		}
		const text = own[`${lens}.${reason}`] || own[reason] || (builtIn[lens] && builtIn[lens][reason]) || ''
		if (text) {
			return text
		}
	}
	return ''
}
