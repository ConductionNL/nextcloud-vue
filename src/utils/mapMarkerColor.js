/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * mapMarkerColor — the colour of an index map's marker, read from a field of
 * its row (`mapConfig.markerColor`).
 *
 * ```json
 * "markerColor": {
 *   "field": "status",
 *   "colorMap": { "open": "#0b71ab", "closed": "var(--nl-color-grey, #696969)" },
 *   "source": { "schema": "statusType", "colorField": "colour" },
 *   "default": "#696969"
 * }
 * ```
 *
 * Without `source` the field's value is looked up in `colorMap`. With
 * `source` the field holds a reference: the referenced row's `colorField`
 * is the colour, or the key `colorMap` maps to one ("blue" -> a CSS colour).
 * A value nothing maps to gets `default`, else no colour (the map's own).
 *
 * @module utils/mapMarkerColor
 */

import { refIdOf } from './boardReferenceColumns.js'

/** A colour that can go into a style or an SVG attribute: no quotes, no `;`, no `url(`. */
const SAFE_COLOR = /^(?!.*url\()[#a-zA-Z0-9(),.%\s_-]{1,120}$/

/**
 * The `markerColor` block in a usable shape, or null when it names no field.
 *
 * @param {unknown} cfg The configured block.
 * @return {{field: string, colorMap: object, source: (object|null), fallback: string}|null} The block.
 */
export function normalizeMarkerColor(cfg) {
	if (!cfg || typeof cfg !== 'object' || typeof cfg.field !== 'string' || cfg.field === '') {
		return null
	}
	const source = cfg.source && typeof cfg.source === 'object' && typeof cfg.source.colorField === 'string' ? cfg.source : null
	return {
		field: cfg.field,
		colorMap: cfg.colorMap && typeof cfg.colorMap === 'object' ? cfg.colorMap : {},
		source,
		fallback: typeof cfg.default === 'string' ? cfg.default : '',
	}
}

/**
 * Read a dotted path off a row, also under `@self`.
 *
 * @param {object} row The row.
 * @param {string} path The path.
 * @return {unknown} The value.
 */
function valueAt(row, path) {
	const read = (base) => path.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), base)
	const direct = read(row)
	return direct === undefined && row && row['@self'] ? read(row['@self']) : direct
}

/**
 * The marker colour of one row.
 *
 * @param {object} row The row.
 * @param {object|null} cfg The normalised block (see {@link normalizeMarkerColor}).
 * @param {Map<string, object>} [refsById] The source rows by id, when `cfg.source` is set.
 * @return {string} A CSS colour, or '' for the map's own.
 */
export function markerColorOf(row, cfg, refsById) {
	if (!cfg || !row) {
		return ''
	}
	const raw = valueAt(row, cfg.field)
	let key = ''
	if (cfg.source) {
		const ref = refsById && refsById.get(refIdOf(raw))
		key = ref ? String(ref[cfg.source.colorField] ?? '') : ''
	} else if (raw !== null && raw !== undefined && typeof raw !== 'object') {
		key = String(raw)
	}
	let color
	if (key !== '' && Object.hasOwn(cfg.colorMap, key)) {
		color = String(cfg.colorMap[key])
	} else if (key !== '' && cfg.source) {
		color = key
	} else {
		color = cfg.fallback
	}
	return SAFE_COLOR.test(color) ? color : ''
}

/**
 * Resolve `var(--name, fallback)` to a concrete colour, for an SVG
 * attribute, where a custom property does not resolve.
 *
 * @param {string} color The colour.
 * @param {Element} [root] The element whose custom properties count.
 * @return {string} The colour without `var()`, or the input when it has none.
 */
export function resolveCssColor(color, root) {
	const match = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(String(color || '').trim())
	if (!match) {
		return color
	}
	let value
	try {
		const el = root || (typeof document !== 'undefined' ? document.documentElement : null)
		value = el && typeof getComputedStyle === 'function' ? getComputedStyle(el).getPropertyValue(match[1]).trim() : ''
	} catch {
		value = ''
	}
	if (value !== '') {
		return value
	}
	return match[2] ? resolveCssColor(match[2].trim(), root) : ''
}
