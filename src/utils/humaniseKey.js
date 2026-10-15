/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Make an identifier-shaped key readable for a person. Pure: no Vue.
 */

/**
 * Split camelCase, snake_case and kebab-case into words, keep acronyms, and
 * capitalise only the first word.
 *
 * `caseAssigned` → "Case assigned", `object_created` → "Object created",
 * `newBRPRecord` → "New BRP record".
 *
 * @param {string} key The key.
 * @return {string} A readable sentence-case label, or the key when it has no words.
 */
export function humaniseKey(key) {
	const words = String(key || '')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.split(/[\s_\-.]+/)
		.filter(Boolean)
	if (words.length === 0) {
		return String(key || '')
	}
	return words
		.map((word, index) => {
			const isAcronym = word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)
			if (isAcronym) {
				return word
			}
			const lower = word.toLowerCase()
			return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
		})
		.join(' ')
}
