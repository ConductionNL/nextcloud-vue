/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A layout item's own `minHeight` replaces the grid's for that item, so a
 * divider can be one row on a grid whose widgets are at least two (launchpad
 * divider-widget REQ-DIV-006: "gridHeight values down to 1").
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnDividerWidget/index.js'

const layout = [
	{ id: 'divider', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1, minHeight: 1 },
	{ id: 'card', gridX: 0, gridY: 1, gridWidth: 4, gridHeight: 2 },
]

describe('CnDashboardGrid per-item minimum height', () => {
	it('writes the item\'s own minimum onto gs-min-h, and the grid\'s for the rest', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, editable: true } })
		expect(wrapper.find('[gs-id="divider"]').attributes('gs-min-h')).toBe('1')
		expect(wrapper.find('[gs-id="card"]').attributes('gs-min-h')).toBe('2')
	})

	it('ignores a minimum that is not a whole row or more', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [{ ...layout[1], minHeight: 0 }, { ...layout[1], id: 'x', minHeight: 'one' }] } })
		expect(wrapper.vm.itemMinHeight({ minHeight: 0 })).toBe(2)
		expect(wrapper.vm.itemMinHeight({ minHeight: 'one' })).toBe(2)
		expect(wrapper.vm.itemMinHeight({ minHeight: 1.5 })).toBe(1)
	})

	it('lets the keyboard shrink a divider to one row, and a card only to the grid minimum', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, editable: true } })
		expect(wrapper.vm.clampRect({ x: 0, y: 0, w: 12, h: 0 }, layout[0]).h).toBe(1)
		expect(wrapper.vm.clampRect({ x: 0, y: 0, w: 4, h: 1 }, layout[1]).h).toBe(2)
	})

	it('registers the divider type with a one-row minimum', () => {
		expect(getWidgetTypeEntry('divider').minHeight).toBe(1)
	})
})
