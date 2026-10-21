/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column can sort on one field and show another (`valueField`): a priority
 * column sorts on the stored order and shows the word it orders.
 *
 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md#requirement-a-column-can-show-one-field-and-sort-on-another
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const SCHEMA = {
	properties: {
		priority: { type: 'string', enum: ['low', 'high'], 'x-enum-labels': { low: 'Low', high: 'High' } },
		priorityOrder: { type: 'integer' },
	},
}

const ROWS = [{ id: '1', priority: 'high', priorityOrder: 3 }]

const CellStub = { props: ['value', 'property'], template: '<span class="cell" :data-enum="property && property.enum ? property.enum.join(\',\') : \'\'">{{ value }}</span>' }

function mountTable(columns) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns, rowKey: 'id', schema: SCHEMA },
		global: { stubs: { CnCellRenderer: CellStub } },
	})
}

describe('CnDataTable — a column with valueField', () => {
	it('hands the cell the value field and its property', () => {
		const wrapper = mountTable([{ key: 'priorityOrder', label: 'Priority', valueField: 'priority' }])
		const cell = wrapper.find('.cell')

		expect(cell.text()).toBe('high')
		expect(cell.attributes('data-enum')).toBe('low,high')
	})

	it('keeps the column key as what the header sorts on', async () => {
		const wrapper = mountTable([{ key: 'priorityOrder', label: 'Priority', valueField: 'priority', sortable: true }])
		const header = wrapper.findAll('th').find((th) => th.text().includes('Priority'))
		await header.trigger('click')

		expect(wrapper.emitted('sort')?.[0]?.[0]).toEqual(expect.objectContaining({ key: 'priorityOrder' }))
	})

	it('shows the key field without valueField', () => {
		const wrapper = mountTable([{ key: 'priorityOrder', label: 'Priority' }])

		expect(wrapper.find('.cell').text()).toBe('3')
	})
})
