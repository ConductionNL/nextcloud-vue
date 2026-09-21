/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * The three list-layout keys a `folderSidebar` scope may carry.
 *
 * @type {string[]}
 */
const SCOPE_LAYOUT_KEYS = ['columns', 'defaultSort', 'searchFields']

/**
 * The key of a column entry, in either of the two shapes the manifest accepts:
 * a bare string (legacy shorthand) or a `{ key, label, ... }` object.
 *
 * @param {(string|object)} column A column entry.
 * @return {string} The column key, or '' when the entry carries none.
 */
export function columnKeyOf(column) {
	if (typeof column === 'string') {
		return column
	}
	if (column && typeof column.key === 'string') {
		return column.key
	}
	return ''
}

/**
 * Normalise one sort entry to the `{ key, order }` shape the fetch uses.
 * Accepts `key` or `field` because the page prop spells it `field` and the
 * manifest spells it `key`; an entry naming neither is dropped rather than
 * sent as an empty sort key.
 *
 * @param {object} entry A sort entry.
 * @return {({key: string, order: string}|null)} The normalised entry, or null.
 */
function normaliseSortEntry(entry) {
	if (!entry || typeof entry !== 'object') {
		return null
	}
	const key = typeof entry.key === 'string' && entry.key !== ''
		? entry.key
		: (typeof entry.field === 'string' ? entry.field : '')
	if (key === '') {
		return null
	}
	return { key, order: entry.order === 'desc' ? 'desc' : 'asc' }
}

/**
 * Normalise a `defaultSort` value, which may be a single entry or a list.
 *
 * @param {(object|object[]|undefined)} value The declared sort.
 * @return {Array<{key: string, order: string}>} The normalised sort keys.
 */
function normaliseSort(value) {
	if (value === undefined || value === null) {
		return []
	}
	const list = Array.isArray(value) ? value : [value]
	return list.map(normaliseSortEntry).filter(Boolean)
}

/**
 * Read one layout key from the scope entry, falling back to the schema row's
 * `x-index` block. A value declared on the folder entry WINS over the row's,
 * which is what makes the row a default rather than an override.
 *
 * @param {(object|null)} scope The folder entry for the active scope.
 * @param {(object|null)} row The schema row the folder derives from.
 * @param {string} key One of `columns`, `defaultSort`, `searchFields`.
 * @return {(Array|object|undefined)} The declared value, the row value, or undefined.
 */
function declaredOrRow(scope, row, key) {
	if (scope && scope[key] !== undefined) {
		return scope[key]
	}
	const carried = row && row['x-index']
	if (carried && typeof carried === 'object' && carried[key] !== undefined) {
		return carried[key]
	}
	return undefined
}

/**
 * Resolve the list layout a `folderSidebar` scope asks for.
 *
 * Two declarations meet here and they do not decide the same thing:
 *
 * - The PAGE decides MEMBERSHIP. `config.columns` is the set of columns this
 *   page has, and it carries each column's definition (label, formatter,
 *   widget). A scope may reorder that set and narrow it; it cannot add to it.
 *   A scope naming a column the page does not declare is DROPPED, so a scope
 *   written before a column was removed cannot bring the column back.
 * - The SCOPE decides PRESENTATION: which of the page's columns are shown, in
 *   what order, sorted by what, searched over what.
 *
 * The page declaring no columns at all is the one case where a scope's list is
 * taken as written: there is no declared set to measure it against, because the
 * columns are derived from the schema at runtime.
 *
 * @param {object} options Resolution inputs.
 * @param {(object|null)} [options.scope] The folder entry for the active scope.
 * @param {(object|null)} [options.row] The schema row the folder derives from.
 * @param {Array} [options.pageColumns] The page's declared `config.columns`.
 * @return {{columns: (Array|null), sortKeys: Array<{key: string, order: string}>, searchFields: string[]}}
 *   `columns` is null when neither source declares any, meaning the page's own
 *   list stands.
 */
export function resolveScopeLayout({ scope = null, row = null, pageColumns = [] } = {}) {
	const declaredColumns = declaredOrRow(scope, row, 'columns')
	const declaredSearch = declaredOrRow(scope, row, 'searchFields')
	const sortKeys = normaliseSort(declaredOrRow(scope, row, 'defaultSort'))

	const searchFields = Array.isArray(declaredSearch)
		? declaredSearch.filter((f) => typeof f === 'string' && f !== '')
		: []

	if (!Array.isArray(declaredColumns) || declaredColumns.length === 0) {
		return { columns: null, sortKeys, searchFields }
	}

	const page = Array.isArray(pageColumns) ? pageColumns : []
	if (page.length === 0) {
		return { columns: [...declaredColumns], sortKeys, searchFields }
	}

	const byKey = new Map()
	page.forEach((col) => {
		const key = columnKeyOf(col)
		if (key !== '') {
			byKey.set(key, col)
		}
	})

	const columns = []
	declaredColumns.forEach((col) => {
		const key = columnKeyOf(col)
		if (key === '' || !byKey.has(key)) {
			return
		}
		// The page's own entry is used, not the scope's, so the label and
		// formatter a column was declared with survive being selected.
		columns.push(byKey.get(key))
	})

	return { columns, sortKeys, searchFields }
}

export { SCOPE_LAYOUT_KEYS }
