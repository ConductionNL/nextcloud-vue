/**
 * Unit tests for default-on live updates in createObjectStore
 * (live-updates-default-on).
 *
 * Covers:
 * - Stores created WITHOUT explicit plugins expose subscribe/unsubscribe + live state
 * - `liveUpdates: false` opts out entirely (no actions, no state)
 * - `liveUpdates: {...}` configures the default-installed plugin
 * - Laziness: no transport activity (listen() probe, polling timers) and no
 *   dedup wrapping before the first subscribe() call
 * - Dedup activates after the first subscribe()
 * - Explicit `plugins: [liveUpdatesPlugin(...)]` is not double-installed:
 *   the explicit instance's options win
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

let storeCounter = 0

/**
 * Create a fresh store with a unique Pinia id so tests never share state.
 *
 * @param {object} [options] createObjectStore options
 * @return {object} Pinia store instance
 */
function freshStore(options = {}) {
	storeCounter += 1
	const useStore = createObjectStore(`default-on-test-${storeCounter}`, options)
	return useStore()
}

// --- Tests ---

describe('createObjectStore default-on live updates', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		mockListenFn.mockReturnValue(true)
		jest.clearAllMocks()
		resetLiveUpdates()
	})

	afterEach(() => {
		resetLiveUpdates()
	})

	describe('default install', () => {
		it('exposes subscribe and unsubscribe actions without explicit plugins', () => {
			const store = freshStore()

			expect(typeof store.subscribe).toBe('function')
			expect(typeof store.unsubscribe).toBe('function')
		})

		it('contributes live state and getters', () => {
			const store = freshStore()

			expect(store.liveStatus).toBe('offline')
			expect(store.liveSubscriptions).toBe(0)
			expect(store.liveLastEventAt).toBeNull()
			expect(store.getLiveStatus).toBe('offline')
		})

		it('subscribe works end-to-end on a default store', async () => {
			const store = freshStore()
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			const handle = await store.subscribe('melding', 'uuid-abc')

			expect(handle.eventKey).toBe('or-object-uuid-abc')
			expect(store.liveSubscriptions).toBe(1)
			expect(store.liveStatus).toBe('live')
		})
	})

	describe('opt-out via liveUpdates: false', () => {
		it('does not expose subscribe/unsubscribe actions', () => {
			const store = freshStore({ liveUpdates: false })

			expect(store.subscribe).toBeUndefined()
			expect(store.unsubscribe).toBeUndefined()
		})

		it('does not contribute live state', () => {
			const store = freshStore({ liveUpdates: false })

			expect(store.liveStatus).toBeUndefined()
			expect(store.liveSubscriptions).toBeUndefined()
		})
	})

	describe('laziness before first subscribe()', () => {
		it('does not probe notify_push listen() on store creation or registration', () => {
			const store = freshStore()
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			expect(mockListenFn).not.toHaveBeenCalled()
		})

		it('does not start polling timers before first subscribe', async () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval')
			try {
				const store = freshStore()
				store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
					registerSlug: 'zaken',
					schemaSlug: 'meldingen',
				})
				global.fetch = jest.fn().mockResolvedValue(okJson({ results: [] }))
				await store.fetchCollection('melding')

				expect(setIntervalSpy).not.toHaveBeenCalled()
				expect(mockListenFn).not.toHaveBeenCalled()
				expect(store.liveStatus).toBe('offline')
			} finally {
				setIntervalSpy.mockRestore()
			}
		})

		it('does not dedup concurrent fetchCollection calls before first subscribe', async () => {
			const store = freshStore()
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			let resolve
			const pending = new Promise((res) => { resolve = res })
			global.fetch = jest.fn().mockReturnValue(
				pending.then(() => okJson({ results: [], total: 0, page: 1, pages: 1 })),
			)

			const params = { _limit: 10 }
			const p1 = store.fetchCollection('melding', params)
			const p2 = store.fetchCollection('melding', params)

			// No subscribe yet — plugin must be inert, so 2 real requests
			expect(global.fetch).toHaveBeenCalledTimes(2)

			resolve()
			await Promise.all([p1, p2])
		})

		it('activates dedup after the first subscribe', async () => {
			const store = freshStore()
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			await store.subscribe('melding', 'uuid-abc')

			let resolve
			const pending = new Promise((res) => { resolve = res })
			global.fetch = jest.fn().mockReturnValue(
				pending.then(() => okJson({ results: [], total: 0, page: 1, pages: 1 })),
			)

			const params = { _limit: 10 }
			const p1 = store.fetchCollection('melding', params)
			const p2 = store.fetchCollection('melding', params)

			expect(global.fetch).toHaveBeenCalledTimes(1)

			resolve()
			await Promise.all([p1, p2])
		})
	})

	describe('explicit plugin passing (dedupe, no double install)', () => {
		it('keeps the explicitly passed plugin instance (its options win)', async () => {
			// Push unavailable → polling transport with per-subscription intervals.
			// If a second (default) copy of the plugin were installed, its actions
			// would override the explicit instance and poll at the default 60000ms
			// instead of the explicit 5000ms.
			mockListenFn.mockReturnValue(false)
			const setIntervalSpy = jest.spyOn(global, 'setInterval')
			try {
				const store = freshStore({
					plugins: [liveUpdatesPlugin({ pollIntervalObject: 5000 })],
				})
				store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
					registerSlug: 'zaken',
					schemaSlug: 'meldingen',
				})

				await store.subscribe('melding', 'uuid-abc')

				const pollIntervals = setIntervalSpy.mock.calls.map((args) => args[1])
				expect(pollIntervals).toContain(5000)
				expect(pollIntervals).not.toContain(60000)
			} finally {
				setIntervalSpy.mockRestore()
			}
		})

		it('subscribe increments liveSubscriptions exactly once per call', async () => {
			const store = freshStore({
				plugins: [liveUpdatesPlugin()],
			})
			store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
				registerSlug: 'zaken',
				schemaSlug: 'meldingen',
			})

			await store.subscribe('melding', 'uuid-abc')

			expect(store.liveSubscriptions).toBe(1)
		})

		it('a consumer plugin action named subscribe wins over the default install', async () => {
			// The default instance is unshifted BEFORE options.plugins and the
			// merge is later-wins, so consumer plugins keep collision priority.
			const customSubscribe = jest.fn(() => 'custom-result')
			const store = freshStore({
				plugins: [{
					name: 'custom',
					actions: { subscribe: customSubscribe },
				}],
			})

			const result = store.subscribe('foo')

			expect(customSubscribe).toHaveBeenCalledWith('foo')
			expect(result).toBe('custom-result')
			// The default plugin's non-colliding surface is still contributed
			expect(store.liveStatus).toBe('offline')
			expect(typeof store.unsubscribe).toBe('function')
			// And no transport activity resulted from the custom subscribe
			expect(mockListenFn).not.toHaveBeenCalled()
		})

		it('liveUpdates: false does not strip an explicitly passed plugin', () => {
			// Explicit plugins are an explicit opt-in; the flag only controls
			// the DEFAULT injection.
			const store = freshStore({
				liveUpdates: false,
				plugins: [liveUpdatesPlugin()],
			})

			expect(typeof store.subscribe).toBe('function')
		})
	})

	describe('polling fallback for the first subscription', () => {
		it('first subscription actually polls when push is unavailable from the start', async () => {
			// Regression: the websocket transport emits 'polling' synchronously
			// during its first subscribe when listen() says push is unavailable.
			// switchToPolling() only migrated already-recorded handles, stranding
			// the first subscription on the dead websocket transport.
			mockListenFn.mockReturnValue(false)
			jest.useFakeTimers()
			try {
				const store = freshStore({ liveUpdates: { pollIntervalObject: 5000 } })
				store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
					registerSlug: 'zaken',
					schemaSlug: 'meldingen',
				})
				global.fetch = jest.fn().mockResolvedValue(okJson({ id: 'uuid-abc' }))

				await store.subscribe('melding', 'uuid-abc')
				expect(global.fetch).not.toHaveBeenCalled()

				jest.advanceTimersByTime(5000)

				// Poll tick fired → plugin callback refetched the object
				expect(global.fetch).toHaveBeenCalledTimes(1)
			} finally {
				jest.useRealTimers()
			}
		})
	})

	describe('liveUpdates options object', () => {
		it('passes options through to the default-installed plugin', async () => {
			mockListenFn.mockReturnValue(false)
			const setIntervalSpy = jest.spyOn(global, 'setInterval')
			try {
				const store = freshStore({
					liveUpdates: { pollIntervalObject: 7000 },
				})
				store.registerObjectType('melding', 'schema-uuid', 'register-uuid', {
					registerSlug: 'zaken',
					schemaSlug: 'meldingen',
				})

				await store.subscribe('melding', 'uuid-abc')

				const pollIntervals = setIntervalSpy.mock.calls.map((args) => args[1])
				expect(pollIntervals).toContain(7000)
			} finally {
				setIntervalSpy.mockRestore()
			}
		})
	})
})
