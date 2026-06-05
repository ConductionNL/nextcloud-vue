/**
 * Transport singleton for live-update subscriptions.
 *
 * `getLiveUpdates()` returns the same instance on every call, ensuring a
 * single WebSocket connection (or polling loop) per browser tab regardless of
 * how many stores or components call `store.subscribe()`.
 *
 * Transport selection:
 * - If `@nextcloud/notify_push` `listen()` returns `true` (push available)
 *   → websocketTransport is used, status `'live'`.
 * - If `listen()` returns `false` (push not configured)
 *   → pollingTransport is used, status `'polling'`.
 * - If websocketTransport emits `'polling'` status (>5 consecutive reconnect
 *   failures) → switches to pollingTransport automatically.
 */

import { createWebsocketTransport } from './websocketTransport.js'
import { createPollingTransport, DEFAULT_POLL_INTERVAL_COLLECTION, DEFAULT_POLL_INTERVAL_OBJECT } from './pollingTransport.js'

/** @type {object|null} Module-level singleton instance */
let instance = null

/**
 * Internal state shared across the singleton.
 *
 * @type {{
 *   wsTransport: object|null,
 *   pollTransport: object|null,
 *   activeTransport: object|null,
 *   handles: Map<object, object>,
 *   statusObservers: Function[],
 *   pollIntervalCollection: number,
 *   pollIntervalObject: number,
 * }}
 */
const state = {
	wsTransport: null,
	pollTransport: null,
	activeTransport: null,
	/** Map from external handle → internal transport handle */
	handles: new Map(),
	statusObservers: [],
	pollIntervalCollection: DEFAULT_POLL_INTERVAL_COLLECTION,
	pollIntervalObject: DEFAULT_POLL_INTERVAL_OBJECT,
}

/**
 * Notify all registered status observers.
 *
 * @param {string} newStatus
 */
function notifyStatus(newStatus) {
	for (const observer of state.statusObservers) {
		observer(newStatus)
	}
}

/**
 * Switch all active subscriptions from websocket to polling transport.
 * Called when the websocket transport emits `'polling'` status.
 *
 * @param {Array<{ handle: object, eventKey: string, cb: Function, interval: number }>} activeSubscriptions
 */
function switchToPolling(activeSubscriptions) {
	if (!state.pollTransport) {
		state.pollTransport = createPollingTransport()
	}
	state.activeTransport = state.pollTransport

	// Re-subscribe all existing subscriptions via polling transport
	for (const sub of activeSubscriptions) {
		const internalHandle = state.pollTransport.subscribe(sub.eventKey, sub.cb, sub.interval)
		state.handles.set(sub.handle, internalHandle)
	}

	notifyStatus('polling')
}

/**
 * Get or create the live-updates singleton.
 *
 * @param {object} [opts] Options (only applied on first call)
 * @param {number} [opts.pollIntervalCollection] Override collection poll interval (ms)
 * @param {number} [opts.pollIntervalObject] Override object poll interval (ms)
 * @return {object} The singleton live-updates instance
 */
export function getLiveUpdates(opts = {}) {
	if (instance) return instance

	if (opts.pollIntervalCollection) state.pollIntervalCollection = opts.pollIntervalCollection
	if (opts.pollIntervalObject) state.pollIntervalObject = opts.pollIntervalObject

	/**
	 * Determine which transport to use by probing notify_push availability.
	 * We probe lazily on the first subscribe() call.
	 *
	 * @return {object} Active transport
	 */
	function getOrInitTransport() {
		if (state.activeTransport) {
			return state.activeTransport
		}

		// Try WebSocket first
		if (!state.wsTransport) {
			state.wsTransport = createWebsocketTransport()

			// Observe status changes from websocket transport
			state.wsTransport.onStatusChange((newStatus) => {
				if (newStatus === 'polling') {
					// Websocket gave up — collect all current subscriptions and switch
					const activeSubscriptions = []
					for (const [extHandle, intHandle] of state.handles) {
						activeSubscriptions.push({
							handle: extHandle,
							eventKey: intHandle.eventKey,
							cb: intHandle.cb,
							interval: intHandle._interval || state.pollIntervalCollection,
						})
					}
					// Remove all websocket handles first
					state.handles.clear()
					switchToPolling(activeSubscriptions)
				} else {
					notifyStatus(newStatus)
				}
			})
		}

		// Probe availability: subscribe a no-op to the key to get the availability flag
		// The websocket transport's subscribe calls listen() internally and returns the handle
		// We check the transport's status after first subscribe
		state.activeTransport = state.wsTransport
		return state.activeTransport
	}

	instance = {
		/**
		 * Get the current transport status.
		 *
		 * @return {string}
		 */
		getStatus() {
			if (state.activeTransport) return state.activeTransport.getStatus()
			return 'offline'
		},

		/**
		 * Register a status observer.
		 *
		 * @param {Function} cb Callback receiving the new status string
		 */
		onStatusChange(cb) {
			state.statusObservers.push(cb)
		},

		/**
		 * Subscribe to an event key.
		 *
		 * @param {string} eventKey Event key (from eventKeys.js)
		 * @param {Function} cb Callback invoked when the event fires
		 * @param {object} [opts] Options
		 * @param {number} [opts.interval] Poll interval override (polling transport only)
		 * @param {boolean} [opts.isObject] Whether this is an object (vs collection) subscription
		 * @return {object} Opaque handle for unsubscribe()
		 */
		subscribe(eventKey, cb, opts = {}) {
			const interval = opts.interval
				|| (opts.isObject ? state.pollIntervalObject : state.pollIntervalCollection)

			const transport = getOrInitTransport()
			const internalHandle = transport.subscribe(eventKey, cb, interval)

			// Attach interval metadata for potential transport switch
			internalHandle._interval = interval

			const externalHandle = { _live: true, eventKey }
			state.handles.set(externalHandle, internalHandle)

			return externalHandle
		},

		/**
		 * Unsubscribe from an event key.
		 *
		 * @param {object} handle Handle returned by subscribe()
		 */
		unsubscribe(handle) {
			const internalHandle = state.handles.get(handle)
			if (!internalHandle) return

			state.handles.delete(handle)

			if (state.activeTransport) {
				state.activeTransport.unsubscribe(internalHandle)
			}
		},

		/**
		 * Reset singleton state (for testing).
		 */
		_reset() {
			if (state.wsTransport) state.wsTransport.destroy()
			if (state.pollTransport) state.pollTransport.destroy()
			state.wsTransport = null
			state.pollTransport = null
			state.activeTransport = null
			state.handles.clear()
			state.statusObservers.length = 0
			instance = null
		},
	}

	return instance
}

/**
 * Reset the singleton (used in tests to get a clean state).
 */
export function resetLiveUpdates() {
	if (instance) {
		instance._reset()
	} else {
		// Still reset module state
		if (state.wsTransport) state.wsTransport.destroy()
		if (state.pollTransport) state.pollTransport.destroy()
		state.wsTransport = null
		state.pollTransport = null
		state.activeTransport = null
		state.handles.clear()
		state.statusObservers.length = 0
		instance = null
	}
}
