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
 * @return {unknown} The value, or undefined.
 */
function readField(row, field) {
	if (!row || typeof field !== 'string') {
		return undefined
	}
	if (field.includes('.')) {
		return field.split('.').reduce((obj, k) => (obj === null || obj === undefined ? undefined : obj[k]), row)
	}
	if (row[field] === undefined && row['@self'] && typeof row['@self'] === 'object') {
		return row['@self'][field]
	}
	return row[field]
}

/**
 * Whether a value is "empty" for sort purposes (always sorts last).
 *
 * @param {unknown} v The value.
 * @return {boolean}
 */
function isEmpty(v) {
	return v === null || v === undefined || v === ''
}

/**
 * Compare two raw values type-aware. Returns <0, 0, or >0.
 *
 * @param {unknown} a Left value.
 * @param {unknown} b Right value.
 * @return {number}
 */
function compareValues(a, b) {
	if (typeof a === 'number' && typeof b === 'number') {
		return a - b
	}

	// Numeric strings → numeric compare.
	const na = Number(a)
	const nb = Number(b)
	if (Number.isFinite(na) && Number.isFinite(nb) && String(a).trim() !== '' && String(b).trim() !== '') {
		if (na !== nb) {
			return na - nb
		}
	}

	// Date-like strings → timestamp compare.
	const ta = Date.parse(a)
	const tb = Date.parse(b)
	if (!Number.isNaN(ta) && !Number.isNaN(tb)
		&& /[-/:T]/.test(String(a)) && /[-/:T]/.test(String(b))) {
		if (ta !== tb) {
			return ta - tb
		}
	}

	return String(a).localeCompare(String(b))
}

/**
 * Compare two values against a declared order of levels.
 *
 * A priority reads high, medium, low, and none of those sort alphabetically
 * into the order a person means. A key carrying `levels` is compared by
 * position in that list instead. A value the list does not name is treated as
 * unranked and sorts after every named one, in both directions, for the same
 * reason an empty value does: a row nobody ranked must not push the ranked
 * ones out of sight.
 *
 * @param {unknown} a Left value.
 * @param {unknown} b Right value.
 * @param {string[]} levels The declared order, lowest first.
 * @return {number}
 */
function compareLevels(a, b, levels) {
	const ia = levels.indexOf(String(a))
	const ib = levels.indexOf(String(b))
	if (ia === -1 || ib === -1) {
		if (ia === ib) {
			return 0
		}
		return ia === -1 ? 1 : -1
	}
	return ia - ib
}

/**
 * Return a new array sorted by the declarative multi-key `spec`.
 *
 * @param {object[]} rows The rows to sort (not mutated).
 * @param {Array<{field: string, order?: 'asc'|'desc', levels?: string[]}>} spec Ordered sort keys. `levels` declares the order of a ranked field (lowest first), for a value like a priority that does not sort alphabetically.
 * @return {object[]} A new, sorted array (input returned as-is when spec is empty / invalid).
 */
export function multiKeySort(rows, spec) {
	if (!Array.isArray(rows) || !Array.isArray(spec) || spec.length === 0) {
		return Array.isArray(rows) ? rows : []
	}
	const keys = spec.filter((k) => k && typeof k.field === 'string')
	if (keys.length === 0) {
		return rows
	}
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
					if (ea && eb) {
						continue
					}
					return ea ? 1 : -1
				}
				const dir = k.order === 'desc' ? -1 : 1
				const ranked = Array.isArray(k.levels) && k.levels.length > 0
				if (ranked) {
					// A value outside the declared levels is unranked, and sorts
					// last whichever way the column is pointing, like an empty
					// one. Multiplying that by the direction would float it to
					// the top on a descending sort.
					const ua = k.levels.indexOf(String(va)) === -1
					const ub = k.levels.indexOf(String(vb)) === -1
					if (ua !== ub) {
						return ua ? 1 : -1
					}
					if (!ua && !ub) {
						const lvl = compareLevels(va, vb, k.levels)
						if (lvl !== 0) {
							return lvl * dir
						}
						continue
					}
					continue
				}
				const cmp = compareValues(va, vb)
				if (cmp !== 0) {
					return cmp * dir
				}
			}
			return x.index - y.index
		})
		.map((d) => d.row)
}
