/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDataMatrix as the scoring matrix of board DqAanbesteding: bidders against
 * weighted criteria, the weighted total per bidder, a rank, and the leading
 * row tinted.
 *
 * @spec openspec/changes/data-matrix-weights/specs/data-matrix-weights/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDataMatrix from '../../src/components/CnDataMatrix/CnDataMatrix.vue'

const columns = [
	{ key: 'price', label: 'Prijs', type: 'number', weight: 40, weightLabel: '40%' },
	{ key: 'plan', label: 'Plan van aanpak', type: 'number', weight: 30, weightLabel: '30%' },
	{ key: 'green', label: 'Duurzaamheid', type: 'number', weight: 20, weightLabel: '20%' },
	{ key: 'social', label: 'Social return', type: 'number', weight: 10 },
]
const rows = [
	{ id: 'b', label: 'Hoveniersbedrijf De Linde', amount: '€ 1.655.000', price: 9.0, plan: 7.5, green: 6.5, social: 7.0 },
	{ id: 'a', label: 'Groenwerk Zuid B.V.', amount: '€ 1.712.000', price: 8.6, plan: 8.0, green: 7.5, social: 9.0 },
	{ id: 'c', label: 'Terra Buitenruimte', amount: '€ 1.912.000', price: 6.9, plan: 6.5, green: 6.0, social: 5.0 },
]

function mountMatrix(props = {}) {
	return mount(CnDataMatrix, {
		propsData: {
			rows,
			columns,
			rowHeader: 'Inschrijver',
			rowSublabelKey: 'amount',
			readOnly: true,
			showRowTotals: true,
			rowTotalsMode: 'weighted',
			totalsFractionDigits: 1,
			showRank: true,
			highlightTopRank: true,
			...props,
		},
	})
}

describe('CnDataMatrix weighted scoring', () => {
	it('shows each weight beside its column label, the weight itself without a weightLabel', () => {
		const heads = mountMatrix().findAll('thead th').map((th) => th.text().replace(/\s+/g, ' '))
		expect(heads).toEqual(['Inschrijver', 'Prijs 40%', 'Plan van aanpak 30%', 'Duurzaamheid 20%', 'Social return 10', 'Total', 'Rank'])
	})

	it('takes the weighted mean as the row total', () => {
		const w = mountMatrix()
		expect(w.vm.rowTotal(rows[1])).toBeCloseTo(8.24, 5)
		expect(w.vm.rowTotal(rows[0])).toBeCloseTo(7.85, 5)
		const totals = w.findAll('tbody tr').map((tr) => tr.findAll('.cn-data-matrix__total-cell')[0].text())
		expect([totals[1], totals[2]]).toEqual(['8.2', '6.4'])
	})

	it('leaves a cell without a value out of the weighted mean', () => {
		const w = mountMatrix()
		expect(w.vm.rowTotal({ id: 'x', price: 8, plan: null, green: '', social: undefined })).toBe(8)
		expect(w.vm.rowTotal({ id: 'y' })).toBeNull()
	})

	it('ranks the rows by total, highest first, and tints the leader', () => {
		const w = mountMatrix()
		const body = w.findAll('tbody tr')
		expect(body.map((tr) => tr.find('.cn-data-matrix__rank-cell').text())).toEqual(['2', '1', '3'])
		expect(body[1].classes()).toContain('cn-data-matrix__row--top')
		expect(body[0].classes()).not.toContain('cn-data-matrix__row--top')
	})

	it('gives tied totals the same rank', () => {
		const tied = [
			{ id: 1, label: 'A', price: 8 },
			{ id: 2, label: 'B', price: 8 },
			{ id: 3, label: 'C', price: 6 },
		]
		const w = mountMatrix({ rows: tied })
		expect([...w.vm.ranks.entries()]).toEqual([[1, 1], [2, 1], [3, 3]])
	})

	it('draws the second line under the row label and a row header with scope row', () => {
		const th = mountMatrix().find('tbody th')
		expect(th.attributes('scope')).toBe('row')
		expect(th.find('.cn-data-matrix__row-sublabel').text()).toBe('€ 1.655.000')
	})

	it('takes its own rank label and keeps the sum mode without the new props', () => {
		expect(mountMatrix({ rankLabel: 'Rang' }).findAll('thead th').at(-1).text()).toBe('Rang')
		const plain = mount(CnDataMatrix, { propsData: { rows, columns, showRowTotals: true } })
		expect(plain.vm.rowTotal(rows[1])).toBeCloseTo(33.1, 5)
		expect(plain.find('.cn-data-matrix__rank-cell').exists()).toBe(false)
	})
})
