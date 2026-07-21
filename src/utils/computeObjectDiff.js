/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pure, Vue-independent, deeply-nested object/array diff. Walks two
 * arbitrary JS values and produces a flat list of per-path change
 * records — the core building block for `CnVersionHistory`'s diff
 * table, but reusable by any future host that has two full snapshots
 * to compare (not just OpenRegister's per-field audit-trail deltas).
 *
 * @module utils/computeObjectDiff
 */

/**
 * A single diffed path.
 *
 * @typedef {object} DiffEntry
 * @property {string} path Dotted/bracketed path, e.g. `'user.tags[1]'`. The root value itself uses `''`.
 * @property {'added'|'removed'|'changed'|'unchanged'} type Classification of the path.
 * @property {*} oldValue The value at this path in `oldValue` (root argument); `undefined` when `type === 'added'`.
 * @property {*} newValue The value at this path in `newValue` (root argument); `undefined` when `type === 'removed'`.
 */

/**
 * Check whether a value is a plain, diffable object (not `null`, not an array).
 *
 * @param {*} value Value to check.
 * @return {boolean} `true` when `value` is a plain object.
 */
function isPlainObject(value) {
	return value !== null && typeof value === 'object' && Array.isArray(value) === false
}

/**
 * Deep-equality check used for leaf comparisons (primitives, `null`, or
 * values of mismatched/non-diffable container types). Uses a
 * JSON-stable comparison for containers, which is sufficient here
 * because `diffValue` only ever calls this once both sides are known
 * NOT to be a matching pair of plain-objects or a matching pair of
 * arrays (those are recursed into separately).
 *
 * @param {*} a First value.
 * @param {*} b Second value.
 * @return {boolean} `true` when the two values are deeply equal.
 */
function leavesEqual(a, b) {
	if (Object.is(a, b) === true) {
		return true
	}
	if (typeof a !== typeof b) {
		return false
	}
	if (a === null || b === null) {
		return false
	}
	if (typeof a === 'object') {
		try {
			return JSON.stringify(a) === JSON.stringify(b)
		} catch {
			return false
		}
	}
	return false
}

/**
 * Recursive worker: diffs `oldVal` vs `newVal` at `path`, pushing
 * results onto `results`.
 *
 * @param {*} oldVal Value from the old side (`undefined` = absent key).
 * @param {*} newVal Value from the new side (`undefined` = absent key).
 * @param {string} path Current path.
 * @param {DiffEntry[]} results Accumulator array (mutated in place).
 * @return {void}
 */
function diffValue(oldVal, newVal, path, results) {
	const oldMissing = oldVal === undefined
	const newMissing = newVal === undefined

	if (oldMissing === true && newMissing === true) {
		return
	}
	if (oldMissing === true) {
		results.push({ path, type: 'added', oldValue: undefined, newValue: newVal })
		return
	}
	if (newMissing === true) {
		results.push({ path, type: 'removed', oldValue: oldVal, newValue: undefined })
		return
	}

	if (isPlainObject(oldVal) === true && isPlainObject(newVal) === true) {
		const keys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)])).sort()
		if (keys.length === 0) {
			results.push({ path, type: 'unchanged', oldValue: oldVal, newValue: newVal })
			return
		}
		for (const key of keys) {
			const childPath = path === '' ? key : `${path}.${key}`
			diffValue(oldVal[key], newVal[key], childPath, results)
		}
		return
	}

	if (Array.isArray(oldVal) === true && Array.isArray(newVal) === true) {
		const maxLen = Math.max(oldVal.length, newVal.length)
		if (maxLen === 0) {
			results.push({ path, type: 'unchanged', oldValue: oldVal, newValue: newVal })
			return
		}
		for (let i = 0; i < maxLen; i++) {
			const childPath = `${path}[${i}]`
			diffValue(oldVal[i], newVal[i], childPath, results)
		}
		return
	}

	results.push({
		path,
		type: leavesEqual(oldVal, newVal) === true ? 'unchanged' : 'changed',
		oldValue: oldVal,
		newValue: newVal,
	})
}

/**
 * Compute a flat, path-addressed diff between two arbitrary JS values.
 *
 * Handles nested plain objects and arrays recursively (path notation
 * `a.b[0].c`), classifies every path as `added` / `removed` /
 * `changed` / `unchanged`, and distinguishes an explicit `null` value
 * from an absent key (`undefined`). A type change (e.g. object →
 * array) at a given path is reported as a single `changed` leaf
 * rather than a partial recursive diff. Neither `oldValue` nor
 * `newValue` is mutated.
 *
 * @param {*} oldValue The "before" value (object, array, or primitive).
 * @param {*} newValue The "after" value (object, array, or primitive).
 * @return {DiffEntry[]} Flat array of diff entries, one per leaf/root path.
 */
export function computeObjectDiff(oldValue, newValue) {
	const results = []
	diffValue(oldValue, newValue, '', results)
	return results
}

export default computeObjectDiff
