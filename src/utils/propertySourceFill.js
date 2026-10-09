/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Helpers for the `config.fill` map of a registry-backed form field
 * (`x-openregister-property-source`): read a value from a resolved answer,
 * test emptiness, and split a fill into "write now" and "ask first".
 *
 * @spec openspec/changes/form-field-property-source/tasks.md#task-3
 */

/**
 * Split a source path into key and index segments (`a.b[0].c`).
 *
 * @param {string} path Dot and `[n]` path.
 * @return {Array<string|number>} The segments.
 */
function segments(path) {
	const out = []
	String(path).split('.').forEach((part) => {
		const m = part.match(/^([^[\]]*)((?:\[\d+\])*)$/)
		if (!m) {
			out.push(part)
			return
		}
		if (m[1] !== '') {
			out.push(m[1])
		}
		for (const idx of m[2].matchAll(/\[(\d+)\]/g)) {
			out.push(Number(idx[1]))
		}
	})
	return out
}

/**
 * Read a path from a resolved value. A path starting with `=` is a literal.
 *
 * @param {*}      source The resolved value.
 * @param {string} path   Dot and `[n]` path, or `=literal`.
 * @return {*} The value, or undefined when the path leads nowhere.
 */
export function readSourcePath(source, path) {
	if (typeof path !== 'string' || path === '') {
		return undefined
	}
	if (path.startsWith('=')) {
		return path.slice(1)
	}
	let cur = source
	for (const seg of segments(path)) {
		if (cur === null || cur === undefined || typeof cur !== 'object') {
			return undefined
		}
		cur = cur[seg]
	}
	return cur
}

/**
 * Whether a form value counts as empty (undefined, null, empty string or empty array).
 *
 * @param {*} value The value to test.
 * @return {boolean}
 */
export function isEmptyFillTarget(value) {
	return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * Read a dotted key (`address.street`) from form data.
 *
 * @param {object} data Form data.
 * @param {string} key  Plain or dotted key.
 * @return {*} The value.
 */
export function getDotted(data, key) {
	if (data && Object.hasOwn(data, key)) {
		return data[key]
	}
	return String(key).split('.').reduce((cur, k) => (cur !== null && cur !== undefined && typeof cur === 'object' ? cur[k] : undefined), data)
}

/**
 * Plan a fill: which targets are written now and which hold a different value.
 *
 * @param {object} fill     The `config.fill` map `{targetKey: sourcePath}`.
 * @param {*}      resolved The resolved value from the source.
 * @param {object} data     Current form data.
 * @param {Function} [isKnown] Whether a target key is a field of the form (default: all).
 * @return {{apply: Array<{key: string, value: *}>, conflicts: Array<{key: string, oldValue: *, newValue: *}>}}
 */
export function planPropertySourceFill(fill, resolved, data, isKnown = () => true) {
	const apply = []
	const conflicts = []
	if (!fill || typeof fill !== 'object') {
		return { apply, conflicts }
	}
	for (const key of Object.keys(fill)) {
		const value = readSourcePath(resolved, fill[key])
		if (value === undefined || value === null) {
			continue
		}
		if (!isKnown(key)) {
			// eslint-disable-next-line no-console
			console.debug(`property-source fill: "${key}" is not a field of this form`)
			continue
		}
		const current = getDotted(data, key)
		if (isEmptyFillTarget(current)) {
			apply.push({ key, value })
		} else if (JSON.stringify(current) !== JSON.stringify(value)) {
			conflicts.push({ key, oldValue: current, newValue: value })
		}
	}
	return { apply, conflicts }
}
