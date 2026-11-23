/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's pager under an object table (DqCatalogus "Objecttypen": "4 van
 * 7" and the page buttons): `pageSize` on CnWidgetObjectTable, forwarded to
 * CnDataTable, which shows one page and draws CnPagination's board variant.
 *
 * @spec openspec/changes/object-table-pager/specs/object-table/spec.md#requirement-an-object-table-can-page-its-rows
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

jest.mock('../../../src/store/useObjectStore.js', () => ({ useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {}, registerObjectType: jest.fn() })) }))

const CnWidgetObjectTable = require('../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default
const CnDataTable = require('../../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = Array.from({ length: 7 }, (_, i) => ({ id: `t-${i + 1}`, title: `Type ${i + 1}` }))
const COLUMNS = [{ key: 'title', label: 'Title' }]

/**
 * Mount a table.
 *
 * @param {object} props The props.
 * @return {import('@vue/test-utils').VueWrapper} The table.
 */
function mountTable(props) {
	return mount(CnWidgetObjectTable, {
		props: { title: 'Object types', columns: COLUMNS, rows: ROWS, ...props },
		global: { stubs: { CnWidgetWrapper: { template: '<div><slot /></div>' } } },
	})
}

const titles = (w) => w.findAll('tbody tr').map((tr) => tr.text())

describe('CnWidgetObjectTable pageSize', () => {
	it('shows the first page and the board pager with "4 of 7"', () => {
		const w = mountTable({ pageSize: 4 })
		expect(titles(w)).toHaveLength(4)
		const pager = w.find('[data-testid="cn-data-table-pager"]')
		expect(pager.exists()).toBe(true)
		expect(pager.classes()).toContain('cn-pagination--board')
		expect(pager.find('[data-testid="cn-pagination-board-count"]').text()).toBe('4 of 7')
	})

	it('moves to the next page', async () => {
		const w = mountTable({ pageSize: 4 })
		await w.find('[data-testid="cn-pagination-next"]').trigger('click')
		await nextTick()
		expect(titles(w)).toHaveLength(3)
		expect(titles(w)[0]).toContain('Type 5')
		expect(w.find('[data-testid="cn-pagination-board-count"]').text()).toBe('3 of 7')
	})

	it('draws no pager when the rows fit one page, or without pageSize', () => {
		expect(mountTable({ pageSize: 10 }).find('[data-testid="cn-data-table-pager"]').exists()).toBe(false)
		const w = mountTable({})
		expect(w.find('[data-testid="cn-data-table-pager"]').exists()).toBe(false)
		expect(titles(w)).toHaveLength(7)
	})

	it('goes back to the last page when the rows shrink', async () => {
		const w = mountTable({ pageSize: 4 })
		await w.find('[data-testid="cn-pagination-next"]').trigger('click')
		await w.setProps({ rows: ROWS.slice(0, 3) })
		expect(w.findComponent(CnDataTable).vm.currentPage).toBe(1)
		expect(titles(w)).toHaveLength(3)
	})

	it('reads source.limit rows under a pager, not one more', () => {
		const w = mountTable({ rows: undefined, pageSize: 4, source: { register: 'dossiq', schema: 'objectType', limit: 50 } })
		expect(w.vm.resolvedFetchParams._limit).toBe(50)
		expect(w.vm.innerProps.limit).toBe(0)
		const capped = mountTable({ rows: undefined, source: { register: 'dossiq', schema: 'objectType', limit: 5 } })
		expect(capped.vm.resolvedFetchParams._limit).toBe(6)
	})
})
