/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Resolve dynamic `@`-tokens inside a widget filter at FETCH time, so manifest
 * filters can express "relative to now / the current user" without baking a
 * fixed value. The widgets call this just before sending the filter to
 * OpenRegister.
 *
 * Supported tokens:
 *  - `@me`            → the current Nextcloud user id (`window.OC.currentUser`)
 *  - `@now`           → the current instant, ISO-8601
 *  - `@today`         → today at 00:00, `YYYY-MM-DD` (date-prefix comparable)
 *  - `@today±Nd`      → N days from today (e.g. `@today-7d`, `@today+30d`)
 *  - `@monthStart`    → first day of the current month, `YYYY-MM-DD`
 *
 * @module utils/resolveFilterTokens
 */

/**
 * Format a Date as `YYYY-MM-DD` (local).
 *
 * @param {Date} d The date.
 * @return {string} The date-only string.
 */
function ymd(d) {
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${m}-${day}`
}

/**
 * Resolve a single filter value if it is a dynamic `@`-token, else pass through.
 *
 * @param {*} v The candidate value.
 * @return {*} The resolved value.
 */
export function resolveFilterValue(v) {
	if (typeof v !== 'string' || v.charAt(0) !== '@') return v
	const now = new Date()
	if (v === '@me') {
		return (typeof window !== 'undefined' && window.OC && window.OC.currentUser) || ''
	}
	if (v === '@now') return now.toISOString()
	if (v === '@today') {
		const d = new Date(now)
		d.setHours(0, 0, 0, 0)
		return ymd(d)
	}
	if (v === '@monthStart') {
		return ymd(new Date(now.getFullYear(), now.getMonth(), 1))
	}
	const m = v.match(/^@today([+-]\d+)d$/)
	if (m) {
		const d = new Date(now)
		d.setHours(0, 0, 0, 0)
		d.setDate(d.getDate() + Number(m[1]))
		return ymd(d)
	}
	return v
}

/**
 * Resolve every dynamic `@`-token in a filter map (equality + operator shapes).
 *
 * @param {object} filter The filter map (`{ field: value | { op: value } }`).
 * @return {object} A new filter map with tokens resolved.
 */
export function resolveFilterTokens(filter) {
	if (!filter || typeof filter !== 'object') return filter
	const out = {}
	for (const [k, v] of Object.entries(filter)) {
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			const inner = {}
			for (const [op, ov] of Object.entries(v)) inner[op] = resolveFilterValue(ov)
			out[k] = inner
		} else {
			out[k] = resolveFilterValue(v)
		}
	}
	return out
}
