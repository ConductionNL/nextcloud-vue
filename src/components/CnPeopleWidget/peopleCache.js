/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In-memory page cache for CnPeopleWidget. It lives at module level so a
 * widget that is unmounted and mounted again (switching dashboards) is
 * served from it instead of asking the directory again.
 */

/** How long a cached page stays fresh, in milliseconds. */
export const PEOPLE_CACHE_TTL_MS = 60 * 1000

const pages = new Map()

/**
 * The cache key of one page.
 *
 * @param {string} baseKey the serialised fetch arguments, without the offset.
 * @param {number} offset the page offset.
 * @return {string} the key.
 */
function keyOf(baseKey, offset) {
	return `${baseKey}|${offset}`
}

/**
 * A cached page that is still fresh, or `null`.
 *
 * @param {string} baseKey the serialised fetch arguments.
 * @param {number} offset the page offset.
 * @return {object|null} the cached `{users, total, hasMore}` page.
 */
export function readPeoplePage(baseKey, offset) {
	const entry = pages.get(keyOf(baseKey, offset))
	if (!entry) {
		return null
	}
	if (Date.now() - entry.storedAt >= PEOPLE_CACHE_TTL_MS) {
		pages.delete(keyOf(baseKey, offset))
		return null
	}
	return entry.page
}

/**
 * Keep a page.
 *
 * @param {string} baseKey the serialised fetch arguments.
 * @param {number} offset the page offset.
 * @param {object} page the `{users, total, hasMore}` page.
 * @return {void}
 */
export function storePeoplePage(baseKey, offset, page) {
	pages.set(keyOf(baseKey, offset), { page, storedAt: Date.now() })
}

/**
 * Drop every cached page of one argument set, or the whole cache.
 *
 * @param {string} [baseKey] the serialised fetch arguments; all when omitted.
 * @return {void}
 */
export function clearPeoplePages(baseKey) {
	if (baseKey === undefined) {
		pages.clear()
		return
	}
	for (const key of [...pages.keys()]) {
		if (key.startsWith(`${baseKey}|`)) {
			pages.delete(key)
		}
	}
}
