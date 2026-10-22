/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `columns[].overline` / `overlineText` draw a muted line above a cell's
 * value (PtToegangsverzoeken "Zaken van" over the organisation). A column
 * without either renders as before.
 *
 * @spec openspec/changes/table-cell-overline/specs/data-table/spec.md#requirement-a-table-column-can-carry-a-muted-line-above-its-value
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [
	{ id: '1', title: 'Lighting Lindelaan', onBehalfOf: 'Bakkerij De Basislijn BV', number: '2026-0082', type: 'Permit' },
	{ id: '2', title: 'Parking permits', onBehalfOf: 'J. Hendriks', number: '', type: '' },
]

function mountTable(columns) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns, rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

describe('CnDataTable — overline', () => {
	it('draws nothing extra without an overline', () => {
		const wrapper = mountTable([{ key: 'onBehalfOf', label: 'Access' }])
		expect(wrapper.findAll('[data-testid="cn-cell-overline"]')).toHaveLength(0)
	})

	it('draws a fixed overline text above the value', () => {
		const wrapper = mountTable([{ key: 'onBehalfOf', label: 'Access', overlineText: 'Cases of' }])
		const cells = wrapper.findAll('td').filter((td) => td.find('[data-testid="cn-cell-overline"]').exists())
		expect(cells).toHaveLength(2)
		const html = cells[0].html()
		expect(cells[0].find('[data-testid="cn-cell-overline"]').text()).toBe('Cases of')
		expect(html.indexOf('cn-cell-overline')).toBeLessThan(html.indexOf('Bakkerij De Basislijn BV'))
	})

	it('fills an overline template from the row, and draws none where it resolves to nothing', () => {
		const wrapper = mountTable([{ key: 'title', label: 'Case', overline: '{number} · {type}' }])
		const lines = wrapper.findAll('[data-testid="cn-cell-overline"]')
		expect(lines).toHaveLength(1)
		expect(lines[0].text()).toBe('2026-0082 · Permit')
	})
})
