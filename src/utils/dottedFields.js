/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Form fields at a dotted path (`handling.teams`): one key inside an object
 * property. While the form is open the value sits under the dotted key, so
 * every widget reads and writes it like any other field; the payload puts it
 * back inside its object, next to the keys of that object the form does not
 * show.
 *
 * @module utils/dottedFields
 * @spec openspec/changes/forms-dotted-path-fields/specs/form-dialog/spec.md#requirement-a-field-can-edit-one-key-inside-an-object-property
 */

import { readPath } from './readPath.js'

/**
 * Whether a field key is a dotted path.
 *
 * @param {unknown} key The key.
 * @return {boolean} True for `a.b`.
 */
export function isDottedKey(key) {
	return typeof key === 'string' && key.includes('.') && !key.startsWith('.') && !key.endsWith('.')
}

/**
 * Form values with each dotted field's value read from its object.
 *
 * @param {object} data The form values (an object as loaded, or create defaults).
 * @param {Array<{key: string}>} fields The form's fields.
 * @return {object} The values, with dotted keys filled where the object holds a value.
 */
export function spreadDottedFields(data, fields) {
	const out = { ...(data || {}) }
	for (const field of fields || []) {
		if (!field || !isDottedKey(field.key)) {
			continue
		}
		const value = readPath(out, field.key)
		if (value !== undefined) {
			out[field.key] = value
		}
	}
	return out
}

/**
 * A payload with each dotted field's value put back inside its object. The
 * object keeps every other key it held, so a save of `handling.teams` does not
 * clear `handling.deadline`. An optional object switched off (its own field is
 * an `object-switch` and holds null) stays null: its dotted fields are dropped.
 *
 * @param {object} payload The form values.
 * @param {Array<{key: string}>} fields The form's fields.
 * @return {object} The payload without dotted keys.
 */
export function foldDottedFields(payload, fields) {
	const out = { ...(payload || {}) }
	const switchedOff = new Set((fields || [])
		.filter((field) => field && field.widget === 'object-switch' && out[field.key] === null)
		.map((field) => field.key))
	for (const field of fields || []) {
		if (!field || !isDottedKey(field.key) || !Object.hasOwn(out, field.key)) {
			continue
		}
		const value = out[field.key]
		delete out[field.key]
		const parts = field.key.split('.')
		const head = parts[0]
		if (switchedOff.has(head)) {
			continue
		}
		out[head] = setIn(out[head], parts.slice(1), value)
	}
	return out
}

/**
 * A copy of `target` with `value` at `path`, creating objects on the way.
 *
 * @param {unknown} target The object (or nothing yet).
 * @param {Array<string>} path The keys below it.
 * @param {unknown} value The value.
 * @return {object} The new object.
 */
function setIn(target, path, value) {
	const base = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {}
	const [key, ...rest] = path
	base[key] = rest.length === 0 ? value : setIn(base[key], rest, value)
	return base
}
