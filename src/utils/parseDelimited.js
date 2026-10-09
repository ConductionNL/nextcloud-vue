// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Parse CSV/TSV text into rows, stopping after `maxRows` rows.
 *
 * Handles quoted cells, doubled quotes and newlines inside quotes. `balanced`
 * is false when a quote is left open at the end, which the preview reports as
 * "could not be read as a table".
 *
 * @param {string} text The text to parse.
 * @param {string} [delimiter] The cell delimiter (`,` or a tab).
 * @param {number} [maxRows] Stop after this many rows (the header counts).
 * @return {{ rows: string[][], balanced: boolean, truncated: boolean }} The rows read.
 */
export function parseDelimited(text, delimiter = ',', maxRows = 101) {
	const rows = []
	let row = []
	let cell = ''
	let inQuotes = false
	let truncated = false
	const src = String(text ?? '')

	for (let i = 0; i < src.length; i++) {
		const ch = src[i]
		if (inQuotes) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					cell += '"'
					i++
				} else {
					inQuotes = false
				}
			} else {
				cell += ch
			}
			continue
		}
		if (ch === '"' && cell === '') {
			inQuotes = true
		} else if (ch === delimiter) {
			row.push(cell)
			cell = ''
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && src[i + 1] === '\n') {
				i++
			}
			row.push(cell)
			cell = ''
			rows.push(row)
			row = []
			if (rows.length >= maxRows) {
				truncated = i < src.length - 1
				return { rows, balanced: true, truncated }
			}
		} else {
			cell += ch
		}
	}
	if (cell !== '' || row.length > 0) {
		row.push(cell)
		rows.push(row)
	}
	return { rows, balanced: !inQuotes, truncated }
}
