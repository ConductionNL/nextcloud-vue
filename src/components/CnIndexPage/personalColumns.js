/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A person's own column layout for one list: which columns, in what order, and
 * how many are pinned. Held in their Nextcloud preferences, per list.
 *
 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-4
 */

/**
 * The preference key a list's column layout is held under.
 *
 * @param {string} listId Stable id of the list (the manual order's id, else the object type or schema).
 * @return {string} The preference key, `columns.<list id>`.
 */
export function personalColumnsKey(listId) {
	return `columns.${String(listId || 'default').replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/**
 * Make a stored layout safe to use: keep only columns the list still has, in the
 * stored order. A column the schema no longer has drops out silently; a new one
 * is simply absent, so it is hidden and sits at the end of the sidebar list.
 * When nothing is known about the list's columns yet (the schema is still
 * loading), the stored layout is kept as it is.
 *
 * @param {unknown} stored The stored value.
 * @param {Iterable<string>} known Keys of the columns the list has now.
 * @return {{columns: string[], pinned: number}|null} The layout, or null when there is nothing to use.
 */
export function reconcilePersonalColumns(stored, known) {
	if (!stored || typeof stored !== 'object' || !Array.isArray(stored.columns)) {
		return null
	}
	const have = new Set(known)
	const columns = stored.columns.map(String).filter((k, i, all) => all.indexOf(k) === i && (have.size === 0 || have.has(k)))
	if (columns.length === 0) {
		return null
	}
	const pinned = Math.min(columns.length, Math.max(0, Math.floor(Number(stored.pinned) || 0)))
	return { columns, pinned }
}

/**
 * Order table columns by a visible-column list. Columns the list does not
 * govern (custom ones outside the sidebar's universe) keep their own slots.
 *
 * @param {Array<(string|{key: string})>} cols The columns as the page has them.
 * @param {string[]} order The visible keys in the person's order.
 * @return {Array<(string|{key: string})>} The columns, reordered.
 */
export function orderColumns(cols, order) {
	const keyOf = (c) => (typeof c === 'string' ? c : c.key)
	const rank = new Map(order.map((k, i) => [k, i]))
	const ordered = cols.filter((c) => rank.has(keyOf(c))).sort((a, b) => rank.get(keyOf(a)) - rank.get(keyOf(b)))
	let next = 0
	return cols.map((c) => (rank.has(keyOf(c)) ? ordered[next++] : c))
}
