/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Bounded, synchronous undo/redo history over manifest-shaped JSON.
 *
 * OpenBuilt's editor holds a working manifest and mutates it live as the user
 * drags widgets, renames pages, and edits config. This util is the shared
 * history primitive behind that undo/redo: a bounded stack of full manifest
 * snapshots (not deltas — see the design rationale below), with structural
 * sharing so consecutive snapshots that differ in a small subtree don't
 * duplicate the rest of the manifest in memory.
 *
 * Why full snapshots and not `diffManifest`/`mergeManifestDelta` deltas:
 * deleting a plain (non-keyed) object key is not expressible as a delta —
 * `mergeManifestDelta` only ever recurses and adds/patches plain-object keys,
 * it never deletes one. An undo history built on deltas would silently fail
 * to represent a key deletion and resurrect deleted config on redo. Deltas
 * are also forward-only (no reverse delta), so undo would need to store both
 * directions or re-diff against a retained base — reintroducing snapshots
 * anyway. See openspec/changes/manifest-edit-history/design.md (D1).
 *
 * @module utils/manifestEditHistory
 */

/**
 * Create a bounded manifest undo/redo history.
 *
 * Each `push()` stores a deep-cloned, deep-frozen snapshot of the given
 * state. `current`, `undo()`, and `redo()` always hand back the frozen
 * stored reference — never a fresh clone — so consumers get an O(1) read
 * and an explicit immutability contract: mutate a working copy, never the
 * snapshot itself.
 *
 * @param {object} [options] History options.
 * @param {number} [options.limit] Maximum number of stored snapshots. The
 *   oldest entry is evicted once a push would exceed this. Default `100`.
 * @param {number} [options.coalesceMs] Coalescing window in ms. When `> 0`,
 *   a `push(state, label)` within `coalesceMs` of the previous push, at the
 *   top of the stack, carrying the same non-empty `label`, replaces the top
 *   entry instead of appending. `0` (the default) disables coalescing.
 * @param {Function} [options.now] Injectable clock used to timestamp pushes
 *   and evaluate the coalescing window. Default `Date.now`. Exists so tests
 *   can simulate elapsed time deterministically without real timers.
 * @return {{
 *   push: (state: object, label?: string) => (object|null),
 *   undo: () => (object|null),
 *   redo: () => (object|null),
 *   clear: () => void,
 *   readonly canUndo: boolean,
 *   readonly canRedo: boolean,
 *   readonly current: (object|null),
 *   readonly size: number,
 * }} The history instance.
 */
export function createManifestEditHistory(options = {}) {
	const limit = options.limit ?? 100
	const coalesceMs = options.coalesceMs ?? 0
	const now = options.now ?? Date.now

	/** @type {object[]} Stored, frozen snapshots — oldest first. */
	let entries = []
	/** @type {(string|null)[]} Coalescing label recorded alongside each entry. */
	let labels = []
	/** @type {number[]} Push timestamp recorded alongside each entry. */
	let timestamps = []
	/** Index of the current entry in `entries`; `-1` when empty. */
	let cursor = -1

	/**
	 * Push a new state onto the history.
	 *
	 * A push whose state deep-equals the current entry is a no-op. Otherwise,
	 * when the cursor sits below the top (some `undo()`s happened since the
	 * last push), the redo tail is discarded before the new entry lands
	 * (branch discard) — which also means a post-undo push never coalesces,
	 * even if its label matches the discarded entry's.
	 *
	 * @param {object} state The manifest-shaped state to record.
	 * @param {string} [label] Optional coalescing label (see `coalesceMs`).
	 * @return {object|null} The new current (frozen) snapshot, or `null` when
	 *   the push was a no-op on an empty history's non-object input.
	 */
	function push(state, label) {
		const normalizedLabel = label || null

		if (cursor >= 0 && deepEqual(state, entries[cursor])) {
			return entries[cursor]
		}

		const atTop = entries.length > 0 && cursor === entries.length - 1
		const ts = now()
		const canCoalesce = coalesceMs > 0
			&& atTop
			&& normalizedLabel !== null
			&& labels[cursor] === normalizedLabel
			&& (ts - timestamps[cursor]) <= coalesceMs

		if (canCoalesce) {
			const shareBase = cursor > 0 ? entries[cursor - 1] : undefined
			entries[cursor] = shareOrClone(state, shareBase)
			labels[cursor] = normalizedLabel
			timestamps[cursor] = ts
			return entries[cursor]
		}

		// Discard the redo tail (no-op when the cursor is already at the top).
		if (cursor < entries.length - 1) {
			entries = entries.slice(0, cursor + 1)
			labels = labels.slice(0, cursor + 1)
			timestamps = timestamps.slice(0, cursor + 1)
		}

		const shareBase = entries.length > 0 ? entries[cursor] : undefined
		entries.push(shareOrClone(state, shareBase))
		labels.push(normalizedLabel)
		timestamps.push(ts)
		cursor = entries.length - 1

		if (entries.length > limit) {
			entries.shift()
			labels.shift()
			timestamps.shift()
			cursor = entries.length - 1
		}

		return entries[cursor]
	}

	/**
	 * Move one entry back in the history.
	 *
	 * @return {object|null} The new current snapshot, or `null` when there is
	 *   no earlier entry (state left unchanged).
	 */
	function undo() {
		if (cursor <= 0) return null
		cursor -= 1
		return entries[cursor]
	}

	/**
	 * Move one entry forward in the history.
	 *
	 * @return {object|null} The new current snapshot, or `null` when there is
	 *   no later entry (state left unchanged).
	 */
	function redo() {
		if (cursor === -1 || cursor >= entries.length - 1) return null
		cursor += 1
		return entries[cursor]
	}

	/** Remove every entry and reset the cursor. */
	function clear() {
		entries = []
		labels = []
		timestamps = []
		cursor = -1
	}

	return {
		push,
		undo,
		redo,
		clear,
		get canUndo() {
			return cursor > 0
		},
		get canRedo() {
			return cursor >= 0 && cursor < entries.length - 1
		},
		get current() {
			return cursor >= 0 ? entries[cursor] : null
		},
		get size() {
			return entries.length
		},
	}
}

/**
 * Clone `value` into a deep-frozen structure, reusing `prev`'s frozen
 * subtree reference wherever the corresponding subtree is deep-equal —
 * i.e. clone, freeze, and structural-sharing in a single recursive pass.
 * `prev` is assumed to already be fully frozen (it is always a previously
 * stored snapshot), so reusing a subtree of it is safe.
 *
 * @param {*} value The raw value to clone/freeze.
 * @param {*} [prev] The previous stored (frozen) snapshot to share against.
 * @return {*} A frozen value equal to `value`.
 */
function shareOrClone(value, prev) {
	if (prev !== undefined && deepEqual(value, prev)) {
		return prev
	}
	if (value === null || typeof value !== 'object') {
		return value
	}
	if (Array.isArray(value)) {
		const prevArr = Array.isArray(prev) ? prev : undefined
		const out = value.map((item, i) => shareOrClone(item, prevArr ? prevArr[i] : undefined))
		return Object.freeze(out)
	}
	const prevObj = (prev !== null && typeof prev === 'object' && !Array.isArray(prev)) ? prev : undefined
	const out = {}
	for (const key of Object.keys(value)) {
		out[key] = shareOrClone(value[key], prevObj ? prevObj[key] : undefined)
	}
	return Object.freeze(out)
}

/**
 * Structural deep-equality check (JSON-safe plain data only — the contract
 * this history is built for).
 *
 * @param {*} a First value.
 * @param {*} b Second value.
 * @return {boolean} Whether `a` and `b` are deeply equal.
 */
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
