/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column can put a pill beside a cell's value when a condition holds on the
 * row: DqContacten draws "*****4054 [Geheimhouding]" for a resident whose data
 * is protected. The condition is the row-indicator grammar (`field` with
 * `equals`, `in`, ... or truthiness); the label goes through the host translation.
 *
 * @spec openspec/changes/column-cell-pills/specs/data-table/spec.md#requirement-a-column-can-put-a-pill-beside-a-cells-value
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const COLUMNS = [
	{ key: 'name', label: 'Name' },
	{ key: 'bsn', label: 'BSN', pills: [{ field: 'indicatieGeheim', equals: true, label: 'Data protection', variant: 'warning' }] },
]

function mountTable(rows) {
	return mount(CnDataTable, {
		propsData: { columns: COLUMNS, rows, rowKey: 'id' },
		global: { provide: { cnTranslate: (text) => ({ 'Data protection': 'Geheimhouding' }[text] || text) } },
	})
}

describe('CnDataTable — cell pills', () => {
	it('puts the pill beside the value when the condition holds', () => {
		const wrapper = mountTable([{ id: '1', name: 'Bram Smit', bsn: '*****4054', indicatieGeheim: true }])
		const cells = wrapper.findAll('tbody td')
		const bsnCell = cells.find((cell) => cell.text().includes('*****4054'))
		const pill = bsnCell.find('[data-testid="cn-cell-pill"]')
		expect(pill.exists()).toBe(true)
		expect(pill.text()).toBe('Geheimhouding')
	})

	it('draws no pill when the condition does not hold', () => {
		const wrapper = mountTable([{ id: '1', name: 'Pieter Bos', bsn: '*****0627', indicatieGeheim: false }])
		expect(wrapper.find('[data-testid="cn-cell-pill"]').exists()).toBe(false)
	})

	it('draws no pill in a column that declares none', () => {
		const wrapper = mountTable([{ id: '1', name: 'Bram Smit', bsn: '*****4054', indicatieGeheim: true }])
		const nameCell = wrapper.findAll('tbody td').find((cell) => cell.text().includes('Bram Smit'))
		expect(nameCell.find('[data-testid="cn-cell-pill"]').exists()).toBe(false)
	})
})
