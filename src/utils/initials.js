/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * initials: the letters an avatar shows for a free name.
 *
 * @module utils/initials
 */

/**
 * The initials of a name: the first letters of its first and its last word,
 * upper-cased ("Sanne de Vries" reads "SV", "Jan" reads "J").
 *
 * @param {unknown} name The name.
 * @return {string} One or two letters, or '' when there is no name.
 * @spec openspec/changes/screens-record-list-avatar/specs/record-list-avatar/spec.md#requirement-a-record-list-row-can-carry-an-avatar
 */
export function initialsOf(name) {
	if (typeof name !== 'string') {
		return ''
	}
	const words = name.trim().split(/\s+/).filter((word) => word !== '')
	if (words.length === 0) {
		return ''
	}
	const first = Array.from(words[0])[0] || ''
	const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] || '') : ''
	return (first + last).toLocaleUpperCase()
}
