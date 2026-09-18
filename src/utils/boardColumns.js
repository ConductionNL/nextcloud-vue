/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The columns a status board has, and which card goes in which.
 *
 * 🔴 THE COLUMNS COME FROM THE SCHEMA, IN THE SCHEMA'S ORDER, AND FROM
 * NOWHERE ELSE. A board that built its columns from the values PRESENT in the
 * loaded rows would lose a stage the moment nothing was in it, which is
 * precisely when somebody needs to see it: an empty "Wacht op aanvrager" is the
 * column you drag a card into. It would also reorder itself as work moved,
 * because the order would follow the data rather than the process.
 *
 * 🔴 A STATUS THE SCHEMA HIDES IS NOT A COLUMN, BUT ITS CARDS ARE NOT LOST.
 * A hidden stage is one the process no longer uses, and rendering it would
 * invite somebody to drag work into a dead end. The cards sitting in one are
 * real work, so they go to a named column of their own rather than
 * disappearing from a board somebody is using to see everything.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** Cards whose status is not a live column land here. */
export const OFF_BOARD_KEY = '__off_board__'

/**
 * The stages a status field declares, in the schema's order.
 *
 * Reads an `enum` and a lifecycle `states` list, because a schema expresses a
 * status either way and a board should not care which. A field with neither is
 * not a status field, and the caller is told so rather than being handed an
 * empty board it would have to diagnose.
 *
 * @param {object} field - The status field's schema.
 * @return {{stages: Array<object>, usable: boolean}} The stages, and whether
 *   the field can back a board at all.
 */
export function stagesOf(field) {
	const declared = Array.isArray(field?.states)
		? field.states
		: (Array.isArray(field?.enum) ? field.enum : null)

	if (declared === null || declared.length === 0) {
		return { stages: [], usable: false }
	}

	const stages = declared
		.map((entry) => (typeof entry === 'string'
			? { key: entry, label: labelFor(field, entry), hidden: false }
			: {
					key: String(entry?.key ?? entry?.value ?? ''),
					label: String(entry?.label ?? entry?.title ?? entry?.key ?? entry?.value ?? ''),
					hidden: entry?.hidden === true,
				}))
		.filter((stage) => stage.key !== '')

	return { stages, usable: stages.length > 0 }
}

/**
 * The label a schema gives one enum value.
 *
 * @param {object} field - The field schema.
 * @param {string} value - The enum value.
 * @return {string} The label, or the value itself.
 */
function labelFor(field, value) {
	const labels = field?.enumLabels
	if (labels && typeof labels === 'object' && typeof labels[value] === 'string') {
		return labels[value]
	}
	return value
}

/**
 * The board: one column per live stage, plus an off-board column when needed.
 *
 * @param {object} options - The call.
 * @param {object} options.field - The status field's schema.
 * @param {Array<object>} [options.rows] - The rows the list holds.
 * @param {string} options.statusField - The property name on a row.
 * @param {string} [options.offBoardLabel] - What to call the off-board column.
 *
 * @return {{columns: Array<object>, usable: boolean}} The columns, each
 *   `{ key, label, cards, count }`, and whether the field could back a board.
 */
export function buildBoardColumns({
	field,
	rows = [],
	statusField = '',
	offBoardLabel = 'Elsewhere',
} = {}) {
	const { stages, usable } = stagesOf(field)
	if (usable === false) {
		return { columns: [], usable: false }
	}

	const live = stages.filter((stage) => stage.hidden !== true)
	const columns = live.map((stage) => ({
		key: stage.key,
		label: stage.label,
		cards: [],
		count: 0,
	}))
	const byKey = new Map(columns.map((column) => [column.key, column]))

	const offBoard = { key: OFF_BOARD_KEY, label: offBoardLabel, cards: [], count: 0 }
	for (const row of rows) {
		const value = String(row?.[statusField] ?? '')
		const column = byKey.get(value) || offBoard
		column.cards.push(row)
		column.count += 1
	}

	// Only when it has something in it. An empty "Elsewhere" on every board
	// would be a column nobody can explain.
	if (offBoard.count > 0) {
		columns.push(offBoard)
	}

	return { columns, usable: true }
}
