/**
 * Tests for the flow lifecycle in useFlowStore.
 *
 * 🔴 THE PROPERTY THAT MATTERS: a published version's GRAPH cannot be edited
 * from the canvas, while its metadata still can. Both halves are load-bearing.
 * Locking everything would refuse edits the server accepts — renaming a live
 * process, or switching it off — and locking nothing would let an author
 * rearrange a graph for ten minutes and lose all of it to a 409 on save.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

// 🔑 HELD, NOT REQUIRED BACK. `@nextcloud/axios` is a PEER dependency, so
// `require()`ing it here trips eslint's `n/no-missing-require` — the module is
// legitimately absent from this package's own tree. A `mock`-prefixed variable
// is the one thing a jest.mock factory may close over, so the spec keeps a
// handle on the double without ever importing the real module.
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

/**
 * A store holding one flow in the given lifecycle state.
 *
 * @param {string} lifecycleStatus The state to put the flow in.
 * @return {object} The store.
 */
function storeWith(lifecycleStatus) {
	const store = useFlowStore()
	store.flow = {
		id: 'flow-1',
		app: 'openregister',
		name: 'Case flow',
		version: 2,
		lifecycleStatus,
		nodes: [{ id: 'a', type: 't', config: {} }],
		edges: [],
	}
	return store
}

describe('useFlowStore — lifecycle', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
	})

	it('locks the graph of a published flow', () => {
		const store = storeWith('published')

		expect(store.graphLocked).toBe(true)
		expect(store.isPublished).toBe(true)
		expect(store.isDraft).toBe(false)
	})

	it('locks the graph of a deprecated flow', () => {
		expect(storeWith('deprecated').graphLocked).toBe(true)
	})

	it('leaves a draft editable', () => {
		const store = storeWith('draft')

		expect(store.graphLocked).toBe(false)
		expect(store.isDraft).toBe(true)
	})

	it('refuses a node addition on a published flow, and says why', () => {
		const store = storeWith('published')

		store.addNode('openregister.object-write')

		expect(store.nodes).toHaveLength(1)
		expect(store.lifecycleRefusal).toEqual({
			reason: 'version-immutable',
			lifecycleStatus: 'published',
		})
	})

	it('refuses a node deletion on a published flow', () => {
		const store = storeWith('published')

		store.removeNode('a')

		expect(store.nodes).toHaveLength(1)
	})

	it('refuses a connection on a published flow', () => {
		const store = storeWith('published')
		store.flow.nodes.push({ id: 'b', type: 't', config: {} })

		store.connect({ source: 'a', target: 'b' })

		expect(store.edges).toHaveLength(0)
	})

	it('refuses a node move on a published flow', () => {
		const store = storeWith('published')

		store.moveNode({ id: 'a', x: 999, y: 999 })

		expect(store.nodes[0].x).toBeUndefined()
	})

	it('copyNode answers null when locked, matching its not-found contract', () => {
		const store = storeWith('published')

		expect(store.copyNode('a')).toBeNull()
	})

	it('still allows a node addition on a draft', () => {
		const store = storeWith('draft')

		store.addNode('openregister.object-write')

		expect(store.nodes).toHaveLength(2)
		expect(store.lifecycleRefusal).toBeNull()
	})

	it('keeps METADATA editable on a published flow', () => {
		const store = storeWith('published')

		store.setFlowField('name', 'Renamed while live')

		expect(store.flow.name).toBe('Renamed while live')
	})

	it('turns a 409 on save into a reason the sidebar can act on', async () => {
		const store = storeWith('published')
		mockAxios.put.mockRejectedValue({
			response: { status: 409, data: { reason: 'version-immutable', lifecycleStatus: 'published' } },
		})

		const saved = await store.save()

		expect(saved).toBeNull()
		expect(store.lifecycleRefusal.reason).toBe('version-immutable')
		// NOT a generic error: the sidebar offers "create a draft", not a retry.
		expect(store.error).toBeNull()
	})

	it('publishes by POSTing to the publish route and reloading', async () => {
		const store = storeWith('draft')
		mockAxios.post.mockResolvedValue({ data: { version: 2, status: 'published' } })
		mockAxios.get.mockResolvedValue({ data: { results: [] } })

		const version = await store.publish()

		expect(mockAxios.post).toHaveBeenCalledWith('/apps/openregister/api/flows/flow-1/publish')
		expect(version.status).toBe('published')
	})

	it('creates a draft by POSTing to the draft route', async () => {
		const store = storeWith('published')
		mockAxios.post.mockResolvedValue({ data: { version: 3, status: 'draft' } })
		mockAxios.get.mockResolvedValue({ data: { results: [] } })

		await store.createDraft()

		expect(mockAxios.post).toHaveBeenCalledWith('/apps/openregister/api/flows/flow-1/draft')
	})

	it('deprecates by POSTing to the deprecate route', async () => {
		const store = storeWith('published')
		mockAxios.post.mockResolvedValue({ data: { version: 2, status: 'deprecated' } })
		mockAxios.get.mockResolvedValue({ data: { results: [] } })

		await store.deprecate()

		expect(mockAxios.post).toHaveBeenCalledWith('/apps/openregister/api/flows/flow-1/deprecate')
	})

	it('surfaces a 409 from a transition without clobbering it as a generic error', async () => {
		const store = storeWith('published')
		mockAxios.post.mockRejectedValue({
			response: { status: 409, data: { reason: 'not-a-draft', lifecycleStatus: 'published' } },
		})

		expect(await store.publish()).toBeNull()
		expect(store.lifecycleRefusal.reason).toBe('not-a-draft')
		expect(store.error).toBeNull()
	})

	it('refuses a lifecycle transition on an unsaved flow', async () => {
		const store = useFlowStore()
		store.flow = { app: 'openregister', nodes: [], edges: [] }

		expect(await store.publish()).toBeNull()
		expect(mockAxios.post).not.toHaveBeenCalled()
	})
})
