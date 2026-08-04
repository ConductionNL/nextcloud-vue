/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * commandPalette/recency — optional, LOCAL-ONLY recency/frequency tracking
 * for `CnCommandPalette`'s idle (empty-query) list and same-tier ranking
 * tie-breaks (see `MAX_RECENCY_BOOST` in `commandPaletteRanking.js`).
 *
 * Persistence is `localStorage` only, namespaced per app id — the same
 * "localStorage fallback" tier `CnSupportDialog`'s dismissal-persistence
 * already uses (see its docblock in `CnAppRoot.vue`), stopping short of
 * that feature's SERVER-side `/api/preferences/*` round trip. Cross-device
 * sync of "your recent commands" is a legitimate follow-up but not
 * required for the feature to be useful — the palette works identically
 * without it, just without a boost. Internal module: not part of the
 * public `@conduction/nextcloud-vue` API surface (no `check:docs` entry
 * needed), used only by `CnCommandPalette` itself.
 *
 * @module commandPalette/recency
 */

const STORAGE_PREFIX = 'cn-command-palette-recency:'
const MAX_TRACKED_IDS = 200

/**
 * Read the raw `{ [id]: count }` map for an app from `localStorage`.
 * Never throws — a disabled/unavailable `localStorage` (private browsing,
 * SSR, a hostile CSP) degrades to "no boost", not a crash.
 *
 * @param {string} appId Namespacing key (usually the Nextcloud app id).
 * @return {Record<string, number>} The usage-count map (possibly empty).
 */
function readUsageCounts(appId) {
	try {
		const raw = window.localStorage.getItem(STORAGE_PREFIX + appId)
		if (!raw) return {}
		const parsed = JSON.parse(raw)
		return (parsed && typeof parsed === 'object') ? parsed : {}
	} catch {
		return {}
	}
}

/**
 * Persist a usage-count map, silently no-op on failure (see `readUsageCounts`).
 *
 * @param {string} appId Namespacing key.
 * @param {Record<string, number>} counts The usage-count map to persist.
 * @return {void}
 */
function writeUsageCounts(appId, counts) {
	try {
		window.localStorage.setItem(STORAGE_PREFIX + appId, JSON.stringify(counts))
	} catch {
		// Ignore — quota exceeded / unavailable storage just disables the boost.
	}
}

/**
 * Create a recency tracker scoped to one app id.
 *
 * @param {string} [appId] Namespacing key. Defaults to `'default'` so callers that don't pass one still get isolation from other localStorage keys.
 * @return {{recordUse: (id: string) => void, getUsageCounts: () => Record<string, number>}} The tracker.
 */
export function createRecencyTracker(appId = 'default') {
	return {
		/**
		 * Record one use of a command/result id, capping the tracked-id set
		 * so an ever-growing palette history can't grow `localStorage`
		 * unbounded — the least-used id is evicted once the cap is hit.
		 *
		 * @param {string} id The activated item's id.
		 * @return {void}
		 */
		recordUse(id) {
			if (typeof id !== 'string' || id === '') return
			const counts = readUsageCounts(appId)
			counts[id] = (counts[id] || 0) + 1

			const ids = Object.keys(counts)
			if (ids.length > MAX_TRACKED_IDS) {
				ids.sort((a, b) => counts[a] - counts[b])
				for (const staleId of ids.slice(0, ids.length - MAX_TRACKED_IDS)) {
					delete counts[staleId]
				}
			}
			writeUsageCounts(appId, counts)
		},

		/**
		 * @return {Record<string, number>} The current usage-count map, for `rankCommandPaletteItems({ usageCounts })`.
		 */
		getUsageCounts() {
			return readUsageCounts(appId)
		},
	}
}
