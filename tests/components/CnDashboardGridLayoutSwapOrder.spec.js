/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A layout change that brings new cards into a built grid adds them top to
 * bottom and sizes the size-to-content ones only once all are placed: on
 * PqWerkplekKlant the in-call tile row, grown as soon as it was added, was
 * pushed below every column card added after it.
 *
 * @spec openspec/changes/dashboard-layout-swap-keeps-order/specs/dashboard-grid/spec.md#requirement-cards-a-layout-change-adds-keep-their-authored-order
 */
import { mount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const before = [{ id: 'old', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }]
const inCall = [
	{ id: 'who', gridX: 0, gridY: 2, gridWidth: 4, gridHeight: 5, sizeToContent: true },
	{ id: 'form', gridX: 4, gridY: 2, gridWidth: 4, gridHeight: 6, sizeToContent: true },
	{ id: 'tiles', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, sizeToContent: true },
	{ id: 'kb', gridX: 8, gridY: 2, gridWidth: 4, gridHeight: 5 },
]

/**
 * Mount on the old layout, with a GridStack stub that, like GridStack, sizes a
 * size-to-content cell the moment it is made a widget.
 *
 * @return {object} The wrapper and the calls in order.
 */
function setup() {
	const wrapper = mount(CnDashboardGrid, { propsData: { layout: before } })
	const grid = wrapper.vm.grid
	const calls = []
	grid.engine.nodes = []
	grid.makeWidget.mockImplementation((el) => {
		const id = el.getAttribute('gs-id')
		calls.push(`add ${id}`)
		grid.engine.nodes.push({ id, el })
		if (el.getAttribute('gs-size-to-content')) {
			grid.resizeToContent(el)
		}
	})
	grid._resizeToContent.mockImplementation((el) => calls.push(`size ${el.getAttribute('gs-id')}`))
	return { wrapper, calls }
}

/**
 * Let the layout watcher's ticks run.
 *
 * @param {object} wrapper The wrapper.
 * @return {Promise<void>}
 */
async function settle(wrapper) {
	for (let i = 0; i < 3; i++) {
		await wrapper.vm.$nextTick()
	}
}

describe('CnDashboardGrid: a layout change keeps the authored order', () => {
	it('adds the new cards top to bottom, then sizes them in the same order', async () => {
		const { wrapper, calls } = setup()
		await wrapper.setProps({ layout: inCall })
		await settle(wrapper)
		expect(calls).toEqual(['add tiles', 'add who', 'add form', 'add kb', 'size tiles', 'size who', 'size form'])
	})

	it('sizes a cell at once again when no layout change is adding cards', async () => {
		const { wrapper, calls } = setup()
		await wrapper.setProps({ layout: inCall })
		await settle(wrapper)
		calls.length = 0
		wrapper.vm.grid.resizeToContent(wrapper.find('[gs-id="who"]').element)
		expect(calls).toEqual(['size who'])
	})
})
