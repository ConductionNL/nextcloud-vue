/**
 * Unit tests for liveUpdatesPlugin.
 *
 * Covers:
 * - Plugin state/getters/actions are contributed to the store
 * - subscribe(type, id) → increments liveSubscriptions, event key = or-object-{id}
 * - subscribe(type) → collection key, lazy slug resolution
 * - subscribe to unregistered type throws
 * - unsubscribe(handle) → decrements liveSubscriptions
 * - In-flight dedup for fetchObject and fetchCollection
 * - Status transitions when transport fires status change
 * - registerObjectType back-compat (3-arg form)
 * - registerObjectType with slugs (4-arg form)
 * - Lazy slug resolution success and failure
 */

import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../../src/store/useObjectStore.js'
import { liveUpdatesPlugin } from '../../../src/store/plugins/liveUpdates.js'
import { resetLiveUpdates } from '../../../src/store/liveUpdates/transport.js'

// --- Mocks ---

// Mock @nextcloud/notify_push — variable name MUST start with 'mock' per Jest rule
const mockListenFn = jest.fn(() => true)
jest.mock('@nextcloud/notify_push', () => ({
	__esModule: true,
	listen: (...args) => mockListenFn(...args),
}))

// Mock @vueuse/core — tryOnScopeDispose is a no-op in tests
jest.mock('@vueuse/core', () => ({
	__esModule: true,
	tryOnScopeDispose: jest.fn(),
}))

// --- Helpers ---

function okJson(data) {
	return { ok: true, json: () => Promise.resolve(data) }
}

function errJson(status) {
	return { ok: false, status, statusText: 'Error', json: () => Promise.resolve({ message: 'error' }) }
}

// --- Tests ---

describe('liveUpdatesPlugin', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		mockListenFn.mockReturnValue(true)
		jest.clearAllMocks()
		// Reset the transport singleton so each test starts clean
		resetLiveUpdates()

		const useStore = createObjectStore('live-test', {
			plugins: [liveUpdatesPlugin()],
		})
		store = useStore()
	})

	afterEach(() => {
		resetLiveUpdates()
	})

	// --- Plugin state and getters ---

	describe('initial state', () => {
		it('contributes liveStatus, liveSubscriptions, liveLastEventAt state', () => {
			expect(store.liveStatus).toBe('offline')
			expect(store.liveSubscriptions).toBe(0)
			expect(store.liveLastEventAt).toBeNull()
		})

		it('contributes getLiveStatus, getLiveSubscriptions, getLiveLastEventAt getters', () => {
			expect(store.getLiveStatus).toBe('offline')
			expect(store.getLiveSubscriptions).toBe(0)
			expect(store.getLiveLastEventAt).toBeNull()
		})
	})

	// --- subscribe / unsubscribe ---

	describe('subscribe with id (object subscription)', () => {
		it('increments liveSubscriptions', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			await store.subscribe('melding', 'uuid-abc')

			expect(store.liveSubscriptions).toBe(1)
		})

		it('returns a non-null handle', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const handle = await store.subscribe('melding', 'uuid-abc')

			expect(handle).toBeTruthy()
			expect(handle._livePlugin).toBe(true)
		})

		it('subscribes to or-object-{id} event key', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const handle = await store.subscribe('melding', 'uuid-abc')

			expect(handle.eventKey).toBe('or-object-uuid-abc')
		})

		it('does not need slugs for object subscription', async () => {
			// Register without slugs — object subscription should not trigger slug fetch
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')
			global.fetch = jest.fn()

			await store.subscribe('melding', 'uuid-abc')

			// No fetchRegister or fetchSchema should be called
			expect(global.fetch).not.toHaveBeenCalled()
		})
	})

	describe('subscribe without id (collection subscription)', () => {
		it('subscribes to or-collection-{register}-{schema} when slugs are known', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const handle = await store.subscribe('melding')

			expect(handle.eventKey).toBe('or-collection-zaken-meldingen')
			expect(store.liveSubscriptions).toBe(1)
		})
	})

	describe('subscribe to unregistered type', () => {
		it('throws with message including the type name', async () => {
			await expect(store.subscribe('unknown')).rejects.toThrow('"unknown" is not registered')
		})
	})

	describe('unsubscribe', () => {
		it('decrements liveSubscriptions', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const handle = await store.subscribe('melding', 'uuid-abc')
			expect(store.liveSubscriptions).toBe(1)

			store.unsubscribe(handle)
			expect(store.liveSubscriptions).toBe(0)
		})

		it('handles multiple subscriptions correctly', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const h1 = await store.subscribe('melding', 'uuid-abc')
			const h2 = await store.subscribe('melding', 'uuid-xyz')

			expect(store.liveSubscriptions).toBe(2)

			store.unsubscribe(h1)
			expect(store.liveSubscriptions).toBe(1)

			store.unsubscribe(h2)
			expect(store.liveSubscriptions).toBe(0)
		})

		it('does not decrement below zero', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const handle = await store.subscribe('melding', 'uuid-abc')
			store.unsubscribe(handle)
			store.unsubscribe(handle) // second call — should not go below 0

			expect(store.liveSubscriptions).toBe(0)
		})
	})

	// --- In-flight dedup ---

	describe('fetchObject deduplication', () => {
		it('makes only one HTTP request for concurrent fetchObject calls on the same id', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			let resolveFirst
			const pending = new Promise((res) => { resolveFirst = res })
			global.fetch = jest.fn().mockReturnValue(pending.then(() => okJson({ id: 'uuid-abc', title: 'test' })))

			// Three concurrent fetchObject calls
			const p1 = store.fetchObject('melding', 'uuid-abc')
			const p2 = store.fetchObject('melding', 'uuid-abc')
			const p3 = store.fetchObject('melding', 'uuid-abc')

			// Only one fetch call should have been made so far
			expect(global.fetch).toHaveBeenCalledTimes(1)

			resolveFirst()
			const [r1, r2, r3] = await Promise.all([p1, p2, p3])

			expect(r1).toEqual(r2)
			expect(r2).toEqual(r3)
			// Still only one HTTP call after resolve
			expect(global.fetch).toHaveBeenCalledTimes(1)
		})

		it('makes two requests for different IDs simultaneously', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			global.fetch = jest.fn()
				.mockResolvedValueOnce(okJson({ id: 'uuid-abc' }))
				.mockResolvedValueOnce(okJson({ id: 'uuid-xyz' }))

			const p1 = store.fetchObject('melding', 'uuid-abc')
			const p2 = store.fetchObject('melding', 'uuid-xyz')

			await Promise.all([p1, p2])

			expect(global.fetch).toHaveBeenCalledTimes(2)
		})

		it('clears dedup entry on resolve so a subsequent call is a new request', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			global.fetch = jest.fn()
				.mockResolvedValueOnce(okJson({ id: 'uuid-abc', v: 1 }))
				.mockResolvedValueOnce(okJson({ id: 'uuid-abc', v: 2 }))

			await store.fetchObject('melding', 'uuid-abc')
			await store.fetchObject('melding', 'uuid-abc')

			expect(global.fetch).toHaveBeenCalledTimes(2)
		})

		it('clears dedup entry on rejection so a subsequent call can retry', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			global.fetch = jest.fn()
				.mockRejectedValueOnce(new TypeError('network fail'))
				.mockResolvedValueOnce(okJson({ id: 'uuid-abc' }))

			// First call (will fail due to TypeError in network)
			await store.fetchObject('melding', 'uuid-abc')

			// Second call should succeed and make a new request
			await store.fetchObject('melding', 'uuid-abc')

			expect(global.fetch).toHaveBeenCalledTimes(2)
		})
	})

	describe('fetchCollection deduplication', () => {
		it('makes only one HTTP request for concurrent fetchCollection calls with same params', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			let resolve
			const pending = new Promise((res) => { resolve = res })
			global.fetch = jest.fn().mockReturnValue(
				pending.then(() => okJson({ results: [], total: 0, page: 1, pages: 1 })),
			)

			const params = { _limit: 10, _search: 'test' }
			const p1 = store.fetchCollection('melding', params)
			const p2 = store.fetchCollection('melding', params)
			const p3 = store.fetchCollection('melding', params)

			expect(global.fetch).toHaveBeenCalledTimes(1)

			resolve()
			await Promise.all([p1, p2, p3])

			expect(global.fetch).toHaveBeenCalledTimes(1)
		})
	})

	// --- Lazy slug resolution ---

	describe('lazy slug resolution', () => {
		it('fetches register and schema slugs when not cached, then subscribes', async () => {
			// Register without slugs
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')

			// Mock fetchRegister and fetchSchema to return objects with slug fields
			global.fetch = jest.fn()
				.mockResolvedValueOnce(okJson({ id: 'register-uuid', slug: 'zaken', title: 'Zaken' }))
				.mockResolvedValueOnce(okJson({ id: 'schema-uuid', slug: 'meldingen', title: 'Meldingen' }))

			const handle = await store.subscribe('melding')

			expect(global.fetch).toHaveBeenCalledTimes(2)
			expect(handle.eventKey).toBe('or-collection-zaken-meldingen')
			// Slugs should be cached in registry
			expect(store.objectTypeRegistry.melding.registerSlug).toBe('zaken')
			expect(store.objectTypeRegistry.melding.schemaSlug).toBe('meldingen')
		})

		it('does not re-fetch slugs on second subscribe when slugs are already cached', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')

			global.fetch = jest.fn()
				.mockResolvedValueOnce(okJson({ slug: 'zaken' }))
				.mockResolvedValueOnce(okJson({ slug: 'meldingen' }))

			await store.subscribe('melding')
			const fetchCallCountAfterFirst = global.fetch.mock.calls.length

			// Second subscribe — slugs should be cached, no new fetch
			global.fetch.mockClear()
			await store.subscribe('melding')

			expect(global.fetch).toHaveBeenCalledTimes(0)
			expect(fetchCallCountAfterFirst).toBe(2) // only 2 fetches for first subscribe
		})

		it('rejects with an error when register fetch fails', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')

			global.fetch = jest.fn()
				.mockResolvedValueOnce(errJson(404))
				.mockResolvedValueOnce(errJson(404))

			await expect(store.subscribe('melding')).rejects.toThrow(/melding/)
		})

		it('does not subscribe to a malformed event key when slug is null', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')

			// fetchRegister returns null slug
			global.fetch = jest.fn()
				.mockResolvedValueOnce(okJson({ slug: null }))
				.mockResolvedValueOnce(okJson({ slug: 'meldingen' }))

			await expect(store.subscribe('melding')).rejects.toThrow(/melding/)

			// notify_push listen should not have been called with null slugs
			const listenCalls = mockListenFn.mock.calls
			const badCalls = listenCalls.filter((args) => args[0].includes('null'))
			expect(badCalls).toHaveLength(0)
		})

		it('skips slug lookup entirely for object subscriptions', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')
			global.fetch = jest.fn()

			await store.subscribe('melding', 'uuid-abc')

			expect(global.fetch).not.toHaveBeenCalled()
		})
	})

	// --- Status transitions ---

	describe('liveStatus transitions', () => {
		it('transitions from offline when first subscribe is called', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			expect(store.liveStatus).toBe('offline')
			await store.subscribe('melding', 'uuid-abc')
			expect(store.liveStatus).not.toBe('offline')
		})

		it('transitions to live when notify_push is available', async () => {
			mockListenFn.mockReturnValue(true)
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			await store.subscribe('melding', 'uuid-abc')

			expect(store.liveStatus).toBe('live')
		})

		it('transitions to polling when notify_push is unavailable', async () => {
			mockListenFn.mockReturnValue(false)
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			await store.subscribe('melding', 'uuid-abc')

			expect(store.liveStatus).toBe('polling')
		})
	})

	// --- registerObjectType back-compat ---

	describe('registerObjectType', () => {
		it('3-arg form (back-compat): slugs default to null', () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid')

			expect(store.objectTypeRegistry.melding).toEqual({
				schema: 'schema-uuid',
				register: 'register-uuid',
				registerSlug: null,
				schemaSlug: null,
			})
		})

		it('4-arg form: stores slugs in registry', () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			expect(store.objectTypeRegistry.melding).toEqual({
				schema: 'schema-uuid',
				register: 'register-uuid',
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})
		})

		it('4-arg form: collection subscribe does not fetch slugs when already provided', async () => {
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			global.fetch = jest.fn()

			await store.subscribe('melding')

			// No fetch calls for slugs since they're already in the registry
			expect(global.fetch).not.toHaveBeenCalled()
		})
	})
})
