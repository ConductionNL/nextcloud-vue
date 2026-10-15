/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The grid wires planGrowth into GridStack's resizeToContent: before a
 * size-to-content cell grows, the cards under it move down, bottom-most
 * first, inside one batch; a cell that does not grow goes straight to
 * GridStack.
 *
 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

/**
 * A grid whose GridStack stub has the parts the growth path reads, and a
 * size-to-content cell that measures `contentHeight` px of content.
 *
 * @param {number} contentHeight The content's height.
 * @return {object} The wrapper, the stub, the calls and the cell.
 */
function setup(contentHeight) {
	const layout = [
		{ id: 'banner', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, sizeToContent: true },
		{ id: 'focus', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
		{ id: 'list', gridX: 0, gridY: 4, gridWidth: 8, gridHeight: 4 },
	]
	const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
	const grid = wrapper.vm.grid
	const calls = []
	const el = (id) => wrapper.find(`[gs-id="${id}"]`).element
	grid.engine.nodes = layout.map((l) => ({ id: l.id, x: l.gridX, y: l.gridY, w: l.gridWidth, h: l.gridHeight, el: el(l.id) }))
	grid.engine.nodes[0].sizeToContent = true
	grid.getCellHeight = () => 80
	grid.batchUpdate = jest.fn((flag = true) => calls.push(flag ? 'batch' : 'commit'))
	grid.update = jest.fn((target, patch) => calls.push(`${target.getAttribute('gs-id')}->${patch.y}`))
	grid._resizeToContent.mockImplementation(() => calls.push('grow'))
	const cell = el('banner')
	cell.gridstackNode = grid.engine.nodes[0]
	Object.defineProperty(cell, 'clientHeight', { value: 160 })
	const content = cell.querySelector('.grid-stack-item-content')
	Object.defineProperty(content, 'clientHeight', { value: 136 })
	const child = document.createElement('div')
	child.getBoundingClientRect = () => ({ height: contentHeight })
	content.appendChild(child)
	return { grid, calls, cell }
}

describe('CnDashboardGrid: a growing cell keeps the order under it', () => {
	it('moves the cards under a growing cell down, bottom first, then grows it, in one batch', () => {
		const { grid, calls, cell } = setup(200)
		grid.resizeToContent(cell)
		expect(calls).toEqual(['batch', 'list->5', 'focus->3', 'grow', 'commit'])
	})

	it('moves the cards inside a batch GridStack already runs, without opening or committing one', () => {
		const { grid, calls, cell } = setup(200)
		grid.engine.batchMode = true
		grid.resizeToContent(cell)
		expect(grid.batchUpdate).not.toHaveBeenCalled()
		expect(calls).toEqual(['list->5', 'focus->3', 'grow'])
	})

	it('leaves a cell that keeps its height to GridStack', () => {
		const { grid, calls, cell } = setup(100)
		grid.resizeToContent(cell)
		expect(calls).toEqual(['grow'])
	})
})

describe('CnDashboardGrid: items in row order', () => {
	it('renders the items top to bottom, then left to right, whatever the layout\'s order', () => {
		const layout = [
			{ id: 'focus', gridX: 0, gridY: 7, gridWidth: 12, gridHeight: 2 },
			{ id: 'list', gridX: 0, gridY: 9, gridWidth: 8, gridHeight: 5 },
			{ id: 'banner', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
			{ id: 'side', gridX: 8, gridY: 9, gridWidth: 4, gridHeight: 5 },
			{ id: 'greeting', gridX: 0, gridY: 0, gridWidth: 9, gridHeight: 2 },
		]
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		expect(wrapper.findAll('.grid-stack-item').map((w) => w.attributes('gs-id'))).toEqual(['greeting', 'banner', 'focus', 'list', 'side'])
	})
})
