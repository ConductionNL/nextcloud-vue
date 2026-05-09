/**
 * Polling transport fallback for live updates.
 *
 * Used when @nextcloud/notify_push is unavailable or WebSocket fails after
 * MAX_RECONNECT_FAILURES consecutive attempts.
 *
 * Features:
 * - Refcounted coalesced intervals: one `setInterval` per unique event key.
 * - Visibility-gated: polls are skipped when `document.visibilityState === 'hidden'`.
 * - On tab becoming visible again, one immediate callback fires then interval resets.
 * - Configurable intervals per subscription (default 30s collections, 60s objects).
 *
 * Status is always `'polling'`.
 */

/** Default poll intervals in milliseconds. */
export const DEFAULT_POLL_INTERVAL_COLLECTION = 30000
export const DEFAULT_POLL_INTERVAL_OBJECT = 60000

/**
 * Check whether the document is currently visible.
 * Falls back to true in environments without document (e.g. SSR, tests).
 *
 * @return {boolean}
 */
function isVisible() {
	if (typeof document === 'undefined') return true
	return document.visibilityState !== 'hidden'
}

/**
 * Create a new polling transport instance.
 *
 * @return {object} Transport instance with subscribe/unsubscribe/onStatusChange
 */
export function createPollingTransport() {
	/**
	 * Per event-key state: { callbacks: Set, intervalId, interval, refcount }
	 *
	 * @type {Map<string, { callbacks: Set<Function>, intervalId: number|null, interval: number, refcount: number }>}
	 */
	const keys = new Map()

	/** @type {Function[]} */
	const statusObservers = []

	/** Visibility change handler (stored so we can remove it in destroy). */
	let visibilityHandler = null

	/**
	 * Set up a document visibility listener (once, lazily).
	 */
	function ensureVisibilityListener() {
		if (visibilityHandler !== null) return
		if (typeof document === 'undefined') return

		visibilityHandler = () => {
			if (document.visibilityState === 'visible') {
				// Fire immediate callbacks and reset intervals
				for (const [, entry] of keys) {
					fireCallbacks(entry)
					resetInterval(entry)
				}
			}
		}

		document.addEventListener('visibilitychange', visibilityHandler)
	}

	/**
	 * Invoke all callbacks for a key entry (if tab is visible).
	 *
	 * @param {{ callbacks: Set<Function> }} entry
	 */
	function fireCallbacks(entry) {
		if (!isVisible()) return
		for (const cb of entry.callbacks) {
			try {
				cb()
			} catch (e) {
				console.error('pollingTransport: callback error:', e)
			}
		}
	}

	/**
	 * Clear and restart the interval for an entry.
	 *
	 * @param {object} entry
	 */
	function resetInterval(entry) {
		if (entry.intervalId !== null) {
			clearInterval(entry.intervalId)
		}
		entry.intervalId = setInterval(() => fireCallbacks(entry), entry.interval)
	}

	return {
		/**
		 * Always returns `'polling'`.
		 *
		 * @return {string}
		 */
		getStatus() {
			return 'polling'
		},

		/**
		 * Register a status observer (always receives `'polling'` immediately on first call).
		 *
		 * @param {Function} cb
		 */
		onStatusChange(cb) {
			statusObservers.push(cb)
		},

		/**
		 * Subscribe a callback to an event key.
		 *
		 * @param {string} eventKey Event key to poll for
		 * @param {Function} cb Callback invoked on each poll tick (and immediately on visibility restore)
		 * @param {number} [interval] Poll interval in ms (default: 30000)
		 * @return {{ eventKey: string, cb: Function }} Handle for unsubscribe
		 */
		subscribe(eventKey, cb, interval = DEFAULT_POLL_INTERVAL_COLLECTION) {
			ensureVisibilityListener()

			if (!keys.has(eventKey)) {
				const entry = {
					callbacks: new Set(),
					intervalId: null,
					interval,
					refcount: 0,
				}
				keys.set(eventKey, entry)
				resetInterval(entry)
			}

			const entry = keys.get(eventKey)
			entry.callbacks.add(cb)
			entry.refcount += 1

			return { eventKey, cb, transport: this }
		},

		/**
		 * Unsubscribe a callback. Clears the interval when last subscriber leaves.
		 *
		 * @param {{ eventKey: string, cb: Function }} handle Handle from subscribe()
		 */
		unsubscribe(handle) {
			const { eventKey, cb } = handle
			const entry = keys.get(eventKey)
			if (!entry) return

			entry.callbacks.delete(cb)
			entry.refcount -= 1

			if (entry.refcount <= 0) {
				if (entry.intervalId !== null) {
					clearInterval(entry.intervalId)
					entry.intervalId = null
				}
				keys.delete(eventKey)
			}
		},

		/**
		 * Clean up all intervals and the visibility listener.
		 */
		destroy() {
			for (const [, entry] of keys) {
				if (entry.intervalId !== null) {
					clearInterval(entry.intervalId)
				}
			}
			keys.clear()

			if (visibilityHandler !== null && typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', visibilityHandler)
				visibilityHandler = null
			}

			statusObservers.length = 0
		},
	}
}
