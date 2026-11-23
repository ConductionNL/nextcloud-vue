// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Split a translated sentence around one placeholder so the caller can render
 * the substituted value in its own element (a bold item name) without
 * `v-html`. `"Delete {name}?"` becomes `["Delete ", "?"]`. A sentence without
 * the placeholder returns the whole sentence before and nothing after.
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-a-destructive-dialog-states-the-consequence
 * @param {string} sentence The translated sentence, with a `{placeholder}`.
 * @param {string} [placeholder] The placeholder name, default `name`.
 * @return {[string, string]} The text before and after the placeholder.
 */
export function splitAroundPlaceholder(sentence, placeholder = 'name') {
	const token = `{${placeholder}}`
	const at = String(sentence).indexOf(token)
	if (at === -1) {
		return [String(sentence), '']
	}
	return [sentence.slice(0, at), sentence.slice(at + token.length)]
}
