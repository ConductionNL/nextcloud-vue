/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Fill `@<root>.<path>` tokens in an action from the row it is drawn on
 * (`@item.id`, `@group.offerId`). A string that is exactly one token takes
 * the value as it is, so `"props": { "session": "@item" }` hands a dialog the
 * whole row and `"href": "@item.joinUrl"` a whole link. Inside a longer `url`,
 * `target` or `href` a value is URL-encoded.
 *
 * @module utils/itemTokens
 */
import { readPath } from './readPath.js'

const ENCODED_KEYS = ['url', 'target', 'href']

/**
 * The value a token names: the whole root (`@item`) or a path in it.
 *
 * @param {object} scope `{ <root>: object }`.
 * @param {string} root The root name.
 * @param {string|undefined} path The dot-path, or undefined for the root.
 * @return {unknown}
 */
function valueOf(scope, root, path) {
	const base = scope[root]
	return path ? readPath(base, path) : base
}

/**
 * Fill the tokens of `scope`'s roots in every string of a value.
 *
 * @param {unknown} value An action, or a part of it.
 * @param {object} scope `{ item, group, ... }`.
 * @param {string} [key] The key the value sits under.
 * @return {unknown} A copy with the tokens filled.
 */
export function fillItemTokens(value, scope, key = '') {
	const roots = Object.keys(scope || {}).join('|')
	if (roots === '') {
		return value
	}
	if (typeof value === 'string') {
		const whole = value.match(new RegExp(`^@(${roots})(?:\\.([\\w.]+))?$`))
		if (whole) {
			return valueOf(scope, whole[1], whole[2]) ?? null
		}
		const encode = ENCODED_KEYS.includes(key)
		return value.replace(new RegExp(`@(${roots})\\.([\\w.]+)`, 'g'), (match, root, path) => {
			const found = valueOf(scope, root, path)
			const text = found === undefined || found === null || typeof found === 'object' ? '' : String(found)
			return encode ? encodeURIComponent(text) : text
		})
	}
	if (Array.isArray(value)) {
		return value.map((entry) => fillItemTokens(entry, scope))
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([inner, entry]) => [inner, fillItemTokens(entry, scope, inner)]))
	}
	return value
}
