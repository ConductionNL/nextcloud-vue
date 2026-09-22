/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A responsive reflow is not a layout edit.
 *
 * GridStack fires `change` when `columnOpts` rescales its nodes onto another
 * column count, carrying the RESCALED geometry — at a 12 → 1 breakpoint every
 * item reads `gridX: 0, gridWidth: 1`. A host that persists `layout-change`
 * (CnDetailPage writes it straight back onto the manifest's layout items) would
 * store that as the authored layout, and widening the window back does not
 * restore it: the source values are already overwritten.
 */
import { shallowMount } from '@vue/test-utils'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const layout = [
	{ id: '1', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 4 },
	{ id: '2', gridX: 3, gridY: 0, gridWidth: 9, gridHeight: 4 },
]

/** The shape GridStack hands `change` after a 12 → 1 rescale. */
const rescaled = [
	{ id: '1', x: 0, y: 0, w: 1, h: 4 },
	{ id: '2', x: 0, y: 4, w: 1, h: 4 },
]

/**
 * @param {number} live The column count GridStack currently reports.
 * @return {object} A grid wrapper whose engine sits at `live` columns.
 */
function mountAtColumns(live) {
	const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, columns: 12 } })
	wrapper.vm.grid = { getColumn: () => live, destroy: () => {} }
	return wrapper
}

describe('CnDashboardGrid — responsive reflow', () => {
	it('drops the change GridStack fires while rescaled to another column count', () => {
		const wrapper = mountAtColumns(1)

		wrapper.vm.handleGridChange(rescaled)

		expect(wrapper.emitted('layout-change')).toBeUndefined()
		wrapper.unmount()
	})

	it('emits a change made at the authored column count', () => {
		const wrapper = mountAtColumns(12)

		wrapper.vm.handleGridChange([{ id: '1', x: 2, y: 0, w: 3, h: 4 }])

		const emitted = wrapper.emitted('layout-change')
		expect(emitted).toHaveLength(1)
		expect(emitted[0][0][0]).toMatchObject({ id: '1', gridX: 2, gridWidth: 3 })
		wrapper.unmount()
	})

	it('reads the authored count off columnOpts.columnMax when the two disagree', () => {
		// GridStack widens to columnMax above the top breakpoint, so a grid sitting
		// there is at its widest — not reflowed — even though `columns` says 6.
		const wrapper = shallowMount(CnDashboardGrid, {
			propsData: { layout, columns: 6, columnOpts: { columnMax: 12, breakpoints: [{ w: 1000, c: 1 }] } },
		})
		wrapper.vm.grid = { getColumn: () => 12, destroy: () => {} }

		wrapper.vm.handleGridChange([{ id: '1', x: 4, y: 0, w: 3, h: 4 }])

		expect(wrapper.emitted('layout-change')).toHaveLength(1)
		wrapper.unmount()
	})

	it('emits as before when the engine cannot report a column count', () => {
		// No `columnOpts` means no reflow is possible, so the gate must not
		// swallow an ordinary drag on a grid whose engine answers nothing.
		const wrapper = shallowMount(CnDashboardGrid, { propsData: { layout, columns: 12 } })
		wrapper.vm.grid = { destroy: () => {} }

		wrapper.vm.handleGridChange([{ id: '1', x: 1, y: 0, w: 3, h: 4 }])

		expect(wrapper.emitted('layout-change')).toHaveLength(1)
		wrapper.unmount()
	})
})
