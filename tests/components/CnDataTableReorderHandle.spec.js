/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A reorderable table shows a grip before each row's name, where the reader
 * takes hold of the row (DqZaaktypeVelden "Sleep om de volgorde te
 * wijzigen"); a table that does not reorder shows none.
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [{ id: 'a', name: 'Bouwkosten', kind: 'Bedrag' }, { id: 'b', name: 'Locatie', kind: 'Adres' }]
const COLUMNS = [{ key: 'name', label: 'Field' }, { key: 'kind', label: 'Kind' }]

describe('CnDataTable reorder handle', () => {
	it('puts one grip in the first cell of every row when reorderable', () => {
		const w = mount(CnDataTable, { propsData: { rows: ROWS, columns: COLUMNS, reorderable: true } })
		const rows = w.findAll('[data-testid="cn-object-row"]')
		expect(rows).toHaveLength(2)
		for (const row of rows) {
			const cells = row.findAll('td')
			expect(cells[0].find('[data-testid="cn-row-reorder-handle"]').exists()).toBe(true)
			expect(cells[1].find('[data-testid="cn-row-reorder-handle"]').exists()).toBe(false)
		}
		expect(w.find('[data-testid="cn-row-reorder-handle"]').attributes('aria-hidden')).toBe('true')
	})

	it('shows no grip when the table does not reorder', () => {
		const w = mount(CnDataTable, { propsData: { rows: ROWS, columns: COLUMNS } })
		expect(w.find('[data-testid="cn-row-reorder-handle"]').exists()).toBe(false)
	})
})
