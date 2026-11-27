/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A run of resizeToContent calls made in one go (GridStack's resize pass, the
 * content observer's frame) matches the same-height rows once, not once per
 * cell: each match clears and re-sets every card's min-height and forces a
 * full style recalculation. The next run matches again.
 *
 * @spec openspec/changes/dashboard-row-same-height/specs/dashboard-grid/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

function setup() {
	const layout = [
		{ id: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2, sizeToContent: true },
		{ id: 'b', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 2, sizeToContent: true },
	]
	const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
	const grid = wrapper.vm.grid
	const match = jest.spyOn(wrapper.vm, 'matchRowHeights').mockImplementation(() => {})
	const el = (id) => wrapper.find(`[gs-id="${id}"]`).element
	return { wrapper, grid, match, a: el('a'), b: el('b') }
}

describe('CnDashboardGrid: same-height rows are matched once per resize run', () => {
	it('matches once for several cells resized in one go', async () => {
		const { grid, match, a, b } = setup()
		// Mounting sizes the cells in a run of its own; let it end first.
		await Promise.resolve()
		match.mockClear()
		grid._resizeToContent.mockClear()
		grid.resizeToContent(a)
		grid.resizeToContent(b)
		grid.resizeToContent(a)
		expect(match).toHaveBeenCalledTimes(1)
		expect(grid._resizeToContent).toHaveBeenCalledTimes(3)
	})

	it('matches again on the next run', async () => {
		const { grid, match, a, b } = setup()
		await Promise.resolve()
		match.mockClear()
		grid.resizeToContent(a)
		await Promise.resolve()
		grid.resizeToContent(b)
		expect(match).toHaveBeenCalledTimes(2)
	})
})
