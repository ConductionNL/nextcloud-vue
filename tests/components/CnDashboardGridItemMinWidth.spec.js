/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A layout item's own `minWidth` replaces the grid's for that item, so an app
 * tile can be one column on a grid whose widgets are at least two (LpWerkplek:
 * each app tile is its own one-cell widget).
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = [
	{ id: 'tile', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 2, minWidth: 1 },
	{ id: 'card', gridX: 1, gridY: 0, gridWidth: 4, gridHeight: 2 },
]

describe('CnDashboardGrid per-item minimum width', () => {
	it('writes the item\'s own minimum onto gs-min-w, and the grid\'s for the rest', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, editable: true } })
		expect(wrapper.find('[gs-id="tile"]').attributes('gs-min-w')).toBe('1')
		expect(wrapper.find('[gs-id="card"]').attributes('gs-min-w')).toBe('2')
	})

	it('ignores a minimum that is not a whole column or more', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		expect(wrapper.vm.itemMinWidth({ minWidth: 0 })).toBe(2)
		expect(wrapper.vm.itemMinWidth({ minWidth: 'one' })).toBe(2)
		expect(wrapper.vm.itemMinWidth({ minWidth: 1.5 })).toBe(1)
	})

	it('lets the keyboard narrow a tile to one column, and a card only to the grid minimum', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, editable: true } })
		expect(wrapper.vm.clampRect({ x: 0, y: 0, w: 0, h: 2 }, layout[0]).w).toBe(1)
		expect(wrapper.vm.clampRect({ x: 0, y: 0, w: 1, h: 2 }, layout[1]).w).toBe(2)
	})
})
