/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * THE EDITOR MUST WRITE THE DIALECT THE ENGINE READS.
 *
 * `connect()` used to store `{source, target}`. The canvas rendered it —
 * `canvasEdges` accepts either spelling — so the author saw the connection and
 * the save succeeded. OpenRegister's flow engine only reads `from`/`to`, so
 * the edge was invisible to it: validate returned a `node-dead-end` warning
 * and a run was refused with "node … has no outgoing edge".
 *
 * Measured against a live instance before this fix:
 *   edges: [{source, target}] -> node-dead-end warning
 *   edges: [{from, to}]       -> clean
 */
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * Seed a store with two unconnected nodes.
 *
 * @return {object} The store.
 */
function twoNodes() {
	const store = useFlowStore()
	store.flow = {
		name: 'dialect',
		nodes: [
			{ id: 'a', type: 'openregister.trigger-manual', config: {}, start: true },
			{ id: 'b', type: 'openregister.end', config: {} },
		],
		edges: [],
	}

	return store
}

describe('useFlowStore — edge dialect', () => {
	it('writes from/to, the spelling the engine reads', () => {
		const store = twoNodes()

		store.connect({ source: 'a', target: 'b' })

		expect(store.edges).toHaveLength(1)
		expect(store.edges[0]).toEqual({ from: 'a', to: 'b' })
		// The old spelling must not linger: the server ignores it entirely.
		expect(store.edges[0].source).toBeUndefined()
		expect(store.edges[0].target).toBeUndefined()
	})

	it('still renders the edge on the canvas', () => {
		const store = twoNodes()

		store.connect({ source: 'a', target: 'b' })

		expect(store.canvasEdges).toHaveLength(1)
		expect(store.canvasEdges[0]).toMatchObject({ source: 'a', target: 'b' })
	})

	it('does not duplicate an edge a loaded flow already carries', () => {
		const store = twoNodes()
		// A flow loaded from the server carries `from`/`to`.
		store.flow.edges = [{ from: 'a', to: 'b' }]

		store.connect({ source: 'a', target: 'b' })

		expect(store.edges).toHaveLength(1)
	})

	it('removes a loaded flow\'s edges when their node goes', () => {
		const store = twoNodes()
		store.flow.edges = [{ from: 'a', to: 'b' }]

		store.removeNode('b')

		// Previously this filtered on source/target only, so a `from`/`to`
		// edge survived the deletion of the node it pointed at.
		expect(store.edges).toHaveLength(0)
	})
})

describe('useFlowStore — Vue Flow does the routing', () => {
	/**
	 * The lines carried no `type`, so every one fell back to Vue Flow's
	 * default bezier — which crosses nodes and doubles back as soon as a graph
	 * stops being a straight chain. That looked like "our lines are
	 * disorderly", and the instinct was to lay the graph out ourselves to
	 * compensate rather than to set the routing option we had never set.
	 */
	it('routes with smoothstep and an arrowhead by default', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [{ id: 'a' }, { id: 'b' }],
			edges: [{ id: 'e1', from: 'a', to: 'b' }],
		}

		const [line] = store.canvasEdges

		expect(line.data.lineType).toBe('smoothstep')
		expect(line.markerEnd).toBe('arrowclosed')
	})

	/**
	 * `type` names the COMPONENT that draws the line, and the router is not a
	 * component. While the router sat there Vue Flow answered with its own
	 * built-in edge, which is why nothing could be attached to a line: the
	 * label, the marker control and the payload affordance had nowhere to
	 * render. Asserted explicitly because the two readings look identical from
	 * the outside — the lines route the same either way, and only the things
	 * that CANNOT be added tell them apart.
	 */
	it('names our own edge component in `type`, never the router', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [{ id: 'a' }, { id: 'b' }],
			edges: [{ id: 'e1', from: 'a', to: 'b', lineType: 'straight' }],
		}

		const [line] = store.canvasEdges

		expect(line.type).toBe('default')
		expect(line.data.lineType).toBe('straight')
	})

	/**
	 * The seam an edge-level control hangs off: one awkward line can be
	 * rerouted without moving a node, and the choice lives on the connection
	 * rather than in a canvas-wide setting.
	 */
	it('lets the connection override the routing per line', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [{ id: 'a' }, { id: 'b' }],
			edges: [{ id: 'e1', from: 'a', to: 'b', lineType: 'straight' }],
		}

		expect(store.canvasEdges[0].data.lineType).toBe('straight')
	})

	it('still splits one connection into several lines, each routed', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
			edges: [{ id: 'e1', from: 'a', to: ['b', 'c'] }],
		}

		expect(store.canvasEdges).toHaveLength(2)
		expect(store.canvasEdges.every((l) => l.data.lineType === 'smoothstep')).toBe(true)
	})
})
