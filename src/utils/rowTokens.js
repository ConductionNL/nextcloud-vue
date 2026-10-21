/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * rowTokens: fill the tokens that read the row a row action runs on.
 *
 * @module utils/rowTokens
 */

import { readPath } from './readPath.js'

/** The action keys whose values may carry row tokens. */
export const ROW_TOKEN_KEYS = Object.freeze(['target', 'url', 'payload', 'params', 'props', 'query', 'filename'])

/** The keys that are URLs, so a row value filled into them is URL-encoded. */
const URL_KEYS = Object.freeze(['target', 'url'])

const ROW_TOKEN = /@row\.([A-Za-z_][\w.@]*)|\{(?!objectId\})([A-Za-z_@][\w.@]*)\}/g
const HAS_ROW_TOKEN = /@row\.[A-Za-z_]|\{(?!objectId\})[A-Za-z_@][\w.@]*\}/

/**
 * Read a row field as text; a missing or non-scalar value reads as ''.
 *
 * @param {object} row The row.
 * @param {string} path Dot-path into the row.
 * @return {string} The text.
 */
function rowText(row, path) {
	const value = readPath(row, path)
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
}

/**
 * Fill `@row.<field>` and `{field}` (dot paths) from the row, in a string or,
 * recursively, in the strings of an object or array. `{objectId}` and the
 * page's `@`-tokens are left for the page context.
 *
 * With `encode` each filled value is URL-encoded, for a value that lands in
 * a URL (an object URL holds `?` and `&`).
 *
 * @spec openspec/changes/object-list-row-tokens/specs/object-list/spec.md#requirement-a-row-action-can-read-its-row
 * @param {unknown} value The value.
 * @param {object} row The row.
 * @param {{encode?: boolean}} [options] `encode`: URL-encode each filled value.
 * @return {unknown} The value with the row's fields filled in.
 */
export function fillRowTokens(value, row, options = {}) {
	if (typeof value === 'string') {
		return value.replace(ROW_TOKEN, (_match, rowPath, bracePath) => {
			const text = rowText(row, rowPath || bracePath)
			return options.encode ? encodeURIComponent(text) : text
		})
	}
	if (Array.isArray(value)) {
		return value.map((item) => fillRowTokens(item, row, options))
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillRowTokens(item, row, options)]))
	}
	return value
}

/**
 * Whether a value carries a row token anywhere in its strings.
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
export function hasRowTokens(value) {
	if (typeof value === 'string') {
		return HAS_ROW_TOKEN.test(value)
	}
	if (Array.isArray(value)) {
		return value.some(hasRowTokens)
	}
	if (value && typeof value === 'object') {
		return Object.values(value).some(hasRowTokens)
	}
	return false
}

/**
 * An action with the row filled into the keys that may carry row tokens
 * (`target`, `url`, `payload`, `params`, `props`, `query`, `filename`). A
 * value filled into `target` or `url` is URL-encoded; a `query` value is not,
 * because the router encodes it.
 *
 * @param {object} action The declared action.
 * @param {object} row The row.
 * @return {object} A copy of the action, or the action itself without row tokens.
 */
export function actionForRow(action, row) {
	if (!action || typeof action !== 'object' || !row) {
		return action
	}
	let out = action
	for (const key of ROW_TOKEN_KEYS) {
		if (action[key] !== undefined && hasRowTokens(action[key])) {
			if (out === action) {
				out = { ...action }
			}
			out[key] = fillRowTokens(action[key], row, { encode: URL_KEYS.includes(key) })
		}
	}
	return out
}
