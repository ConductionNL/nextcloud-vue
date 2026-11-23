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
 * upper-cased ("Sanne de Vries" reads "SV", "Jan" reads "J"). With `letters`
 * a one-word name gives that many of its letters ("Reeks" reads "RE" at 2).
 *
 * @param {unknown} name The name.
 * @param {number} [letters] The letters a one-word name gives (default 1).
 * @return {string} One or more letters, or '' when there is no name.
 * @spec openspec/changes/screens-record-list-avatar/specs/record-list-avatar/spec.md#requirement-a-record-list-row-can-carry-an-avatar
 * @spec openspec/changes/record-list-avatar-letters/specs/record-list-avatar/spec.md#requirement-a-record-list-avatar-can-draw-two-letters-for-one-word
 */
export function initialsOf(name, letters = 1) {
	if (typeof name !== 'string') {
		return ''
	}
	const words = name.trim().split(/\s+/).filter((word) => word !== '')
	if (words.length === 0) {
		return ''
	}
	if (words.length === 1) {
		const count = Number.isInteger(letters) && letters > 1 ? letters : 1
		return Array.from(words[0]).slice(0, count).join('').toLocaleUpperCase()
	}
	const first = Array.from(words[0])[0] || ''
	const last = Array.from(words[words.length - 1])[0] || ''
	return (first + last).toLocaleUpperCase()
}
