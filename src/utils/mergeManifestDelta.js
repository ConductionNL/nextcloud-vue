/**
 * Keyed structural merge for app manifests (the `delta` merge mode).
 *
 * Unlike a plain deep-merge (which replaces arrays wholesale), this merges
 * the manifest's identity-bearing arrays BY KEY: `pages[]` by `page.id`,
 * `widgets[]` by `widget.id`, and `menu[]` by `menu.id`. That lets a stored
 * delta patch a single page or widget without resending the whole array, and
 * lets a built app inherit later changes to its base manifest.
 *
 * Semantics (per the manifest-delta-merge capability):
 *  - Plain objects merge recursively; scalars and non-keyed arrays are
 *    replaced (delta wins) — preserving today's deep-merge behaviour.
 *  - In a keyed array, a delta entry whose key MATCHES a base entry is merged
 *    into it; a delta entry whose key is NEW is appended.
 *  - A delta entry of the form `{ "<key>": "x", "$op": "remove" }` deletes the
 *    matching base entry. `$op:"remove"` targeting a key not present in the
 *    base is an ORPHAN: it is skipped, warned, and its path recorded.
 *  - An optional `__order` object on the parent maps an array name to an id
 *    sequence (`{ "widgets": ["w2", "w1"] }`) and reorders the merged entries
 *    to it; unlisted entries keep their relative order after the listed ones.
 *    Using an object (not a bare array) keeps it unambiguous when a parent
 *    holds more than one keyed array (the manifest has both `pages` and
 *    `menu`).
 *
 * The function is pure and Vue-free so it can be unit-tested in isolation and
 * reused by OpenBuilt (client-side preview + a server-side port).
 *
 * @module utils/mergeManifestDelta
 */

/**
 * Map of array property name → the field that identifies its entries.
 * Only arrays listed here merge by key; every other array replaces.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const KEYED_ARRAYS = Object.freeze({
	pages: 'id',
	widgets: 'id',
	menu: 'id',
})

/** Reserved delta markers — never part of a base manifest. */
export const DELTA_REMOVE = 'remove'
const ORDER_KEY = '__order'
const OP_KEY = '$op'

/**
 * Apply a keyed structural delta to a base manifest.
 *
 * @param {object} base The base manifest (bundled manifest or stub).
 * @param {object} delta The delta payload to apply.
 * @return {{ manifest: object, orphanedDeltaPaths: string[] }}
 *   `manifest` is a new merged object (inputs are never mutated);
 *   `orphanedDeltaPaths` lists the paths of delta entries that targeted a
 *   missing base entry and were therefore skipped.
 */
export function mergeManifestDelta(base, delta) {
	const orphans = []
	const manifest = mergeValue(base, delta, '', orphans)
	return { manifest, orphanedDeltaPaths: orphans }
}

/**
 * Recursively merge `delta` onto `base` at `path`, collecting orphan paths.
 *
 * @param {*} base Base value.
 * @param {*} delta Delta value (takes precedence).
 * @param {string} path Current JSON-ish path (for orphan reporting).
 * @param {string[]} orphans Accumulator for orphaned delta paths.
 * @return {*} Merged value.
 */
function mergeValue(base, delta, path, orphans) {
	// Delta absent → keep base. Base absent / scalar mismatch → delta wins.
	if (delta === undefined) return clone(base)
	if (!isPlainObject(base) || !isPlainObject(delta)) {
		return clone(delta)
	}

	const out = { ...clone(base) }
	for (const key of Object.keys(delta)) {
		if (key === ORDER_KEY) continue
		const childPath = path ? `${path}/${key}` : key
		const baseChild = base[key]
		const deltaChild = delta[key]

		if (Array.isArray(deltaChild) && Array.isArray(baseChild) && KEYED_ARRAYS[key]) {
			out[key] = mergeKeyedArray(baseChild, deltaChild, KEYED_ARRAYS[key], childPath, orphans)
		} else if (isPlainObject(deltaChild) && isPlainObject(baseChild)) {
			out[key] = mergeValue(baseChild, deltaChild, childPath, orphans)
		} else {
			out[key] = clone(deltaChild)
		}
	}

	// Apply `__order` last so a reorder-only delta (which carries no copy of
	// the array itself) still reorders the base array.
	const orderMap = isPlainObject(delta[ORDER_KEY]) ? delta[ORDER_KEY] : {}
	for (const [arrKey, seq] of Object.entries(orderMap)) {
		if (Array.isArray(seq) && Array.isArray(out[arrKey]) && KEYED_ARRAYS[arrKey]) {
			out[arrKey] = applyOrder(out[arrKey], seq, KEYED_ARRAYS[arrKey])
		}
	}
	return out
}

/**
 * Merge two arrays of keyed entries.
 *
 * @param {object[]} baseArr Base array.
 * @param {object[]} deltaArr Delta array.
 * @param {string} keyField Identity field name (e.g. "id").
 * @param {string} path Current path (for orphan reporting).
 * @param {string[]} orphans Accumulator for orphaned delta paths.
 * @return {object[]} Merged array (ordering, if any, is applied by the caller).
 */
function mergeKeyedArray(baseArr, deltaArr, keyField, path, orphans) {
	// Start from a keyed map of the base entries, preserving order.
	const merged = baseArr.map((entry) => clone(entry))
	const indexByKey = new Map()
	merged.forEach((entry, i) => {
		if (isPlainObject(entry) && entry[keyField] !== undefined) {
			indexByKey.set(entry[keyField], i)
		}
	})

	for (const deltaEntry of deltaArr) {
		if (!isPlainObject(deltaEntry)) continue
		const key = deltaEntry[keyField]
		const op = deltaEntry[OP_KEY]
		const entryPath = `${path}/${key}`

		if (op === DELTA_REMOVE) {
			if (indexByKey.has(key)) {
				merged[indexByKey.get(key)] = undefined // tombstone; compacted below
			} else {
				orphans.push(entryPath)
			}
			continue
		}

		if (indexByKey.has(key)) {
			// Patch an existing entry (recurse so nested widgets[] merge AND a
			// nested __order both apply). Keep __order for the recursion —
			// mergeValue consumes it and never copies it into the output; only
			// $op is meaningless past this point.
			const i = indexByKey.get(key)
			merged[i] = mergeValue(merged[i], stripOp(deltaEntry), entryPath, orphans)
		} else {
			// New key → append as an addition.
			merged.push(clone(stripMarkers(deltaEntry)))
		}
	}

	return merged.filter((e) => e !== undefined)
}

/**
 * Reorder entries to the given key sequence; unlisted entries follow in their
 * original relative order.
 *
 * @param {object[]} entries Merged entries.
 * @param {string[]} order Desired key sequence.
 * @param {string} keyField Identity field name.
 * @return {object[]} Reordered entries.
 */
function applyOrder(entries, order, keyField) {
	const byKey = new Map(entries.map((e) => [e && e[keyField], e]))
	const result = []
	const used = new Set()
	for (const key of order) {
		if (byKey.has(key)) {
			result.push(byKey.get(key))
			used.add(key)
		}
	}
	for (const e of entries) {
		if (!used.has(e && e[keyField])) result.push(e)
	}
	return result
}

/**
 * Strip all delta-only markers from an entry before it lands in the manifest.
 * @param entry
 */
function stripMarkers(entry) {
	const out = { ...entry }
	delete out[OP_KEY]
	delete out[ORDER_KEY]
	return out
}

/**
 * Strip only `$op`, preserving `__order` for a recursive merge to consume.
 * @param entry
 */
function stripOp(entry) {
	const out = { ...entry }
	delete out[OP_KEY]
	return out
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Structured clone via JSON (manifests are plain JSON — no cycles/functions).
 * @param value
 */
function clone(value) {
	if (value === undefined) return undefined
	if (value === null || typeof value !== 'object') return value
	return JSON.parse(JSON.stringify(value))
}
