/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pure helpers for the detail-page header field chips
 * (manifest `config.headerFields`).
 *
 * @spec openspec/changes/detail-header-field-chips/specs/detail-page-header/spec.md
 */

/** The renderers a header chip can use. */
export const HEADER_CHIP_FORMATS = Object.freeze(['text', 'mono', 'badge', 'user', 'date'])

/** The variants a colour name maps onto; anything else is neutral. */
const COLOR_VARIANTS = Object.freeze({
	success: 'success',
	warning: 'warning',
	error: 'error',
	info: 'info',
	primary: 'primary',
	neutral: 'default',
})

/**
 * Normalise `headerFields`: a string is `{ key }`, an object keeps its known
 * keys, and anything without a usable `key` or with an unknown `format` is
 * dropped. A repeated key keeps its first entry.
 *
 * @param {Array<string|object>|null|undefined} fields The declared entries.
 * @return {Array<{key: string, format: string, labelField: string, colorField: string, warnWhenPast: boolean}>} The usable entries, in order.
 */
export function normalizeHeaderFields(fields) {
	if (!Array.isArray(fields)) {
		return []
	}
	const seen = new Set()
	const out = []
	for (const entry of fields) {
		const raw = typeof entry === 'string' ? { key: entry } : entry
		if (!raw || typeof raw !== 'object' || typeof raw.key !== 'string' || raw.key === '' || seen.has(raw.key)) {
			continue
		}
		const format = raw.format === undefined ? 'text' : raw.format
		if (!HEADER_CHIP_FORMATS.includes(format)) {
			continue
		}
		seen.add(raw.key)
		out.push({
			key: raw.key,
			format,
			labelField: typeof raw.labelField === 'string' ? raw.labelField : '',
			colorField: typeof raw.colorField === 'string' ? raw.colorField : '',
			warnWhenPast: raw.warnWhenPast === true,
		})
	}
	return out
}

/**
 * Whether a field value has nothing to show.
 *
 * @param {*} value The raw value.
 * @return {boolean} True for null, undefined, an empty string or an empty array.
 */
export function isEmptyChipValue(value) {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * Map a colour name read off a referenced object onto a badge variant.
 *
 * @param {*} name The colour name (`success`, `warning`, `error`, `info`, `neutral`).
 * @return {string} A `CnStatusBadge` variant; `default` (neutral) when unknown.
 */
export function variantForColor(name) {
	const key = typeof name === 'string' ? name.trim().toLowerCase() : ''
	return COLOR_VARIANTS[key] || 'default'
}

/**
 * The display label of a referenced object: `labelField`, then `title`, then
 * `name`, then `@self.name`. A per-language map collapses to its first value.
 *
 * @param {object|null} obj The referenced object.
 * @param {string} [labelField] The preferred property.
 * @return {string} The label, or '' when none is usable.
 */
export function pickRefLabel(obj, labelField = '') {
	if (!obj || typeof obj !== 'object') {
		return ''
	}
	const candidates = [labelField ? obj[labelField] : undefined, obj.title, obj.name, obj['@self'] && obj['@self'].name]
	for (const raw of candidates) {
		if (typeof raw === 'string' && raw !== '') {
			return raw
		}
		if (typeof raw === 'number') {
			return String(raw)
		}
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
			const first = Object.values(raw).find((v) => typeof v === 'string' && v !== '')
			if (first) {
				return first
			}
		}
	}
	return ''
}

/**
 * Whether a date value lies before now.
 *
 * @param {*} value A date string, number or Date.
 * @param {number} [now] The current time in ms (injectable for tests).
 * @return {boolean} True when it parses and is in the past.
 */
export function isPastDate(value, now = Date.now()) {
	const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
	return !Number.isNaN(time) && time < now
}
