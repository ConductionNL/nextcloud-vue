/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * How many indicators a row shows before the rest move into the row menu.
 * Four hundred cases are triaged by glancing, and a row of nine icons is not
 * glanceable.
 *
 * @type {number}
 */
export const DEFAULT_ROW_INDICATOR_CAP = 3

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
 * Whether one declared indicator applies to a row.
 *
 * The grammar is deliberately three words wide: `equals`, `in`, and truthiness
 * when neither is given. A condition a reader cannot evaluate in their head is
 * a condition nobody can check against the icon it draws.
 *
 * @param {object} indicator The declared indicator.
 * @param {object} row The row.
 * @return {boolean} True when the indicator applies.
 */
export function indicatorApplies(indicator, row) {
	if (!indicator || typeof indicator !== 'object' || typeof indicator.field !== 'string') {
		return false
	}
	const value = atPath(row, indicator.field)
	if (indicator.equals !== undefined) {
		return value === indicator.equals
	}
	if (Array.isArray(indicator.in)) {
		return indicator.in.includes(value)
	}
	return Boolean(value)
}

/**
 * The text alternative an indicator renders with. An indicator without one is
 * not rendered at all, because an icon with no text is colour and shape alone,
 * which is exactly what this feature exists to avoid.
 *
 * @param {object} indicator The declared indicator.
 * @return {string} The text, or ''.
 */
export function indicatorText(indicator) {
	if (!indicator || typeof indicator !== 'object') {
		return ''
	}
	return typeof indicator.text === 'string' ? indicator.text.trim() : ''
}

/**
 * Resolve the indicators a row shows, and the ones that did not fit.
 *
 * Membership belongs to the page: an indicator renders only when the page
 * declares it and its condition holds on this row. Presentation belongs to the
 * page too, in order: the declared order is the rendered order, and the cap
 * decides where the row stops and the row menu starts. Nothing the record
 * carries adds an indicator the page has not declared.
 *
 * @param {Array<object>} indicators The page's declared indicators, in order.
 * @param {object} row The row.
 * @param {number} [cap] How many render on the row itself.
 * @return {{shown: Array<object>, overflow: Array<object>}}
 */
export function resolveRowIndicators(indicators, row, cap = DEFAULT_ROW_INDICATOR_CAP) {
	const declared = Array.isArray(indicators) ? indicators : []
	const active = declared.filter((indicator) => indicatorText(indicator) !== '' && indicatorApplies(indicator, row))
	const limit = Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_ROW_INDICATOR_CAP
	return { shown: active.slice(0, limit), overflow: active.slice(limit) }
}
