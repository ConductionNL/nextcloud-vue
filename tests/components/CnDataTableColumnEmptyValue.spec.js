/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's `emptyValue` is what a row without a value holds, so a badge
 * column draws a pill on every row (DqZaaktypeVelden Herkomst: an own field
 * has no `origin`, an inherited one says `inherited`).
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [{ id: 'a', name: 'Bouwkosten' }, { id: 'b', name: 'Locatie', origin: 'inherited' }]

describe('CnDataTable column emptyValue', () => {
	it('hands the cell the emptyValue when the row has none, and the row value otherwise', () => {
		const w = mount(CnDataTable, {
			propsData: { rows: ROWS, columns: [{ key: 'name', label: 'Field' }, { key: 'origin', label: 'Origin', emptyValue: 'own' }] },
			global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } } },
		})
		const origins = w.findAll('[data-testid="cn-object-row"]').map((row) => row.findAll('.cell')[1].text())
		expect(origins).toEqual(['own', 'inherited'])
	})

	it('leaves an empty cell empty without one', () => {
		const w = mount(CnDataTable, {
			propsData: { rows: ROWS, columns: [{ key: 'name', label: 'Field' }, { key: 'origin', label: 'Origin' }] },
			global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } } },
		})
		expect(w.findAll('[data-testid="cn-object-row"]')[0].findAll('.cell')[1].text()).toBe('')
	})
})
