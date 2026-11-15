/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The list view edits the flow document itself, and the canvas draws that same
 * document: these tests read the result back from `canvasEdges`, the lines the
 * canvas gets, not from what the list shows.
 */
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * @return {object} A store holding trigger → a → b → end.
 */
function seeded() {
	const store = useFlowStore()
	store.nodeCatalog = [
		{ id: 'openregister.trigger-manual', role: 'trigger' },
		{ id: 'openregister.set-fields', role: 'step' },
		{ id: 'openregister.end', role: 'end' },
	]
	store.flow = {
		name: 'list',
		lifecycleStatus: 'draft',
		nodes: [
			{ id: 't', type: 'openregister.trigger-manual', start: true, x: 0, y: 0 },
			{ id: 'a', type: 'openregister.set-fields', x: 0, y: 100 },
			{ id: 'b', type: 'openregister.set-fields', x: 0, y: 200 },
			{ id: 'e', type: 'openregister.end', x: 0, y: 300 },
		],
		edges: [{ from: 't', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'e' }],
	}

	return store
}

const drawn = (store) => store.canvasEdges.map((line) => `${line.source}>${line.target}`)

describe('list view edits', () => {
	beforeEach(() => setActivePinia(createPinia()))

	it('moves a step in the flow and on the canvas', () => {
		const store = seeded()

		store.moveStep({ id: 'b', by: -1 })

		expect(drawn(store)).toEqual(['t>b', 'b>a', 'a>e'])
		expect(store.nodes.find((node) => node.id === 'b').y).toBe(100)
		expect(store.dirty).toBe(true)
	})

	it('undoes a move in one go', () => {
		const store = seeded()

		store.moveStep({ id: 'a', by: 1 })
		store.undo()

		expect(drawn(store)).toEqual(['t>a', 'a>b', 'b>e'])
	})

	it('adds a step before the closing step, undone in one go', () => {
		const store = seeded()

		const id = store.appendStep('openregister.set-fields')

		expect(drawn(store)).toEqual(['t>a', 'a>b', `b>${id}`, `${id}>e`])
		expect(store.selectedNodeId).toBe(id)

		store.undo()

		expect(drawn(store)).toEqual(['t>a', 'a>b', 'b>e'])
		expect(store.nodes).toHaveLength(4)
	})

	it('closes the gap of a removed step, undone in one go', () => {
		const store = seeded()

		store.removeStep('a')

		expect(drawn(store)).toEqual(['b>e', 't>b'])

		store.undo()

		expect(drawn(store)).toEqual(['t>a', 'a>b', 'b>e'])
	})

	it('changes nothing on a published flow', () => {
		const store = seeded()
		store.flow.lifecycleStatus = 'published'

		store.moveStep({ id: 'a', by: 1 })
		store.removeStep('a')

		expect(store.appendStep('openregister.set-fields')).toBeUndefined()
		expect(drawn(store)).toEqual(['t>a', 'a>b', 'b>e'])
		expect(store.nodes).toHaveLength(4)
		expect(store.lifecycleRefusal?.reason).toBe('version-immutable')
	})

	it('ignores a move the list cannot make', () => {
		const store = seeded()

		store.moveStep({ id: 'a', by: -1 })

		expect(store.undoStack).toHaveLength(0)
		expect(store.dirty).toBe(false)
	})
})
