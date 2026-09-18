// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { computed, getCurrentScope, onScopeDispose, ref, unref } from 'vue'
import { buildObjectKey } from '../store/liveUpdates/eventKeys.js'
import { getLiveUpdates } from '../store/liveUpdates/transport.js'

/**
 * How long the server believes a reader after their last beat, in seconds.
 *
 * Mirrored from `PresenceService::WINDOW_SECONDS` and used ONLY as the
 * fallback pace when a server does not answer with its own. The server's
 * `beatSeconds` wins whenever it is present, because the window is its
 * decision and a client pacing itself to a stale copy of it drops off the
 * list while its user is still reading.
 */
const FALLBACK_BEAT_SECONDS = 30

/**
 * useObjectPresence — who else has this object open.
 *
 * 🔴 A HEARTBEAT, NOT A CONNECTION. notify_push tells the server nothing about
 * who is looking at what: a socket can be open while the tab showing this
 * object closed ten minutes ago, and a socket can drop while the reader is
 * still there. So the client says "still here" on a timer and the server stops
 * believing it after its window. Missing two beats reads as gone, which
 * survives a lost socket where connection tracking does not.
 *
 * 🔑 THE LIST COMES FROM TWO PLACES, AND THAT IS DELIBERATE. Every beat answers
 * the current list, so the component is correct even on an instance with no
 * notify_push at all — it simply learns at beat pace. The push is the
 * OPTIMISATION: it carries the new list on the object's own channel the moment
 * somebody arrives or leaves. Relying on the push alone would make presence a
 * feature that silently does nothing wherever notify_push is not installed,
 * which is most development instances and some production ones.
 *
 * 🔑 DEPARTURE IS SENT TWICE, ON PURPOSE. `tryOnScopeDispose` covers a route
 * change and an unmount; `beforeunload` with `sendBeacon` covers a closed tab,
 * which fires no Vue hook at all. Without the beacon a closed tab lingers for a
 * whole window on everybody else's screen; without the dispose a route change
 * does. Both are cheap and the server is idempotent about it.
 *
 * @param {string|import('vue').Ref<string>} register   OpenRegister register slug.
 * @param {string|import('vue').Ref<string>} schema     OpenRegister schema slug.
 * @param {string|import('vue').Ref<string>} objectUuid The object being read.
 * @param {object}  [options]         Optional config.
 * @param {boolean} [options.enabled] Set false to make the whole thing inert.
 * @return {{
 *   others: import('vue').ComputedRef<Array<object>>,
 *   count: import('vue').ComputedRef<number>,
 *   active: import('vue').Ref<boolean>,
 *   depart: () => Promise<void>
 * }} The other readers, and a way to leave early.
 */
export function useObjectPresence(register, schema, objectUuid, options = {}) {
	const present = ref([])
	const active = ref(false)
	let beatTimer = null
	let subscription = null
	let beatSeconds = FALLBACK_BEAT_SECONDS

	const enabled = () => options.enabled !== false
	const readUuid = () => String(unref(objectUuid) || '')

	/**
	 * The presence endpoint of the object currently being read.
	 *
	 * Named `presenceUrl` rather than `endpoint` because
	 * `tests/packaging/api-fetches-are-url-prefixed` recognises module-local
	 * URL builders BY NAME, alongside `objectsUrl` and `agentsUrl`. A generic
	 * `endpoint` would have to be exempted globally, which would blanket every
	 * function of that name in the library.
	 *
	 * @return {string} The url, or '' when the object is not resolved yet.
	 */
	function presenceUrl() {
		const r = String(unref(register) || '')
		const s = String(unref(schema) || '')
		const i = readUuid()
		if (!r || !s || !i) {
			return ''
		}
		return generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(r)}/${encodeURIComponent(s)}/${encodeURIComponent(i)}/presence`)
	}

	/**
	 * Everybody present except the viewer.
	 *
	 * The server already leaves the caller out of the beat's answer, but a
	 * PUSH carries the whole list — it is one payload for every recipient and
	 * cannot be personalised. Filtering here is what stops a reader seeing
	 * their own avatar appear the moment somebody else arrives.
	 */
	const others = computed(() => {
		const me = getCurrentUser()?.uid
		return present.value.filter((entry) => !me || entry?.user !== me)
	})

	const count = computed(() => others.value.length)

	/**
	 * Replace the list with whatever the server just said.
	 *
	 * @param {Array<object>} list The readers.
	 * @return {void}
	 */
	function adopt(list) {
		present.value = Array.isArray(list) ? list : []
	}

	/**
	 * Say we are still here, and take the answer.
	 *
	 * @return {Promise<void>}
	 */
	async function beat() {
		const url = presenceUrl()
		if (!url || !enabled()) {
			return
		}
		try {
			const { data } = await axios.put(url)
			adopt(data?.present)
			active.value = true
			// The server's pace, when it offers one. See FALLBACK_BEAT_SECONDS.
			if (Number.isFinite(data?.beatSeconds) && data.beatSeconds > 0) {
				beatSeconds = data.beatSeconds
			}
		} catch {
			// A failed beat is NOT an empty list. The reader drops off other
			// people's screens in one window either way, and clearing our own
			// list here would tell this reader they are alone on a page two
			// colleagues are looking at.
			active.value = false
		}
	}

	/**
	 * Say we have gone.
	 *
	 * @return {Promise<void>}
	 */
	async function depart() {
		stop()
		const url = presenceUrl()
		if (!url) {
			return
		}
		try {
			await axios.delete(url)
		} catch {
			// Best effort: the window expires us anyway.
		}
		present.value = []
		active.value = false
	}

	/**
	 * Tell the server we are gone from a tab that is closing.
	 *
	 * `sendBeacon` because `beforeunload` gives no time for a promise: an
	 * axios call from here is cancelled with the page. A beacon is queued by
	 * the browser and survives the navigation, which is the only mechanism
	 * that does.
	 *
	 * @return {void}
	 */
	function beaconDepart() {
		const url = presenceUrl()
		if (!url || !active.value) {
			return
		}
		try {
			// No DELETE from a beacon — it is always a POST — so the server's
			// own POST release path is used. Both reach one implementation.
			navigator.sendBeacon?.(url.replace(/\/presence$/, '/presence?_method=DELETE'))
		} catch {
			// Best effort.
		}
	}

	/**
	 * Begin beating and listen for other people's arrivals.
	 *
	 * @return {void}
	 */
	function start() {
		if (!enabled() || beatTimer) {
			return
		}

		beat()
		beatTimer = setInterval(beat, beatSeconds * 1000)

		try {
			const live = getLiveUpdates()
			subscription = live.subscribe(
				buildObjectKey(readUuid()),
				(event, body) => {
					// ONLY the presence event. The same channel carries create,
					// update and delete, and adopting a lifecycle payload's
					// absent `present` key would blank the list on every save.
					if (body?.action === 'presence') {
						adopt(body?.present)
					}
				},
				{ isObject: true },
			)
		} catch {
			// No transport is not an error: the beats still answer the list,
			// and presence simply updates at beat pace.
			subscription = null
		}
	}

	/**
	 * Stop beating and listening.
	 *
	 * @return {void}
	 */
	function stop() {
		if (beatTimer) {
			clearInterval(beatTimer)
			beatTimer = null
		}
		if (subscription) {
			try {
				getLiveUpdates().unsubscribe(subscription)
			} catch {
				// Already gone.
			}
			subscription = null
		}
	}

	// 🔴 STARTED HERE, NOT IN `onMounted`. `onMounted` only fires inside a
	// COMPONENT: called from a plain `effectScope`, or from a composable a
	// consumer wires up outside setup, it warns and never runs, and presence
	// would be a feature that silently does nothing in exactly the places
	// somebody would try it first. `tryOnScopeDispose` below works in both, so
	// the pairing is scope-based at both ends rather than half component and
	// half scope.
	//
	// Beating before mount is also the behaviour we want: a reader has the
	// object open the moment its page is being built, not one frame later.
	window.addEventListener('beforeunload', beaconDepart)
	start()

	// 🔴 VUE'S OWN `onScopeDispose`, NOT `@vueuse/core`'s `tryOnScopeDispose`.
	// Measured in this repo's jest on 2026-09-18: a `tryOnScopeDispose`
	// callback registered inside `effectScope().run()` does NOT fire on
	// `scope.stop()`, while Vue's own does. The cause is the dual-package
	// hazard — vueuse resolves its own copy of Vue and asks a different
	// `getCurrentScope()` — so the registration silently goes nowhere.
	//
	// A departure that never fires is the exact silent no-op this whole
	// feature is built to avoid: the reader stays on everybody's list for a
	// full window after they navigate away. One fewer indirection also means
	// one fewer thing that can resolve to the wrong instance.
	//
	// Guarded, because a consumer may legitimately call this outside a scope;
	// there it simply has no automatic cleanup and relies on the beacon and
	// the server's window, which is what the guard makes explicit rather than
	// leaving to a warning nobody reads.
	if (getCurrentScope()) {
		onScopeDispose(() => {
			window.removeEventListener('beforeunload', beaconDepart)
			// Fire and forget: the scope is gone, there is nobody to await it.
			depart()
		})
	}

	return { others, count, active, depart }
}
