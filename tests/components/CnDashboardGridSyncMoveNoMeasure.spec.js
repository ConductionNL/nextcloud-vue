/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A layout change that only moves a cell is applied without GridStack measuring
 * it again: at the same width its content keeps its height, and each measure
 * forced a style recalculation of the page. A width change is still measured.
 *
 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
 */
import { shallowMount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = [
	{ id: '1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2, sizeToContent: true },
]

function mountWithFakeGrid() {
	const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, editable: true } })
	const seen = []
	const grid = {
		engine: { nodes: [{ id: '1', el: wrapper.find('[gs-id="1"]').element, x: 0, y: 0, w: 4, h: 2 }] },
		update: jest.fn(() => seen.push(wrapper.vm.movingCardsOnly === true)),
		makeWidget: jest.fn(),
		removeWidget: jest.fn(),
		enable: jest.fn(),
		disable: jest.fn(),
		destroy: () => {},
	}
	wrapper.vm.grid = grid
	return { wrapper, grid, seen }
}

async function settle(wrapper) {
	await wrapper.vm.$nextTick()
	await wrapper.vm.$nextTick()
}

describe('CnDashboardGrid — a moved cell is not measured again', () => {
	it('moves a size-to-content cell to another row without a measure', async () => {
		const { wrapper, grid, seen } = mountWithFakeGrid()
		await wrapper.setProps({ layout: [{ ...layout[0], gridY: 5 }] })
		await settle(wrapper)
		expect(grid.update).toHaveBeenCalledTimes(1)
		expect(seen).toEqual([true])
		wrapper.unmount()
	})

	it('measures a cell whose width the layout changed', async () => {
		const { wrapper, grid, seen } = mountWithFakeGrid()
		await wrapper.setProps({ layout: [{ ...layout[0], gridWidth: 8 }] })
		await settle(wrapper)
		expect(grid.update).toHaveBeenCalledTimes(1)
		expect(seen).toEqual([false])
		wrapper.unmount()
	})
})
