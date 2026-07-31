/**
 * liveUpdatesPlugin — Pinia plugin factory for OpenRegister real-time updates.
 *
 * Adds live-update subscription support to any store created via createObjectStore().
 * Uses @nextcloud/notify_push via the transport singleton, with automatic polling
 * fallback when push is unavailable.
 *
 * Contributed state:
 *   - `liveStatus`        — current transport status string (`'offline'|'connecting'|'live'|'reconnecting'|'polling'`)
 *   - `liveSubscriptions` — number of active subscriptions
 *   - `liveLastEventAt`   — Date of last received event, or null
 *
 * Contributed getters:
 *   - `getLiveStatus`, `getLiveSubscriptions`, `getLiveLastEventAt`
 *
 * Contributed actions:
 *   - `subscribe(type, id?, opts?)` — subscribe to live updates; returns a handle
 *   - `unsubscribe(handle)`         — tear down a subscription
 *
 * Usage note (Options API):
 *   `tryOnScopeDispose` auto-registers cleanup when called from a Vue setup()
 *   or Options API mounted() with an active effect scope. In Options API mounted()
 *   without Vue 2.7 scope tracking, manual `unsubscribe(handle)` in beforeDestroy
 *   is required. Document this at the call site.
 *
 * In-flight dedup:
 *   Concurrent calls to fetchObject(type, id) or fetchCollection(type, params)
 *   for the same key are coalesced into one HTTP request. The dedup maps live as
 *   plain (non-reactive) Maps on the store instance to avoid Vue 2 overhead.
 *   Dedup activates on the FIRST `subscribe()` call — before that, fetch actions
 *   pass straight through to the base implementations. This keeps the plugin
 *   fully inert (zero behaviour change) on stores that never subscribe, which
 *   matters now that createObjectStore installs this plugin by default
 *   (live-updates-default-on).
 *
 * Laziness guarantee:
 *   Installing the plugin causes NO transport activity. The transport singleton
 *   (and therefore the notify_push `listen()` probe / websocket connection /
 *   polling timers) is only created inside the `subscribe()` action.
 *
 * Event coalescing:
 *   Live events are HINTS ("something changed"), not payloads — each one
 *   triggers a refetch. A burst of events (mass import, bulk save, another
 *   user's rapid edits) would fire a refetch per event, so the dispatch is
 *   coalesced per subscription: the FIRST event refetches immediately, and
 *   any further events inside the `refetchDebounce` window (default 750 ms)
 *   collapse into ONE trailing refetch when the window closes. Pending
 *   trailing refetches are cancelled by `unsubscribe()`.
 *
 * @param {object} [opts] Plugin options
 * @param {number} [opts.pollIntervalCollection=30000] Collection poll interval (ms)
 * @param {number} [opts.pollIntervalObject=60000]     Object poll interval (ms)
 * @param {number} [opts.refetchDebounce=750]          Event-burst coalescing window (ms); 0 disables
 * @return {object} Plugin definition for use with createObjectStore
 *
 * @example
 * import { createObjectStore, liveUpdatesPlugin } from '@conduction/nextcloud-vue'
 *
 * const useStore = createObjectStore('myStore', {
 *   plugins: [liveUpdatesPlugin({ pollIntervalCollection: 15000 })],
 * })
 *
 * // In a Vue component:
 * const store = useStore()
 * const handle = await store.subscribe('melding')       // collection
 * const handle2 = await store.subscribe('melding', id)  // object
 * // In beforeDestroy (Options API without scope):
 * store.unsubscribe(handle)
 */

// `tryOnScopeDispose` comes from @vueuse/core, a DECLARED (non-optional) peer
// dependency, so it is imported statically.
//
// It used to be pulled in through a CommonJS call inside a try/catch "to avoid
// a hard failure if @vueuse/core is absent". That could not work: this module
// ships to `dist/esm/**` where that function is not defined, and @vueuse/core's
// own `exports` map resolves "." to a single ESM file with no CommonJS
// condition. The catch therefore fired every time, `_tryOnScopeDispose` was
// permanently null, and auto-cleanup on scope dispose silently never happened —
// subscriptions leaked with no warning anywhere.
import { tryOnScopeDispose as _tryOnScopeDispose } from '@vueuse/core'
import { getLiveUpdates } from '../liveUpdates/transport.js'
import { buildObjectKey, buildCollectionKey } from '../liveUpdates/eventKeys.js'

/**
 * Compute a stable cache key for dedup of fetchCollection calls.
 *
 * @param {string} type Object type slug
 * @param {object} params Query params
 * @return {string}
 */
function collectionDedupKey(type, params) {
	return `${type}:${JSON.stringify(params)}`
}

/**
 * Compute the cache key for dedup of fetchObject calls.
 *
 * @param {string} type Object type slug
 * @param {string} id Object ID
 * @return {string}
 */
function objectDedupKey(type, id) {
	return `${type}:${id}`
}

/**
 * Wrap a refetch dispatcher in a leading+trailing burst coalescer.
 *
 * Events are hints, so the exact invocation count doesn't matter — only
 * that the data ends up fresh. The first `run()` dispatches immediately
 * (snappy single-event case); further `run()`s inside the `waitMs` window
 * collapse into one trailing dispatch when the window closes (which opens
 * a new window, so a sustained burst dispatches at most once per window).
 * `cancel()` clears any pending trailing dispatch — called on
 * unsubscribe so a torn-down subscription never fires a late refetch.
 *
 * @param {Function} fn The refetch dispatcher.
 * @param {number} waitMs Coalescing window in ms; `<= 0` disables (every run dispatches).
 * @return {{run: Function, cancel: Function}} The coalesced dispatcher.
 */
function createHintCoalescer(fn, waitMs) {
	let timer = null
	let pending = false

	function run() {
		if (!(waitMs > 0)) {
			fn()
			return
		}
		if (timer) {
			pending = true
			return
		}
		fn()
		timer = setTimeout(() => {
			timer = null
			if (pending) {
				pending = false
				run()
			}
		}, waitMs)
	}

	function cancel() {
		if (timer) clearTimeout(timer)
		timer = null
		pending = false
	}

	return { run, cancel }
}

export function liveUpdatesPlugin(opts = {}) {
	const pluginPollCollection = opts.pollIntervalCollection || 30000
	const pluginPollObject = opts.pollIntervalObject || 60000
	const pluginRefetchDebounce = opts.refetchDebounce === undefined ? 750 : opts.refetchDebounce

	return {
		name: 'liveUpdates',

		state: () => ({
			/** @type {'offline'|'connecting'|'live'|'reconnecting'|'polling'} */
			liveStatus: 'offline',
			/** @type {number} */
			liveSubscriptions: 0,
			/** @type {Date|null} */
			liveLastEventAt: null,
		}),

		getters: {
			/**
			 * Get the current transport status.
			 *
			 * @param {object} state Pinia state
			 * @return {string}
			 */
			getLiveStatus: (state) => state.liveStatus,

			/**
			 * Get the number of active subscriptions.
			 *
			 * @param {object} state Pinia state
			 * @return {number}
			 */
			getLiveSubscriptions: (state) => state.liveSubscriptions,

			/**
			 * Get the timestamp of the last received live event.
			 *
			 * @param {object} state Pinia state
			 * @return {Date|null}
			 */
			getLiveLastEventAt: (state) => state.liveLastEventAt,
		},

		actions: {
			/**
			 * Subscribe to live updates for an object type.
			 *
			 * When `id` is provided: subscribes to `or-object-{id}` (per-object events).
			 * When `id` is omitted: subscribes to `or-collection-{registerSlug}-{schemaSlug}`
			 *   derived from objectTypeRegistry. Slugs are lazy-fetched if not already cached.
			 *
			 * **Options API note**: In `mounted()` without an active Vue scope,
			 * `tryOnScopeDispose` cannot auto-register cleanup. Call `unsubscribe(handle)`
			 * manually in `beforeDestroy`.
			 *
			 * @param {string} type Registered object type slug
			 * @param {string} [id] Object UUID (omit for collection subscription)
			 * @param {object} [subscribeOpts] Options
			 * @param {number} [subscribeOpts.interval] Override poll interval (ms)
			 * @return {Promise<object>} Opaque handle for unsubscribe()
			 * @throws {Error} If type is not registered, or if lazy slug fetch fails (collection form)
			 */
			async subscribe(type, id, subscribeOpts = {}) {
				const config = this.objectTypeRegistry[type]
				if (!config) {
					throw new Error(`"${type}" is not registered. Call registerObjectType('${type}', ...) first.`)
				}

				// First subscribe() activates the in-flight dedup wrappers set
				// up in the plugin's setup() hook. Before this point the store
				// behaves exactly as if the plugin were not installed.
				this.__liveDedupActive = true

				const liveUpdates = getLiveUpdates({
					pollIntervalCollection: pluginPollCollection,
					pollIntervalObject: pluginPollObject,
				})

				// Register transport status observer (idempotent: only once per store instance)
				if (!this.__liveStatusObserverRegistered) {
					this.__liveStatusObserverRegistered = true
					liveUpdates.onStatusChange((newStatus) => {
						this.liveStatus = { ...this.liveStatus, valueOf: undefined, toString: undefined }
						// Vue 2 spread pattern for primitive reactive update
						this.liveStatus = newStatus
					})
				}

				let eventKey
				let isObject = false

				if (id !== undefined && id !== null) {
					// Object subscription — no slug lookup needed
					isObject = true
					eventKey = buildObjectKey(id)
				} else {
					// Collection subscription — need registerSlug + schemaSlug
					let { registerSlug, schemaSlug } = config

					if (!registerSlug || !schemaSlug) {
						// Lazy fetch slugs via existing store actions
						try {
							const [register, schema] = await Promise.all([
								this.fetchRegister(type),
								this.fetchSchema(type),
							])

							if (!register || !register.slug) {
								throw new Error(`Failed to resolve register slug for "${type}"`)
							}
							if (!schema || !schema.slug) {
								throw new Error(`Failed to resolve schema slug for "${type}"`)
							}

							registerSlug = register.slug
							schemaSlug = schema.slug

							// Cache slugs in registry (Vue 2 spread pattern)
							this.objectTypeRegistry = {
								...this.objectTypeRegistry,
								[type]: { ...config, registerSlug, schemaSlug },
							}
						} catch (err) {
							throw new Error(`liveUpdatesPlugin: cannot subscribe to "${type}" collection — ${err.message}`)
						}
					}

					eventKey = buildCollectionKey(registerSlug, schemaSlug)
				}

				// Set status to 'connecting' on first subscribe (before transport sets it)
				if (this.liveStatus === 'offline') {
					this.liveStatus = 'connecting'
				}

				const store = this

				// Events are hints — coalesce refetch bursts per subscription
				// (see "Event coalescing" in the module docblock). A per-call
				// `subscribeOpts.debounce` overrides the plugin default; 0 disables.
				const debounceMs = subscribeOpts.debounce === undefined ? pluginRefetchDebounce : subscribeOpts.debounce
				const dispatch = isObject
					? () => {
						// Dispatch fetchObject with dedup
						store.fetchObject(type, id)
					}
					: () => {
						// Dispatch fetchCollection with last stashed params + dedup
						const lastParams = store.__lastCollectionParams?.get(type) || {}
						store.fetchCollection(type, lastParams)
					}
				const coalesced = createHintCoalescer(dispatch, debounceMs)

				const callback = () => {
					store.liveLastEventAt = new Date()
					coalesced.run()
				}

				const transportOpts = {
					isObject,
					interval: subscribeOpts.interval || (isObject ? pluginPollObject : pluginPollCollection),
				}

				const transportHandle = liveUpdates.subscribe(eventKey, callback, transportOpts)

				// Update reactive subscriptions count (Vue 2 spread)
				this.liveSubscriptions = this.liveSubscriptions + 1

				// Update liveStatus from transport now that we've subscribed
				const transportStatus = liveUpdates.getStatus()
				if (transportStatus !== 'offline') {
					this.liveStatus = transportStatus
				}

				const handle = {
					_livePlugin: true,
					type,
					id,
					eventKey,
					transportHandle,
					// Cancels a pending coalesced (trailing) refetch — called by
					// unsubscribe() so a torn-down subscription never fires late.
					_cancelPendingRefetch: coalesced.cancel,
				}

				// Auto-cleanup via tryOnScopeDispose (Vue 2.7 composition API scopes)
				if (_tryOnScopeDispose) {
					try {
						_tryOnScopeDispose(() => {
							this.unsubscribe(handle)
						})
					} catch {
						// Not in a scope — manual unsubscribe required in beforeDestroy
					}
				}

				return handle
			},

			/**
			 * Unsubscribe from live updates. Idempotent — releasing the same
			 * handle twice (e.g. the plugin's own scope-dispose cleanup racing
			 * a composable's explicit detach) is a no-op the second time, so
			 * `liveSubscriptions` never double-decrements.
			 *
			 * @param {object} handle Handle returned by subscribe()
			 */
			unsubscribe(handle) {
				if (!handle || !handle._livePlugin || handle._released) return
				handle._released = true

				// Cancel any pending coalesced refetch before tearing down the
				// transport subscription — a late trailing dispatch after
				// unsubscribe would refetch for a scope nobody renders anymore.
				if (typeof handle._cancelPendingRefetch === 'function') {
					handle._cancelPendingRefetch()
				}

				const liveUpdates = getLiveUpdates()
				liveUpdates.unsubscribe(handle.transportHandle)

				this.liveSubscriptions = Math.max(0, this.liveSubscriptions - 1)
			},
		},

		/**
		 * Plugin setup hook — called once per store instance.
		 * Sets up:
		 * 1. `$onAction` observer for fetchCollection → stash last params
		 * 2. In-flight dedup Maps for fetchObject and fetchCollection
		 *
		 * @param {object} store The Pinia store instance
		 */
		setup(store) {
			// Dedup activation flag — flipped to true by the first subscribe()
			// call. Until then the fetch wrappers below pass straight through,
			// so a default-installed plugin causes zero behaviour change on
			// stores that never subscribe (live-updates-default-on).
			store.__liveDedupActive = false

			// -- Last-params stash for collection re-fetch on events --
			// Plain (non-reactive) Map: type → last params object
			store.__lastCollectionParams = new Map()

			store.$onAction(({ name, args, after }) => {
				if (name === 'fetchCollection') {
					const [type, params = {}] = args
					after(() => {
						store.__lastCollectionParams.set(type, params)
					})
				}
			})

			// -- In-flight dedup for fetchObject --
			// Plain Map: dedupKey → Promise
			const objectInFlight = new Map()

			const originalFetchObject = store.fetchObject.bind(store)
			store.fetchObject = async function dedupedFetchObject(type, id) {
				if (!store.__liveDedupActive) {
					return originalFetchObject(type, id)
				}
				const key = objectDedupKey(type, id)
				if (objectInFlight.has(key)) {
					return objectInFlight.get(key)
				}
				const promise = originalFetchObject(type, id).finally(() => {
					objectInFlight.delete(key)
				})
				objectInFlight.set(key, promise)
				return promise
			}

			// -- In-flight dedup for fetchCollection --
			const collectionInFlight = new Map()

			const originalFetchCollection = store.fetchCollection.bind(store)
			store.fetchCollection = async function dedupedFetchCollection(type, params = {}) {
				if (!store.__liveDedupActive) {
					return originalFetchCollection(type, params)
				}
				const key = collectionDedupKey(type, params)
				if (collectionInFlight.has(key)) {
					return collectionInFlight.get(key)
				}
				const promise = originalFetchCollection(type, params).finally(() => {
					collectionInFlight.delete(key)
				})
				collectionInFlight.set(key, promise)
				return promise
			}
		},
	}
}
