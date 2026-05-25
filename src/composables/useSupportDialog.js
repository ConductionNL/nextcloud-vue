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
	const visible = ref(persistence === 'local' ? !hasFlag(storage, storageKey) : false)

	const handle = {
		visible,
		show() {
			visible.value = true
		},
		hide() {
			visible.value = false
			setFlag(storage, storageKey)
			if (persistence === 'server') {
				putFlag(http, endpoint, '1')
			}
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
		resolveServerVisibility(http, endpoint, storage, storageKey, visible)
	}

	return handle
}

/**
 * Resolve `visible` from the server preferences endpoint, falling back
 * to `localStorage` on any failure (unauthenticated, 404, network).
 *
 * @param {object}  http     axios instance.
 * @param {string}  endpoint Preferences endpoint URL.
 * @param {Storage} storage  localStorage backend (fallback + cache).
 * @param {string}  key      localStorage key.
 * @param {import('vue').Ref<boolean>} visible Visibility ref to update.
 * @return {Promise<void>}
 */
async function resolveServerVisibility(http, endpoint, storage, key, visible) {
	try {
		const { data } = await http.get(endpoint)
		const seen = (data && (data.value === '1' || data.value === 1)) === true
		visible.value = !seen
		// Mirror into localStorage so a later page load (or an offline
		// blip) stays consistent with the server's answer.
		if (seen) {
			setFlag(storage, key)
		}
	} catch (e) {
		// Unauthenticated / endpoint missing / offline — degrade to the
		// per-browser flag rather than nagging or hard-failing.
		visible.value = !hasFlag(storage, key)
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

function hasFlag(storage, key) {
	if (!storage) {
		return true
	}
	try {
		return storage.getItem(key) === '1'
	} catch (e) {
		return true
	}
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
