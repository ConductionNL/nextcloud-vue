/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The content observer's frame measures every cell before it resizes any, so
 * the measures share one style recalculation instead of forcing one per cell,
 * and applies GridStack's own arithmetic: a growing cell moves the cards under
 * it down first, a capped cell is marked to scroll.
 *
 * @spec openspec/changes/dashboard-growth-keeps-order/specs/dashboard-grid/spec.md#requirement-a-growing-cell-keeps-the-order-of-the-cards-under-it
 */
import { mount } from '@vue/test-utils'
import { toRaw } from 'vue'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const LAYOUT = [
	{ id: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2, sizeToContent: true },
	{ id: 'b', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 2, sizeToContent: true },
	{ id: 'c', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
]

/**
 * A grid whose stub carries engine nodes on the cells, and a log of reads and writes.
 *
 * @param {object} rows The rows each cell measures, by id.
 * @return {object} The wrapper, the raw grid, the log and the cells.
 */
function setup(rows) {
	const wrapper = mount(CnDashboardGrid, { propsData: { layout: LAYOUT } })
	const grid = toRaw(wrapper.vm.grid)
	const log = []
	const el = (id) => wrapper.find(`[gs-id="${id}"]`).element
	grid.el = el('a').parentElement
	grid.engine.nodes = LAYOUT.map((l) => ({ id: l.id, x: l.gridX, y: l.gridY, w: l.gridWidth, h: l.gridHeight, el: el(l.id) }))
	for (const node of grid.engine.nodes) {
		node.el.gridstackNode = node
	}
	grid.engine.batchMode = false
	grid.batchUpdate = jest.fn((flag = true) => log.push(flag ? 'batch' : 'commit'))
	grid.update = jest.fn((target, patch) => log.push(`move ${target.getAttribute('gs-id')}->${patch.y}`))
	grid.moveNode = jest.fn((node, patch) => log.push(`size ${node.id}->${patch.h}`))
	jest.spyOn(wrapper.vm, 'matchRowHeights').mockImplementation(() => {})
	jest.spyOn(wrapper.vm, 'contentFit').mockImplementation((cell) => {
		const id = cell.getAttribute('gs-id')
		log.push(`measure ${id}`)
		return rows[id] === undefined ? null : rows[id]
	})
	grid._resizeToContent.mockClear()
	return { wrapper, grid, log, a: el('a'), b: el('b'), c: el('c') }
}

describe('CnDashboardGrid: a frame of cells is measured before any is resized', () => {
	it('measures every cell first, then moves the cards under a growing cell and sizes it', () => {
		const { wrapper, log, a, b } = setup({ a: { rows: 3, capped: false }, b: { rows: 2, capped: false } })
		wrapper.vm.resizeCellsMeasuredFirst(new Set([a, b]))
		expect(log).toEqual(['measure a', 'measure b', 'batch', 'move c->3', 'size a->3', 'commit'])
	})

	it('marks a capped cell to scroll, as GridStack does, and clears the mark otherwise', () => {
		const { wrapper, a, b } = setup({ a: { rows: 2, capped: true }, b: { rows: 2, capped: false } })
		b.classList.add('size-to-content-max')
		wrapper.vm.resizeCellsMeasuredFirst([a, b])
		expect(a.classList.contains('size-to-content-max')).toBe(true)
		expect(b.classList.contains('size-to-content-max')).toBe(false)
	})

	it('leaves a cell it cannot measure as it is', () => {
		const { wrapper, grid, log, a, b } = setup({ a: { rows: 1, capped: false } })
		wrapper.vm.resizeCellsMeasuredFirst([a, b])
		expect(log).toEqual(['measure a', 'measure b', 'size a->1'])
		expect(grid._resizeToContent).not.toHaveBeenCalled()
	})

	it('hands a single cell to resizeToContent', () => {
		const { wrapper, grid, a } = setup({})
		wrapper.vm.resizeCellsMeasuredFirst([a])
		expect(grid._resizeToContent).toHaveBeenCalledWith(a)
	})

	it('hands a sub-grid cell to resizeToContent', () => {
		const { wrapper, grid, a, b } = setup({ b: { rows: 2, capped: false } })
		a.gridstackNode.subGrid = {}
		wrapper.vm.resizeCellsMeasuredFirst([a, b])
		expect(grid._resizeToContent).toHaveBeenCalledWith(a)
	})
})
