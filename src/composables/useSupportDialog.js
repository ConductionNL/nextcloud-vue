/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useSupportDialog — first-open visibility + dismiss persistence for
 * `CnSupportDialog`.
 *
 * Each host app calls this once with its kebab-case slug and gets back
 * a `visible` ref it can bind to a `<CnSupportDialog v-if="visible">`.
 * The composable seeds `visible` to `true` on first call when the
 * browser has no `cn-support-dialog-shown:{appSlug}` localStorage key,
 * and to `false` otherwise. `hide()` flips visible + writes the flag
 * so subsequent app opens stay quiet. `reset()` removes the flag for
 * test fixtures or a future "show again" admin action.
 *
 * The slug-keyed namespace matters: two Conduction apps mounted in
 * the same Nextcloud session must each show their own support note
 * the first time the user opens them.
 *
 * @module composables/useSupportDialog
 */

import { ref } from 'vue'

const STORAGE_KEY_PREFIX = 'cn-support-dialog-shown:'

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
 * @property {() => void} reset Remove the persisted flag (for tests / admin re-show).
 */

/**
 * Build a first-open support-dialog handle for the host app.
 *
 * Behaviour on first call for a given slug:
 *  - If `storage` has no `cn-support-dialog-shown:{slug}` entry,
 *    `visible.value` starts at `true`.
 *  - Otherwise it starts at `false`.
 *
 * Safe under SSR / missing localStorage — if `storage` access throws
 * or `window` is undefined, the composable behaves as if the flag is
 * already set (i.e. `visible=false`), so server-side renders stay
 * quiet.
 *
 * @param {string}  appSlug          Kebab-case host-app id (e.g. `"decidesk"`).
 * @param {object}  [options]         Optional configuration bag.
 * @param {Storage} [options.storage] Storage backend; defaults to
 *                                    `window.localStorage`. Injectable
 *                                    for tests.
 * @return {SupportDialogHandle}
 *
 * @example
 * // In App.vue setup():
 * const { visible, hide } = useSupportDialog('decidesk')
 * // <CnSupportDialog v-if="visible" app-slug="decidesk" ... @close="hide" />
 */
export function useSupportDialog(appSlug, options = {}) {
	const storage = resolveStorage(options.storage)
	const key = STORAGE_KEY_PREFIX + appSlug

	if (cache.has(key)) {
		return cache.get(key)
	}

	const visible = ref(!hasFlag(storage, key))

	const handle = {
		visible,
		show() {
			visible.value = true
		},
		hide() {
			setFlag(storage, key)
			visible.value = false
		},
		reset() {
			clearFlag(storage, key)
			visible.value = true
		},
	}

	cache.set(key, handle)
	return handle
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
