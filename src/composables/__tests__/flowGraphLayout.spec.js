/**
 * Tests for the pure flow graph layout.
 *
 * 🔴 THE PROPERTY THAT MATTERS: a flow whose nodes carry no usable positions
 * must come out READABLE — every node on its own point, triggers left, edges
 * flowing right — and a flow somebody arranged must come out UNTOUCHED. The
 * pass must also be deterministic (a layout that shuffles on every open reads
 * as a broken canvas) and must terminate on a loop (the dossiq case flow has
 * one, so "loops hang the layering" is not a theoretical failure).
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

const {
	FLOW_LAYOUT_COLUMN_WIDTH,
	FLOW_LAYOUT_ROW_HEIGHT,
	FLOW_LAYOUT_MARGIN,
	FLOW_LAYOUT_TOP,
	layoutFlowNodes,
	needsFullLayout,
	placeLooseNodes,
	readNodePoint,
} = require('../flowGraphLayout.js')

const caseFlow = require('./__fixtures__/case-behandeling-flow.json')

/**
 * Expand the document's `{from, to}` edges into `{source, target}` lines, the
 * way `useFlowStore.canvasEdges` does — the layout functions receive lines,
 * not stored edges.
 *
 * @param {Array<object>} edges The stored edges.
 * @return {Array<{source: string, target: string}>} The lines.
 */
function toLines(edges) {
	return edges.map((edge) => ({
		source: edge.source ?? edge.from,
		target: edge.target ?? edge.to,
	}))
}

/**
 * Simple nodes from a list of ids, with no positions.
 *
 * @param {Array<string>} ids The node ids.
 * @return {Array<object>} The nodes.
 */
function bareNodes(ids) {
	return ids.map((id) => ({ id, type: 't', config: {} }))
}

/**
 * A map from node id to its laid-out point.
 *
 * @param {Array<object>} nodes Laid-out nodes.
 * @return {Map<string, {x: number, y: number}>} Id to point.
 */
function pointsOf(nodes) {
	return new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y }]))
}

describe('readNodePoint', () => {
	it('reads both spellings, flat first', () => {
		expect(readNodePoint({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
		expect(readNodePoint({ position: { x: 3, y: 4 } })).toEqual({ x: 3, y: 4 })
		expect(readNodePoint({ x: 1, y: 2, position: { x: 9, y: 9 } })).toEqual({ x: 1, y: 2 })
	})

	it('answers null when there is nothing usable', () => {
		expect(readNodePoint({})).toBeNull()
		expect(readNodePoint({ x: 'top' })).toBeNull()
		expect(readNodePoint(null)).toBeNull()
	})

	it('treats the origin as a real position', () => {
		expect(readNodePoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
	})
})

describe('needsFullLayout', () => {
	it('wants a layout when no node carries a position', () => {
		expect(needsFullLayout(bareNodes(['a', 'b']))).toBe(true)
	})

	it('wants a layout when every positioned node piles on one point', () => {
		const pile = [
			{ id: 'a', x: 0, y: 0 },
			{ id: 'b', x: 0, y: 0 },
			{ id: 'c', position: { x: 0, y: 0 } },
		]
		expect(needsFullLayout(pile)).toBe(true)
	})

	it('wants a layout for an identical pile away from the origin too', () => {
		expect(needsFullLayout([
			{ id: 'a', x: 40, y: 40 },
			{ id: 'b', x: 40, y: 40 },
		])).toBe(true)
	})

	it('leaves an arranged flow alone', () => {
		expect(needsFullLayout([
			{ id: 'a', x: 0, y: 0 },
			{ id: 'b', x: 200, y: 0 },
		])).toBe(false)
	})

	it('leaves a single node parked at the origin alone', () => {
		expect(needsFullLayout([{ id: 'a', x: 0, y: 0 }])).toBe(false)
	})

	it('treats a mix of placed and loose nodes as arranged', () => {
		expect(needsFullLayout([
			{ id: 'a', x: 100, y: 100 },
			{ id: 'b' },
		])).toBe(false)
	})

	it('has no opinion on an empty graph', () => {
		expect(needsFullLayout([])).toBe(false)
	})
})

describe('layoutFlowNodes — layering', () => {
	it('lays a diamond out with the branches side by side', () => {
		const nodes = bareNodes(['a', 'b', 'c', 'd'])
		const lines = toLines([
			{ from: 'a', to: 'b' },
			{ from: 'a', to: 'c' },
			{ from: 'b', to: 'd' },
			{ from: 'c', to: 'd' },
		])

		const points = pointsOf(layoutFlowNodes(nodes, lines, ['a']))

		expect(points.get('a').x).toBe(FLOW_LAYOUT_MARGIN)
		expect(points.get('b').x).toBe(points.get('c').x)
		expect(points.get('b').x).toBe(FLOW_LAYOUT_MARGIN + FLOW_LAYOUT_COLUMN_WIDTH)
		expect(points.get('b').y).not.toBe(points.get('c').y)
		expect(points.get('d').x).toBe(FLOW_LAYOUT_MARGIN + (2 * FLOW_LAYOUT_COLUMN_WIDTH))
	})

	it('keeps parallel branches on their own rows all the way across', () => {
		// a → b1 → b2 → join, a → c1 → c2 → join.
		const nodes = bareNodes(['a', 'b1', 'c1', 'b2', 'c2', 'join'])
		const lines = toLines([
			{ from: 'a', to: 'b1' },
			{ from: 'a', to: 'c1' },
			{ from: 'b1', to: 'b2' },
			{ from: 'c1', to: 'c2' },
			{ from: 'b2', to: 'join' },
			{ from: 'c2', to: 'join' },
		])

		const points = pointsOf(layoutFlowNodes(nodes, lines, ['a']))

		// The barycenter pass keeps each branch behind its own head instead
		// of braiding: b2 follows b1's row, c2 follows c1's.
		expect(points.get('b2').y).toBe(points.get('b1').y)
		expect(points.get('c2').y).toBe(points.get('c1').y)
		expect(points.get('b1').y).not.toBe(points.get('c1').y)
	})

	it('places a node one column past the furthest node leading to it', () => {
		// a → b → c plus the shortcut a → c: longest path wins, so c sits in
		// the third column, to the right of BOTH of its sources.
		const nodes = bareNodes(['a', 'b', 'c'])
		const lines = toLines([
			{ from: 'a', to: 'b' },
			{ from: 'b', to: 'c' },
			{ from: 'a', to: 'c' },
		])

		const points = pointsOf(layoutFlowNodes(nodes, lines, ['a']))

		expect(points.get('c').x).toBe(FLOW_LAYOUT_MARGIN + (2 * FLOW_LAYOUT_COLUMN_WIDTH))
	})

	it('tolerates a cycle: terminates, and the loop reads left to right', () => {
		// a → b → c → b is a loop; c → d leaves it.
		const nodes = bareNodes(['a', 'b', 'c', 'd'])
		const lines = toLines([
			{ from: 'a', to: 'b' },
			{ from: 'b', to: 'c' },
			{ from: 'c', to: 'b' },
			{ from: 'c', to: 'd' },
		])

		const points = pointsOf(layoutFlowNodes(nodes, lines, ['a']))

		// The back edge is dropped from LAYERING only: b keeps the column its
		// forward path gives it, instead of drifting right forever.
		expect(points.get('b').x).toBe(FLOW_LAYOUT_MARGIN + FLOW_LAYOUT_COLUMN_WIDTH)
		expect(points.get('c').x).toBe(FLOW_LAYOUT_MARGIN + (2 * FLOW_LAYOUT_COLUMN_WIDTH))
		expect(points.get('d').x).toBe(FLOW_LAYOUT_MARGIN + (3 * FLOW_LAYOUT_COLUMN_WIDTH))
	})

	it('survives a two-node cycle with no way in', () => {
		// No start can reach the loop, so both nodes are "unreachable" and
		// must still land somewhere finite, off the origin.
		const nodes = bareNodes(['start', 'x', 'y'])
		const lines = toLines([
			{ from: 'x', to: 'y' },
			{ from: 'y', to: 'x' },
		])

		const laid = layoutFlowNodes(nodes, lines, ['start'])

		for (const node of laid) {
			expect(Number.isFinite(node.x)).toBe(true)
			expect(Number.isFinite(node.y)).toBe(true)
		}
		const points = pointsOf(laid)
		expect(points.get('x').x).toBeGreaterThan(points.get('start').x)
	})

	it('puts unreachable nodes one column past everything', () => {
		const nodes = bareNodes(['a', 'b', 'loose'])
		const lines = toLines([{ from: 'a', to: 'b' }])

		const points = pointsOf(layoutFlowNodes(nodes, lines, ['a']))

		expect(points.get('loose').x).toBe(FLOW_LAYOUT_MARGIN + (2 * FLOW_LAYOUT_COLUMN_WIDTH))
	})

	it('clears the floating toolbar', () => {
		const laid = layoutFlowNodes(bareNodes(['a']), [], ['a'])
		expect(laid[0].y).toBeGreaterThanOrEqual(FLOW_LAYOUT_TOP)
	})

	it('changes coordinates and nothing else, writing both spellings', () => {
		const nodes = [{ id: 'a', type: 'x', config: { keep: 1 }, start: true }]
		const laid = layoutFlowNodes(nodes, [], ['a'])

		expect(laid[0].config).toEqual({ keep: 1 })
		expect(laid[0].start).toBe(true)
		expect(laid[0].position).toEqual({ x: laid[0].x, y: laid[0].y })
		// The input was not mutated.
		expect(nodes[0].x).toBeUndefined()
	})
})

describe('layoutFlowNodes — determinism', () => {
	it('answers the same coordinates for the same input, every time', () => {
		const nodes = () => bareNodes(['a', 'b', 'c', 'd', 'e'])
		const lines = toLines([
			{ from: 'a', to: 'b' },
			{ from: 'a', to: 'c' },
			{ from: 'b', to: 'd' },
			{ from: 'c', to: 'd' },
			{ from: 'd', to: 'e' },
		])

		const first = layoutFlowNodes(nodes(), lines, ['a'])
		const second = layoutFlowNodes(nodes(), lines, ['a'])

		expect(second).toEqual(first)
	})
})

describe('layoutFlowNodes — the real dossiq case flow', () => {
	const lines = toLines(caseFlow.edges)
	const laid = layoutFlowNodes(caseFlow.nodes, lines, ['start'])
	const points = pointsOf(laid)

	it('is the shape the live bug had: 18 nodes, no positions, one loop', () => {
		expect(caseFlow.nodes).toHaveLength(18)
		expect(caseFlow.nodes.some((node) => readNodePoint(node) !== null)).toBe(false)
		expect(needsFullLayout(caseFlow.nodes)).toBe(true)
	})

	it('gives every node its own point, well separated', () => {
		const seen = new Set()
		for (const node of laid) {
			expect(Number.isFinite(node.x)).toBe(true)
			expect(Number.isFinite(node.y)).toBe(true)
			seen.add(`${node.x},${node.y}`)
		}
		expect(seen.size).toBe(18)

		// No overlap is not enough — cards are ~230x130px, so any two nodes
		// must be at least a column or a row apart.
		for (let i = 0; i < laid.length; i++) {
			for (let j = i + 1; j < laid.length; j++) {
				const dx = Math.abs(laid[i].x - laid[j].x)
				const dy = Math.abs(laid[i].y - laid[j].y)
				expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(FLOW_LAYOUT_ROW_HEIGHT)
			}
		}
	})

	it('flows left to right, except the one loop-back the flow really has', () => {
		const backward = lines.filter(
			(line) => points.get(line.target).x <= points.get(line.source).x,
		)

		// `ask-indiener → check-complete` closes the resubmission loop; every
		// other edge must point right.
		expect(backward.map((line) => `${line.source}→${line.target}`))
			.toEqual(['ask-indiener→check-complete'])
	})

	it('starts at the trigger, on the left edge', () => {
		expect(points.get('start').x).toBe(FLOW_LAYOUT_MARGIN)
		const minX = Math.min(...laid.map((node) => node.x))
		expect(points.get('start').x).toBe(minX)
	})

	it('is deterministic on the real graph too', () => {
		expect(layoutFlowNodes(caseFlow.nodes, lines, ['start'])).toEqual(laid)
	})
})

describe('placeLooseNodes', () => {
	const lines = toLines([
		{ from: 'a', to: 'b' },
		{ from: 'b', to: 'c' },
	])

	it('keeps every placed node byte for byte, and by reference', () => {
		const placed = { id: 'a', x: 300, y: 500 }
		const nodes = [placed, { id: 'b' }, { id: 'c' }]

		const result = placeLooseNodes(nodes, lines, ['a'])

		expect(result[0]).toBe(placed)
	})

	it('slots loose nodes beneath the lowest placed node, in run order', () => {
		const nodes = [
			{ id: 'a', x: 300, y: 500 },
			{ id: 'b' },
			{ id: 'c' },
		]

		const result = placeLooseNodes(nodes, lines, ['a'])
		const points = pointsOf(result)

		for (const id of ['b', 'c']) {
			expect(points.get(id).y).toBeGreaterThanOrEqual(500 + FLOW_LAYOUT_ROW_HEIGHT)
		}
		// Run order still reads left to right along the strip.
		expect(points.get('c').x).toBeGreaterThan(points.get('b').x)
	})

	it('writes both spellings on the nodes it places', () => {
		const result = placeLooseNodes([{ id: 'a', x: 10, y: 10 }, { id: 'b' }], lines, ['a'])
		const b = result.find((node) => node.id === 'b')
		expect(b.position).toEqual({ x: b.x, y: b.y })
	})

	it('does nothing when every node is placed', () => {
		const nodes = [{ id: 'a', x: 1, y: 2 }, { id: 'b', x: 3, y: 4 }]
		const result = placeLooseNodes(nodes, lines, ['a'])
		expect(result[0]).toBe(nodes[0])
		expect(result[1]).toBe(nodes[1])
	})
})
