/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Putting the saved row back is NOT here. `CnIndexPage` already writes a saved
 * record onto its row through `splitRowPatches` / `applyRowPatches`, which is
 * what keeps the list's scroll, its selection and its page. A second way to do
 * the same thing would be a second thing to keep in step with it.
 */

/**
 * Read a dotted path off a row without throwing on a missing segment.
 *
 * @param {object} row The row.
 * @param {string} path A dotted path.
 * @return {(Array|object|string|number|boolean|undefined)} The value.
 */
function atPath(row, path) {
	if (!row || typeof path !== 'string' || path === '') {
		return undefined
	}
	return path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), row)
}

/**
 * The fields of a quick edit this caller may write.
 *
 * The page decides which fields the quick edit asks for at all. The record
 * decides which of those this caller may change. A field outside the page's
 * list is never editable however the record reads, so a record cannot open a
 * form on a field the page did not put there.
 *
 * A row carrying nothing at `writableField` is a server that does not answer
 * about field permissions, and every field the page named stays editable. A
 * server that does answer is believed: an empty list means nothing may be
 * written, which is a refusal, not a silence.
 *
 * @param {object} row The row.
 * @param {string[]} fields The fields the page named.
 * @param {string} [writableField] Where the record lists its writable fields.
 * @return {string[]} The writable fields, in the page's order.
 */
export function writableQuickEditFields(row, fields, writableField = '@self.writableFields') {
	const named = Array.isArray(fields) ? fields : []
	const declared = atPath(row, writableField)
	if (!Array.isArray(declared)) {
		return [...named]
	}
	const allowed = new Set(declared.map(String))
	return named.filter((field) => allowed.has(field))
}

/**
 * The patch a quick edit writes: the fields the page named, that this caller
 * may write, whose value actually changed.
 *
 * Sending back a field nobody touched is how a save loses a value somebody
 * else wrote between the list loading and this form opening.
 *
 * @param {object} row The row as the form opened on it.
 * @param {object} data The form's data.
 * @param {string[]} fields The fields the page named.
 * @param {string} [writableField] Where the record lists its writable fields.
 * @return {object} The patch.
 */
export function quickEditPatch(row, data, fields, writableField = '@self.writableFields') {
	const source = data && typeof data === 'object' ? data : {}
	const patch = {}
	writableQuickEditFields(row, fields, writableField).forEach((field) => {
		if (!Object.hasOwn(source, field)) {
			return
		}
		const before = row ? row[field] : undefined
		if (JSON.stringify(source[field]) !== JSON.stringify(before)) {
			patch[field] = source[field]
		}
	})
	return patch
}

/**
 * The fields a colleague changed under this edit.
 *
 * Only a field this person is writing counts: a colleague changing a field
 * nobody here touched is not a conflict, and stopping the save for it would
 * teach people to click through the warning.
 *
 * @param {object} opened The row as the form opened on it.
 * @param {object} server The row as the server holds it now.
 * @param {object} patch The patch this person is writing.
 * @return {Array<{field: string, label: string, mine: (string|number|boolean|Array|object|null|undefined), theirs: (string|number|boolean|Array|object|null|undefined)}>}
 */
export function conflictingFields(opened, server, patch) {
	const now = server && typeof server === 'object' ? server : {}
	const mine = patch && typeof patch === 'object' ? patch : {}
	return Object.keys(mine)
		.filter((field) => JSON.stringify(now[field]) !== JSON.stringify(opened ? opened[field] : undefined))
		.map((field) => ({
			field,
			label: field,
			mine: mine[field],
			theirs: now[field],
		}))
}
