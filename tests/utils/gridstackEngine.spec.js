/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The real GridStack engine of the installed major (the peer range accepts 12,
 * 13 and 14) does what CnDashboardGrid relies on: an item dragged or resized
 * lands where it is put, `mode: 'float'` leaves a gap open while `'top'` packs
 * it, and a 12-column layout reflows to one column for a phone and back.
 */
import { GridStackEngine } from 'gridstack/dist/gridstack-engine.js'

const engineFor = (mode, column = 12) => new GridStackEngine({ column, mode, float: mode === 'float' })
const at = (engine, id) => engine.nodes.find((n) => n.id === id)

describe('GridStack engine (installed major)', () => {
	it('keeps a dragged item where it is dropped in float mode', () => {
		const engine = engineFor('float')
		engine.addNode({ id: 'a', x: 0, y: 0, w: 3, h: 2 })
		engine.addNode({ id: 'b', x: 3, y: 0, w: 3, h: 2 })
		engine.moveNode(at(engine, 'a'), { x: 6, y: 4 })
		expect(at(engine, 'a')).toMatchObject({ x: 6, y: 4, w: 3, h: 2 })
		expect(at(engine, 'b')).toMatchObject({ x: 3, y: 0 })
	})

	it('pushes the item below down when an item is resized over it', () => {
		const engine = engineFor('float')
		engine.addNode({ id: 'a', x: 0, y: 0, w: 4, h: 2 })
		engine.addNode({ id: 'b', x: 0, y: 2, w: 4, h: 2 })
		engine.moveNode(at(engine, 'a'), { w: 6, h: 4, resizing: true })
		expect(at(engine, 'a')).toMatchObject({ x: 0, y: 0, w: 6, h: 4 })
		expect(at(engine, 'b').y).toBeGreaterThanOrEqual(4)
	})

	it('leaves a gap in float mode and packs it in top mode', () => {
		const floating = engineFor('float')
		floating.addNode({ id: 'a', x: 0, y: 3, w: 3, h: 2 })
		expect(at(floating, 'a').y).toBe(3)
		const packing = engineFor('top')
		packing.addNode({ id: 'a', x: 0, y: 3, w: 3, h: 2 })
		expect(at(packing, 'a').y).toBe(0)
	})

	it('stacks a 12-column layout in one column for a phone and restores it', () => {
		const engine = engineFor('float')
		engine.addNode({ id: 'a', x: 0, y: 0, w: 6, h: 2 })
		engine.addNode({ id: 'b', x: 6, y: 0, w: 6, h: 2 })
		engine.column = 1
		engine.columnChanged(12, 1)
		expect(at(engine, 'a')).toMatchObject({ x: 0, w: 1 })
		expect(at(engine, 'b')).toMatchObject({ x: 0, w: 1 })
		expect(at(engine, 'a').y).not.toBe(at(engine, 'b').y)
		engine.column = 12
		engine.columnChanged(1, 12)
		expect(at(engine, 'a')).toMatchObject({ x: 0, y: 0, w: 6 })
		expect(at(engine, 'b')).toMatchObject({ x: 6, y: 0, w: 6 })
	})
})
