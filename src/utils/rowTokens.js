/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

const ROW_TOKEN = /@row\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g

/**
 * Read a dot path off a row.
 *
 * @param {object} row The row.
 * @param {string} path The dot path.
 * @return {unknown} The value, or undefined.
 */
function readRowPath(row, path) {
	return path.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), row)
}

/**
 * Fill the `@row.<field>` tokens of a value from a row, at any depth. A
 * string that is one whole token takes the field's value as it is (a number
 * stays a number); a token inside a longer string is written into it, empty
 * when the row has no such field.
 *
 * @param {unknown} value A string, or an object or array holding strings.
 * @param {object|null} row The row an action runs on.
 * @return {unknown} The value with the row's fields filled in.
 */
export function resolveRowTokens(value, row) {
	if (!row || typeof row !== 'object') {
		return value
	}
	if (typeof value === 'string') {
		if (value.indexOf('@row.') === -1) {
			return value
		}
		const whole = value.match(/^@row\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)$/)
		if (whole) {
			return readRowPath(row, whole[1])
		}
		return value.replace(ROW_TOKEN, (_, path) => {
			const v = readRowPath(row, path)
			return v === undefined || v === null ? '' : String(v)
		})
	}
	if (Array.isArray(value)) {
		return value.map((item) => resolveRowTokens(item, row))
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRowTokens(v, row)]))
	}
	return value
}

/**
 * The fields of a row action that may name fields of its row.
 *
 * @type {string[]}
 */
const ROW_ACTION_FIELDS = ['url', 'filename', 'target', 'payload', 'params', 'props']

/**
 * A row action with every `@row.<field>` token in its url, filename, target,
 * payload, params and props filled from the row. An action without such
 * tokens is returned unchanged.
 *
 * @param {object} action The action.
 * @param {object|null} row The row it runs on.
 * @return {object} The action for that row.
 */
export function actionForRow(action, row) {
	if (!action || !row || JSON.stringify(action).indexOf('@row.') === -1) {
		return action
	}
	const out = { ...action }
	for (const key of ROW_ACTION_FIELDS) {
		if (out[key] !== undefined) {
			out[key] = resolveRowTokens(out[key], row)
		}
	}
	return out
}
