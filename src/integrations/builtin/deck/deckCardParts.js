/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The parts of a linked Deck card a row shows, shared by the Deck tab and
 * the Deck card: its board, its stack, its assignees and its labels.
 */

/**
 * @param {object} card The card row.
 * @return {string} The board's title, or ''.
 */
export function cardBoardTitle(card) {
	return card?.boardTitle ?? card?.board?.title ?? ''
}

/**
 * @param {object} card The card row.
 * @return {string} The stack's title, or ''.
 */
export function cardStackTitle(card) {
	return card?.stackTitle ?? card?.stack?.title ?? ''
}

/**
 * Deck's `assignedUsers` (each with a nested `participant`), or a plain
 * `assignees` / `users` list of strings or objects.
 *
 * @param {object} card The card row.
 * @return {Array} The assignee entries.
 */
export function cardAssignees(card) {
	const raw = card?.assignedUsers ?? card?.assignees ?? card?.users ?? []
	return Array.isArray(raw) ? raw : []
}

/**
 * @param {object|string} assignee An assignee entry.
 * @return {string} Its display name, or ''.
 */
export function assigneeDisplayName(assignee) {
	if (typeof assignee === 'string') {
		return assignee
	}
	const p = assignee?.participant ?? assignee ?? {}
	return p.displayname ?? p.displayName ?? p.uid ?? p.id ?? ''
}

/**
 * @param {object} card The card row.
 * @return {Array<object>} Its labels.
 */
export function cardLabels(card) {
	const labels = card?.labels ?? card?.tags ?? []
	return Array.isArray(labels) ? labels : []
}
