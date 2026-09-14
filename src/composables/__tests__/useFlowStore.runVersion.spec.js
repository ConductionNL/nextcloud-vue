/**
 * Tests for showing the graph a run actually executed.
 *
 * 🔴 THE PROPERTY THAT MATTERS: inspecting a run puts the version of the flow
 * that run executed onto the canvas, and closing the run puts the live graph
 * back untouched. A flow's graph moves on — steps are added, renamed and
 * deleted — so replaying an old run over today's canvas paints badges onto
 * nodes that did not exist when it ran and silently drops the ones that have
 * since been deleted.
 *
 * 🔴 THE PROPERTY THAT MATTERS MORE: while a snapshot is on the canvas,
 * `flow.id` still names the LIVE flow, and `save()` picks PUT over POST from
 * exactly that. One edit-and-save on a snapshot would overwrite the current
 * flow with an old graph. The lock and the `save()` refusal below are the two
 * halves of that guard, and the `save()` half is the one that holds when the
 * button is bypassed by a keyboard shortcut.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

// 🔑 HELD, NOT REQUIRED BACK — see useFlowStore.autoLayout.spec.js for why a
// `mock`-prefixed handle is the only way to double a peer dependency here.
const mockAxios = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: mockAxios,
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
}))

const { setActivePinia, createPinia } = require('pinia')
const { useFlowStore } = require('../useFlowStore.js')

const LIVE_NODES = [
	{ id: 'start', type: 'openregister.trigger-manual', position: { x: 0, y: 0 } },
	{ id: 'added-later', type: 'openregister.action-log', position: { x: 200, y: 0 } },
]
const LIVE_EDGES = [{ id: 'e-live', source: 'start', target: 'added-later' }]

const VERSION_NODES = [
	{ id: 'start', type: 'openregister.trigger-manual', position: { x: 0, y: 0 } },
	{ id: 'since-deleted', type: 'openregister.action-mail', position: { x: 200, y: 0 } },
]
const VERSION_EDGES = [{ id: 'e-v1', source: 'start', target: 'since-deleted' }]

/**
 * A store holding one open flow with the live graph on the canvas.
 *
 * @param {object} overrides Fields to override on the open flow.
 * @return {object} The store.
 */
function storeWithOpenFlow(overrides = {}) {
	const store = useFlowStore()
	store.flow = {
		id: 'flow-1',
		app: 'openregister',
		name: 'Flow under test',
		version: 3,
		lifecycleStatus: 'draft',
		nodes: JSON.parse(JSON.stringify(LIVE_NODES)),
		edges: JSON.parse(JSON.stringify(LIVE_EDGES)),
		...overrides,
	}
	store.dirty = false
	return store
}

/**
 * Answer the run read and the version read that `inspectRun()` makes.
 *
 * @param {object} options Shape of the two answers.
 * @param {number|null} options.flowVersion The version the run recorded.
 * @param {object|null} options.graph The stored graph, or null to 404.
 * @return {void}
 */
function respondWith({ flowVersion = 1, graph = { nodes: VERSION_NODES, edges: VERSION_EDGES } } = {}) {
	mockAxios.get.mockImplementation((url) => {
		if (url.includes('/flow-runs/')) {
			return Promise.resolve({ data: { log: [{ transition: 'when', status: 'completed' }], flowVersion } })
		}
		if (url.includes('/versions/')) {
			return graph === null
				? Promise.reject(new Error('no such version'))
				: Promise.resolve({ data: { version: flowVersion, graph } })
		}
		// The run's objects and tasks: not under test, answered empty so the
		// tail of inspectRun() does not reject and mask the assertion.
		return Promise.resolve({ data: { results: [] } })
	})
}

describe('useFlowStore run version snapshot', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		console.error.mockRestore()
	})

	describe('inspecting a run', () => {
		it('puts the graph that run executed onto the canvas', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: 1 })

			await store.inspectRun('run-1')

			expect(store.viewingVersion).toBe(1)
			expect(store.flow.nodes.map((n) => n.id)).toEqual(['start', 'since-deleted'])
			expect(store.flow.edges.map((e) => e.id)).toEqual(['e-v1'])
		})

		it('reads the version from the RUN, not from the loaded run history', async () => {
			const store = storeWithOpenFlow()
			// The history is capped at 25 rows and a run reached by `?run=` need
			// not be in it at all. If this ever regresses to reading
			// `this.runs`, a deep-linked run gets no snapshot and nothing says so.
			store.runs = []
			respondWith({ flowVersion: 2 })

			await store.inspectRun('run-1')

			expect(store.viewingVersion).toBe(2)
			expect(mockAxios.get).toHaveBeenCalledWith('/apps/openregister/api/flows/flow-1/versions/2')
		})

		it('deep-copies the stored version, so the canvas cannot mutate it', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: 1 })

			await store.inspectRun('run-1')
			store.flow.nodes[0].position.x = 999

			expect(VERSION_NODES[0].position.x).toBe(0)
		})

		it('locks the graph, on a DRAFT flow the server would happily overwrite', async () => {
			const store = storeWithOpenFlow({ lifecycleStatus: 'draft' })
			respondWith({ flowVersion: 1 })

			await store.inspectRun('run-1')

			expect(store.graphLocked).toBe(true)
		})

		it('refuses save() outright while a snapshot is up', async () => {
			const store = storeWithOpenFlow({ lifecycleStatus: 'draft' })
			respondWith({ flowVersion: 1 })
			await store.inspectRun('run-1')

			const result = await store.save()

			expect(result).toBeNull()
			// The assertion that matters. A PUT here writes version 1's graph
			// over the live flow and there is no undo.
			expect(mockAxios.put).not.toHaveBeenCalled()
			expect(mockAxios.post).not.toHaveBeenCalled()
		})
	})

	describe('when the snapshot cannot be shown', () => {
		it('keeps an author\'s unsaved graph and says why', async () => {
			const store = storeWithOpenFlow()
			store.dirty = true
			respondWith({ flowVersion: 1 })

			await store.inspectRun('run-1')

			// The whole point: unsaved edits exist nowhere else, so they are
			// never displaced to show a nicety.
			expect(store.flow.nodes.map((n) => n.id)).toEqual(['start', 'added-later'])
			expect(store.viewingVersion).toBeNull()
			expect(store.runGraphNotice).toEqual({ version: 1, reason: 'unsaved-edits' })
		})

		it('does not even ask for the version while the canvas is dirty', async () => {
			const store = storeWithOpenFlow()
			store.dirty = true
			respondWith({ flowVersion: 1 })

			await store.inspectRun('run-1')

			expect(mockAxios.get).not.toHaveBeenCalledWith(expect.stringContaining('/versions/'))
		})

		it('falls back to the live graph when the version row is gone', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: 1, graph: null })

			await store.inspectRun('run-1')

			expect(store.viewingVersion).toBeNull()
			expect(store.flow.nodes.map((n) => n.id)).toEqual(['start', 'added-later'])
			expect(store.runGraphNotice).toEqual({ version: 1, reason: 'unreadable' })
			// The fallback IS the old behaviour, so nothing regresses. It just
			// stops being silent.
			expect(store.graphLocked).toBe(false)
		})

		it('leaves the canvas alone for a run that recorded no version', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: null })

			await store.inspectRun('run-1')

			expect(store.viewingVersion).toBeNull()
			expect(store.runGraphNotice).toBeNull()
			expect(store.flow.nodes.map((n) => n.id)).toEqual(['start', 'added-later'])
		})
	})

	describe('closing the run', () => {
		it('puts the live graph back exactly as it was', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: 1 })
			await store.inspectRun('run-1')

			store.closeRun()

			expect(store.flow.nodes).toEqual(LIVE_NODES)
			expect(store.flow.edges).toEqual(LIVE_EDGES)
			expect(store.viewingVersion).toBeNull()
			expect(store.liveGraph).toBeNull()
			expect(store.inspectedRunUuid).toBeNull()
		})

		it('unlocks the canvas again', async () => {
			const store = storeWithOpenFlow({ lifecycleStatus: 'draft' })
			respondWith({ flowVersion: 1 })
			await store.inspectRun('run-1')

			store.closeRun()

			expect(store.graphLocked).toBe(false)
		})

		it('keeps a PUBLISHED flow locked, because that lock was never ours', async () => {
			const store = storeWithOpenFlow({ lifecycleStatus: 'published' })
			respondWith({ flowVersion: 1 })
			await store.inspectRun('run-1')

			store.closeRun()

			expect(store.graphLocked).toBe(true)
		})

		it('restores the LIVE graph after moving between two runs', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: 1 })
			await store.inspectRun('run-1')

			// The second inspect must not re-stash: stashing the first run's
			// snapshot as "live" would make closing restore a version.
			respondWith({ flowVersion: 2, graph: { nodes: [{ id: 'only-in-v2', position: { x: 0, y: 0 } }], edges: [] } })
			await store.inspectRun('run-2')
			expect(store.flow.nodes.map((n) => n.id)).toEqual(['only-in-v2'])

			store.closeRun()

			expect(store.flow.nodes).toEqual(LIVE_NODES)
		})
	})

	describe('opening another flow', () => {
		it('drops the snapshot state, so the next flow is not locked by it', async () => {
			const store = storeWithOpenFlow()
			respondWith({ flowVersion: 1 })
			await store.inspectRun('run-1')

			store.flows = [{
				id: 'flow-2',
				app: 'openregister',
				name: 'Another flow',
				lifecycleStatus: 'draft',
				nodes: [{ id: 'n', position: { x: 0, y: 0 } }],
				edges: [],
			}]
			store.open('flow-2')

			expect(store.viewingVersion).toBeNull()
			expect(store.liveGraph).toBeNull()
			expect(store.runGraphNotice).toBeNull()
			expect(store.graphLocked).toBe(false)
		})
	})
})
