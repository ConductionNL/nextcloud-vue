/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rows a list shows, as a CSV file: one column per table column, headed by
 * its label. Used by an index page whose rows come from a named or endpoint
 * source, which has no server export of its own.
 *
 * @spec openspec/changes/index-named-source-export/specs/index-named-source-export/spec.md#requirement-a-named-source-list-downloads-its-rows
 */

/**
 * A value as the text of one CSV cell. A list joins its items, a record reads
 * its name, an empty value is an empty cell.
 *
 * @param {unknown} value The cell value.
 * @return {string} The cell text.
 */
export function cellText(value) {
	if (value === null || value === undefined) {
		return ''
	}
	if (Array.isArray(value)) {
		return value.map(cellText).filter((item) => item !== '').join('; ')
	}
	if (typeof value === 'object') {
		for (const key of ['title', 'name', 'label', 'displayName', 'id']) {
			if (value[key] !== undefined && value[key] !== null && typeof value[key] !== 'object') {
				return String(value[key])
			}
		}
		return JSON.stringify(value)
	}
	return String(value)
}

/**
 * One CSV field: quoted when it holds a separator, a quote or a line break,
 * and a leading `=`, `+`, `-` or `@` is neutralised with a `'` so a
 * spreadsheet does not read the cell as a formula.
 *
 * @param {string} text The cell text.
 * @return {string} The field.
 */
export function csvField(text) {
	let out = String(text)
	if (/^[=+\-@\t\r]/.test(out)) {
		out = `'${out}`
	}
	return /[",\r\n]/.test(out) ? `"${out.replace(/"/g, '""')}"` : out
}

/**
 * The value of a column in a row: a dotted key reads a nested field, a flat
 * key falls back to the row's `@self`, as the table reads it.
 *
 * @param {object} row The row.
 * @param {string} key The column key.
 * @return {unknown} The value.
 */
function columnValue(row, key) {
	if (key.includes('.')) {
		return key.split('.').reduce((obj, part) => obj?.[part], row)
	}
	if (row?.[key] === undefined && row?.['@self'] && typeof row['@self'] === 'object') {
		return row['@self'][key]
	}
	return row?.[key]
}

/**
 * The rows as CSV text, a header line of the column labels first. Columns
 * without a key (selection, row actions) are left out.
 *
 * @param {Array<object>} rows The rows.
 * @param {Array<{key: string, label?: string}>} columns The table columns.
 * @return {string} The CSV text, lines ended with CRLF.
 */
export function rowsToCsv(rows, columns) {
	const cols = (Array.isArray(columns) ? columns : [])
		.filter((col) => col && typeof col.key === 'string' && col.key !== '' && col.widget !== 'actions')
	const lines = [cols.map((col) => csvField(col.label || col.key)).join(',')]
	for (const row of Array.isArray(rows) ? rows : []) {
		lines.push(cols.map((col) => csvField(cellText(columnValue(row, col.key)))).join(','))
	}
	return lines.join('\r\n') + '\r\n'
}
