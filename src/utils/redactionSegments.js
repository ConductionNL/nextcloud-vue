/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A document text cut into plain and marked segments, for the redaction
 * editor to draw the passages in place.
 *
 * @module utils/redactionSegments
 */

/**
 * The text as segments: plain ones and marked ones carrying the passage's
 * verdict (`open` before it has one). Where passages overlap the longest wins,
 * and every occurrence of a passage is marked.
 *
 * @param {string} text The document text.
 * @param {Array<{value: string, verdict: (string|null)}>} passages The passages.
 * @return {Array<{text: string, verdict: (string|null)}>} The segments.
 */
export function redactionSegments(text, passages) {
	const source = String(text || '')
	const ranges = []
	const ordered = (Array.isArray(passages) ? passages : [])
		.filter((passage) => passage && String(passage.value || '') !== '')
		.sort((left, right) => right.value.length - left.value.length)
	for (const passage of ordered) {
		let from = source.indexOf(passage.value)
		while (from !== -1) {
			const to = from + passage.value.length
			if (ranges.every((range) => to <= range.from || from >= range.to)) {
				ranges.push({ from, to, verdict: passage.verdict || 'open' })
			}
			from = source.indexOf(passage.value, to)
		}
	}
	ranges.sort((left, right) => left.from - right.from)
	const segments = []
	let at = 0
	for (const range of ranges) {
		if (range.from > at) {
			segments.push({ text: source.slice(at, range.from), verdict: null })
		}
		segments.push({ text: source.slice(range.from, range.to), verdict: range.verdict })
		at = range.to
	}
	if (at < source.length) {
		segments.push({ text: source.slice(at), verdict: null })
	}
	return segments
}
