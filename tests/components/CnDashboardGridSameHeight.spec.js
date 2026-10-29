/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The grid stretches the shorter `sameHeight` cards of a layout row to the
 * tallest one (a min-height on the widget), so GridStack sizes their cells
 * alike and the next row starts level.
 *
 * @spec openspec/changes/dashboard-row-same-height/specs/dashboard-grid/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = [
	{ id: 'total', gridX: 0, gridY: 8, gridWidth: 6, gridHeight: 3, sizeToContent: true, sameHeight: true },
	{ id: 'top', gridX: 6, gridY: 8, gridWidth: 6, gridHeight: 3, sizeToContent: true, sameHeight: true },
	{ id: 'chart', gridX: 0, gridY: 11, gridWidth: 12, gridHeight: 4, sizeToContent: true },
	{ id: 'bars', gridX: 0, gridY: 15, gridWidth: 6, gridHeight: 4, sizeToContent: true, sameHeight: true },
	{ id: 'line', gridX: 6, gridY: 15, gridWidth: 6, gridHeight: 4, sameHeight: true },
]

/**
 * Put a measured widget into a cell: its height is its content, or its min-height when taller.
 *
 * @param {object} wrapper The mounted grid.
 * @param {string} id The layout item id.
 * @param {number} height The content height in pixels.
 * @return {HTMLElement} The widget.
 */
function card(wrapper, id, height) {
	const child = document.createElement('div')
	child.getBoundingClientRect = () => ({ height: child.style.minHeight ? Math.max(parseFloat(child.style.minHeight), height) : height })
	const content = wrapper.find(`[gs-id="${id}"] .grid-stack-item-content`).element
	content.innerHTML = ''
	content.appendChild(child)
	return child
}

describe('CnDashboardGrid: sameHeight cards', () => {
	it('marks the cards that share their row height', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		expect(wrapper.find('[gs-id="total"]').classes()).toContain('cn-dashboard-grid__item--same-height')
		expect(wrapper.find('[gs-id="chart"]').classes()).not.toContain('cn-dashboard-grid__item--same-height')
	})

	it('stretches the shorter card of the row to the tallest', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		const total = card(wrapper, 'total', 89)
		const top = card(wrapper, 'top', 110)
		const chart = card(wrapper, 'chart', 300)
		wrapper.vm.matchRowHeights()
		expect(total.style.minHeight).toBe('110px')
		expect(top.style.minHeight).toBe('')
		expect(chart.style.minHeight).toBe('')
	})

	it('measures again from the content, so a row can shrink', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		const total = card(wrapper, 'total', 89)
		card(wrapper, 'top', 110)
		wrapper.vm.matchRowHeights()
		card(wrapper, 'top', 95)
		wrapper.vm.matchRowHeights()
		expect(total.style.minHeight).toBe('95px')
	})

	it('stretches a card to a fixed-height card beside it, and never the fixed one', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
		const bars = card(wrapper, 'bars', 231)
		const line = card(wrapper, 'line', 300)
		line.style.minHeight = '12px'
		wrapper.vm.matchRowHeights()
		expect(bars.style.minHeight).toBe('300px')
		expect(line.style.minHeight).toBe('12px')
	})

	it('leaves the cards their own height in edit mode', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout, editable: true } })
		const total = card(wrapper, 'total', 89)
		card(wrapper, 'top', 110)
		wrapper.vm.matchRowHeights()
		expect(total.style.minHeight).toBe('')
	})
})
