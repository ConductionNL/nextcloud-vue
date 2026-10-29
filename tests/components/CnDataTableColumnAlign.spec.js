/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * A column's `align: "right"` (or `"end"`) puts the column, header included,
 * at the end of its cells, as boards PqKassabon and PqKassadienst draw amounts
 * and counts. CnObjectListWidget already passes `align` through; the table
 * drew it at the start.
 *
 * @spec openspec/changes/data-table-column-align/specs/data-table-column-align/spec.md#requirement-a-column-can-align-to-the-end
 */

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: '1', description: 'Afvalpas, extra', quantity: 1, lineTotal: 12.5 }]
const stubs = { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } }

/**
 * Whether each header and body cell carries the end class, in column order.
 *
 * @param {object} wrapper The mounted wrapper.
 * @param {string} cell `th` or `td`.
 * @return {Array<boolean>} One flag per column.
 */
function ends(wrapper, cell) {
	const row = cell === 'th' ? 'thead tr' : 'tbody tr'
	return wrapper.find(row).findAll(cell).map((c) => c.classes().includes('cn-table-col--end'))
}

describe('CnDataTable column align', () => {
	it('aligns a right or end column to the end, header and cells', () => {
		const wrapper = mount(CnDataTable, {
			propsData: {
				rows,
				columns: [
					{ key: 'description', label: 'Description' },
					{ key: 'quantity', label: 'Qty', align: 'right' },
					{ key: 'lineTotal', label: 'Line total', align: 'end' },
				],
			},
			stubs,
		})
		expect(ends(wrapper, 'th')).toEqual([false, true, true])
		expect(ends(wrapper, 'td')).toEqual([false, true, true])
	})

	it('leaves a column without align, or with left, at the start', () => {
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns: [{ key: 'description', label: 'Description', align: 'left' }, { key: 'quantity', label: 'Qty' }] },
			stubs,
		})
		expect(ends(wrapper, 'th')).toEqual([false, false])
		expect(ends(wrapper, 'td')).toEqual([false, false])
	})
})
