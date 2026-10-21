/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * pl4-board-list-stages: a board can take its columns from a list on a parent
 * row (a pipeline's `stages`), narrowed to the parent the page filters on,
 * with a closed stage collapsed until the reader opens it.
 *
 * @spec openspec/changes/pl4-board-list-stages/specs/pl4-board-list-stages/spec.md#requirement-columns-can-be-a-list-on-a-parent-row
 */

import { buildBoardColumns } from '../../src/utils/boardColumns.js'
import { buildReferenceStages, columnKeyOfRow, flattenItemRefs, resolveDropValue } from '../../src/utils/boardReferenceColumns.js'

const PIPELINES = [
	{ id: 'p1', title: 'Sales', stages: [
		{ name: 'Won', order: 3, isClosed: true, color: 'success' },
		{ name: 'New', order: 1 },
		{ name: 'Proposal', order: 2 },
	] },
	{ id: 'p2', title: 'Renewals', stages: [{ name: 'Due', order: 1 }, { name: 'Won', order: 2, isClosed: true }] },
	{ id: 'p3', title: 'Broken' },
]

describe('flattenItemRefs', () => {
	it('turns each parent\'s list into rows keyed by the item field, linked to their parent', () => {
		const refs = flattenItemRefs(PIPELINES, { itemsPath: 'stages', keyField: 'name' })
		expect(refs.map((r) => [r.id, r._parent])).toEqual([
			['Won', 'p1'],
			['New', 'p1'],
			['Proposal', 'p1'],
			['Due', 'p2'],
			['Won', 'p2'],
		])
		expect(refs[0].isClosed).toBe(true)
	})

	it('drops an item without a key', () => {
		expect(flattenItemRefs([{ id: 'p', stages: [{ order: 1 }, { name: '' }] }], { itemsPath: 'stages', keyField: 'name' })).toEqual([])
	})
})

describe('a pipeline board', () => {
	const refs = flattenItemRefs(PIPELINES, { itemsPath: 'stages', keyField: 'name' })
	const narrowBy = { field: '_parent', rowField: 'pipeline' }
	const stages = buildReferenceStages({ refs, labelField: 'name', orderField: 'order', colorField: 'color', closedField: 'isClosed', narrowBy, narrowValue: 'p1' })

	it('draws the chosen pipeline\'s stages in order, the closed one marked', () => {
		expect(stages.states.map((s) => [s.key, s.closed === true])).toEqual([['New', false], ['Proposal', false], ['Won', true]])
		expect(stages.states.find((s) => s.key === 'Won').color).toBe('success')
	})

	it('puts a lead in the column its stage names, and a drop writes the stage name', () => {
		const lead = { id: 'l1', pipeline: 'p1', stage: 'Proposal' }
		expect(columnKeyOfRow(lead, 'stage', stages.keyByValue)).toBe('Proposal')
		expect(resolveDropValue({ card: lead, toKey: 'Won', kind: 'reference', refsByKey: stages.refsByKey, narrowBy })).toMatchObject({ value: 'Won' })
	})

	it('carries the closed mark onto the column', () => {
		const { columns } = buildBoardColumns({ field: { states: stages.states }, rows: [], statusField: 'stage' })
		expect(columns.map((c) => c.closed)).toEqual([false, false, true])
	})
})
