/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The layout's width and height reach the grid, and the grid is switched to
 * editing on the raw GridStack rather than through Vue's proxy (a drag on a
 * grid enabled through the proxy is shown but never reported). The drag
 * itself is pinned in a real browser by e2e/grid-drag-saves.e2e.js.
 */
import { shallowMount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = [
	{ id: '1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 },
	{ id: '2', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 2, sizeToContent: true },
]

/**
 * A grid whose engine tracks the elements the wrapper rendered.
 *
 * @param {object} wrapper The mounted grid.
 * @return {object} The fake GridStack.
 */
function fakeGrid(wrapper) {
	const nodes = layout.map((item) => ({
		id: item.id,
		el: wrapper.find(`[gs-id="${item.id}"]`).element,
		x: item.gridX,
		y: item.gridY,
		w: item.gridWidth,
		h: item.gridHeight,
	}))
	const grid = {
		engine: { nodes },
		update: jest.fn(),
		makeWidget: jest.fn(),
		removeWidget: jest.fn(),
		enable: jest.fn(function() {
			grid.enabledOn = this
		}),
		disable: jest.fn(),
		destroy: () => {},
	}
	return grid
}

describe('CnDashboardGrid — the layout\'s size reaches the grid', () => {
	it('updates a widget whose width and height the layout changed', async () => {
		const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, editable: true } })
		const grid = fakeGrid(wrapper)
		wrapper.vm.grid = grid

		await wrapper.setProps({ layout: [{ ...layout[0], gridWidth: 6, gridHeight: 3 }, layout[1]] })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const el = wrapper.find('[gs-id="1"]').element
		expect(grid.update).toHaveBeenCalledWith(el, { x: 0, y: 0, w: 6, h: 3 })
		wrapper.unmount()
	})

	it('leaves a size-to-content widget at the height its content gave it', async () => {
		const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, editable: true } })
		const grid = fakeGrid(wrapper)
		grid.engine.nodes[1].h = 5
		wrapper.vm.grid = grid

		await wrapper.setProps({ layout: [layout[0], { ...layout[1], gridWidth: 6 }] })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const el = wrapper.find('[gs-id="2"]').element
		expect(grid.update).toHaveBeenCalledWith(el, { x: 4, y: 0, w: 6, h: 5 })
		wrapper.unmount()
	})

	it('does not update a widget whose place and size are unchanged', async () => {
		const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, editable: true } })
		const grid = fakeGrid(wrapper)
		wrapper.vm.grid = grid

		await wrapper.setProps({ layout: layout.map((item) => ({ ...item })) })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(grid.update).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('enables editing on the raw GridStack, not on the proxy', async () => {
		const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, editable: false } })
		const grid = fakeGrid(wrapper)
		wrapper.vm.grid = grid

		await wrapper.setProps({ editable: true })

		expect(grid.enable).toHaveBeenCalled()
		expect(grid.enabledOn).toBe(grid)
		wrapper.unmount()
	})
})
