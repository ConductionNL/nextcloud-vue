/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-declared-states: a page names the columns its board draws for a status
 * field, instead of every value of the field's enum.
 *
 * @spec openspec/changes/board-declared-states/specs/board-view/spec.md#requirement-a-board-can-declare-the-states-its-columns-come-from
 */

import { buildBoardColumns, OFF_BOARD_KEY } from '../../src/utils/boardColumns.js'
import { columnFieldsOf, declaredStatesOf } from '../../src/utils/boardReferenceColumns.js'
import { validateManifestV2 as validateManifest } from '../../src/utils/validateManifest.js'

const STATUS = {
	type: 'string',
	enum: ['new', 'in_progress', 'awaiting_customer', 'resolved', 'completed', 'rejected', 'converted', 'closed'],
}

const STATES = [
	'new',
	'in_progress',
	'awaiting_customer',
	{ key: 'completed', label: 'Finished' },
	{ key: 'converted', closed: true },
	{ key: 'rejected', closed: true },
	{ key: 'resolved', hidden: true },
	{ key: 'closed', hidden: true },
]

describe('declaredStatesOf', () => {
	it('reads board.states for the status field', () => {
		const board = { statusField: 'status', states: STATES }
		expect(declaredStatesOf(board, null, 'status')).toHaveLength(8)
	})

	it('reads the states of the active column field first', () => {
		const board = { statusField: 'status', states: STATES, columnFields: [{ field: 'priority', states: ['high', 'low'] }] }
		const [active] = columnFieldsOf(board)
		expect(declaredStatesOf(board, active, 'priority')).toEqual([
			{ key: 'high', label: 'high', hidden: false, closed: false },
			{ key: 'low', label: 'low', hidden: false, closed: false },
		])
	})

	it('ignores states on a referenced or values column', () => {
		const board = { statusField: 'status', columnFields: [{ field: 'assignee', kind: 'values', states: ['a'] }] }
		const [active] = columnFieldsOf(board)
		expect(declaredStatesOf(board, active, 'assignee')).toBeNull()
	})

	it('answers null without states, so the enum is read as before', () => {
		expect(declaredStatesOf({ statusField: 'status' }, null, 'status')).toBeNull()
	})
})

describe('a board drawn from declared states', () => {
	const field = { ...STATUS, states: declaredStatesOf({ statusField: 'status', states: STATES }, null, 'status') }
	const rows = [
		{ id: 1, status: 'new' },
		{ id: 2, status: 'completed' },
		{ id: 3, status: 'resolved' },
	]
	const { columns } = buildBoardColumns({ field, rows, statusField: 'status' })

	it('draws the declared columns in order, hides the hidden ones and folds the closed ones', () => {
		expect(columns.map((c) => c.key)).toEqual(['new', 'in_progress', 'awaiting_customer', 'completed', 'converted', 'rejected', OFF_BOARD_KEY])
		expect(columns.find((c) => c.key === 'completed').label).toBe('Finished')
		expect(columns.find((c) => c.key === 'converted').closed).toBe(true)
	})

	it('puts a card in a hidden state in Elsewhere', () => {
		expect(columns.find((c) => c.key === OFF_BOARD_KEY).cards.map((c) => c.id)).toEqual([3])
	})
})

describe('the manifest schema', () => {
	const manifest = (board) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'Tickets', route: '/tickets', type: 'index', title: 'Tickets', config: { register: 'r', schema: 's', viewModes: ['table', 'board'], board } }],
	})

	it('accepts states on the board and on a column field', () => {
		const result = validateManifest(manifest({ statusField: 'status', states: STATES, columnFields: [{ field: 'status' }, { field: 'priority', states: ['high'] }] }))
		expect(result.errors).toEqual([])
	})

	it('refuses an entry without a key', () => {
		expect(validateManifest(manifest({ statusField: 'status', states: [{ label: 'x' }] })).valid).toBe(false)
	})
})
