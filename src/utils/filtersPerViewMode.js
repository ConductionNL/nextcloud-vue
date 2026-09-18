/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A filter set on the board does not follow you to the table.
 *
 * The two views are asked different questions. A board is "show me the work in
 * flight", a table is "find me this case", and carrying the board's filter into
 * the table is how somebody searches for a case they know exists and is told
 * there are no results. The other way round is worse: a table filter carried
 * into a board silently empties three columns, and an empty column on a board
 * reads as "no work here" rather than "you are not being shown it".
 *
 * 🔴 THE VIEW'S OWN CRITERIA DO FOLLOW. A saved view is the question; the mode
 * is how you look at the answer. Switching from table to board must not drop
 * the saved view, or the board would be of the whole register.
 *
 * Pure: no store, no fetch, no Vue.
 */

/**
 * Remember this mode's filters and hand back the next mode's.
 *
 * @param {object} options - The call.
 * @param {object} [options.held] - What each mode had, by mode.
 * @param {string} options.fromMode - The mode being left.
 * @param {object} [options.currentFilters] - What is set right now.
 * @param {string} options.toMode - The mode being entered.
 *
 * @return {{held: object, filters: object}} The new store, and the filters the
 *   next mode opens with.
 */
export function switchViewMode({ held = {}, fromMode = '', currentFilters = {}, toMode = '' } = {}) {
	const next = { ...held }
	if (String(fromMode) !== '') {
		next[fromMode] = { ...currentFilters }
	}

	// A mode nobody has been to yet opens CLEAN rather than inheriting from
	// wherever the reader happened to come from. Inheriting would make the
	// board's first impression depend on a filter set somewhere else, which is
	// the thing this whole function exists to stop.
	const filters = String(toMode) === '' ? {} : (next[toMode] ? { ...next[toMode] } : {})

	return { held: next, filters }
}

/**
 * Whether a mode has been visited, so a surface can say the filter is its own.
 *
 * @param {object} held - What each mode had.
 * @param {string} mode - The mode.
 * @return {boolean} True when this mode has its own remembered filters.
 */
export function hasOwnFilters(held = {}, mode = '') {
	return Object.hasOwn(held, mode)
}
