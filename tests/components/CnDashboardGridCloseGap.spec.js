/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The pipelinq dashboard opened with an empty band above its stat tiles: the
 * attention card's condition turned false after the grid mounted, the page
 * re-compacted its display layout, and the tiles' new gridY never reached
 * GridStack. The grid now moves an item it already tracks to where the layout
 * puts it, without reporting that move back as a user's arrangement. `float`
 * is a prop (default true, GridStack's own setting until now), and a
 * size-to-content cell lets its content take its own height.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-dashboard-closes-the-gap-a-shrinking-or-hidden-widget-leaves
 */
import { mount } from '@vue/test-utils'
import { GridStack } from 'gridstack'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const tile = { id: 'tile', gridX: 0, gridY: 2, gridWidth: 3, gridHeight: 2 }

describe('CnDashboardGrid: closing the gap', () => {
	it('initialises GridStack with float: true by default', () => {
		mount(CnDashboardGrid, { propsData: { layout: [tile] } })
		expect(GridStack.init.mock.calls.at(-1)[0].float).toBe(true)
	})

	it('passes float: false through', () => {
		mount(CnDashboardGrid, { propsData: { layout: [tile], float: false } })
		expect(GridStack.init.mock.calls.at(-1)[0].float).toBe(false)
	})

	it('moves a tracked item to its new row without emitting a layout change', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [tile] } })
		const grid = wrapper.vm.grid
		const el = wrapper.find('[gs-id="tile"]').element
		grid.engine.nodes.push({ id: 'tile', x: 0, y: 2, w: 3, h: 2, el })
		await wrapper.setProps({ layout: [{ ...tile, gridY: 0 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).toHaveBeenCalledWith(el, { x: 0, y: 0 })
		expect(wrapper.emitted('layout-change')).toBeUndefined()
	})

	it('leaves an item alone when the layout agrees with the grid', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [tile] } })
		const grid = wrapper.vm.grid
		const el = wrapper.find('[gs-id="tile"]').element
		grid.engine.nodes.push({ id: 'tile', x: 0, y: 2, w: 3, h: 2, el })
		await wrapper.setProps({ layout: [{ ...tile, gridHeight: 3 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).not.toHaveBeenCalled()
	})

	it('marks a size-to-content cell so its content takes its own height', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [{ ...tile, sizeToContent: true }, { ...tile, id: 'other', gridY: 4 }] } })
		const cells = wrapper.findAll('.grid-stack-item')
		expect(cells[0].classes()).toContain('cn-dashboard-grid__item--fit')
		expect(cells[1].classes()).not.toContain('cn-dashboard-grid__item--fit')
	})
})
