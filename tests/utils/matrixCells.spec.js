/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * pivotCells: records that each hold one cell become matrix rows and columns.
 *
 * @spec openspec/changes/matrix-cell-records/specs/matrix-cell-records/spec.md
 */
import { cellsFromRecord, pivotCells } from '../../src/utils/matrixCells.js'

const CELLS = [
	{ row: '2', col: 'B', step: 'warning' },
	{ row: '1', col: 'A', step: 'talk' },
	{ row: '1', col: 'B', step: 'talk' },
	{ row: '2', col: 'A', step: 'talk' },
	{ row: '10', col: 'A', step: 'order' },
	{ row: '1', col: 'A', step: 'ignored duplicate' },
	{ row: null, col: 'A', step: 'no row' },
]

describe('pivotCells', () => {
	it('lays the cells out per row and column, in natural order, first cell wins', () => {
		const out = pivotCells(CELLS, { rowField: 'row', columnField: 'col', valueField: 'step' })
		expect(out.categories).toEqual(['A', 'B'])
		expect(out.columnKeys).toEqual(['A', 'B'])
		expect(out.series).toEqual([
			{ key: '1', name: '1', data: ['talk', 'talk'] },
			{ key: '2', name: '2', data: ['talk', 'warning'] },
			{ key: '10', name: '10', data: ['order', null] },
		])
	})

	it('takes labels from a map or a field, and an explicit or numeric order', () => {
		const records = [
			{ r: 'x', rLabel: 'Row X', c: 'late', cRank: 2, v: 1 },
			{ r: 'y', rLabel: 'Row Y', c: 'early', cRank: 1, v: 2 },
		]
		const out = pivotCells(records, {
			rowField: 'r',
			columnField: 'c',
			valueField: 'v',
			rowLabelField: 'rLabel',
			rowOrder: ['y'],
			columnOrderField: 'cRank',
			columnLabels: { early: 'Early', late: 'Late' },
		})
		expect(out.series.map((s) => [s.key, s.name])).toEqual([['y', 'Row Y'], ['x', 'Row X']])
		expect(out.categories).toEqual(['Early', 'Late'])
		expect(out.columnKeys).toEqual(['early', 'late'])
		expect(out.series[0].data).toEqual([2, null])
	})

	it('reads nested paths and returns an empty matrix for nothing', () => {
		expect(pivotCells([{ cell: { r: 1, c: 2, v: 'z' } }], { rowField: 'cell.r', columnField: 'cell.c', valueField: 'cell.v' }).series).toEqual([{ key: '1', name: '1', data: ['z'] }])
		expect(pivotCells(null, {})).toEqual({ series: [], categories: [], columnKeys: [] })
	})
})

describe('cellsFromRecord', () => {
	const MATRIX = {
		version: 'v2',
		behaviourAxis: ['4', '1', '2'],
		severityAxis: ['C', 'A'],
		cells: [
			{ behaviour: '1', severity: 'A', actorType: 'company', intervention: 'talk' },
			{ behaviour: '1', severity: 'A', actorType: 'person', intervention: 'letter' },
			{ behaviour: '2', severity: 'C', actorType: 'company', intervention: 'order' },
			{ behaviour: '4', severity: 'A', actorType: 'company', intervention: 'enforce' },
		],
	}
	const CFG = { cellsPath: 'cells', rowField: 'behaviour', columnField: 'severity', valueField: 'intervention', rowOrderPath: 'behaviourAxis', columnOrderPath: 'severityAxis' }

	it('takes the cells of the record, narrows them by cellFilter and orders by the record axes', () => {
		const { cells, config } = cellsFromRecord(MATRIX, CFG, { actorType: 'company' })
		expect(cells).toHaveLength(3)
		const out = pivotCells(cells, config)
		expect(out.series.map((s) => s.key)).toEqual(['4', '1', '2'])
		expect(out.columnKeys).toEqual(['C', 'A'])
		expect(out.series.map((s) => s.data)).toEqual([[null, 'enforce'], [null, 'talk'], ['order', null]])
	})

	it('keeps an explicit order over the record axes, and returns no cells without a record', () => {
		expect(cellsFromRecord(MATRIX, { ...CFG, rowOrder: ['2'] }).config.rowOrder).toEqual(['2'])
		expect(cellsFromRecord(null, CFG).cells).toEqual([])
	})
})
