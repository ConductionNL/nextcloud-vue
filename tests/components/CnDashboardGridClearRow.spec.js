/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The grid holds a `clear` item in place (gs-locked, outside edit mode) so the
 * packing does not lift it, and places it below the earlier rows after a cell
 * is measured to its content.
 *
 * @spec openspec/changes/dashboard-clear-row/specs/dashboard-grid/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = [
	{ id: 'main', gridX: 0, gridY: 4, gridWidth: 8, gridHeight: 4, sizeToContent: true },
	{ id: 'side', gridX: 8, gridY: 4, gridWidth: 4, gridHeight: 7, sizeToContent: true },
	{ id: 'followed', gridX: 0, gridY: 16, gridWidth: 6, gridHeight: 4, clear: true },
]

describe('CnDashboardGrid: a clear item', () => {
	it('is locked outside edit mode, and free to move in it', () => {
		const view = mount(CnDashboardGrid, { propsData: { layout } })
		expect(view.find('[gs-id="followed"]').attributes('gs-locked')).toBe('true')
		expect(view.find('[gs-id="main"]').attributes('gs-locked')).toBeUndefined()
		const edit = mount(CnDashboardGrid, { propsData: { layout, editable: true } })
		expect(edit.find('[gs-id="followed"]').attributes('gs-locked')).toBeUndefined()
	})

	it('goes below the lowest card above it after a cell is measured', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		const grid = wrapper.vm.grid
		const el = (id) => wrapper.find(`[gs-id="${id}"]`).element
		grid.engine.nodes = [
			{ id: 'main', x: 0, y: 4, w: 8, h: 6, el: el('main') },
			{ id: 'side', x: 8, y: 4, w: 4, h: 12, el: el('side') },
			{ id: 'followed', x: 0, y: 10, w: 6, h: 4, el: el('followed') },
		]
		grid.update = jest.fn()
		grid.batchUpdate = jest.fn()
		wrapper.vm.placeClearRows()
		expect(grid.update).toHaveBeenCalledWith(el('followed'), { y: 16 })
	})
})
