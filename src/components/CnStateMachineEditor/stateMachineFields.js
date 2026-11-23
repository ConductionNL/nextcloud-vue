/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record model behind CnStateMachineEditor's property panels: turning a
 * stored record into an editable copy described by field descriptors, and the
 * copy back into the record the host stores.
 *
 * A field descriptor is `{ key, type, label, ... }` with `type` one of
 * `text`, `textarea`, `number`, `checkbox`, `select`, `checkboxes`, `list`,
 * `typed-list`, `group` or `row`. A `group` with a `key` edits a nested object;
 * without one, like a `row`, it only arranges its `fields`.
 *
 * @module components/CnStateMachineEditor/stateMachineFields
 */

const LIST_TYPES = new Set(['list', 'typed-list', 'checkboxes'])

let generatedIds = 0

/**
 * Parse a value a host may have stored as a JSON string.
 *
 * @param {unknown} raw The stored value.
 * @return {unknown} The parsed value, or the value itself when it is not JSON text.
 */
export function parseStored(raw) {
	if (typeof raw !== 'string') {
		return raw
	}
	const text = raw.trim()
	if (text.charAt(0) !== '[' && text.charAt(0) !== '{') {
		return raw
	}
	try {
		return JSON.parse(text)
	} catch {
		return raw
	}
}

/**
 * Deep copy of plain data.
 *
 * @param {unknown} value The value.
 * @return {unknown} The copy.
 */
export function cloneData(value) {
	if (value === undefined) {
		return undefined
	}
	return JSON.parse(JSON.stringify(value))
}

/**
 * Whether a value counts as not filled in.
 *
 * @param {unknown} value The value.
 * @return {boolean} True for null, undefined, '', NaN and blank strings.
 */
export function isBlank(value) {
	if (value === null || value === undefined) {
		return true
	}
	if (typeof value === 'number') {
		return Number.isNaN(value)
	}
	return typeof value === 'string' && value.trim() === ''
}

/**
 * Whether a value is a plain object.
 *
 * @param {unknown} value The value.
 * @return {boolean} True for `{}`-like values.
 */
function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * A fresh id for a new list item.
 *
 * @param {string} prefix The id prefix.
 * @return {string} The id.
 */
export function newItemId(prefix = 'item-') {
	generatedIds += 1
	return `${prefix}${Date.now().toString(36)}-${generatedIds}`
}

/**
 * The path that identifies an optional group in the enabled map.
 *
 * @param {string} base The parent path.
 * @param {string} key The group key.
 * @return {string} The path.
 */
function pathOf(base, key) {
	return base ? `${base}.${key}` : key
}

/**
 * Normalise `target` in place so every described field holds an editable value,
 * and record which optional groups are switched on.
 *
 * Text fields that are absent stay absent: a panel opened and closed must not
 * add empty keys to a record.
 *
 * @param {object} target The copy being edited.
 * @param {Array<object>} fields The descriptors.
 * @param {object} enabled Optional-group state by path, filled in here.
 * @param {string} [base] The path of `target`.
 * @return {object} `target`.
 */
export function normaliseFields(target, fields, enabled, base = '') {
	for (const field of fields || []) {
		if ((field.type === 'group' && !field.key) || field.type === 'row') {
			normaliseFields(target, field.fields, enabled, base)
			continue
		}
		if (!field.key) {
			continue
		}
		const stored = parseStored(target[field.key])
		if (field.type === 'group') {
			const present = isPlainObject(stored)
			if (field.optional) {
				enabled[pathOf(base, field.key)] = present
			}
			const value = { ...cloneData(field.defaults || {}), ...(present ? stored : {}) }
			normaliseFields(value, field.fields, enabled, pathOf(base, field.key))
			target[field.key] = value
		} else if (LIST_TYPES.has(field.type)) {
			target[field.key] = Array.isArray(stored) ? stored : []
		} else if (field.type === 'checkbox') {
			if (stored !== undefined || field.default !== undefined) {
				target[field.key] = stored === undefined ? !!field.default : !!stored
			}
		} else if (stored === undefined && field.default !== undefined) {
			target[field.key] = cloneData(field.default)
		} else if (stored !== undefined) {
			target[field.key] = stored
		}
	}
	return target
}

/**
 * Turn a stored record into the copy a panel edits.
 *
 * @param {object} record The stored record.
 * @param {Array<object>} fields The descriptors.
 * @return {{ model: object, enabled: object }} The copy, and which optional groups are on.
 */
export function readRecord(record, fields) {
	const enabled = {}
	const model = normaliseFields(cloneData(record || {}), fields, enabled)
	return { model, enabled }
}

/**
 * Every leaf key a group describes, through rows and key-less groups.
 *
 * @param {Array<object>} fields The descriptors.
 * @return {Array<object>} The leaf descriptors.
 */
function leafFields(fields) {
	const leaves = []
	for (const field of fields || []) {
		if ((field.type === 'group' && !field.key) || field.type === 'row') {
			leaves.push(...leafFields(field.fields))
		} else if (field.key) {
			leaves.push(field)
		}
	}
	return leaves
}

/**
 * Drop what is not filled in from one pruned object.
 *
 * Lists of strings lose their blank entries; then any key holding a blank
 * value or an empty list goes. `false` and `0` are values and stay.
 *
 * @param {object} value The object.
 * @param {Array<object>} fields Its descriptors.
 * @return {object} The pruned object.
 */
function prune(value, fields) {
	const byKey = Object.fromEntries(leafFields(fields).map((field) => [field.key, field]))
	for (const key of Object.keys(value)) {
		let entry = value[key]
		const field = byKey[key]
		if (Array.isArray(entry) && field && field.type === 'list' && field.itemType !== 'object') {
			entry = entry.filter((item) => !isBlank(item))
			value[key] = entry
		}
		if (isBlank(entry) || (Array.isArray(entry) && entry.length === 0)) {
			delete value[key]
		}
	}
	return value
}

/**
 * Turn an edited copy back into the record to store.
 *
 * Per group: an optional group that is off is left out; a `requireAll` group is
 * left out unless every leaf is filled in; a `prune` group drops its empty
 * entries and, with `omitWhenEmpty`, is left out once nothing remains.
 *
 * @param {object} model The edited copy.
 * @param {Array<object>} fields The descriptors.
 * @param {object} enabled Optional-group state by path.
 * @param {string} [base] The path of `model`.
 * @return {object} The record.
 */
export function buildRecord(model, fields, enabled, base = '') {
	const out = cloneData(model || {})
	const visit = (target, list, path) => {
		for (const field of list || []) {
			if ((field.type === 'group' && !field.key) || field.type === 'row') {
				visit(target, field.fields, path)
				continue
			}
			if (field.type !== 'group' || !field.key) {
				continue
			}
			const groupPath = pathOf(path, field.key)
			if (field.optional && !enabled[groupPath]) {
				delete target[field.key]
				continue
			}
			const inner = isPlainObject(target[field.key]) ? target[field.key] : {}
			visit(inner, field.fields, groupPath)
			if (field.requireAll && leafFields(field.fields).some((leaf) => isBlank(inner[leaf.key]))) {
				delete target[field.key]
				continue
			}
			if (field.prune) {
				prune(inner, field.fields)
			}
			if (field.omitWhenEmpty && Object.keys(inner).length === 0) {
				delete target[field.key]
				continue
			}
			target[field.key] = inner
		}
	}
	visit(out, fields, base)
	return out
}

/**
 * A new item for a list field.
 *
 * @param {object} field The list descriptor.
 * @return {unknown} The item: '' for a list of strings, else a copy of `newItem` with a fresh id when `idKey` is set.
 */
export function newListItem(field) {
	if (field.type === 'list' && field.itemType !== 'object') {
		return ''
	}
	const item = cloneData(field.newItem || {})
	if (field.idKey) {
		item[field.idKey] = newItemId(field.idPrefix)
	}
	return item
}

/**
 * Move one entry of a list.
 *
 * @param {Array} list The list, changed in place.
 * @param {number} from The entry's index.
 * @param {number} to Its new index.
 * @return {boolean} Whether anything moved.
 */
export function moveItem(list, from, to) {
	if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
		return false
	}
	const [item] = list.splice(from, 1)
	list.splice(to, 0, item)
	return true
}
