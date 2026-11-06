/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flowStepBridge, flowStepRows, flowStepSwap, flowStepTail, insertStepEdges, orderFlowNodes, swapStepEdges, swapStepPlaces } from '../../src/utils/flowStepList.js'

const roleOf = (type) => (type === 'trigger' || type === 'end' ? type : 'step')

/**
 * @param {object} id The node id and its optional fields.
 * @param {string} [type] The node type.
 * @return {object} A node.
 */
function node(id, type = 'step') {
	return { id, type, name: id.toUpperCase() }
}

/**
 * @param {string} source The source id.
 * @param {string} target The target id.
 * @param {object} [data] The line's data.
 * @return {object} A drawn line, its stored edge in `data.edge`.
 */
function line(source, target, data = {}) {
	return { id: `${source}-${target}`, source, target, data: { edge: { from: source, to: target }, ...data } }
}

/**
 * @param {Array<object>} nodes The nodes.
 * @param {Array<object>} lines The lines.
 * @return {object} The graph, entered at `t`.
 */
function graphOf(nodes, lines) {
	return { nodes, lines, startIds: ['t'], roleOf }
}

function chain() {
	return graphOf(
		[node('e', 'end'), node('b'), node('t', 'trigger'), node('a')],
		[line('t', 'a'), line('a', 'b'), line('b', 'e')],
	)
}

function branch() {
	return graphOf(
		[node('t', 'trigger'), { ...node('c'), exits: [{ id: 'hi' }, { id: 'lo' }] }, { ...node('h'), y: 10 }, { ...node('m'), y: 20 }, node('a'), node('o'), node('e', 'end')],
		[
			line('t', 'c'),
			line('c', 'h', { conditionText: 'prio is high', condition: { '==': [] } }),
			line('c', 'm', { conditionText: 'Otherwise', condition: null }),
			line('h', 'a'),
			line('a', 'o'),
			line('m', 'o'),
			line('o', 'e'),
		],
	)
}

const ids = (entries) => entries.map((entry) => entry.node.id)

describe('orderFlowNodes', () => {
	it('follows the run, not the order in the document', () => {
		expect(ids(orderFlowNodes(chain()))).toEqual(['t', 'a', 'b', 'e'])
	})

	it('takes branches level by level, top to bottom', () => {
		expect(ids(orderFlowNodes(branch()))).toEqual(['t', 'c', 'h', 'm', 'a', 'o', 'e'])
	})

	it('reads a position in either spelling', () => {
		const graph = graphOf(
			[node('t', 'trigger'), { ...node('x'), position: { x: 0, y: 9 } }, { ...node('y'), y: 1 }],
			[line('t', 'x'), line('t', 'y')],
		)

		expect(ids(orderFlowNodes(graph))).toEqual(['t', 'y', 'x'])
	})

	it('survives a loop', () => {
		const graph = graphOf(
			[node('t', 'trigger'), node('ask'), node('check'), node('e', 'end')],
			[line('t', 'ask'), line('ask', 'check'), line('check', 'ask'), line('check', 'e')],
		)

		expect(ids(orderFlowNodes(graph))).toEqual(['t', 'ask', 'check', 'e'])
	})

	it('puts steps nothing leads to last', () => {
		const graph = chain()
		graph.nodes.unshift(node('z'))

		const ordered = orderFlowNodes(graph)

		expect(ids(ordered)).toEqual(['t', 'a', 'b', 'e', 'z'])
		expect(ordered[4].loose).toBe(true)
	})
})

describe('flowStepRows', () => {
	const titleOf = (item) => item.name || item.id

	it('splits the triggers off and numbers the steps', () => {
		const { triggers, steps } = flowStepRows(chain(), titleOf)

		expect(triggers.map((row) => row.id)).toEqual(['t'])
		expect(steps.map((row) => [row.id, row.n])).toEqual([['a', 1], ['b', 2], ['e', 3]])
	})

	it('shows a branch as conditions on the steps and routes on the branching step', () => {
		const { steps } = flowStepRows(branch(), titleOf)
		const byId = Object.fromEntries(steps.map((row) => [row.id, row]))

		expect(byId.h.when).toBe('Only if prio is high')
		expect(byId.m.when).toBe('Otherwise')
		expect(byId.c.routes.map((route) => [route.label, route.to])).toEqual([['prio is high', 'Step 2'], ['Otherwise', 'Step 3']])
		expect(byId.a.routes).toEqual([])
	})

	it('names no condition on a step a plain line also reaches', () => {
		const { steps } = flowStepRows(branch(), titleOf)

		expect(steps.find((row) => row.id === 'o').when).toBe('')
	})

	it('names a route to a trigger by its title', () => {
		const graph = graphOf([node('t', 'trigger'), node('a'), node('b')], [line('t', 'a'), line('a', 'b', { label: 'next' }), line('a', 't', { label: 'again' })])

		expect(flowStepRows(graph, titleOf).steps[0].routes.map((route) => route.to)).toEqual(['Step 2', 'T'])
	})

	it('offers the arrows along a chain only', () => {
		const rows = flowStepRows(chain(), titleOf).steps

		expect(rows.map((row) => [row.canMoveUp, row.canMoveDown])).toEqual([[false, true], [true, false], [false, false]])
		expect(flowStepRows(branch(), titleOf).steps.find((row) => row.id === 'h').canMoveDown).toBe(false)
	})
})

describe('flowStepSwap', () => {
	it('names the pair in list order', () => {
		expect(flowStepSwap(chain(), { id: 'a', by: 1 })).toEqual(['a', 'b'])
		expect(flowStepSwap(chain(), { id: 'b', by: -1 })).toEqual(['a', 'b'])
	})

	it.each([
		['the first step up', 'a', -1],
		['past the closing step', 'b', 1],
		['an unknown step', 'x', 1],
	])('refuses %s', (name, id, by) => {
		expect(flowStepSwap(chain(), { id, by })).toBeNull()
	})

	it('refuses a step that routes through exits', () => {
		const graph = chain()
		graph.nodes.find((item) => item.id === 'b').exits = [{ id: 'x' }]

		expect(flowStepSwap(graph, { id: 'a', by: 1 })).toBeNull()
	})

	it('refuses a step the run starts on', () => {
		const graph = chain()
		graph.nodes.find((item) => item.id === 'a').start = true

		expect(flowStepSwap(graph, { id: 'a', by: 1 })).toBeNull()
	})
})

describe('swapStepEdges', () => {
	it('swaps the two steps in the chain, in either spelling and in lists', () => {
		const edges = [
			{ from: 't', to: 'a', fromExit: 'go' },
			{ source: 'a', target: 'b' },
			{ from: 'b', to: ['e', 'x'] },
		]

		expect(swapStepEdges(edges, ['a', 'b'])).toEqual([
			{ from: 't', to: 'b', fromExit: 'go' },
			{ source: 'b', target: 'a' },
			{ from: 'a', to: ['e', 'x'] },
		])
	})
})

describe('swapStepPlaces', () => {
	it('swaps both spellings of the place and nothing else', () => {
		const nodes = [
			{ id: 'a', name: 'A', x: 1, y: 2, position: { x: 1, y: 2 } },
			{ id: 'b', name: 'B', x: 3, y: 4 },
			{ id: 'c', x: 9, y: 9 },
		]

		expect(swapStepPlaces(nodes, ['a', 'b'])).toEqual([
			{ id: 'a', name: 'A', x: 3, y: 4, position: undefined },
			{ id: 'b', name: 'B', x: 1, y: 2, position: { x: 1, y: 2 } },
			{ id: 'c', x: 9, y: 9 },
		])
	})
})

describe('adding at the bottom', () => {
	it('goes before the closing step', () => {
		const graph = chain()
		const tail = flowStepTail(graph)

		expect(tail.end.id).toBe('e')
		expect(insertStepEdges(graph.lines.map((item) => item.data.edge), { id: 'n', ...tail })).toEqual([
			{ from: 't', to: 'a' },
			{ from: 'a', to: 'b' },
			{ from: 'b', to: 'n' },
			{ from: 'n', to: 'e' },
		])
	})

	it('takes every line into the closing step along', () => {
		const graph = graphOf(
			[node('t', 'trigger'), node('a'), node('b'), node('e', 'end')],
			[line('t', 'a'), line('t', 'b'), line('a', 'e'), line('b', 'e')],
		)

		expect(insertStepEdges(graph.lines.map((item) => item.data.edge), { id: 'n', ...flowStepTail(graph) })).toEqual([
			{ from: 't', to: 'a' },
			{ from: 't', to: 'b' },
			{ from: 'a', to: 'n' },
			{ from: 'b', to: 'n' },
			{ from: 'n', to: 'e' },
		])
	})

	it('follows the last step when there is no closing step', () => {
		const graph = graphOf([node('t', 'trigger'), node('a')], [line('t', 'a')])

		expect(insertStepEdges([{ from: 't', to: 'a' }], { id: 'n', ...flowStepTail(graph) })).toEqual([{ from: 't', to: 'a' }, { from: 'a', to: 'n' }])
	})

	it('wires a first step between the trigger and a closing step not yet reached', () => {
		const graph = graphOf([node('t', 'trigger'), node('e', 'end')], [])
		graph.startIds = ['t', 'e']

		expect(insertStepEdges([], { id: 'n', ...flowStepTail(graph) })).toEqual([{ from: 't', to: 'n' }, { from: 'n', to: 'e' }])
	})

	it('adds no line to an empty flow', () => {
		expect(insertStepEdges([], { id: 'n', ...flowStepTail(graphOf([], [])) })).toEqual([])
	})
})

describe('flowStepBridge', () => {
	it('carries the line in on to the next step', () => {
		const graph = chain()
		graph.lines[1].data.edge = { from: 'a', to: 'b', fromExit: 'go', title: 'on' }

		expect(flowStepBridge(graph, 'b')).toEqual({ from: 'a', to: 'e', fromExit: 'go', title: 'on' })
	})

	it('keeps the spelling of the stored edge', () => {
		const graph = chain()
		graph.lines[1].data.edge = { source: 'a', target: 'b' }

		expect(flowStepBridge(graph, 'b')).toEqual({ source: 'a', target: 'e' })
	})

	it.each([
		['a branching step', 'c'],
		['a step two lines reach', 'o'],
		['an unknown step', 'x'],
	])('leaves %s to the plain removal', (name, id) => {
		expect(flowStepBridge(branch(), id)).toBeNull()
	})

	it('does not bridge a record that draws several lines', () => {
		const graph = chain()
		graph.lines[1].data.edge = { from: 'a', to: ['b', 'x'] }

		expect(flowStepBridge(graph, 'b')).toBeNull()
	})

	it('does not make a step point at itself', () => {
		const graph = graphOf([node('t', 'trigger'), node('a'), node('b')], [line('a', 'b'), line('b', 'a')])

		expect(flowStepBridge(graph, 'b')).toBeNull()
	})
})
