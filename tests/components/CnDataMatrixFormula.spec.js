/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDataMatrix `column.formula`, as board LqPrognose draws it: typed percentages
 * and a computed number per row.
 *
 * @spec openspec/changes/data-matrix-formula/specs/data-matrix-formula/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDataMatrix from '../../src/components/CnDataMatrix/CnDataMatrix.vue'

const columns = [
	{ key: 'now', label: 'Now', type: 'number' },
	{ key: 'over', label: 'Up, percent', type: 'number' },
	{ key: 'stays', label: 'Stays, percent', type: 'number' },
	{ key: 'expected', label: 'Expected', type: 'number', round: 'round', formula: 'prev_now*prev_over/100+now*stays/100' },
]
const rows = [
	{ id: 'y1', label: 'Year 1', now: 200, over: 90, stays: 5, expected: 210 },
	{ id: 'y2', label: 'Year 2', now: 180, over: 95, stays: 10 },
	{ id: 'y3', label: 'Year 3', now: 170, over: '', stays: 4 },
	{ id: 'y4', label: 'Year 4', now: 160, over: 90, stays: 5 },
]

/**
 * @param {object} [props] The props.
 * @return {object} The mounted matrix.
 */
function mountMatrix(props = {}) {
	return mount(CnDataMatrix, { props: { rows, columns, rowIdKey: 'id', rowLabelKey: 'label', ...props } })
}

const cell = (w, row, key) => w.find(`[data-row-id="${row}"][data-col-key="${key}"]`)
const text = (w, row, key) => cell(w, row, key).text()

describe('CnDataMatrix column.formula', () => {
	it('computes from the row and the row above', () => {
		const w = mountMatrix()
		// 200 * 90% + 180 * 10% = 198
		expect(text(w, 'y2', 'expected')).toBe('198')
		// 180 * 95% + 170 * 4% = 177.8, rounded
		expect(text(w, 'y3', 'expected')).toBe('178')
	})

	it('shows the stored value where the formula has no answer', () => {
		const w = mountMatrix()
		expect(text(w, 'y1', 'expected')).toBe('210')
	})

	it('leaves a cell blank when there is no answer and nothing stored', () => {
		const w = mountMatrix()
		expect(text(w, 'y4', 'expected')).toBe('')
	})

	it('reads no empty cell as zero', () => {
		const w = mountMatrix({ columns: [{ key: 'a', type: 'number' }, { key: 'sum', type: 'number', formula: 'a+1' }], rows: [{ id: 'r', a: '' }] })
		expect(text(w, 'r', 'sum')).toBe('')
	})

	it('is read only, and does not open an editor', async () => {
		const w = mountMatrix()
		expect(cell(w, 'y2', 'expected').classes()).toContain('cn-data-matrix__cell--read-only')
		await cell(w, 'y2', 'expected').find('.cn-data-matrix__cell-value').trigger('click')
		expect(cell(w, 'y2', 'expected').find('input').exists()).toBe(false)
		await cell(w, 'y2', 'stays').find('.cn-data-matrix__cell-value').trigger('click')
		expect(cell(w, 'y2', 'stays').find('input').exists()).toBe(true)
	})

	it('follows new rows', async () => {
		const w = mountMatrix()
		await w.setProps({ rows: rows.map((row) => (row.id === 'y2' ? { ...row, stays: 20 } : row)) })
		// 180 + 180 * 20% = 216
		expect(text(w, 'y2', 'expected')).toBe('216')
	})

	it('rounds up with ceil, and sees a formula column to its left', () => {
		const w = mountMatrix({
			columns: [
				{ key: 'learners', type: 'number' },
				{ key: 'max', type: 'number' },
				{ key: 'groups', type: 'number', round: 'ceil', formula: 'learners/max' },
				{ key: 'twice', type: 'number', formula: 'groups*2' },
			],
			rows: [{ id: 'r', learners: 104, max: 32 }],
		})
		expect(text(w, 'r', 'groups')).toBe('4')
		expect(text(w, 'r', 'twice')).toBe('8')
	})

	it('gives no answer on a division by zero or a formula it cannot read', () => {
		const w = mountMatrix({
			columns: [
				{ key: 'a', type: 'number' },
				{ key: 'zero', type: 'number', formula: 'a/0' },
				{ key: 'bad', type: 'number', formula: 'a;alert(1)' },
			],
			rows: [{ id: 'r', a: 4 }],
		})
		expect(text(w, 'r', 'zero')).toBe('')
		expect(text(w, 'r', 'bad')).toBe('')
	})

	it('counts the computed value in the totals', () => {
		const w = mountMatrix({
			showRowTotals: true,
			showColumnTotals: true,
			columns: [
				{ key: 'a', type: 'number' },
				{ key: 'twice', type: 'number', formula: 'a*2' },
			],
			rows: [{ id: 'r1', a: 1 }, { id: 'r2', a: 2 }],
		})
		const totals = w.findAll('.cn-data-matrix__total-cell').map((total) => total.text())
		// Row totals 3 and 6, column totals 3 and 6, grand total 9.
		expect(totals).toEqual(['3', '6', '3', '6', '9'])
	})

	it('weighs and ranks by the computed value', () => {
		const w = mountMatrix({
			showRank: true,
			rowTotalsMode: 'weighted',
			showRowTotals: true,
			columns: [
				{ key: 'a', type: 'number' },
				{ key: 'score', type: 'number', weight: 1, formula: 'a*2' },
			],
			rows: [{ id: 'low', a: 1 }, { id: 'high', a: 5 }],
		})
		const rank = w.findAll('.cn-data-matrix__rank-cell').map((c) => c.text())
		expect(rank).toEqual(['2', '1'])
	})

	it('leaves a matrix without formulas alone', () => {
		const w = mountMatrix({ columns: [{ key: 'a', type: 'number' }], rows: [{ id: 'r', a: 3 }] })
		expect(w.vm.formulaValues.size).toBe(0)
		expect(text(w, 'r', 'a')).toBe('3')
	})
})
