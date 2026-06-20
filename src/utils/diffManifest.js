/**
 * Produce the minimal keyed delta between two manifests.
 *
 * `diffManifest(base, edited)` returns a delta such that
 * `mergeManifestDelta(base, diffManifest(base, edited)).manifest` reproduces
 * `edited` for every keyed array (`pages` / `widgets` / `menu`). It is the
 * inverse of {@link module:utils/mergeManifestDelta} and is what OpenBuilt's
 * editor persists when a user saves a built app — only the differences from
 * the base, not a frozen copy of the whole manifest.
 *
 * Behaviour:
 *  - Unchanged scalars / objects / arrays are omitted from the delta.
 *  - A keyed array yields per-entry patches (keyed object with only the
 *    changed fields), full entries for additions, and `{ <key>, $op:"remove" }`
 *    markers for entries dropped by `edited`. A `__order` map is emitted only
 *    when the entry order cannot be reproduced by the merge's
 *    base-then-appended ordering.
 *  - A mergeable array whose entries lack the identity field cannot be diffed
 *    by key, so the WHOLE array is emitted (replacement) and a warning logged.
 *
 * Limitation: deleting a plain (non-keyed) object key is not expressible as a
 * delta — only keyed-array entry removals are. This matches the merge engine.
 *
 * @module utils/diffManifest
 */

import { KEYED_ARRAYS, DELTA_REMOVE } from './mergeManifestDelta.js'

/**
 * Compute the minimal delta from `base` to `edited`.
 *
 * @param {object} base The base manifest.
 * @param {object} edited The edited manifest.
 * @return {object} The delta (empty object when the two are equal).
 */
export function diffManifest(base, edited) {
	const delta = diffValue(base, edited, '')
	return isPlainObject(delta) ? delta : {}
}

/**
 * Diff two values; return `undefined` when equal, else the minimal delta.
 *
 * @param {*} base Base value.
 * @param {*} edited Edited value.
 * @param {string} path Current path (for warnings).
 * @return {*} Minimal delta value, or `undefined` if unchanged.
 */
function diffValue(base, edited, path) {
	if (deepEqual(base, edited)) return undefined
	if (!isPlainObject(base) || !isPlainObject(edited)) {
		return clone(edited)
	}

	const out = {}
	const orderMap = {}
	for (const key of Object.keys(edited)) {
		const childPath = path ? `${path}/${key}` : key
		const baseChild = base[key]
		const editedChild = edited[key]

		if (Array.isArray(editedChild) && Array.isArray(baseChild) && KEYED_ARRAYS[key]) {
			const keyField = KEYED_ARRAYS[key]
			const result = diffKeyedArray(baseChild, editedChild, keyField, childPath)
			if (result.replaceWhole) {
				out[key] = clone(editedChild)
			} else if (result.entries.length > 0) {
				out[key] = result.entries
			}
			if (result.order) orderMap[key] = result.order
		} else {
			const childDelta = diffValue(baseChild, editedChild, childPath)
			if (childDelta !== undefined) out[key] = childDelta
		}
	}

	if (Object.keys(orderMap).length > 0) out.__order = orderMap
	return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Diff two keyed arrays.
 *
 * @param {object[]} baseArr Base array.
 * @param {object[]} editedArr Edited array.
 * @param {string} keyField Identity field name.
 * @param {string} path Current path (for warnings).
 * @return {{ entries: object[], order: (string[]|null), replaceWhole: boolean }}
 */
function diffKeyedArray(baseArr, editedArr, keyField, path) {
	const idless = [...baseArr, ...editedArr].some(
		(e) => !isPlainObject(e) || e[keyField] === undefined,
	)
	if (idless) {
		// eslint-disable-next-line no-console
		console.warn(
			`[diffManifest] Array at "${path}" has entries without "${keyField}" — `
			+ 'emitting a whole-array replacement instead of a keyed delta. '
			+ 'Add stable ids to enable fine-grained deltas.',
		)
		return { entries: [], order: null, replaceWhole: true }
	}

	const baseByKey = new Map(baseArr.map((e) => [e[keyField], e]))
	const editedKeys = new Set(editedArr.map((e) => e[keyField]))
	const entries = []

	for (const editedEntry of editedArr) {
		const key = editedEntry[keyField]
		if (baseByKey.has(key)) {
			const patch = diffValue(baseByKey.get(key), editedEntry, `${path}/${key}`)
			if (patch !== undefined) entries.push({ [keyField]: key, ...patch })
		} else {
			entries.push(clone(editedEntry))
		}
	}
	for (const baseEntry of baseArr) {
		if (!editedKeys.has(baseEntry[keyField])) {
			entries.push({ [keyField]: baseEntry[keyField], $op: DELTA_REMOVE })
		}
	}

	// Order is needed only when merge's natural ordering (surviving base
	// entries in base order, then new entries in delta order) differs from
	// the edited order.
	const survivingBaseKeys = baseArr
		.map((e) => e[keyField])
		.filter((k) => editedKeys.has(k))
	const newKeys = editedArr
		.map((e) => e[keyField])
		.filter((k) => !baseByKey.has(k))
	const naturalOrder = [...survivingBaseKeys, ...newKeys]
	const editedOrder = editedArr.map((e) => e[keyField])
	const order = arraysEqual(naturalOrder, editedOrder) ? null : editedOrder

	return { entries, order, replaceWhole: false }
}

function arraysEqual(a, b) {
	return a.length === b.length && a.every((v, i) => v === b[i])
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function deepEqual(a, b) {
	if (a === b) return true
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false
	}
	const aArr = Array.isArray(a)
	const bArr = Array.isArray(b)
	if (aArr !== bArr) return false
	if (aArr) {
		return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
	}
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)
	if (aKeys.length !== bKeys.length) return false
	return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
}

function clone(value) {
	if (value === undefined) return undefined
	if (value === null || typeof value !== 'object') return value
	return JSON.parse(JSON.stringify(value))
}
