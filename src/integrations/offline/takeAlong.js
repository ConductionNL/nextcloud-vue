/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Take-along sets: the records a manifest's `offline.takeAlong` declares,
 * downloaded to the device, read back while the connection is gone, and
 * cleared without touching any other app's data (manifest-offline-block D3).
 *
 * The host decides WHEN to download and when to clear (buildiq's runtime
 * downloads on a signed-in load and clears on a load without a session).
 * This module only knows how, so the pages and the downloader agree on one
 * collection name and one expiry rule.
 *
 * @module integrations/offline/takeAlong
 */

import { takeAlongEntries } from '../../utils/offlineManifest.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { clearCollection, getPlannedItems, getPlanningMeta, storePlanning } from './offlineDb.js'
import { fetchPlanning } from './planningFetch.js'

/** The collection every take-along set is stored under. */
export const TAKE_ALONG_COLLECTION = 'take-along'

const HOUR_MS = 60 * 60 * 1000

/**
 * Download every declared take-along set and store it with its expiry.
 *
 * Each entry's filter tokens are resolved (`@me`, `@today`, ...), at most
 * `limit` records are fetched through the object API and stored under
 * {@link TAKE_ALONG_COLLECTION} with an expiry of `ttlHours`. An entry whose
 * register cannot be resolved is skipped. One failing entry does not stop
 * the others; its error is reported in the result.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-offline-core-downloads-reads-and-clears-a-take-along-set
 * @param {object} manifest The app manifest.
 * @param {object} [ctx] Token context forwarded to `resolveFilterTokens`.
 * @param {object} [deps] Test seam: `{ fetch, store }`.
 * @return {Promise<Array<{register: string, schema: string, count: number, error: (string|null)}>>} One outcome per entry.
 */
export async function downloadTakeAlong(manifest, ctx = {}, deps = {}) {
	const fetchSet = deps.fetch || fetchPlanning
	const store = deps.store || storePlanning
	const outcomes = []
	for (const entry of takeAlongEntries(manifest)) {
		if (entry.register === '') {
			outcomes.push({ register: '', schema: entry.schema, count: 0, error: 'no register' })
			continue
		}
		try {
			const items = await fetchSet({
				register: entry.register,
				schema: entry.schema,
				extraFilters: resolveFilterTokens(entry.filter, ctx),
				limit: entry.limit,
			})
			const rows = Array.isArray(items) ? items.slice(0, entry.limit) : []
			await store({
				register: entry.register,
				schema: entry.schema,
				items: rows,
				collection: TAKE_ALONG_COLLECTION,
				ttlMs: entry.ttlHours * HOUR_MS,
			})
			outcomes.push({ register: entry.register, schema: entry.schema, count: rows.length, error: null })
		} catch (error) {
			outcomes.push({ register: entry.register, schema: entry.schema, count: 0, error: error?.message || String(error) })
		}
	}
	return outcomes
}

/**
 * Read the take-along set of a register and schema.
 *
 * An expired set returns no rows, so a page never shows a copy past its
 * lifetime. A set never downloaded returns `syncedAt: null`.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-offline-core-downloads-reads-and-clears-a-take-along-set
 * @param {string} register Register slug.
 * @param {string} schema Schema slug.
 * @param {Date} [now] The current time (test seam).
 * @return {Promise<{rows: Array, syncedAt: (string|null), expiresAt: (string|null), expired: boolean}>} The set.
 */
export async function readTakeAlong(register, schema, now = new Date()) {
	const meta = await getPlanningMeta(register, schema, TAKE_ALONG_COLLECTION)
	if (meta === null) {
		return { rows: [], syncedAt: null, expiresAt: null, expired: false }
	}
	const expiresAt = meta.expiresAt || null
	const expired = expiresAt !== null && new Date(expiresAt).getTime() <= now.getTime()
	if (expired) {
		return { rows: [], syncedAt: meta.syncedAt || null, expiresAt, expired: true }
	}
	const rows = await getPlannedItems(register, schema, TAKE_ALONG_COLLECTION)
	return { rows, syncedAt: meta.syncedAt || null, expiresAt, expired: false }
}

/**
 * Remove the declared take-along sets of one app, and nothing else.
 *
 * Another app's sets and every queued mutation on the device stay.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-offline-core-downloads-reads-and-clears-a-take-along-set
 * @param {object} manifest The app manifest.
 * @return {Promise<number>} The number of records removed.
 */
export async function clearTakeAlong(manifest) {
	let removed = 0
	for (const entry of takeAlongEntries(manifest)) {
		if (entry.register !== '') {
			removed += await clearCollection(entry.register, entry.schema, TAKE_ALONG_COLLECTION)
		}
	}
	return removed
}
