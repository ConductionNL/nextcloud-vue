/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-column-capacity: a column built from referenced rows carries the limit
 * its row declares; a column merged from several rows shows none; a drop is
 * full when the concrete row it writes already holds its limit.
 *
 * @spec openspec/changes/board-column-capacity/specs/board-view/spec.md
 */

import { buildBoardColumns, capacityValue } from '../../src/utils/boardColumns.js'
import { buildReferenceStages, capacityOfRef, fullTargetOf } from '../../src/utils/boardReferenceColumns.js'

const STATUSES = [
	{ id: 's1', name: 'Ontvangen', order: 1, caseType: 'woo' },
	{ id: 's2', name: 'In behandeling', order: 2, caseType: 'woo', capacity: 2 },
	{ id: 'b2', name: 'In behandeling', order: 2, caseType: 'bez', capacity: 5 },
	{ id: 'b4', name: 'Hoorzitting', order: 4, caseType: 'bez', capacity: '1' },
]

describe('capacityValue', () => {
	it('reads a number above 0 and nothing else', () => {
		expect([3, '4', 0, -1, '', null, undefined, 'veel'].map(capacityValue)).toEqual([3, 4, null, null, null, null, null, null])
	})
})

describe('buildReferenceStages with capacityField', () => {
	it('gives each column its row\'s limit, and none to a column merged from two rows', () => {
		const { states } = buildReferenceStages({ refs: STATUSES, orderField: 'order', mergeBy: 'name', capacityField: 'capacity' })
		expect(states.map((state) => [state.key, state.capacity])).toEqual([
			['Ontvangen', null],
			['In behandeling', null],
			['Hoorzitting', 1],
		])
	})

	it('shows the limit again once the board is narrowed to one parent', () => {
		const { states } = buildReferenceStages({
			refs: STATUSES,
			mergeBy: 'name',
			capacityField: 'capacity',
			narrowBy: { field: 'caseType', rowField: 'caseType' },
			narrowValue: 'woo',
		})
		expect(states.find((state) => state.key === 'In behandeling').capacity).toBe(2)
	})

	it('carries no limit without capacityField', () => {
		const { states } = buildReferenceStages({ refs: STATUSES, mergeBy: 'name' })
		expect(states.every((state) => !('capacity' in state))).toBe(true)
	})

	it('reaches the board columns', () => {
		const { states } = buildReferenceStages({ refs: STATUSES.slice(0, 2), capacityField: 'capacity' })
		const { columns } = buildBoardColumns({ field: { states }, rows: [] })
		expect(columns.map((column) => column.capacity)).toEqual([null, 2])
	})
})

describe('fullTargetOf', () => {
	const rows = [
		{ id: 'c1', status: 's2' },
		{ id: 'c2', status: { id: 's2' } },
		{ id: 'c3', status: 's1' },
	]

	it('is full when the concrete row holds its limit, not counting the card itself', () => {
		expect(fullTargetOf({ target: STATUSES[1], card: rows[2], rows, field: 'status', capacityField: 'capacity' })).toEqual({ count: 2, capacity: 2 })
		expect(fullTargetOf({ target: STATUSES[1], card: rows[0], rows, field: 'status', capacityField: 'capacity' })).toBeNull()
	})

	it('is never full without a limit', () => {
		expect(fullTargetOf({ target: STATUSES[0], card: rows[0], rows, field: 'status', capacityField: 'capacity' })).toBeNull()
		expect(capacityOfRef(STATUSES[1], '')).toBeNull()
	})
})
