/**
 * WebSocket transport for live updates via @nextcloud/notify_push.
 *
 * Wraps the notify_push `listen()` API with refcounted listener management,
 * exponential backoff + jitter on disconnect, and status change observation.
 *
 * The singleton is created lazily on the first `subscribe()` call.
 *
 * Status values: `'connecting' | 'live' | 'reconnecting' | 'offline' | 'polling'`
 */

import { listen } from '@nextcloud/notify_push'

const BACKOFF_BASE = 1000
const BACKOFF_CAP = 30000
const BACKOFF_MULTIPLIER = 2
const MAX_RECONNECT_FAILURES = 5

/**
 * Create a new WebSocket transport instance.
 *
 * @return {object} Transport instance with subscribe/unsubscribe/onStatusChange/destroy
 */
export function createWebsocketTransport() {
	/**
	 * Map from eventKey to Set of callbacks registered by plugin subscribers.
	 *
	 * @type {Map<string, Set<Function>>}
	 */
	const listeners = new Map()

	/** @type {Function[]} Status change observers */
	const statusObservers = []

	/** @type {'connecting'|'live'|'reconnecting'|'offline'|'polling'} */
	let status = 'offline'

	/** Number of consecutive reconnect failures */
	let reconnectFailures = 0

	/** Reconnect timer handle */
	let reconnectTimer = null

	/**
	 * Notify all status observers of a state change.
	 *
	 * @param {string} newStatus New status string
	 */
	function setStatus(newStatus) {
		status = newStatus
		for (const observer of statusObservers) {
			observer(newStatus)
		}
	}

	/**
	 * Register a single event key with notify_push.
	 * Returns true if push is available, false otherwise.
	 *
	 * @param {string} eventKey Event key to register
	 * @return {boolean} Whether push is available
	 */
	function registerKey(eventKey) {
		return listen(eventKey, (event, body) => {
			const cbs = listeners.get(eventKey)
			if (cbs) {
				for (const cb of cbs) {
					cb(event, body)
				}
			}
		})
	}

	/**
	 * Attempt to connect all active event keys.
	 * Sets status based on whether notify_push is available.
	 */
	function connect() {
		setStatus('connecting')
		let available = false
		for (const eventKey of listeners.keys()) {
			const result = registerKey(eventKey)
			available = available || result
		}

		if (available) {
			setStatus('live')
			reconnectFailures = 0
		} else {
			setStatus('polling')
		}
	}

	/**
	 * Schedule a reconnect attempt with exponential backoff + jitter.
	 */
	function scheduleReconnect() {
		if (reconnectTimer !== null) return

		reconnectFailures += 1

		if (reconnectFailures > MAX_RECONNECT_FAILURES) {
			setStatus('polling')
			return
		}

		const backoff = Math.min(BACKOFF_BASE * Math.pow(BACKOFF_MULTIPLIER, reconnectFailures - 1), BACKOFF_CAP)
		const jitter = Math.random() * backoff
		const delay = backoff + jitter

		setStatus('reconnecting')

		reconnectTimer = setTimeout(() => {
			reconnectTimer = null
			reattachAll()
		}, delay)
	}

	/**
	 * Re-attach all active event keys after a reconnect.
	 */
	function reattachAll() {
		let available = false
		for (const eventKey of listeners.keys()) {
			const result = registerKey(eventKey)
			available = available || result
		}

		if (available) {
			setStatus('live')
			reconnectFailures = 0
		} else {
			scheduleReconnect()
		}
	}

	return {
		/**
		 * Get the current transport status.
		 *
		 * @return {string} Current status
		 */
		getStatus() {
			return status
		},

		/**
		 * Register a status change observer.
		 *
		 * @param {Function} cb Callback receiving the new status string
		 */
		onStatusChange(cb) {
			statusObservers.push(cb)
		},

		/**
		 * Subscribe a callback to an event key.
		 * Multiple subscribers to the same key share one underlying listen() call.
		 *
		 * @param {string} eventKey Event key (e.g. `'or-object-uuid-abc'`)
		 * @param {Function} cb Callback invoked when the event fires
		 * @return {{ eventKey: string, cb: Function }} Handle for unsubscribe
		 */
		subscribe(eventKey, cb) {
			if (!listeners.has(eventKey)) {
				listeners.set(eventKey, new Set())
				// Register with notify_push on first subscriber for this key
				const available = registerKey(eventKey)

				if (status === 'offline') {
					if (available) {
						setStatus('live')
						reconnectFailures = 0
					} else {
						setStatus('polling')
					}
				}
			}

			listeners.get(eventKey).add(cb)
			return { eventKey, cb, transport: this }
		},

		/**
		 * Unsubscribe a callback. When the last subscriber for a key is removed,
		 * the key is cleaned up (the underlying notify_push listener cannot be
		 * individually removed per the library's API, but our fan-out stops).
		 *
		 * @param {{ eventKey: string, cb: Function }} handle Handle from subscribe()
		 */
		unsubscribe(handle) {
			const { eventKey, cb } = handle
			const cbs = listeners.get(eventKey)
			if (!cbs) return

			cbs.delete(cb)
			if (cbs.size === 0) {
				listeners.delete(eventKey)
			}
		},

		/**
		 * Trigger a reconnect attempt (used externally when persistent failure detected).
		 */
		reconnect() {
			scheduleReconnect()
		},

		/**
		 * Connect all current listeners (called after first subscribe).
		 */
		connect,

		/**
		 * Clean up all state.
		 */
		destroy() {
			if (reconnectTimer !== null) {
				clearTimeout(reconnectTimer)
				reconnectTimer = null
			}
			listeners.clear()
			statusObservers.length = 0
			status = 'offline'
			reconnectFailures = 0
		},
	}
}
