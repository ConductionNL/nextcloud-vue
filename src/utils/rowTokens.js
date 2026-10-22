/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@row.<field>` tokens: a value read off the row a list shows, for what a
 * list declares per row (a child list's link to its row, a row action's
 * target).
 *
 * @spec openspec/changes/object-list-children/specs/object-list-widget/spec.md#requirement-a-list-can-show-each-rows-child-records-under-it
 */
import { objectFieldValue } from './objectName.js'

const WHOLE_TOKEN = /^@row\.([A-Za-z0-9_.@-]+)$/
const INLINE_TOKEN = /@row\.([A-Za-z0-9_.@-]+)/g

/**
 * The row field a whole-value `@row.<field>` token names, or ''.
 *
 * @param {unknown} value A filter value.
 * @return {string} The field path.
 */
export function rowTokenField(value) {
	if (typeof value !== 'string') {
		return ''
	}
	const match = WHOLE_TOKEN.exec(value)
	return match ? match[1] : ''
}

/**
 * Whether a string carries an `@row.<field>` token anywhere.
 *
 * @param {unknown} value The string.
 * @return {boolean}
 */
export function hasRowTokens(value) {
	return typeof value === 'string' && value.includes('@row.')
}

/**
 * A field of a row. `id` reads the top-level id, else `@self.id`.
 *
 * @param {object} row The row.
 * @param {string} field The field path.
 * @return {unknown} The value.
 */
function rowValue(row, field) {
	if (field === 'id') {
		const id = row && (row.id ?? (row['@self'] && row['@self'].id))
		return id === undefined || id === null ? undefined : id
	}
	return objectFieldValue(row, field)
}

/**
 * Resolve `@row.<field>` tokens in a filter against a row. A whole-value
 * token keeps the value's type; other values pass through unchanged.
 *
 * @param {object} filter The filter.
 * @param {object} row The row.
 * @return {object} The resolved filter.
 */
export function resolveRowFilter(filter, row) {
	const out = {}
	for (const [key, value] of Object.entries(filter || {})) {
		const field = rowTokenField(value)
		out[key] = field === '' ? value : rowValue(row, field)
	}
	return out
}

/**
 * Replace every `@row.<field>` token in a string (a route or URL) with the
 * row's value, URI-encoded. A missing value becomes ''.
 *
 * @param {string} str The string.
 * @param {object} row The row.
 * @return {string} The resolved string.
 */
export function interpolateRowTokens(str, row) {
	if (typeof str !== 'string') {
		return str
	}
	return str.replace(INLINE_TOKEN, (_, field) => {
		const value = rowValue(row, field)
		return value === undefined || value === null ? '' : encodeURIComponent(String(value))
	})
}
