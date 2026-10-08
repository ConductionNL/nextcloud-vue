/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * jsdom computes no layout, so this checks the classes and the summed offsets;
 * the scrolled bounding boxes are the Playwright run (e2e/data-table-pinned-columns.e2e.js).
 *
 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const columns = [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }, { key: 'owner', label: 'Owner' }]
const rows = [{ id: '1', name: 'A', status: 'open', owner: 'jan' }]
const stubs = { CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' }, NcCheckboxRadioSwitch: true }

function widths(values) {
	jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function() {
		const cells = [...this.parentElement.children]
		return values[cells.indexOf(this)] || 0
	})
}

describe('CnDataTable pinnedCount', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('pins nothing by default', () => {
		const w = mount(CnDataTable, { props: { rows, columns }, global: { stubs } })
		expect(w.findAll('.cn-table-col--pinned')).toHaveLength(0)
	})

	it('pins the first columns and the selection column, with summed offsets', async () => {
		widths([40, 120, 90, 80])
		const w = mount(CnDataTable, { props: { rows, columns, selectable: true, pinnedCount: 2 }, global: { stubs } })
		await w.vm.$nextTick()
		w.vm.measurePins()
		await w.vm.$nextTick()
		const head = w.findAll('thead th')
		expect(head.map((h) => h.classes().includes('cn-table-col--pinned'))).toEqual([true, true, true, false])
		expect(head.map((h) => h.attributes('style') || '')).toEqual(['left: 0px;', 'left: 40px;', 'left: 160px;', ''])
		expect(head[2].classes()).toContain('cn-table-col--pinned-last')
		const cells = w.findAll('tbody tr:first-child td')
		expect(cells.map((c) => c.classes().includes('cn-table-col--pinned'))).toEqual([true, true, true, false])
		expect(cells[1].attributes('style')).toContain('left: 40px')
	})

	it('without selection the first data column is the first pinned cell', async () => {
		widths([100, 100, 100])
		const w = mount(CnDataTable, { props: { rows, columns, pinnedCount: 1 }, global: { stubs } })
		w.vm.measurePins()
		await w.vm.$nextTick()
		const head = w.findAll('thead th')
		expect(head[0].classes()).toContain('cn-table-col--pinned-last')
		expect(head[1].classes()).not.toContain('cn-table-col--pinned')
	})

	it('unpinning clears the offsets', async () => {
		widths([100, 100, 100])
		const w = mount(CnDataTable, { props: { rows, columns, pinnedCount: 2 }, global: { stubs } })
		w.vm.measurePins()
		await w.setProps({ pinnedCount: 0 })
		w.vm.measurePins()
		expect(w.vm.pinOffsets).toEqual([])
		expect(w.findAll('.cn-table-col--pinned')).toHaveLength(0)
	})
})
