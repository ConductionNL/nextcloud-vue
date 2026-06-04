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
 *
 * @param {object} [opts] Plugin options
 * @param {number} [opts.pollIntervalCollection=30000] Collection poll interval (ms)
 * @param {number} [opts.pollIntervalObject=60000]     Object poll interval (ms)
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

import { buildCollectionKey, buildObjectKey } from '../liveUpdates/eventKeys.js'
import { getLiveUpdates } from '../liveUpdates/transport.js'

// tryOnScopeDispose is from @vueuse/core — available as peerDependency
let _tryOnScopeDispose = null
try {
	// Dynamic import guard: avoid hard failure if @vueuse/core is absent
	// eslint-disable-next-line no-undef
	const vueuse = require('@vueuse/core')
	_tryOnScopeDispose = vueuse.tryOnScopeDispose
} catch {
	// @vueuse/core not installed — auto-cleanup unavailable; manual unsubscribe required
}

/**
 * Recursively produce a deterministic JSON string with object keys sorted at
 * every nesting level. This is necessary because `JSON.stringify(v, replacer)`
 * only applies the replacer-as-allowlist to the **top-level** keys; nested
 * objects still serialize in insertion order and collapse to `{}` when the
 * replacer array omits them entirely.
 *
 * @param {*} v Any JSON-serialisable value
 * @return {string}
 */
function stableStringify(v) {
	if (v && typeof v === 'object' && !Array.isArray(v)) {
		return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}'
	}
	return JSON.stringify(v)
}

/**
 * Compute a stable cache key for dedup of fetchCollection calls.
 *
 * Keys are built with recursively sorted JSON so that two semantically-identical
 * parameter objects with different key-insertion order produce the same
 * cache key and are correctly deduplicated. Without sorting,
 * `{ type: 'case', register: '1' }` and `{ register: '1', type: 'case' }`
 * would yield different strings and trigger duplicate live-update
 * subscriptions (#466).
 *
 * `stableStringify` is used instead of the `JSON.stringify(v, replacer)` array
 * form because the replacer-as-allowlist only applies at the top level —
 * nested objects pass through unsorted and collapse to `{}` when their keys
 * are not in the array.
 *
 * @param {string} type Object type slug
 * @param {object} params Query params
 * @return {string}
 */
function collectionDedupKey(type, params) {
	return `${type}:${stableStringify(params)}`
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

export function liveUpdatesPlugin(opts = {}) {
	const pluginPollCollection = opts.pollIntervalCollection || 30000
	const pluginPollObject = opts.pollIntervalObject || 60000

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
			 * @param {object} state
			 * @return {string}
			 */
			getLiveStatus: (state) => state.liveStatus,

			/**
			 * Get the number of active subscriptions.
			 *
			 * @param {object} state
			 * @return {number}
			 */
			getLiveSubscriptions: (state) => state.liveSubscriptions,

			/**
			 * Get the timestamp of the last received live event.
			 *
			 * @param {object} state
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

				const liveUpdates = getLiveUpdates({
					pollIntervalCollection: pluginPollCollection,
					pollIntervalObject: pluginPollObject,
				})

				// Register transport status observer (idempotent: only once per store instance)
				if (!this.__liveStatusObserverRegistered) {
					this.__liveStatusObserverRegistered = true
					liveUpdates.onStatusChange((newStatus) => {
						// Direct assignment — `liveStatus` is a Pinia reactive
						// state property whose setter is installed by Vue.set()
						// at store init, so the assignment triggers reactivity.
						// The prior spread `{ ...this.liveStatus, valueOf: ... }`
						// was dead code: spreading a primitive string yields a
						// char-index map ({0:'o', 1:'f', ...}) which was
						// immediately overwritten anyway (#465).
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
							throw new Error(`liveUpdatesPlugin: cannot subscribe to "${type}" collection — ${err.message}`, { cause: err })
						}
					}

					eventKey = buildCollectionKey(registerSlug, schemaSlug)
				}

				// Set status to 'connecting' on first subscribe (before transport sets it)
				if (this.liveStatus === 'offline') {
					this.liveStatus = 'connecting'
				}

				const store = this

				const callback = isObject
					? () => {
						store.liveLastEventAt = new Date()
						// Dispatch fetchObject with dedup
						store.fetchObject(type, id)
					}
					: () => {
						store.liveLastEventAt = new Date()
						// Dispatch fetchCollection with last stashed params + dedup
						const lastParams = store.__lastCollectionParams?.get(type) || {}
						store.fetchCollection(type, lastParams)
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
			 * Unsubscribe from live updates.
			 *
			 * @param {object} handle Handle returned by subscribe()
			 */
			unsubscribe(handle) {
				if (!handle || !handle._livePlugin) return

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
