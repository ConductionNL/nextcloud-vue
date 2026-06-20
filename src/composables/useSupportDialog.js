/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useSupportDialog — first-open visibility + dismiss persistence for
 * `CnSupportDialog`.
 *
 * Each host app (or `CnAppRoot`) calls this once with its kebab-case
 * slug and gets back a `visible` ref it binds to
 * `<CnSupportDialog v-if="visible">`. `hide()` marks the note seen so
 * subsequent app opens stay quiet; `reset()` clears the flag.
 *
 * Two persistence backends:
 *  - `'local'` (default) — per-browser flag in `localStorage`
 *    (`cn-support-dialog-shown:{appSlug}`). Synchronous, zero backend.
 *  - `'server'` — per-USER flag via the app's generic preferences
 *    endpoint (`GET`/`PUT /apps/{appSlug}/api/preferences/{key}`),
 *    backed by Nextcloud `IConfig` user values. Cross-device "once
 *    ever". Falls back to `localStorage` when the user is
 *    unauthenticated or the endpoint is missing, so the dialog never
 *    becomes a hard dependency on the backend.
 *
 * The slug-keyed namespace matters: two Conduction apps mounted in the
 * same Nextcloud session must each track their own "seen" flag.
 *
 * @module composables/useSupportDialog
 */

import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

const STORAGE_KEY_PREFIX = 'cn-support-dialog-shown:'
const DEFAULT_PREFERENCE_KEY = 'support-dialog-seen'

/**
 * Per-`appSlug` cache so multiple calls within a session share refs.
 * Module-level lifetime — survives until the page is reloaded.
 */
const cache = new Map()

/**
 * @typedef {object} SupportDialogHandle
 * @property {import('vue').Ref<boolean>} visible Reactive visibility flag.
 * @property {() => void} show  Force the dialog visible (ignores stored flag).
 * @property {() => void} hide  Mark dismissed, persist, and hide.
 * @property {() => void} reset Clear the persisted flag (tests / admin re-show).
 */

/**
 * Build a first-open support-dialog handle for the host app.
 *
 * `'local'` mode seeds `visible` synchronously from `localStorage`.
 * `'server'` mode seeds `visible` to `false`, then resolves it
 * asynchronously from the preferences endpoint (so the note never
 * flashes before we know whether the user has already seen it), with a
 * `localStorage` fallback on any error.
 *
 * @param {string}  appSlug              Kebab-case host-app id (e.g. `"decidesk"`).
 * @param {object}  [options]            Optional configuration bag.
 * @param {('local'|'server')} [options.persistence] Backend; defaults to `'local'`.
 * @param {string}  [options.key]        Preference key (default `support-dialog-seen`).
 * @param {Storage} [options.storage]    localStorage backend; injectable for tests.
 * @param {object}  [options.http]       axios instance; injectable for tests.
 * @return {SupportDialogHandle}
 *
 * @example
 * // Per-browser (default):
 * const { visible, hide } = useSupportDialog('decidesk')
 *
 * @example
 * // Per-user, cross-device:
 * const { visible, hide } = useSupportDialog('decidesk', { persistence: 'server' })
 */
export function useSupportDialog(appSlug, options = {}) {
	const persistence = options.persistence === 'server' ? 'server' : 'local'
	const prefKey = options.key || DEFAULT_PREFERENCE_KEY
	const storage = resolveStorage(options.storage)
	const http = options.http || axios
	const storageKey = STORAGE_KEY_PREFIX + appSlug
	const cacheKey = persistence + ':' + storageKey

	if (cache.has(cacheKey)) {
		return cache.get(cacheKey)
	}

	const endpoint = generateUrl('/apps/' + appSlug + '/api/preferences/' + prefKey)

	// Local mode resolves synchronously; server mode starts hidden and
	// resolves after the GET so the note never flashes on a return visit.
	// Local mode only opens when storage is present, readable, AND the flag
	// is positively unset (fail-closed: a storage-less / quota-blocked /
	// throwing browser stays hidden rather than nagging or trapping clicks).
	const visible = ref(persistence === 'local' && flagIsReadableAndUnset(storage, storageKey))

	/**
	 * Persist "seen" the moment the note is shown, so a later navigation /
	 * reload that re-runs the composable never re-opens it (which would
	 * re-mount the modal mask and trap clicks). Keeps the local flag and
	 * the server preference in sync.
	 *
	 * @return {void}
	 */
	function markSeen() {
		setFlag(storage, storageKey)
		if (persistence === 'server') {
			putFlag(http, endpoint, '1')
		}
	}

	const handle = {
		visible,
		show() {
			// Showing the note ALSO records it as seen immediately, so a
			// navigation or reload that re-runs the composable never
			// re-opens (and never re-traps clicks behind the modal mask).
			// The personal note is a one-time nudge, not a per-visit gate.
			visible.value = true
			markSeen()
		},
		hide() {
			visible.value = false
			markSeen()
		},
		reset() {
			clearFlag(storage, storageKey)
			if (persistence === 'server') {
				putFlag(http, endpoint, '')
			}
			visible.value = true
		},
	}

	cache.set(cacheKey, handle)

	if (persistence === 'server') {
		resolveServerVisibility(http, endpoint, storage, storageKey, visible, markSeen)
	} else if (visible.value) {
		// Local mode decided synchronously to show: record "seen" now so a
		// reload / route change never re-opens (and never re-traps clicks).
		markSeen()
	}

	return handle
}

/**
 * Resolve `visible` from the server preferences endpoint.
 *
 * The note is a one-time, low-priority nudge — it must NEVER auto-open in
 * a way that traps clicks across an app, and must never re-appear on every
 * navigation. So this resolver is deliberately fail-CLOSED:
 *
 *  - It only opens the note when it has a DEFINITIVE "not seen yet" answer
 *    from a real preferences endpoint — i.e. the response is a JSON object
 *    carrying a `value` field (the documented shape). Most apps don't
 *    serve `/api/preferences/{key}`, so Nextcloud returns the SPA index
 *    HTML with a 200 status; that is NOT a real "not seen" signal and is
 *    treated as "endpoint absent" → the note stays hidden (rather than the
 *    old behaviour, which read `htmlString.value === undefined` as
 *    "unseen" and re-opened a click-trapping modal on every page load).
 *  - When the endpoint is genuinely absent / errors, it falls back to the
 *    per-browser localStorage flag, and ONLY shows when that flag is
 *    explicitly known to be unset (storage present + key absent). A
 *    storage-unavailable environment stays hidden.
 *  - The instant it decides to show, it records "seen" via `markSeen` so a
 *    reload or route change never re-opens the note.
 *
 * @param {object}  http     axios instance.
 * @param {string}  endpoint Preferences endpoint URL.
 * @param {Storage} storage  localStorage backend (fallback + cache).
 * @param {string}  key      localStorage key.
 * @param {import('vue').Ref<boolean>} visible Visibility ref to update.
 * @param {() => void} markSeen Persist the "seen" flag (local + server).
 * @return {Promise<void>}
 */
async function resolveServerVisibility(http, endpoint, storage, key, visible, markSeen) {
	// A previously-recorded local flag is authoritative and zero-cost:
	// if we've already shown the note in this browser, never re-open.
	if (storage && hasRealFlag(storage, key)) {
		visible.value = false
		return
	}

	try {
		const { data } = await http.get(endpoint)
		// Only a proper JSON object with a `value` field counts as a real
		// preferences response. An HTML string (SPA fallback) or any other
		// non-object shape means the endpoint is not served → stay hidden.
		if (!isPlainObject(data) || !('value' in data)) {
			visible.value = false
			return
		}
		const seen = data.value === '1' || data.value === 1 || data.value === true
		if (seen) {
			visible.value = false
			setFlag(storage, key)
			return
		}
		// Definitive "not seen yet" from a real endpoint — show ONCE and
		// record it immediately so it never re-traps on navigation.
		visible.value = true
		markSeen()
	} catch (e) {
		// Unauthenticated / endpoint missing / offline. Fall back to the
		// per-browser flag, but only show when we can positively confirm
		// the flag is readable AND unset. Otherwise stay hidden — a support
		// nudge must never block the UI on uncertainty.
		if (flagIsReadableAndUnset(storage, key)) {
			visible.value = true
			markSeen()
		} else {
			visible.value = false
		}
	}
}

function putFlag(http, endpoint, value) {
	try {
		// Fire-and-forget: the local flag already hid the dialog for this
		// session, so a failed write only means the user might see it
		// again on another device — acceptable for a support nudge.
		http.put(endpoint, { value }).catch(() => {})
	} catch (e) {
		/* swallow — never let persistence break the UI */
	}
}

function resolveStorage(injected) {
	if (injected) {
		return injected
	}
	if (typeof window === 'undefined') {
		return null
	}
	try {
		return window.localStorage
	} catch (e) {
		return null
	}
}

/**
 * True only when the "seen" flag is positively set to `'1'` in storage.
 * Returns `false` for a missing key, missing storage, or a read error —
 * the opposite fail-safe to a generic presence check. Callers gate
 * showing the note on `!hasRealFlag`, so any uncertainty keeps the note
 * hidden rather than nagging.
 *
 * @param {Storage|null} storage localStorage backend.
 * @param {string} key Flag key.
 * @return {boolean} True only when the flag is definitively set.
 */
function hasRealFlag(storage, key) {
	if (!storage) {
		return false
	}
	try {
		return storage.getItem(key) === '1'
	} catch (e) {
		return false
	}
}

/**
 * True only when storage is present, the key is READABLE, and it is
 * positively unset (not yet '1'). Returns `false` on missing storage or
 * any read error (SSR / private-mode / SecurityError) — the fail-closed
 * gate for *showing* the note, so uncertainty never opens a click-trapping
 * modal.
 *
 * @param {Storage|null} storage localStorage backend.
 * @param {string} key Flag key.
 * @return {boolean} True only when readable AND unset.
 */
function flagIsReadableAndUnset(storage, key) {
	if (!storage) {
		return false
	}
	try {
		return storage.getItem(key) !== '1'
	} catch (e) {
		return false
	}
}

/**
 * Type guard — true when value is a plain (non-array, non-null) object.
 * Used to reject SPA HTML-string responses from the preferences endpoint.
 *
 * @param {*} value Candidate.
 * @return {boolean} True when value is a plain object.
 */
function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function setFlag(storage, key) {
	if (!storage) {
		return
	}
	try {
		storage.setItem(key, '1')
	} catch (e) {
		/* quota or private-mode — swallow */
	}
}

function clearFlag(storage, key) {
	if (!storage) {
		return
	}
	try {
		storage.removeItem(key)
	} catch (e) {
		/* swallow */
	}
}
