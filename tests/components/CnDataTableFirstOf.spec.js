/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqOfferte "Regels": a line's Product cell reads the line's own name,
 * else the linked product's name, else its description, so an older line
 * without a name does not read as a dash. `firstOf` lists the fields a cell
 * tries in order. The object list passes it (and `secondaryLabels`) through.
 *
 * @spec openspec/changes/column-first-of/specs/data-table/spec.md#requirement-a-cell-shows-the-first-field-that-has-a-value
 */
const { mount } = require('@vue/test-utils')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const COLUMN = { key: 'name', label: 'Product', firstOf: ['name', 'product.name', 'description'] }

function cellOf(row) {
	const wrapper = mount(CnDataTable, {
		propsData: { rows: [{ id: '1', ...row }], columns: [COLUMN], rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
	return wrapper.find('.cell').text()
}

describe('CnDataTable firstOf', () => {
	it('shows the line\'s own name', () => {
		expect(cellOf({ name: 'Koppeling met het kassasysteem', description: 'Dagvoorraad' })).toBe('Koppeling met het kassasysteem')
	})

	it('falls back to the linked product\'s name, then the description', () => {
		expect(cellOf({ name: '', product: { name: 'Website, basispakket' }, description: 'Ontwerp en bouw' })).toBe('Website, basispakket')
		expect(cellOf({ product: 'a-uuid-not-extended', description: 'Ontwerp en bouw' })).toBe('Ontwerp en bouw')
	})

	it('is passed through by the object list, with secondaryLabels', () => {
		const source = readFileSync(resolve(__dirname, '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'), 'utf8')
		expect(source).toMatch(/'emptyValueBy', 'firstOf', 'secondaryLabels'\]/)
	})
})
