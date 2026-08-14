/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Release a `fetch` Response whose body will never be read.
 *
 * WHY THIS EXISTS (nextcloud-vue#573)
 * -----------------------------------
 * `fetch()` resolves as soon as the response HEADERS arrive. The body is a
 * live `ReadableStream` and the HTTP request stays *in flight* until that
 * stream is read to completion or explicitly cancelled. Code that inspects
 * `response.ok`, decides it does not want the payload, and returns — the
 * classic `if (!response.ok) return null` — leaves the stream open for the
 * lifetime of the page.
 *
 * Nothing warns. The call "worked", the caller got its `null`, and the only
 * visible symptom is that the browser never reaches a quiet network. That is
 * exactly how it was found: `useObjectStore.fetchSchema()` 404s on an app that
 * has no schema registered for a type, and scholiq's Playwright suite measured
 * 0 requests in flight 40 s after load under Vue 2 versus 1 under Vue 3 — one
 * permanently-pending schema fetch, which made `waitUntil: 'networkidle'`
 * unreachable and was the entire e2e delta on that app.
 *
 * Call this on every response you are about to walk away from.
 *
 * @module utils/discardResponseBody
 */

/**
 * Cancel a response body that will not be consumed, so the underlying request
 * completes instead of hanging.
 *
 * Safe to call with anything: a real `Response`, a partially-shaped test
 * double, `null`, or a response whose body was already read. Cancellation is
 * best-effort and never throws — a caller that has already decided to discard
 * the response must not acquire a new failure mode from cleaning up.
 *
 * @param {Response|null|undefined} response The response to release.
 *
 * @return {void}
 */
export function discardResponseBody(response) {
	try {
		const body = response?.body
		// `bodyUsed` is true once .json()/.text()/etc. consumed the stream;
		// cancelling then throws a TypeError in some engines. `body` is null
		// for 204/HEAD and for most hand-rolled test doubles.
		if (body && response.bodyUsed !== true && typeof body.cancel === 'function') {
			// Returns a promise. Deliberately not awaited: the caller is
			// discarding this response and must not be made to wait on the
			// teardown, and an unhandled rejection here would be noise.
			body.cancel().catch(() => {})
		}
	} catch {
		// Best-effort only.
	}
}
