/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pure click / shift-click sort-state-transition machine for CnDataTable's
 * multi-column sort. Independent of Vue so the state machine is unit
 * testable in isolation and reusable by any future host.
 *
 * @module utils/multiColumnSort
 */

/** Maximum number of simultaneously active sort keys. */
export const MAX_SORT_KEYS = 3

/**
 * Compute the next ordered sort-key list for a header click.
 *
 * Plain click (`append: false`) reproduces CnDataTable's original
 * single-sort behavior exactly: clicking the sole active key cycles its
 * direction asc → desc → cleared; clicking any other column (including one
 * that is only a secondary/tertiary key in an active multi-sort) replaces
 * the whole list with that column alone, ascending.
 *
 * Shift+click (`append: true`) appends a not-yet-active column to the end
 * of the list, ascending, capped at `MAX_SORT_KEYS` (a shift+click beyond
 * the cap is a no-op — the list is returned unchanged). Shift+clicking a
 * column that is already active cycles only that column's own direction
 * (asc → desc → removed), leaving the other active keys' order and
 * direction untouched. Removing the primary (first) key promotes the next
 * key to primary.
 *
 * @param {Array<{key: string, order: 'asc'|'desc'}>} sortKeys Current ordered sort-key list.
 * @param {string} key The clicked column's key.
 * @param {{append?: boolean}} [options] `append: true` for a shift+click.
 * @return {Array<{key: string, order: 'asc'|'desc'}>} The next ordered sort-key list (new array; input not mutated).
 */
export function nextSortState(sortKeys, key, options = {}) {
	const keys = Array.isArray(sortKeys) ? sortKeys : []
	const append = options.append === true
	const idx = keys.findIndex((k) => k && k.key === key)

	if (!append) {
		const isSoleActiveKey = keys.length === 1 && idx === 0
		if (isSoleActiveKey) {
			if (keys[0].order === 'asc') {
				return [{ key, order: 'desc' }]
			}
			// desc -> cleared.
			return []
		}
		// Any other case (unsorted, or part of a multi-sort): become the sole
		// ascending key, dropping every other active key.
		return [{ key, order: 'asc' }]
	}

	// Shift+click: not yet active -> append (unless capped).
	if (idx === -1) {
		if (keys.length >= MAX_SORT_KEYS) {
			return keys
		}
		return [...keys, { key, order: 'asc' }]
	}

	// Shift+click on an already-active key: cycle its own direction only.
	if (keys[idx].order === 'asc') {
		return keys.map((k, i) => (i === idx ? { key, order: 'desc' } : k))
	}
	// desc -> remove this key, preserving the order of the rest.
	return keys.filter((_, i) => i !== idx)
}
