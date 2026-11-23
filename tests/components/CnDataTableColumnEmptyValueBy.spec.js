/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's `emptyValueBy` says what an empty cell holds by another field of
 * the row (DqZaaktypeStatussen Resultaten: a result that is kept without a
 * retention period reads "Permanent"; one that is destroyed stays empty).
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [
	{ id: 'a', name: 'Verleend', archivalAction: 'bewaren' },
	{ id: 'b', name: 'Geweigerd', archivalAction: 'vernietigen', archivalPeriod: 'P10Y' },
	{ id: 'c', name: 'Ingetrokken', archivalAction: 'vernietigen' },
]

describe('CnDataTable column emptyValueBy', () => {
	it('fills an empty cell from another field, translated, and leaves the rest as they are', () => {
		const w = mount(CnDataTable, {
			propsData: {
				rows: ROWS,
				columns: [
					{ key: 'name', label: 'Result' },
					{ key: 'archivalPeriod', label: 'Retention', emptyValueBy: { field: 'archivalAction', values: { bewaren: 'Kept permanently' } } },
				],
			},
			global: {
				provide: { cnTranslate: (key) => ({ 'Kept permanently': 'Permanent' })[key] ?? key },
				stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
			},
		})
		const periods = w.findAll('[data-testid="cn-object-row"]').map((row) => row.findAll('.cell')[1].text())
		expect(periods).toEqual(['Permanent', 'P10Y', ''])
	})
})
