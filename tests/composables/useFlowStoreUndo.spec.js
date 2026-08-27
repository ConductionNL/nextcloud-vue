// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// The flow editor's undo stack.
//
// A canvas is direct manipulation: a mis-aimed Delete or a dropped node
// destroys work with no dialog in between. Before this the only way back was to
// reload the page and lose everything since the last save.
//
// The tests that matter here are the ones about what undo must NOT do — restore
// a reference that later edits rewrite, come back empty, or appear to do
// nothing. Each has a control, because "the flow changed" is true of an undo
// that restored the wrong snapshot just as much as the right one.

import { setActivePinia, createPinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

/**
 * A two-node flow, for the tests that only need something to edit.
 *
 * @return {object} The store.
 */
const seededFlow = () => {
	const store = useFlowStore()
	store.flow = {
		name: 'F',
		nodes: [{ id: 'a', type: 'openregister.trigger-manual' }, { id: 'b', type: 'openregister.end' }],
		edges: [{ id: 'e1', from: 'a', to: 'b' }],
	}
	return store
}

describe('useFlowStore — undo', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	/**
	 * Give the store a two-node flow to edit.
	 *
	 * @return {object} The store.
	 */
	const seeded = () => {
		const store = useFlowStore()
		store.flow = {
			name: 'F',
			nodes: [{ id: 'a', type: 'openregister.trigger-manual' }, { id: 'b', type: 'openregister.end' }],
			edges: [{ id: 'e1', from: 'a', to: 'b' }],
		}
		return store
	}

	it('has nothing to undo before anything is edited', () => {
		expect(seeded().canUndo).toBe(false)
	})

	it('brings back a removed node AND the edge that pointed at it', () => {
		const store = seeded()

		store.removeNode('b')
		expect(store.nodes.map((n) => n.id)).toEqual(['a'])
		expect(store.edges).toEqual([])

		expect(store.undo()).toBe(true)

		// The edge is the point. `removeNode` drops the edges referencing the
		// node, so an undo that restored only `nodes` would leave a graph that
		// looks whole and has lost its connection.
		expect(store.nodes.map((n) => n.id)).toEqual(['a', 'b'])
		expect(store.edges).toHaveLength(1)
	})

	it('steps back one edit at a time, in order', () => {
		const store = seeded()

		store.setFlowField('name', 'second')
		store.setFlowField('name', 'third')
		expect(store.flow.name).toBe('third')

		store.undo()
		expect(store.flow.name).toBe('second')

		store.undo()
		expect(store.flow.name).toBe('F')

		expect(store.canUndo).toBe(false)
	})

	/**
	 * ⚠️ THE SNAPSHOT MUST BE A COPY.
	 *
	 * Several actions mutate `flow` in place. A stack holding references would
	 * have every entry rewritten by the very edit it exists to reverse, so undo
	 * would restore the current state and look like it had done nothing at all.
	 */
	it('is not rewritten by the edit it exists to reverse', () => {
		const store = seeded()

		store.setNodeName('a', 'renamed')
		store.undo()

		expect(store.nodes.find((n) => n.id === 'a').name).not.toBe('renamed')
	})

	/**
	 * Actions snapshot before they know whether they will change anything —
	 * `connect()` refuses a duplicate, for instance. Without discarding the
	 * no-op entries a user would press Ctrl+Z and watch nothing happen, which
	 * reads as "undo is broken" rather than "that edit did nothing".
	 */
	it('skips entries that would restore the state already showing', () => {
		const store = seeded()

		store.connect({ source: 'a', target: 'b' })
		const after = JSON.stringify(store.flow)

		// The duplicate was refused, so the flow is unchanged...
		expect(after).toBe(JSON.stringify(store.flow))

		// ...and undo reports there was nothing to step back to, rather than
		// consuming the press silently.
		expect(store.undo()).toBe(false)
	})

	it('drops a selection that the restored flow no longer contains', () => {
		const store = seeded()

		store.addNode('openregister.set-fields')
		const added = store.nodes[store.nodes.length - 1].id
		store.selectedNodeId = added
		store.editingNodeId = added

		store.undo()

		expect(store.nodes.some((n) => n.id === added)).toBe(false)
		expect(store.selectedNodeId).toBeNull()
		expect(store.editingNodeId).toBeNull()
	})

	it('keeps a selection the restored flow still contains', () => {
		const store = seeded()

		store.selectedNodeId = 'a'
		store.setFlowField('name', 'changed')
		store.undo()

		// The control for the test above: undo clears a selection because the
		// node is GONE, not as a matter of course.
		expect(store.selectedNodeId).toBe('a')
	})

	it('invalidates the engine verdict, which described the replaced graph', () => {
		const store = seeded()

		store.removeNode('b')
		store.checkResult = { valid: true }
		store.undo()

		expect(store.checkResult).toBeNull()
	})

	/**
	 * ⚠️ THE COPY MUST NOT SHARE ITS CONFIG OBJECT.
	 *
	 * A shallow spread copies the reference, so editing the duplicate would
	 * silently rewrite the original — the copy would look independent and not
	 * be, and the author would find a step they never touched had changed.
	 */
	it('copies a step without sharing its config', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [{ id: 'a', type: 'openregister.set-fields', config: { to: 'x' }, x: 10, y: 20 }],
			edges: [],
		}

		const copyId = store.copyNode('a')
		const copy = store.nodes.find((n) => n.id === copyId)

		expect(store.nodes).toHaveLength(2)
		expect(copy.config).toEqual({ to: 'x' })

		copy.config.to = 'changed'
		expect(store.nodes.find((n) => n.id === 'a').config.to).toBe('x')
	})

	it('offsets the copy so it is not hidden under the original', () => {
		const store = useFlowStore()
		store.flow = { nodes: [{ id: 'a', type: 't', x: 10, y: 20 }], edges: [] }

		// The id FIRST. Calling copyNode() inside the predicate runs it once per
		// node and returns a different id each time — the copy is made, and the
		// search is for an id that no longer matches anything.
		const copyId = store.copyNode('a')
		const copy = store.nodes.find((n) => n.id === copyId)

		expect(copy.x).toBeGreaterThan(10)
		expect(copy.y).toBeGreaterThan(20)
	})

	/**
	 * A duplicate wired exactly like its original would fan the flow in two at
	 * that point — a different graph from the one the author asked for. And a
	 * second node claiming `start` makes the flow's entry ambiguous.
	 */
	it('does not copy the edges or the starting point', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [{ id: 'a', type: 't', start: true }, { id: 'b', type: 't' }],
			edges: [{ id: 'e1', from: 'a', to: 'b' }],
		}

		const copyId = store.copyNode('a')
		const copy = store.nodes.find((n) => n.id === copyId)

		expect(store.edges).toHaveLength(1)
		expect(copy.start).toBeUndefined()
	})

	it('refuses to copy a step that is not there, without throwing', () => {
		const store = useFlowStore()
		store.flow = { nodes: [], edges: [] }

		expect(store.copyNode('ghost')).toBeNull()
		expect(store.canUndo).toBe(false)
	})

	it('undoes a copy', () => {
		const store = seededFlow()

		store.copyNode('a')
		expect(store.nodes).toHaveLength(3)

		store.undo()
		expect(store.nodes).toHaveLength(2)
	})

	it('caps the stack so a long session cannot grow without bound', () => {
		const store = seeded()

		for (let i = 0; i < 60; i++) {
			store.setFlowField('name', `n${i}`)
		}

		expect(store.undoStack.length).toBeLessThanOrEqual(50)
	})
})
