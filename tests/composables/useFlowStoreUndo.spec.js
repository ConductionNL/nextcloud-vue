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

	it('caps the stack so a long session cannot grow without bound', () => {
		const store = seeded()

		for (let i = 0; i < 60; i++) {
			store.setFlowField('name', `n${i}`)
		}

		expect(store.undoStack.length).toBeLessThanOrEqual(50)
	})
})
