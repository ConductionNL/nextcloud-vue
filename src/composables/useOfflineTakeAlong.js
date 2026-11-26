/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The offline state of an index or detail page and the take-along set it
 * reads while the connection is gone (manifest-offline-block D4, D5).
 *
 * A page is offline when `navigator.onLine` is false, or when its own list
 * or object request failed without any answer (the page calls
 * `markOffline()`). It is back once the `online` event fires. Only a page
 * whose manifest takes its register and schema along enables this, so no
 * other page ever opens the offline database: the take-along module, and
 * with it Dexie, is imported on the first read only.
 *
 * @module composables/useOfflineTakeAlong
 */

import { translate as t } from '@nextcloud/l10n'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * A getter for an option that may be a value or a function.
 *
 * @param {unknown} option The option.
 * @return {function(): unknown} The getter.
 */
function getter(option) {
	return typeof option === 'function' ? option : () => option
}

/**
 * The download time as the page shows it: hours and minutes, `08:14`.
 *
 * @param {string|null} iso The ISO time.
 * @return {string} The time, or an empty string.
 */
export function takeAlongTime(iso) {
	if (!iso) {
		return ''
	}
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) {
		return ''
	}
	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * The sentence an index page shows above the downloaded rows.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline
 * @param {{rows: Array, syncedAt: (string|null), expired: boolean}} set The set.
 * @return {string} The sentence.
 */
export function takeAlongIndexText(set) {
	if (set.expired) {
		return t('nextcloud-vue', 'The records on this device have expired. Connect to download them again.')
	}
	return t('nextcloud-vue', 'You are offline. Showing {count} records downloaded at {time}.', { count: set.rows.length, time: takeAlongTime(set.syncedAt) })
}

/**
 * The sentence a detail page shows above a downloaded record.
 *
 * @param {{syncedAt: (string|null), expired: boolean}} set The set.
 * @return {string} The sentence.
 */
export function takeAlongDetailText(set) {
	if (set.expired) {
		return t('nextcloud-vue', 'The records on this device have expired. Connect to download them again.')
	}
	return t('nextcloud-vue', 'You are offline. Downloaded at {time}.', { time: takeAlongTime(set.syncedAt) })
}

/**
 * Search and sort downloaded rows on the device.
 *
 * The search keeps rows where any scalar value contains the term, ignoring
 * case; the sort compares the key's values as text, numbers in order.
 *
 * @param {Array<object>} rows The rows.
 * @param {{search?: string, sortKey?: string, sortOrder?: string}} [options] Search and sort.
 * @return {Array<object>} A new array.
 */
export function searchAndSortLocally(rows, options = {}) {
	const term = String(options.search || '').trim().toLowerCase()
	let out = Array.isArray(rows) ? rows.slice() : []
	if (term !== '') {
		out = out.filter((row) => Object.values(row || {}).some((value) => (typeof value === 'string' || typeof value === 'number') && String(value).toLowerCase().includes(term)))
	}
	const key = options.sortKey || ''
	if (key !== '') {
		const direction = options.sortOrder === 'desc' ? -1 : 1
		const text = (row) => (row && row[key] !== undefined && row[key] !== null ? String(row[key]) : '')
		out.sort((a, b) => direction * text(a).localeCompare(text(b), undefined, { numeric: true, sensitivity: 'base' }))
	}
	return out
}

/**
 * Offline state and take-along set for one register and schema.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline
 * @param {object} options Options.
 * @param {string|Function} options.register Register slug (or getter).
 * @param {string|Function} options.schema Schema slug (or getter).
 * @param {boolean|Function} options.enabled Whether the manifest takes this register and schema along (or getter).
 * @param {Function} [options.read] Test seam replacing `readTakeAlong`.
 * @return {{offline: object, set: object, active: object, markOffline: Function, load: Function}} The state.
 */
export function useOfflineTakeAlong(options) {
	const register = getter(options.register)
	const schema = getter(options.schema)
	const enabled = getter(options.enabled)

	const offline = ref(false)
	const loaded = ref(false)
	const set = ref({ rows: [], syncedAt: null, expiresAt: null, expired: false })

	/**
	 * Read the set from the device.
	 *
	 * @return {Promise<void>}
	 */
	async function load() {
		if (!enabled() || !register() || !schema()) {
			return
		}
		try {
			const read = options.read || (await import('../integrations/offline/takeAlong.js')).readTakeAlong
			set.value = await read(String(register()), String(schema()))
		} catch {
			set.value = { rows: [], syncedAt: null, expiresAt: null, expired: false }
		}
		loaded.value = true
	}

	/**
	 * Follow the browser's connection state.
	 *
	 * @return {void}
	 */
	function follow() {
		offline.value = typeof navigator !== 'undefined' && navigator.onLine === false
		if (offline.value) {
			load()
		}
	}

	/**
	 * Count the page as offline: its request failed without any answer.
	 *
	 * @return {Promise<void>}
	 */
	function markOffline() {
		if (!enabled()) {
			return Promise.resolve()
		}
		offline.value = true
		return load()
	}

	onMounted(() => {
		if (!enabled()) {
			return
		}
		window.addEventListener('online', follow)
		window.addEventListener('offline', follow)
		follow()
	})

	onBeforeUnmount(() => {
		window.removeEventListener('online', follow)
		window.removeEventListener('offline', follow)
	})

	// Showing the set: offline, read, and downloaded at some point. A page
	// without a set keeps today's offline error.
	const active = computed(() => Boolean(enabled()) && offline.value && loaded.value && set.value.syncedAt !== null)

	return { offline, set, active, markOffline, load }
}
