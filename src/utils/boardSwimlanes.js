/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The second axis of a board: rows across the stages.
 *
 * The columns stay the process. A swimlane groups the SAME cards into rows by
 * some other field — the handler, the case type, the team — so a board answers
 * "where is the work" and "whose is it" at once.
 *
 * 🔴 A CARD WITH NO VALUE FOR THE FIELD IS NEVER DROPPED. Grouping by handler
 * and silently hiding the unassigned work turns a board into a picture of what
 * is already somebody's problem, which is the opposite of what a board is for.
 * Those cards get one named row, and it goes LAST so the board does not open on
 * them.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** Cards with no value for the swimlane field land here. */
export const UNASSIGNED_LANE = '__unassigned__'

/**
 * The board as rows of columns.
 *
 * @param {object} options - The call.
 * @param {Array<object>} options.columns - The columns from buildBoardColumns().
 * @param {string} [options.swimlaneField] - The field to group rows by.
 * @param {string} [options.unassignedLabel] - What to call the row for cards
 *   with no value.
 *
 * @return {Array<object>} Lanes, each `{ key, label, columns, count }`. With no
 *   swimlaneField, one lane with no key: the caller renders no row headers.
 */
export function buildSwimlanes({ columns = [], swimlaneField = '', unassignedLabel = 'Unassigned' } = {}) {
	const field = String(swimlaneField ?? '').trim()
	const total = columns.reduce((sum, column) => sum + column.cards.length, 0)

	if (field === '') {
		return [{ key: '', label: '', columns, count: total }]
	}

	// Every lane carries EVERY column, empty or not. A lane that only had the
	// columns its own cards happen to sit in would put the same stage at a
	// different horizontal position on each row, and the board would stop
	// reading as a board.
	const laneKeys = []
	const byKey = new Map()
	const ensure = (key, label) => {
		if (byKey.has(key) === false) {
			laneKeys.push(key)
			byKey.set(key, {
				key,
				label,
				columns: columns.map((column) => ({ ...column, cards: [], count: 0 })),
				count: 0,
			})
		}
		return byKey.get(key)
	}

	for (const [index, column] of columns.entries()) {
		for (const card of column.cards) {
			const raw = card?.[field]
			const empty = raw === undefined || raw === null || String(raw).trim() === ''
			const key = empty ? UNASSIGNED_LANE : String(raw)
			const lane = ensure(key, empty ? unassignedLabel : String(raw))

			lane.columns[index].cards.push(card)
			lane.columns[index].count += 1
			lane.count += 1
		}
	}

	const named = laneKeys
		.filter((key) => key !== UNASSIGNED_LANE)
		.sort((left, right) => left.localeCompare(right))
		.map((key) => byKey.get(key))

	// Last, always. A board that opens on the unassigned row reads as though
	// unassigned were the normal state of the work.
	if (byKey.has(UNASSIGNED_LANE) === true) {
		named.push(byKey.get(UNASSIGNED_LANE))
	}

	return named
}
