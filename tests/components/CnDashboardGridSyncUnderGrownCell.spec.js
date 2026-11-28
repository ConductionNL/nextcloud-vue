/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * decidiq's Dashboard opened with its greeting at the bottom of the grid. The
 * greeting is a size-to-content cell authored one row tall that its content
 * grew to two. When a conditional banner under it left, the page re-compacted
 * its display layout with the AUTHORED heights and moved the counters to row
 * 1, into the greeting's second row, and GridStack pushed the greeting below
 * every card. A card the layout moves up now stops under the cards above it
 * as the grid holds them.
 *
 * @spec openspec/specs/dashboard-grid/spec.md#requirement-a-card-moved-up-by-the-layout-stops-under-the-cards-above-it
 */
import { mount } from '@vue/test-utils'
import { GridStackEngine } from 'gridstack/dist/gridstack-engine.js'
import CnDashboardGrid from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'

const greeting = { id: 's1', gridX: 0, gridY: 0, gridWidth: 9, gridHeight: 1, sizeToContent: true }
const actions = { id: 's0', gridX: 9, gridY: 0, gridWidth: 3, gridHeight: 1, sizeToContent: true }
const counter = { id: 'k1', gridX: 0, gridY: 3, gridWidth: 3, gridHeight: 2 }
const lastCounter = { id: 'k4', gridX: 9, gridY: 3, gridWidth: 3, gridHeight: 2 }

/**
 * Mount the grid and let GridStack hold each item at the given geometry.
 *
 * @param {Array<object>} layout The layout.
 * @param {object} held id -> { x, y, w, h } as GridStack holds it.
 * @return {object} { wrapper, grid, el }
 */
function mountHeld(layout, held) {
	const wrapper = mount(CnDashboardGrid, { propsData: { layout } })
	const grid = wrapper.vm.grid
	const el = (id) => wrapper.find(`[gs-id="${id}"]`).element
	for (const [id, geometry] of Object.entries(held)) {
		grid.engine.nodes.push({ id, ...geometry, el: el(id) })
	}
	return { wrapper, grid, el }
}

describe('CnDashboardGrid: a card moved up stops under the cards above it', () => {
	it('keeps the counters under a greeting its content grew to two rows', async () => {
		const { wrapper, grid, el } = mountHeld([greeting, actions, counter, lastCounter], {
			s1: { x: 0, y: 0, w: 9, h: 2 },
			s0: { x: 9, y: 0, w: 3, h: 2 },
			k1: { x: 0, y: 3, w: 3, h: 2 },
			k4: { x: 9, y: 3, w: 3, h: 2 },
		})
		// The banner between them left; the page compacts with authored heights.
		await wrapper.setProps({ layout: [greeting, actions, { ...counter, gridY: 1 }, { ...lastCounter, gridY: 1 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).toHaveBeenCalledWith(el('k1'), { x: 0, y: 2, w: 3, h: 2 })
		expect(grid.update).toHaveBeenCalledWith(el('k4'), { x: 9, y: 2, w: 3, h: 2 })
		expect(grid.update).not.toHaveBeenCalledWith(el('s1'), expect.anything())
		expect(wrapper.emitted('layout-change')).toBeUndefined()
	})

	it('still moves a card up to the row the layout gives when nothing above is in the way', async () => {
		const { wrapper, grid, el } = mountHeld([greeting, counter], {
			s1: { x: 0, y: 0, w: 9, h: 1 },
			k1: { x: 0, y: 3, w: 3, h: 2 },
		})
		await wrapper.setProps({ layout: [greeting, { ...counter, gridY: 1 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).toHaveBeenCalledWith(el('k1'), { x: 0, y: 1, w: 3, h: 2 })
	})

	it('only reads cards in the columns the moving card covers', async () => {
		const { wrapper, grid, el } = mountHeld([greeting, { ...counter, gridX: 9 }], {
			s1: { x: 0, y: 0, w: 9, h: 4 },
			k1: { x: 9, y: 3, w: 3, h: 2 },
		})
		await wrapper.setProps({ layout: [greeting, { ...counter, gridX: 9, gridY: 0 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).toHaveBeenCalledWith(el('k1'), { x: 9, y: 0, w: 3, h: 2 })
	})

	it('leaves a card moved down where the layout puts it', async () => {
		const { wrapper, grid, el } = mountHeld([greeting, counter], {
			s1: { x: 0, y: 0, w: 9, h: 2 },
			k1: { x: 0, y: 3, w: 3, h: 2 },
		})
		await wrapper.setProps({ layout: [greeting, { ...counter, gridY: 6 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).toHaveBeenCalledWith(el('k1'), { x: 0, y: 6, w: 3, h: 2 })
	})

	it('never moves a card down when it was already above the rows the layout gives', async () => {
		const { wrapper, grid } = mountHeld([greeting, counter], {
			s1: { x: 0, y: 0, w: 9, h: 5 },
			k1: { x: 0, y: 2, w: 3, h: 2 },
		})
		await wrapper.setProps({ layout: [greeting, { ...counter, gridY: 1 }] })
		await wrapper.vm.$nextTick()
		expect(grid.update).not.toHaveBeenCalled()
	})
})

describe('the same moves on the real GridStack engine', () => {
	/**
	 * A float engine holding the grown greeting and the counters.
	 *
	 * @return {object} The engine and its nodes by id.
	 */
	function engineHolding() {
		const engine = new GridStackEngine({ column: 12, float: true })
		const nodes = {}
		for (const n of [
			{ id: 's1', x: 0, y: 0, w: 9, h: 2 },
			{ id: 's0', x: 9, y: 0, w: 3, h: 2 },
			{ id: 'k1', x: 0, y: 3, w: 3, h: 2 },
			{ id: 'k4', x: 9, y: 3, w: 3, h: 2 },
		]) {
			nodes[n.id] = engine.addNode(n)
		}
		return { engine, nodes }
	}

	it('pushes the greeting down when a counter is moved into its grown row (the bug)', () => {
		const { engine, nodes } = engineHolding()
		engine.moveNode(nodes.k1, { x: 0, y: 1 })
		expect(nodes.s1.y).toBeGreaterThan(0)
	})

	it('keeps the greeting on top with the row the grid now asks for', () => {
		const { engine, nodes } = engineHolding()
		engine.moveNode(nodes.k1, { x: 0, y: 2 })
		engine.moveNode(nodes.k4, { x: 9, y: 2 })
		expect(nodes.s1.y).toBe(0)
		expect(nodes.s0.y).toBe(0)
		expect(nodes.k1.y).toBe(2)
		expect(nodes.k4.y).toBe(2)
	})
})
