/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow editor must not be interactive before it is initialised (#607).
 *
 * `emptyFlow()` has `name: ''` and only `open('new')` supplies the default.
 * `open()` used to run at the TAIL of `load()`, behind `await GET /api/flows`
 * — a flow list a blank flow does not need — while the sidebar was already
 * rendered and Save already enabled, because the store is a singleton whose
 * `nodeCatalog` the index page had filled.
 *
 * Two things followed, both measured on openregister:
 *
 *   - Save in that window posted `name: ""`, which the API answers 400
 *     "A flow needs a name." — 9 of 10 attempts against a fresh instance.
 *   - The late `open('new')` reset `this.flow`, so a step placed during the
 *     window was wiped, and a save landing after it stored `nodes: []`.
 *
 * The second is the one that made an e2e suite pass while asserting nothing:
 * the run it saved was empty, so it could not fail on the flow's contents.
 */
import { createPinia, setActivePinia } from 'pinia'
import axios from '@nextcloud/axios'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(),
		put: jest.fn(),
		delete: jest.fn(),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * A promise plus the handle to settle it, so a request can be held open.
 *
 * @return {{promise: Promise, resolve: Function}} The promise and its resolver.
 */
function deferred() {
	let settle
	const promise = new Promise((resolve) => {
		settle = resolve
	})

	return { promise, resolve: settle }
}

describe('useFlowStore.load', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [] } })
	})

	it('names a blank flow before the network, not after it', async () => {
		const flows = deferred()
		axios.get.mockImplementation((url) => {
			if (url.endsWith('/api/flows')) {
				return flows.promise
			}

			return Promise.resolve({ data: { results: [] } })
		})

		const store = useFlowStore()
		const loading = store.load({ app: 'openregister', id: 'new' })

		// The flow list is still in flight — exactly the window in which the
		// sidebar is rendered and Save is enabled.
		expect(store.flow.name).toBe('New flow')

		flows.resolve({ data: { results: [] } })
		await loading
		expect(store.flow.name).toBe('New flow')
	})

	it('keeps a step placed while the flow list is still loading', async () => {
		const flows = deferred()
		axios.get.mockImplementation((url) => {
			if (url.endsWith('/api/flows')) {
				return flows.promise
			}

			return Promise.resolve({ data: { results: [] } })
		})

		const store = useFlowStore()
		const loading = store.load({ app: 'openregister', id: 'new' })

		// One node is already there: the seeded start trigger.
		store.addNode('openregister.stop')
		expect(store.flow.nodes).toHaveLength(2)

		flows.resolve({ data: { results: [] } })
		await loading

		// The late open('new') used to land here and reset the flow, taking the
		// step with it — and a save after that stored an empty graph.
		expect(store.flow.nodes).toHaveLength(2)
		expect(store.flow.nodes.map((n) => n.type)).toContain('openregister.stop')
	})

	it('seeds a new flow with the manual-trigger start node, not an empty page', async () => {
		const store = useFlowStore()
		await store.load({ app: 'openconnector', id: 'new' })

		// A new flow is an empty render of the SAME editor with only a
		// starting point on it — never a blank surface that looks like a
		// different product.
		expect(store.flow.nodes).toHaveLength(1)
		expect(store.flow.nodes[0].type).toBe('openregister.trigger-manual')
		expect(store.flow.nodes[0].start).toBe(true)
		expect(store.flow.trigger).toBe('manual')
		expect(store.dirty).toBe(false)
	})

	it('leaves the open flow alone when reloading the list with no id', async () => {
		const store = useFlowStore()
		store.flow = {
			id: 'flow-a',
			name: 'Saved flow',
			app: 'openregister',
			nodes: [{ id: 'n1', type: 'openregister.stop', config: {} }],
			edges: [],
		}

		// This is exactly the call `save()` makes to refresh the list after
		// storing. A null id has always meant "reload the list, leave the open
		// flow alone"; treating it as blank would reset the flow right after
		// storing it and discard the id the server had just returned.
		await store.load({ app: 'openregister' })

		expect(store.flow.id).toBe('flow-a')
		expect(store.flow.name).toBe('Saved flow')
		expect(store.flow.nodes).toHaveLength(1)
	})

	it('draws edges whatever dialect the stored flow speaks', async () => {
		const store = useFlowStore()

		// This store writes {source, target}; the engine — and hermiq's stored
		// flows — equally use {from, to}, where an endpoint may be a LIST.
		// Handing flow.edges to the canvas raw rendered those flows as
		// unconnected cards.
		store.flow = {
			name: 'x',
			nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
			edges: [
				{ source: 'a', target: 'b' },
				{ id: 'split', from: 'b', to: ['a', 'c'] },
			],
		}

		const lines = store.canvasEdges.map((l) => `${l.source}->${l.target}`)
		expect(lines).toEqual(['a->b', 'b->a', 'b->c'])

		// Line ids must be unique even when one edge fans out into several
		// lines, or v-for keys collide.
		const ids = store.canvasEdges.map((l) => l.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('treats a refused check as a verdict, not a transport failure', async () => {
		const store = useFlowStore()
		axios.post.mockRejectedValue({
			response: {
				status: 400,
				data: { valid: false, blocking: [], warnings: [], message: 'Body does not describe a flow graph.' },
			},
		})

		const result = await store.check()

		// The 400 body IS the answer the Check button asked for — losing it to
		// a generic error card would hide the clearest message in the editor.
		expect(result?.valid).toBe(false)
		expect(store.checkResult?.message).toContain('does not describe a flow graph')
		expect(store.error).toBeNull()
	})

	it('drops a stale check verdict as soon as the graph changes', async () => {
		const store = useFlowStore()
		store.checkResult = { valid: true, blocking: [], warnings: [] }

		store.addNode('openregister.filter')

		// A "looks runnable" that outlives the graph it described is a lie.
		expect(store.checkResult).toBeNull()
	})

	it('still opens a STORED flow after the list has arrived', async () => {
		const stored = {
			id: 'flow-a',
			name: 'Stored flow',
			app: 'openregister',
			nodes: [],
			edges: [],
		}
		axios.get.mockImplementation((url) => {
			if (url.endsWith('/api/flows')) {
				return Promise.resolve({ data: { results: [stored] } })
			}

			return Promise.resolve({ data: { results: [] } })
		})

		const store = useFlowStore()
		await store.load({ app: 'openregister', id: 'flow-a' })

		// A stored flow genuinely needs the list, so it is opened at the tail.
		expect(store.flow.name).toBe('Stored flow')
	})
})
