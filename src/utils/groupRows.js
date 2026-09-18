/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Grouping a list by one field, with a count per group.
 *
 * 🔴 IT COUNTS THE ROWS THE LIST HOLDS, AND SAYS SO. A paged list holds one
 * page, so "Open (12)" on page one of nine is a count of this page and not of
 * the query. Both numbers are legitimate and they are wildly different; the one
 * thing that is not legitimate is showing a page count as though it were the
 * total. `partial` travels with the result so the surface can say which it has,
 * and a second fetch per group to get the real total is exactly the cost this
 * grouping exists to avoid.
 *
 * 🔴 AN EMPTY VALUE IS ITS OWN GROUP, NOT A DROPPED ROW. Rows with no assignee
 * are the ones somebody opens a grouped list to find.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** The key a row with no value for the grouping field lands under. */
export const UNGROUPED_KEY = '__ungrouped__'

/**
 * Group rows by one field.
 *
 * @param {object} options - The call.
 * @param {Array<object>} options.rows - The rows the list holds.
 * @param {string} options.field - The field to group on.
 * @param {boolean} [options.paged] - Whether the list holds one page of more.
 *
 * @return {{groups: Array<object>, partial: boolean}} The groups, biggest
 *   first, each `{ key, value, rows, count }`, and whether the counts are of a
 *   page rather than of the query.
 */
export function groupRows({ rows = [], field = '', paged = false } = {}) {
	if (String(field ?? '').trim() === '') {
		return { groups: [], partial: false }
	}

	const byKey = new Map()
	for (const row of rows) {
		const raw = row?.[field]
		const empty = raw === undefined || raw === null || String(raw).trim() === ''
		const key = empty ? UNGROUPED_KEY : String(raw)

		if (byKey.has(key) === false) {
			byKey.set(key, { key, value: empty ? null : raw, rows: [], count: 0 })
		}
		const group = byKey.get(key)
		group.rows.push(row)
		group.count += 1
	}

	// Biggest first, and the ungrouped rows last whatever their size: they are
	// a gap in the data rather than a category, and leading with them reads as
	// though "no assignee" were the main way work is organised.
	const groups = [...byKey.values()].sort((left, right) => {
		if (left.key === UNGROUPED_KEY) {
			return 1
		}
		if (right.key === UNGROUPED_KEY) {
			return -1
		}
		if (right.count !== left.count) {
			return right.count - left.count
		}
		return String(left.key).localeCompare(String(right.key))
	})

	return { groups, partial: paged === true }
}
