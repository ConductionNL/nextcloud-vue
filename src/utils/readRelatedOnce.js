/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * readRelatedOnce: one read per related record, shared by every widget on the page.
 *
 * A detail page draws several data cards over the same record, and each card
 * names the records its relation fields point at. Each card read them on its
 * own, so a case page with five cards read its case type five times on open.
 * This keeps the read (in flight or answered) for a short while, keyed by the
 * record (`register/schema/id`), so the cards and the visibility rows of a
 * detail page share one request. A failed read is not kept: the next caller
 * tries again.
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
 * @param {string} key The record's key, `register/schema/id` (or its url).
 * @param {(key: string) => Promise<object>} get Reads the record and resolves to its body.
 * @param {number} [now] The current time in ms (for tests).
 * @return {Promise<object>} The body, shared with every caller of the same key.
 * @spec openspec/changes/related-record-read-once/specs/data-widget/spec.md#requirement-a-related-record-is-read-once-per-page-open
 */
export function readRelatedOnce(key, get, now = Date.now()) {
	const kept = reads.get(key)
	if (kept && now - kept.at < RELATED_READ_TTL) {
		return kept.promise
	}
	const promise = Promise.resolve().then(() => get(key))
	reads.set(key, { promise, at: now })
	promise.catch(() => {
		if (reads.get(key)?.promise === promise) {
			reads.delete(key)
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
