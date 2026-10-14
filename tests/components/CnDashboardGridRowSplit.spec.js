/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A size-to-content cell could only be a whole 80px row tall, so on a packing
 * grid it kept up to a row of empty space under its content (pipelinq and
 * dossiq Mijn werk, decidiq Mijn acties). In view mode a packing grid with a
 * size-to-content cell now draws each layout row as eight 10px rows: every
 * place and size scales with the rows, so nothing moves until a cell shrinks,
 * and the layout and its change events stay in layout rows. Every other grid
 * is built exactly as before.
 *
 * @spec openspec/changes/dashboard-fit-cells-close-up/specs/dashboard-grid/spec.md#requirement-a-size-to-content-cell-ends-at-its-content
 */
import { mount } from '@vue/test-utils'
import { GridStack } from 'gridstack'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const fit = { id: 'fit', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, sizeToContent: true }
const capped = { id: 'capped', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3, sizeToContent: 5 }
const below = { id: 'below', gridX: 0, gridY: 3, gridWidth: 12, gridHeight: 2 }

function attrs(wrapper, id) {
	const el = wrapper.find(`[gs-id="${id}"]`)
	return { y: el.attributes('gs-y'), h: el.attributes('gs-h'), minH: el.attributes('gs-min-h'), fit: el.attributes('gs-size-to-content') }
}

describe('CnDashboardGrid: a size-to-content cell ends at its content', () => {
	it('splits each row into eight on a packing view-mode grid with a size-to-content cell', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [fit, capped, below], float: false } })
		expect(GridStack.init.mock.calls.at(-1)[0].cellHeight).toBe(10)
		expect(attrs(wrapper, 'below')).toEqual({ y: '24', h: '16', minH: '16', fit: undefined })
		expect(attrs(wrapper, 'fit').fit).toBe('true')
		// A size-to-content cell may shrink to its content.
		expect(attrs(wrapper, 'fit').minH).toBe('1')
		// A row maximum scales with the rows.
		expect(attrs(wrapper, 'capped').fit).toBe('40')
	})

	it('builds every other grid as before', () => {
		for (const props of [
			{ layout: [fit, below] },
			{ layout: [fit, below], float: false, editable: true },
			{ layout: [below], float: false },
		]) {
			const wrapper = mount(CnDashboardGrid, { propsData: props })
			expect(GridStack.init.mock.calls.at(-1)[0].cellHeight).toBe(80)
			expect(attrs(wrapper, 'below')).toEqual({ y: '3', h: '2', minH: '2', fit: undefined })
		}
	})

	it('does not report packing or measuring on split rows as a layout change', () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [fit, below], float: false } })
		wrapper.vm.grid._trigger('change', null, [{ id: 'below', x: 0, y: 19, w: 12, h: 16 }])
		expect(wrapper.emitted('layout-change')).toBeUndefined()
	})

	it('moves a tracked item to its layout row in split rows', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [fit, below], float: false } })
		const grid = wrapper.vm.grid
		const el = wrapper.find('[gs-id="below"]').element
		grid.engine.nodes.push({ id: 'below', x: 0, y: 24, w: 12, h: 16, el })
		await wrapper.setProps({ layout: [fit, { ...below, gridY: 4 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).toHaveBeenCalledWith(el, { x: 0, y: 32 })
	})

	it('rebuilds on whole rows for edit mode, and reports changes there in layout rows', async () => {
		const wrapper = mount(CnDashboardGrid, { propsData: { layout: [fit, below], float: false } })
		const first = wrapper.vm.grid
		await wrapper.setProps({ editable: true })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(first.destroy).toHaveBeenCalledWith(false)
		expect(GridStack.init.mock.calls.at(-1)[0].cellHeight).toBe(80)
		expect(attrs(wrapper, 'below')).toEqual({ y: '3', h: '2', minH: '2', fit: undefined })
		wrapper.vm.grid._trigger('change', null, [{ id: 'below', x: 0, y: 4, w: 12, h: 2 }])
		expect(wrapper.emitted('layout-change').at(-1)[0].find((i) => i.id === 'below').gridY).toBe(4)
	})
})
