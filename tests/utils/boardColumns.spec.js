/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The columns a status board has, and which card goes in which.
 *
 * The failure this guards is a board that looks right: a stage missing because
 * nothing is in it, a column order that shifts as work moves, or a card that
 * quietly stops being on the board at all.
 */

const { OFF_BOARD_KEY, buildBoardColumns, stagesOf } = require('../../src/utils/boardColumns.js')

const ENUM_FIELD = {
	enum: ['intake', 'in-behandeling', 'wacht-op-aanvrager', 'afgehandeld'],
	enumLabels: { intake: 'Intake', 'in-behandeling': 'In behandeling' },
}

const LIFECYCLE_FIELD = {
	states: [
		{ key: 'open', label: 'Open' },
		{ key: 'gesloten', label: 'Gesloten' },
		{ key: 'vervallen', label: 'Vervallen', hidden: true },
	],
}

describe('the stages a field declares', () => {
	it('reads an enum and a lifecycle alike', () => {
		expect(stagesOf(ENUM_FIELD).stages.map((s) => s.key)).toEqual([
			'intake',
			'in-behandeling',
			'wacht-op-aanvrager',
			'afgehandeld',
		])
		expect(stagesOf(LIFECYCLE_FIELD).stages.map((s) => s.key)).toEqual([
			'open',
			'gesloten',
			'vervallen',
		])
	})

	it('uses the schema label when there is one, and the value when there is not', () => {
		const byKey = Object.fromEntries(stagesOf(ENUM_FIELD).stages.map((s) => [s.key, s.label]))

		expect(byKey.intake).toBe('Intake')
		expect(byKey['wacht-op-aanvrager']).toBe('wacht-op-aanvrager')
	})

	it('says a field with neither cannot back a board', () => {
		// Told rather than handed an empty board somebody has to diagnose.
		expect(stagesOf({ type: 'string' }).usable).toBe(false)
		expect(stagesOf(undefined).usable).toBe(false)
		expect(buildBoardColumns({ field: { type: 'string' } }).usable).toBe(false)
	})
})

describe('the board columns', () => {
	const rows = [
		{ id: 1, status: 'intake' },
		{ id: 2, status: 'in-behandeling' },
		{ id: 3, status: 'in-behandeling' },
	]

	it('are the schema stages in the schema order, empty ones included', () => {
		// An empty "Wacht op aanvrager" is the column you drag a card INTO.
		// Building columns from the values present would lose it exactly when
		// somebody needs it, and reorder the board as work moved.
		const { columns } = buildBoardColumns({ field: ENUM_FIELD, rows, statusField: 'status' })

		expect(columns.map((column) => column.key)).toEqual([
			'intake',
			'in-behandeling',
			'wacht-op-aanvrager',
			'afgehandeld',
		])
		expect(columns[2].count).toBe(0)
	})

	it('put each card in its stage', () => {
		const { columns } = buildBoardColumns({ field: ENUM_FIELD, rows, statusField: 'status' })

		expect(columns[1].count).toBe(2)
		expect(columns[1].cards.map((card) => card.id)).toEqual([2, 3])
	})

	it('leave a hidden stage off the board', () => {
		// A stage the process no longer uses. Rendering it invites somebody to
		// drag work into a dead end.
		const { columns } = buildBoardColumns({ field: LIFECYCLE_FIELD, rows: [], statusField: 'status' })

		expect(columns.map((column) => column.key)).toEqual(['open', 'gesloten'])
	})
})

describe('a card whose stage is not a column', () => {
	it('goes to a named column rather than off the board', () => {
		// Real work sitting in a retired stage. Dropping it would take it off
		// a board somebody is using to see everything.
		const { columns } = buildBoardColumns({
			field: LIFECYCLE_FIELD,
			rows: [{ id: 9, status: 'vervallen' }, { id: 10, status: 'open' }],
			statusField: 'status',
			offBoardLabel: 'Elders',
		})

		const off = columns[columns.length - 1]
		expect(off.key).toBe(OFF_BOARD_KEY)
		expect(off.label).toBe('Elders')
		expect(off.cards.map((card) => card.id)).toEqual([9])
	})

	it('adds no such column when every card is on the board', () => {
		// An empty "Elsewhere" on every board would be a column nobody can
		// explain. This is the control for the test above.
		const { columns } = buildBoardColumns({
			field: LIFECYCLE_FIELD,
			rows: [{ id: 10, status: 'open' }],
			statusField: 'status',
		})

		expect(columns.some((column) => column.key === OFF_BOARD_KEY)).toBe(false)
	})

	it('keeps every card somewhere, so the board total equals the list total', () => {
		const rows = [
			{ id: 1, status: 'open' },
			{ id: 2, status: 'vervallen' },
			{ id: 3, status: null },
		]
		const { columns } = buildBoardColumns({ field: LIFECYCLE_FIELD, rows, statusField: 'status' })

		expect(columns.reduce((sum, column) => sum + column.count, 0)).toBe(rows.length)
	})
})
