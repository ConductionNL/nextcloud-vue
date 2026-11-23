/**
 * Reading an import file in the browser before it is uploaded: its columns,
 * its row count, a column-to-field mapping and the file rewritten to that
 * mapping. CSV and JSON (an array of objects) are read; other formats
 * (Excel) are uploaded as they are. A CSV is read line by line, so a quoted
 * cell that spans several lines is not supported.
 */

/**
 * The delimiter of a CSV header line: `;` when it has more of those than
 * commas, else `,`.
 *
 * @param {string} line The first line of the file.
 * @return {string} The delimiter.
 */
export function csvDelimiter(line) {
	const semi = (line.match(/;/g) || []).length
	const comma = (line.match(/,/g) || []).length
	return semi > comma ? ';' : ','
}

/**
 * Split one CSV line into cells, honouring double quotes.
 *
 * @param {string} line One line of the file.
 * @param {string} delimiter The delimiter.
 * @return {string[]} The cells, unquoted.
 */
export function splitCsvLine(line, delimiter) {
	const cells = []
	let cell = ''
	let quoted = false
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') {
				cell += '"'
				i++
			} else if (ch === '"') {
				quoted = false
			} else {
				cell += ch
			}
		} else if (ch === '"') {
			quoted = true
		} else if (ch === delimiter) {
			cells.push(cell)
			cell = ''
		} else {
			cell += ch
		}
	}
	cells.push(cell)
	return cells
}

/**
 * Quote a CSV cell when it needs it.
 *
 * @param {string} value The cell.
 * @param {string} delimiter The delimiter.
 * @return {string} The cell as written.
 */
function quoteCell(value, delimiter) {
	const text = String(value ?? '')
	if (text.includes('"') || text.includes(delimiter) || text.includes('\n')) {
		return '"' + text.replace(/"/g, '""') + '"'
	}
	return text
}

/**
 * The lines of a CSV text, without a trailing empty line.
 *
 * @param {string} text The file's text.
 * @return {string[]} The lines.
 */
function csvLines(text) {
	const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
	while (lines.length && lines[lines.length - 1].trim() === '') {
		lines.pop()
	}
	return lines
}

/**
 * The columns and the row count of an import file.
 *
 * @param {string} text The file's text.
 * @param {string} ext The file extension, lower case (`csv` or `json`).
 * @return {{ columns: string[], rows: number }|null} Null when the format is
 *   not read in the browser or the file does not parse.
 */
export function readImportColumns(text, ext) {
	if (ext === 'csv') {
		const lines = csvLines(text)
		if (lines.length === 0) {
			return null
		}
		const columns = splitCsvLine(lines[0], csvDelimiter(lines[0])).map((c) => c.trim())
		return { columns, rows: lines.length - 1 }
	}
	if (ext === 'json') {
		let data
		try {
			data = JSON.parse(text)
		} catch {
			return null
		}
		if (!Array.isArray(data)) {
			return null
		}
		const columns = []
		for (const row of data) {
			if (row && typeof row === 'object' && !Array.isArray(row)) {
				for (const key of Object.keys(row)) {
					if (!columns.includes(key)) {
						columns.push(key)
					}
				}
			}
		}
		return { columns, rows: data.length }
	}
	return null
}

/**
 * Lower case, without spaces, dashes or underscores, for matching a column to
 * a field.
 *
 * @param {string} text A column or field name.
 * @return {string} The comparable form.
 */
function plain(text) {
	return String(text || '').toLowerCase().replace(/[\s_-]+/g, '')
}

/**
 * Map each column to the field with the same key or label, or to `''` (not
 * used).
 *
 * @param {string[]} columns The file's columns.
 * @param {Array<{ key: string, label?: string }>} fields The fields a row can fill.
 * @return {Object<string, string>} Column name to field key, `''` when none matches.
 */
export function autoMapColumns(columns, fields) {
	const mapping = {}
	for (const column of columns) {
		const match = fields.find((f) => plain(f.key) === plain(column) || (f.label && plain(f.label) === plain(column)))
		mapping[column] = match ? match.key : ''
	}
	return mapping
}

/**
 * Whether a mapping changes anything: a column renamed or left out.
 *
 * @param {Object<string, string>} mapping Column to field key.
 * @return {boolean} True when the file has to be rewritten before upload.
 */
export function mappingChangesFile(mapping) {
	return Object.entries(mapping).some(([column, key]) => column !== key)
}

/**
 * The file's text with its columns renamed to their fields and the unused
 * columns left out.
 *
 * @param {string} text The file's text.
 * @param {string} ext The file extension (`csv` or `json`).
 * @param {Object<string, string>} mapping Column to field key; `''` leaves the column out.
 * @return {string} The rewritten text.
 */
export function applyColumnMapping(text, ext, mapping) {
	if (ext === 'json') {
		const data = JSON.parse(text)
		return JSON.stringify(data.map((row) => {
			const out = {}
			for (const [column, value] of Object.entries(row || {})) {
				if (mapping[column]) {
					out[mapping[column]] = value
				}
			}
			return out
		}))
	}
	const lines = csvLines(text)
	const delimiter = csvDelimiter(lines[0])
	const header = splitCsvLine(lines[0], delimiter).map((c) => c.trim())
	const keep = header.map((column) => mapping[column] || '')
	return lines.map((line, index) => {
		const cells = index === 0 ? keep : splitCsvLine(line, delimiter)
		return cells.filter((_, i) => keep[i] !== '').map((c) => quoteCell(c, delimiter)).join(delimiter)
	}).join('\n') + '\n'
}
