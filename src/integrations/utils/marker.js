/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * stripMarker — shared marker-strip helper for the pluggable
 * integration registry (ADR-019).
 *
 * Every link-table-strategy provider stuffs an `[or:{uuid}]` marker
 * into the host app's title / slug / description column so the
 * provider's `list()` query can find the linked rows. The marker is
 * an implementation detail of the storage strategy; the UI must never
 * surface it. Talk, Maps, Polls, Photos, Collectives, Analytics and
 * Flow all need to strip it on render, so the regex lives here once
 * and is imported by every leaf instead of being copy-pasted.
 *
 * Some providers (e.g. early Maps fixtures) accidentally land the
 * marker WITHOUT the surrounding brackets in a secondary column (e.g.
 * `category = 'or:{uuid}'`). The shared helper handles both shapes —
 * bracketed and bare `or:{uuid}` — so the UI is robust against either.
 *
 * @example
 * import { stripMarker } from '../../utils/marker.js'
 * const title = stripMarker(raw) || fallback
 *
 * @module integrations/utils/marker
 */

const OPEN = '[or:'

// Bare `or:{uuid}` marker without enclosing brackets. UUID-shaped
// payload only — we deliberately do NOT match arbitrary `or:foo` text
// to avoid eating legitimate values like "or:option-a" (a poll option).
// Pattern: `or:` followed by hex/hyphens (UUID alphabet) of length ≥ 8.
const BARE = /or:[0-9a-f-]{8,}/gi

/**
 * Replace every `[or:…]` marker (any non-empty, non-`]` content) with a
 * space, in one pass over the text.
 *
 * @param {string} text The text to clean.
 *
 * @return {string}
 */
function dropBracketed(text) {
	let out = ''
	let from = 0
	let search = 0
	for (;;) {
		const start = text.indexOf(OPEN, search)
		if (start === -1) {
			break
		}
		const end = text.indexOf(']', start + OPEN.length)
		if (end === -1) {
			break
		}
		if (end === start + OPEN.length) {
			search = end
			continue
		}
		out += text.slice(from, start) + ' '
		from = end + 1
		search = from
	}
	return out + text.slice(from)
}

/**
 * Strip the `[or:{uuid}]` marker (and the rarer bare `or:{uuid}`
 * form) from a string. Returns the input coerced to string and
 * trimmed; never returns `null`/`undefined`.
 *
 * @param {unknown} raw any value that should be rendered as a string
 *
 * @return {string}
 */
export function stripMarker(raw) {
	if (raw === null || raw === undefined) {
		return ''
	}
	return dropBracketed(String(raw))
		.replace(BARE, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * `true` when the input is entirely composed of a marker (i.e. once
 * the marker is stripped the remainder is empty). Useful for hiding
 * chip-style affordances when the field is "just the marker".
 *
 * @param {unknown} raw any value
 *
 * @return {boolean}
 */
export function isMarkerOnly(raw) {
	if (raw === null || raw === undefined || raw === '') {
		return false
	}
	return stripMarker(raw) === '' && String(raw).trim() !== ''
}
