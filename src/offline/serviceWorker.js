/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The service worker that lets the shell open with no signal.
 *
 * It caches two things and refuses to cache a third. The shell and the built
 * bundle are cached, because without them a field device with no signal opens a
 * browser error page and every capture already on the device is unreachable
 * behind it. An object read is never cached, and that refusal is the important
 * half.
 *
 * 🔴 WHY AN OBJECT READ IS NEVER SERVED FROM CACHE. A cached read looks exactly
 * like a fresh one. An inspector would be shown a case, a status, an address or
 * an assignment from some earlier moment with nothing to say how old it is, and
 * would act on it in front of a citizen. The leaf already has a cache with an
 * expiry and a download time attached, and it says out loud when it is out of
 * date; that is where stale data belongs. A second, silent copy inside the
 * worker would undo it.
 *
 * The decision logic below is exported as plain functions so it can be tested
 * without a served origin. The `self.addEventListener` calls at the bottom only
 * run inside a real worker.
 *
 * @module offline/serviceWorker
 */

/** Cache name prefix. The version is appended by {@link cacheNameFor}. */
export const CACHE_PREFIX = 'cn-offline-shell'

/**
 * Paths that must always go to the network, whatever the connection is doing.
 *
 * Object reads and writes both: a write answered from a cache would be a lie
 * about having reached the server, which is exactly the failure the queue
 * exists to make visible.
 */
export const NEVER_CACHED = [
	'/apps/openregister/api/',
	'/ocs/',
	'/apps/files/api/',
]

/**
 * The cache name for one bundle version.
 *
 * @param {string} version The bundle version the host is serving.
 *
 * @return {string} The versioned cache name.
 */
export function cacheNameFor(version) {
	return `${CACHE_PREFIX}-${String(version || '0')}`
}

/**
 * Whether this request may be answered from the shell cache.
 *
 * Only a GET, and only a path that is not an API read. Everything else goes to
 * the network and is allowed to fail, because failing is information.
 *
 * @param {string} url      The request URL.
 * @param {string} [method] The HTTP method.
 *
 * @return {boolean} True when the cache may answer it.
 */
export function isCacheable(url, method = 'GET') {
	if (String(method).toUpperCase() !== 'GET') {
		return false
	}

	const path = String(url || '')
	return NEVER_CACHED.some((prefix) => path.includes(prefix)) === false
}

/**
 * Which cache names to delete when a new version activates.
 *
 * Every cache this module owns except the current one. A worker that ADDS a
 * cache per release serves last month's bundle to whichever request happens to
 * hit the older entry, and grows without limit on a device that is never
 * cleared. Caches belonging to other code are left alone.
 *
 * @param {string[]} existingNames Every cache name currently present.
 * @param {string}   currentName   The cache this version uses.
 *
 * @return {string[]} The names to delete.
 */
export function staleCacheNames(existingNames, currentName) {
	return (Array.isArray(existingNames) ? existingNames : [])
		.filter((name) => String(name).startsWith(CACHE_PREFIX) && name !== currentName)
}

/**
 * Answer one request: cache first for the shell, network for everything else.
 *
 * Cache-first rather than network-first for the shell, because network-first on
 * a dead connection means waiting for a timeout before showing a page that was
 * on the device the whole time. A capture is not made faster by a spinner.
 *
 * @param {object}   request           The request ({ url, method }).
 * @param {object}   cache             A Cache-like object (match / put).
 * @param {(request: object) => Promise<object>} fetchFn The fetch to fall back to.
 *
 * @return {Promise<object>} The response.
 */
export async function respondTo(request, cache, fetchFn) {
	if (isCacheable(request.url, request.method) === false) {
		return await fetchFn(request)
	}

	const cached = await cache.match(request)
	if (cached !== undefined && cached !== null) {
		return cached
	}

	const response = await fetchFn(request)
	if (response && response.ok === true) {
		await cache.put(request, response.clone ? response.clone() : response)
	}
	return response
}

/* istanbul ignore next -- only reachable inside a real service worker. */
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function' && typeof self.skipWaiting === 'function') {
	const version = (typeof self.CN_OFFLINE_BUNDLE_VERSION === 'string') ? self.CN_OFFLINE_BUNDLE_VERSION : '0'
	const cacheName = cacheNameFor(version)

	self.addEventListener('install', () => self.skipWaiting())

	self.addEventListener('activate', (event) => {
		event.waitUntil((async () => {
			const names = await caches.keys()
			await Promise.all(staleCacheNames(names, cacheName).map((name) => caches.delete(name)))
			await self.clients.claim()
		})())
	})

	self.addEventListener('fetch', (event) => {
		event.respondWith((async () => {
			const cache = await caches.open(cacheName)
			return await respondTo(event.request, cache, (request) => fetch(request))
		})())
	})
}
