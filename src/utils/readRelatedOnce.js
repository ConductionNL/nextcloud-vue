/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * readRelatedOnce: one read per related record, shared by every widget on the page.
 *
 * A detail page draws several data cards over the same record, and each card
 * names the records its relation fields point at. Each card read them on its
 * own, so a case page with five cards read its case type five times on open.
 * This keeps the read (in flight or answered) for a short while, keyed by its
 * url, so the cards share one request. A failed read is not kept: the next
 * card tries again.
 *
 * @module utils/readRelatedOnce
 */

/** How long an answered read is shared, in milliseconds. */
export const RELATED_READ_TTL = 30000

/** @type {Map<string, {promise: Promise<object>, at: number}>} */
const reads = new Map()

/**
 * Read a related record once for every caller within the TTL.
 *
 * @param {string} url The record's url.
 * @param {(url: string) => Promise<object>} get Reads the url and resolves to the response (e.g. `axios.get`).
 * @param {number} [now] The current time in ms (for tests).
 * @return {Promise<object>} The response, shared with every caller of the same url.
 * @spec openspec/changes/related-record-read-once/specs/data-widget/spec.md#requirement-a-related-record-is-read-once-per-page-open
 */
export function readRelatedOnce(url, get, now = Date.now()) {
	const kept = reads.get(url)
	if (kept && now - kept.at < RELATED_READ_TTL) {
		return kept.promise
	}
	const promise = Promise.resolve().then(() => get(url))
	reads.set(url, { promise, at: now })
	promise.catch(() => {
		if (reads.get(url)?.promise === promise) {
			reads.delete(url)
		}
	})
	return promise
}

/**
 * Forget every kept read (after a write, or between tests).
 *
 * @return {void}
 * @spec openspec/changes/related-record-read-once/specs/data-widget/spec.md#requirement-a-related-record-is-read-once-per-page-open
 */
export function forgetRelatedReads() {
	reads.clear()
}
