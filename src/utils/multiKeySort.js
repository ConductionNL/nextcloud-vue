/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Stable, type-aware multi-key sort for a declarative `defaultSort` spec.
 *
 * Used by CnIndexPage to apply a fixed presentation order (e.g. "group by
 * type, then name") to already-loaded rows when no explicit column sort is
 * active. Comparison per key: numbers numerically, dates by timestamp, and
 * everything else via locale-aware string compare. Empty values (null /
 * undefined / '') sort last regardless of direction.
 *
 * @module utils/multiKeySort
 */

/**
 * Read a (possibly dotted) field from a row, falling back to the OpenRegister
 * `@self` block — mirrors CnDataTable's `getCellValue` so a `defaultSort` on a
 * metadata field (e.g. `@self.created`, written as `created`) resolves.
 *
 * @param {object} row The row object.
 * @param {string} field The field key (supports dot notation).
 * @return {*} The value, or undefined.
 */
function readField(row, field) {
	if (!row || typeof field !== 'string') return undefined
	if (field.includes('.')) {
		return field.split('.').reduce((obj, k) => (obj == null ? undefined : obj[k]), row)
	}
	if (row[field] === undefined && row['@self'] && typeof row['@self'] === 'object') {
		return row['@self'][field]
	}
	return row[field]
}

/**
 * Whether a value is "empty" for sort purposes (always sorts last).
 *
 * @param {*} v The value.
 * @return {boolean}
 */
function isEmpty(v) {
	return v === null || v === undefined || v === ''
}

/**
 * Compare two raw values type-aware. Returns <0, 0, or >0.
 *
 * @param {*} a Left value.
 * @param {*} b Right value.
 * @return {number}
 */
function compareValues(a, b) {
	if (typeof a === 'number' && typeof b === 'number') return a - b

	// Numeric strings → numeric compare.
	const na = Number(a)
	const nb = Number(b)
	if (Number.isFinite(na) && Number.isFinite(nb) && String(a).trim() !== '' && String(b).trim() !== '') {
		if (na !== nb) return na - nb
	}

	// Date-like strings → timestamp compare.
	const ta = Date.parse(a)
	const tb = Date.parse(b)
	if (!Number.isNaN(ta) && !Number.isNaN(tb)
		&& /[-/:T]/.test(String(a)) && /[-/:T]/.test(String(b))) {
		if (ta !== tb) return ta - tb
	}

	return String(a).localeCompare(String(b))
}

/**
 * Return a new array sorted by the declarative multi-key `spec`.
 *
 * @param {object[]} rows The rows to sort (not mutated).
 * @param {Array<{field: string, order?: 'asc'|'desc'}>} spec Ordered sort keys.
 * @return {object[]} A new, sorted array (input returned as-is when spec is empty / invalid).
 */
export function multiKeySort(rows, spec) {
	if (!Array.isArray(rows) || !Array.isArray(spec) || spec.length === 0) {
		return Array.isArray(rows) ? rows : []
	}
	const keys = spec.filter((k) => k && typeof k.field === 'string')
	if (keys.length === 0) return rows
	// Decorate-sort-undecorate keeps the sort stable across engines.
	return rows
		.map((row, index) => ({ row, index }))
		.sort((x, y) => {
			for (const k of keys) {
				const va = readField(x.row, k.field)
				const vb = readField(y.row, k.field)
				// Empty values always sort last, independent of direction.
				const ea = isEmpty(va)
				const eb = isEmpty(vb)
				if (ea || eb) {
					if (ea && eb) continue
					return ea ? 1 : -1
				}
				const dir = k.order === 'desc' ? -1 : 1
				const cmp = compareValues(va, vb)
				if (cmp !== 0) return cmp * dir
			}
			return x.index - y.index
		})
		.map((d) => d.row)
}
