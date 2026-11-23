/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The choices a node's `select` field offers, in the `{id, label}` shape
 * NcSelect takes.
 *
 * A field gets its choices one of two ways. `optionsFrom` names a url the
 * owning app answers. `options` lists them in the form itself, for a short
 * fixed vocabulary that has no endpoint of its own. Both dialogs that render a
 * node's configForm read the same shapes through this module, so the two
 * cannot come to accept different ones.
 */

/**
 * Normalise rows into `{id, label}` options.
 *
 * Accepts plain strings and numbers, `{id, label}`, `{value, label}`, and
 * OpenRegister objects (uuid from `@self`, label from name or title). A row
 * without an id is dropped rather than shown as a blank option.
 *
 * @param {Array<unknown>} rows The raw rows.
 * @param {(label: string) => string} [translate] Applied to each declared label.
 * @return {Array<{id: string|number, label: string}>} The options.
 */
export function normaliseSelectOptions(rows, translate = (s) => s) {
	if (!Array.isArray(rows)) {
		return []
	}

	return rows.map((row) => {
		if (typeof row === 'string' || typeof row === 'number') {
			return { id: row, label: String(row) }
		}
		if (!row || typeof row !== 'object') {
			return { id: undefined, label: '' }
		}

		const id = row.id ?? row.value ?? row['@self']?.uuid ?? row.uuid
		const declared = row.label || row.name || row.title

		return { id, label: declared ? String(translate(declared)) : String(id) }
	}).filter((option) => option.id !== undefined && option.id !== null && option.id !== '')
}

/**
 * Whether a field declares its choices in the form itself.
 *
 * @param {object} field The field declaration.
 * @return {boolean} True for a `select` with an `options` list.
 */
export function hasStaticOptions(field) {
	return field?.type === 'select' && Array.isArray(field?.options)
}
