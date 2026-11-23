/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list ordered by a field of its own records (`reorder: { field: 'order' }`):
 * moving a row renumbers the rows and writes only that field, and only on the
 * rows whose number changed.
 *
 * @module utils/reorderRows
 * @spec openspec/changes/list-reorder-order-field/specs/object-list-widget/spec.md#requirement-a-list-can-be-reordered-by-its-order-field
 */

/**
 * The list with the item at `from` moved to `to`.
 *
 * @param {Array} list The list.
 * @param {number} from The index moved from.
 * @param {number} to The index moved to.
 * @return {Array} A new list; the same order when an index is out of range.
 */
export function moveIndex(list, from, to) {
	const out = [...(Array.isArray(list) ? list : [])]
	if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) {
		return out
	}
	const [item] = out.splice(from, 1)
	out.splice(to, 0, item)
	return out
}

/**
 * The id of an OpenRegister row.
 *
 * @param {object} row The row.
 * @return {string} Its id, or ''.
 */
export function rowIdOf(row) {
	const id = row && (row.id ?? row['@self']?.id ?? row.uuid)
	return id === undefined || id === null ? '' : String(id)
}

/**
 * The rows renumbered from `start` in their current sequence, and the writes
 * that needs: one `{ id, value }` per row whose `field` changed.
 *
 * @param {Array<object>} rows The rows in their new sequence.
 * @param {string} field The order field.
 * @param {number} [start] The number of the first row (1, or the page's offset + 1).
 * @return {{rows: Array<object>, changes: Array<{id: string, value: number}>}} The renumbered rows and the writes.
 */
export function renumberRows(rows, field, start = 1) {
	const changes = []
	const out = (Array.isArray(rows) ? rows : []).map((row, index) => {
		const value = start + index
		if (row[field] === value) {
			return row
		}
		const id = rowIdOf(row)
		if (id !== '') {
			changes.push({ id, value })
		}
		return { ...row, [field]: value }
	})
	return { rows: out, changes }
}
