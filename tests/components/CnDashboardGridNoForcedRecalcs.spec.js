/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Two forced style recalculations per move are gone: GridStack gets a
 * `minRow` while the grid holds cards (so it stops reading the grid's CSS
 * min-height after every move), and a card the grid only moves down is not
 * measured to its content again.
 *
 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
 */
import { mount } from '@vue/test-utils'
import { toRaw } from 'vue'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const LAYOUT = [
	{ id: 'banner', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, sizeToContent: true },
	{ id: 'focus', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2, sizeToContent: true },
]

/**
 * A grid whose GridStack stub carries the options and element syncMinRow reads.
 *
 * @param {Array} layout The layout.
 * @return {object} The wrapper and the raw grid.
 */
function setup(layout) {
	const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
	const grid = toRaw(wrapper.vm.grid)
	grid.opts = { cellHeight: 80, cellHeightUnit: 'px' }
	grid.el = wrapper.find('.grid-stack').element
	wrapper.vm.cssMinRows = undefined
	return { wrapper, grid }
}

describe('CnDashboardGrid: GridStack minRow', () => {
	it('is at least 1 while the grid holds cards', () => {
		const { wrapper, grid } = setup(LAYOUT)
		wrapper.vm.syncMinRow()
		expect(grid.opts.minRow).toBe(1)
	})

	it('is left to GridStack on an empty grid', () => {
		const { wrapper, grid } = setup([])
		wrapper.vm.syncMinRow()
		expect(grid.opts.minRow).toBe(0)
	})

	it('carries a CSS min-height in rows, as GridStack would read it, and reads it once', () => {
		const { wrapper, grid } = setup(LAYOUT)
		const spy = jest.spyOn(window, 'getComputedStyle').mockReturnValue({ minHeight: '400px' })
		wrapper.vm.syncMinRow()
		wrapper.vm.syncMinRow()
		expect(spy).toHaveBeenCalledTimes(1)
		spy.mockRestore()
		expect(grid.opts.minRow).toBe(5)
	})
})

describe('CnDashboardGrid: a card only moved down is not measured again', () => {
	it('skips the measure GridStack asks for while the grid moves cards', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT } })
		const grid = toRaw(wrapper.vm.grid)
		const cell = wrapper.find('[gs-id="focus"]').element
		grid._resizeToContent.mockClear()
		wrapper.vm.moveCardsOnly(() => grid.resizeToContent(cell))
		expect(grid._resizeToContent).not.toHaveBeenCalled()
		grid.resizeToContent(cell)
		expect(grid._resizeToContent).toHaveBeenCalledTimes(1)
	})
})
