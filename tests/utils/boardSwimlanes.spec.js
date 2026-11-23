/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The second axis of a board: rows across the stages.
 */

const { UNASSIGNED_LANE, buildSwimlanes } = require('../../src/utils/boardSwimlanes.js')

/** Two columns holding four cards between them. */
function columns() {
	return [
		{ key: 'open', label: 'Open', cards: [{ id: 1, who: 'alice' }, { id: 2, who: 'bob' }], count: 2 },
		{ key: 'done', label: 'Done', cards: [{ id: 3, who: 'alice' }, { id: 4 }], count: 2 },
	]
}

describe('with no swimlane field', () => {
	it('renders one lane with no key, so the caller draws no row headers', () => {
		const lanes = buildSwimlanes({ columns: columns() })

		expect(lanes).toHaveLength(1)
		expect(lanes[0].key).toBe('')
		expect(lanes[0].count).toBe(4)
	})
})

describe('with a swimlane field', () => {
	it('groups the cards into rows while the columns stay the stages', () => {
		const lanes = buildSwimlanes({ columns: columns(), swimlaneField: 'who' })

		expect(lanes.map((lane) => lane.key)).toEqual(['alice', 'bob', UNASSIGNED_LANE])
		expect(lanes[0].columns.map((column) => column.key)).toEqual(['open', 'done'])
	})

	it('gives every lane every column, empty or not', () => {
		// A lane with only the columns its own cards sit in would put the same
		// stage at a different horizontal position on each row, and the board
		// would stop reading as a board.
		const lanes = buildSwimlanes({ columns: columns(), swimlaneField: 'who' })
		const bob = lanes.find((lane) => lane.key === 'bob')

		expect(bob.columns.map((column) => column.count)).toEqual([1, 0])
	})

	it('keeps cards with no value in one named row, last', () => {
		// Grouping by handler and hiding the unassigned work turns a board
		// into a picture of what is already somebody's problem.
		const lanes = buildSwimlanes({
			columns: columns(),
			swimlaneField: 'who',
			unassignedLabel: 'Niemand',
		})
		const last = lanes[lanes.length - 1]

		expect(last.key).toBe(UNASSIGNED_LANE)
		expect(last.label).toBe('Niemand')
		expect(last.count).toBe(1)
	})

	it('loses no card, so the lanes sum to the board', () => {
		const lanes = buildSwimlanes({ columns: columns(), swimlaneField: 'who' })

		expect(lanes.reduce((sum, lane) => sum + lane.count, 0)).toBe(4)
	})

	it('adds no unassigned row when every card has a value', () => {
		// The control: a lane builder that always added one would put an empty
		// row on every board.
		const lanes = buildSwimlanes({
			columns: [{ key: 'open', label: 'Open', cards: [{ id: 1, who: 'alice' }], count: 1 }],
			swimlaneField: 'who',
		})

		expect(lanes.map((lane) => lane.key)).toEqual(['alice'])
	})
})
