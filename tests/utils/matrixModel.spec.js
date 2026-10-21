/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md
 */

import {
	bulkTargets,
	cellIndex,
	cellKey,
	columnsFrom,
	fieldRows,
	matchesWhen,
	matrixRows,
	normMarks,
	parseCellInput,
	withFieldCell,
} from '../../src/utils/matrixModel.js'

const entries = [
	{ id: 'e1', learnerId: 'anna', componentId: 'c1', value: 7.5, lifecycle: 'concept' },
	{ id: 'e2', learnerId: 'anna', componentId: 'c2', value: 6, lifecycle: 'published' },
	{ id: 'e3', learnerId: 'bram', componentId: 'c1', value: 5.4, lifecycle: 'concept' },
	{ id: 'e4', learnerId: 'cleo', componentId: 'c2', value: 8, lifecycle: 'concept' },
]
const cells = { rowKey: 'learnerId', columnKey: 'componentId', value: 'value' }

describe('matrixModel', () => {
	it('indexes cell objects by row and column key', () => {
		const index = cellIndex(entries, cells)
		expect(index.get(cellKey('anna', 'c2')).id).toBe('e2')
		expect(index.get(cellKey('bram', 'c2'))).toBeUndefined()
	})

	it('pivots cells into one row per row item, labelled from a lookup', () => {
		const columns = columnsFrom([{ componentId: 'c1', name: 'Test 1' }, { componentId: 'c2', name: 'Test 2' }], { key: 'componentId', label: '{name}' })
		const rows = matrixRows({
			items: ['anna', 'bram', 'cleo'],
			columns,
			index: cellIndex(entries, cells),
			cells,
			labels: { anna: 'Anna de Vries', bram: 'Bram Smit' },
		})
		expect(rows.map((r) => r.id)).toEqual(['anna', 'bram', 'cleo'])
		expect(rows[0].label).toBe('Anna de Vries')
		expect(rows[2].label).toBe('cleo')
		expect(rows[0].c1).toBe(7.5)
		expect(rows[1].c2).toBeUndefined()
		expect(rows[2].c2).toBe(8)
		expect(columns).toEqual([{ key: 'c1', label: 'Test 1' }, { key: 'c2', label: 'Test 2' }])
	})

	it('maps cell values through valueMap and groups rows', () => {
		const rows = matrixRows({
			items: [{ id: 'g1', name: 'Goal 1', domain: 'Reading' }, { id: 'g2', name: 'Goal 2', domain: 'Maths' }],
			rowKey: 'id',
			rowLabel: '{name}',
			groupBy: 'domain',
			columns: [{ key: 'w1' }],
			index: cellIndex([{ goalId: 'g1', week: 'w1', level: 'covered' }], { rowKey: 'goalId', columnKey: 'week' }),
			cells: { rowKey: 'goalId', columnKey: 'week', value: 'level', valueMap: { covered: 'Covered' } },
		})
		expect(rows[0]).toMatchObject({ id: 'g1', label: 'Goal 1', group: 'Reading', w1: 'Covered' })
		expect(rows[1].group).toBe('Maths')
	})

	it('reads rows from an array field and writes one cell back into a copy', () => {
		const list = [{ activityId: 'a1', name: 'Reading', w1: 2, w2: 3 }, { activityId: 'a2', name: 'Maths', w1: 4 }]
		const field = { rowKey: 'activityId', label: '{name}' }
		const rows = fieldRows(list, field, [{ key: 'w1' }, { key: 'w2' }])
		expect(rows[1]).toMatchObject({ id: 'a2', label: 'Maths', w1: 4 })
		const next = withFieldCell(list, field, 'a2', 'w2', 5)
		expect(next[1]).toEqual({ activityId: 'a2', name: 'Maths', w1: 4, w2: 5 })
		expect(list[1].w2).toBeUndefined()
		expect(next[0]).toBe(list[0])
	})

	it('writes a field cell under valueKey when entries keep their values in a map', () => {
		const list = [{ id: 'a1', hours: { w1: 2 } }]
		const field = { rowKey: 'id', valueKey: 'hours' }
		expect(fieldRows(list, field, [{ key: 'w1' }])[0].w1).toBe(2)
		expect(withFieldCell(list, field, 'a1', 'w2', 1)[0]).toEqual({ id: 'a1', hours: { w1: 2, w2: 1 } })
	})

	it('marks a column total above its norm', () => {
		expect(normMarks({ w1: 38, w2: 44, w3: 10 }, { w1: 40, w2: 40 })).toEqual({ w1: '', w2: 'over', w3: '' })
	})

	it('matches when-rules with equality and lists', () => {
		expect(matchesWhen({ lifecycle: 'concept' }, { lifecycle: 'concept' })).toBe(true)
		expect(matchesWhen({ lifecycle: 'published' }, { lifecycle: ['concept', 'draft'] })).toBe(false)
		expect(matchesWhen({ lifecycle: 'draft' }, null)).toBe(true)
	})

	it('picks bulk targets by when-rule and column', () => {
		const targets = bulkTargets(entries, { when: { lifecycle: 'concept' }, column: 'c1', columnKey: 'componentId' })
		expect(targets.map((e) => e.id)).toEqual(['e1', 'e3'])
		expect(bulkTargets(entries, { when: { lifecycle: 'concept' } }).map((e) => e.id)).toEqual(['e1', 'e3', 'e4'])
	})

	it('parses typed input by column type', () => {
		expect(parseCellInput('7,5', { type: 'number' })).toEqual({ ok: true, value: 7.5 })
		expect(parseCellInput('abc', { type: 'number' })).toEqual({ ok: false, value: null })
		expect(parseCellInput('', { type: 'number' })).toEqual({ ok: true, value: null })
		expect(parseCellInput(' fine ', { type: 'text' })).toEqual({ ok: true, value: 'fine' })
	})
})
