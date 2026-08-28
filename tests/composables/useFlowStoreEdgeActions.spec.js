/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A LINE IS NOT A RECORD, AND THAT IS THE WHOLE DIFFICULTY.
 *
 * `canvasEdges` expands one stored edge into several drawn lines: an endpoint
 * may be a LIST, so `{from: 'a', to: ['b','c']}` is one record and two
 * connections. Every action a user takes on the canvas is aimed at ONE of those
 * lines, and the naive implementations of all four actions below act on the
 * whole record instead:
 *
 *   - deleting a→c drops the record, and a→b vanishes with it;
 *   - restyling a→c restyles a→b as well, from a control opened on one line.
 *
 * Neither failure raises anything. The canvas simply shows a graph the author
 * did not draw, which is the same class of defect as an edge dialect the engine
 * cannot read — see useFlowStoreEdgeDialect.spec.js.
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
 * Seed a store with three steps and the given edges.
 *
 * @param {Array<object>} edges The stored edges.
 * @return {object} The store.
 */
function seed(edges) {
	const store = useFlowStore()
	store.flow = {
		name: 'edge actions',
		nodes: [
			{ id: 'a', type: 'openregister.trigger-manual', config: {}, start: true },
			{ id: 'b', type: 'openregister.set-fields', config: {} },
			{ id: 'c', type: 'openregister.end', config: {} },
		],
		edges,
	}
	store.undoStack = []
	store.editingEdge = null
	store.edgeStyleClipboard = null

	return store
}

describe('useFlowStore — acting on one connection', () => {
	describe('locateEdge', () => {
		it('finds a line stored in either dialect', () => {
			expect(seed([{ from: 'a', to: 'b' }]).locateEdge({ source: 'a', target: 'b' })).not.toBeNull()
			expect(seed([{ source: 'a', target: 'b' }]).locateEdge({ source: 'a', target: 'b' })).not.toBeNull()
		})

		it('finds a line inside a record that draws several', () => {
			const found = seed([{ from: 'a', to: ['b', 'c'] }]).locateEdge({ source: 'a', target: 'c' })

			expect(found.targets).toEqual(['b', 'c'])
			expect(found.targetKey).toBe('to')
		})

		it('reports nothing for a line that is not drawn', () => {
			expect(seed([{ from: 'a', to: 'b' }]).locateEdge({ source: 'b', target: 'a' })).toBeNull()
		})
	})

	describe('removeEdge', () => {
		it('removes the record when it drew only that line', () => {
			const store = seed([{ from: 'a', to: 'b' }])

			store.removeEdge({ source: 'a', target: 'b' })

			expect(store.edges).toEqual([])
		})

		/**
		 * ⚠️ THE ONE THAT MATTERS. Dropping the whole record because it happens
		 * to be where a→c is stored deletes a→b, which the author never
		 * selected — and nothing reports it.
		 */
		it('narrows a multi-line record instead of dropping it', () => {
			const store = seed([{ from: 'a', to: ['b', 'c'] }])

			store.removeEdge({ source: 'a', target: 'c' })

			expect(store.edges).toEqual([{ from: 'a', to: 'b' }])
			expect(store.canvasEdges.map((line) => `${line.source}->${line.target}`)).toEqual(['a->b'])
		})

		it('leaves the document alone when the line is not there', () => {
			const store = seed([{ from: 'a', to: 'b' }])

			store.removeEdge({ source: 'c', target: 'a' })

			expect(store.edges).toEqual([{ from: 'a', to: 'b' }])
			// No undo entry either: a no-op that pushes one makes Ctrl+Z do
			// nothing visible, which reads as undo being broken.
			expect(store.undoStack).toEqual([])
		})

		it('is undoable', () => {
			const store = seed([{ from: 'a', to: 'b' }])

			store.removeEdge({ source: 'a', target: 'b' })
			store.undo()

			expect(store.edges).toEqual([{ from: 'a', to: 'b' }])
		})
	})

	describe('setEdgeFields', () => {
		it('writes onto the record when it draws only that line', () => {
			const store = seed([{ from: 'a', to: 'b' }])

			store.setEdgeFields({ source: 'a', target: 'b', fields: { lineType: 'straight', title: 'yes' } })

			expect(store.edges).toEqual([{ from: 'a', to: 'b', lineType: 'straight', title: 'yes' }])
		})

		/**
		 * A per-line control whose blast radius is every line of the record is
		 * not a per-line control.
		 */
		it('splits a multi-line record so the sibling line keeps its own style', () => {
			const store = seed([{ from: 'a', to: ['b', 'c'] }])

			store.setEdgeFields({ source: 'a', target: 'c', fields: { lineType: 'straight' } })

			const drawn = store.canvasEdges
			expect(drawn).toHaveLength(2)
			expect(drawn.find((line) => line.target === 'c').data.lineType).toBe('straight')
			expect(drawn.find((line) => line.target === 'b').data.lineType).toBe('smoothstep')
		})

		it('commits every field as ONE undo step', () => {
			const store = seed([{ from: 'a', to: 'b' }])

			store.setEdgeFields({ source: 'a', target: 'b', fields: { lineType: 'straight', title: 'yes' } })
			store.undo()

			expect(store.edges).toEqual([{ from: 'a', to: 'b' }])
		})
	})

	describe('copy and paste a line’s presentation', () => {
		it('carries the label and the router onto another line', () => {
			const store = seed([
				{ from: 'a', to: 'b', lineType: 'straight', title: 'approved' },
				{ from: 'b', to: 'c' },
			])

			store.copyEdgeStyle({ source: 'a', target: 'b' })
			store.pasteEdgeStyle({ source: 'b', target: 'c' })

			expect(store.edges[1]).toEqual({ from: 'b', to: 'c', lineType: 'straight', title: 'approved' })
		})

		it('is one undo step, not two', () => {
			const store = seed([
				{ from: 'a', to: 'b', lineType: 'straight', title: 'approved' },
				{ from: 'b', to: 'c' },
			])

			store.copyEdgeStyle({ source: 'a', target: 'b' })
			store.pasteEdgeStyle({ source: 'b', target: 'c' })
			store.undo()

			expect(store.edges[1]).toEqual({ from: 'b', to: 'c' })
		})

		it('does nothing with an empty clipboard', () => {
			const store = seed([{ from: 'b', to: 'c' }])

			store.pasteEdgeStyle({ source: 'b', target: 'c' })

			expect(store.edges).toEqual([{ from: 'b', to: 'c' }])
		})
	})

	describe('a dialog open on a line the graph no longer has', () => {
		it('closes when the step at either end is removed', () => {
			const store = seed([{ from: 'a', to: 'b' }])
			store.editingEdge = { source: 'a', target: 'b' }

			store.removeNode('b')

			expect(store.editingEdge).toBeNull()
		})

		it('stays open when an unrelated step goes', () => {
			const store = seed([{ from: 'a', to: 'b' }])
			store.editingEdge = { source: 'a', target: 'b' }

			store.removeNode('c')

			expect(store.editingEdge).toEqual({ source: 'a', target: 'b' })
		})
	})
})
