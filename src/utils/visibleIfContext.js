/**
 * @copyright Copyright (c) 2024 Conduction B.V. <info@conduction.nl>
 * @license EUPL-1.2
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 */

/**
 * Resolve a dot-separated path against a plain-object tree.
 *
 * Examples:
 *   resolvePath({ user: { primaryRole: 'hr' } }, 'user.primaryRole') → 'hr'
 *   resolvePath({ user: { flags: { active: true } } }, 'user.flags.active') → true
 *   resolvePath({}, 'user.primaryRole') → undefined
 *
 * Only plain-object descent is supported; array indexing is intentionally
 * absent — manifest paths reference scalar runtime fields, not arrays.
 *
 * @param {object} root The root object to walk.
 * @param {string} path Dot-separated path string (e.g. `"user.primaryRole"`).
 * @return {unknown} The value at the path, or `undefined` when any segment is missing.
 */
function resolvePath(root, path) {
	if (!root || typeof root !== 'object') return undefined
	const segments = path.split('.')
	let current = root
	for (const segment of segments) {
		if (current === null || typeof current !== 'object') return undefined
		if (!Object.hasOwn(current, segment)) return undefined
		current = current[segment]
	}
	return current
}

/**
 * Evaluate a single predicate against a resolved value.
 *
 * Supported predicate shapes (all are optional — omit any you don't use):
 *
 * | Shape                          | Operator  | Passes when …                                                |
 * |--------------------------------|-----------|--------------------------------------------------------------|
 * | `true` / `false`               | `eq`      | `value === predicateValue` (strict equality)                |
 * | `{ eq: <scalar> }`             | `eq`      | `value === eq`                                              |
 * | `{ in: [<scalar>, …] }`        | `in`      | `in` array contains `value` (strict item equality)          |
 * | `{ notIn: [<scalar>, …] }`     | `notIn`   | `notIn` array does NOT contain `value`                      |
 * | `{ gt: <number|date> }`        | `gt`      | `value > gt` (numeric or ISO-date string comparison)        |
 * | `{ gte: <number|date> }`       | `gte`     | `value >= gte`                                              |
 * | `{ lt: <number|date> }`        | `lt`      | `value < lt`                                                |
 * | `{ lte: <number|date> }`       | `lte`     | `value <= lte`                                              |
 * | `{ truthy: true }`             | `truthy`  | `Boolean(value) === true`                                   |
 * | `{ truthy: false }`            | `falsy`   | `Boolean(value) === false`                                  |
 *
 * The shorthand scalar / boolean form (`"user.primaryRole": "compliance-officer"`)
 * maps to `{ eq: "compliance-officer" }`.
 *
 * Unknown operator keys are ignored (permissive forward-compatibility).
 *
 * @param {unknown} value The resolved runtime value.
 * @param {unknown} predicate The predicate expression from the manifest.
 * @return {boolean} Whether the predicate passes.
 */
function evaluatePredicate(value, predicate) {
	// Shorthand scalar: { "user.primaryRole": "some-role" } or { "user.isOverdue": true }
	if (predicate === null || typeof predicate !== 'object') {
		return value === predicate
	}

	// Object predicate — evaluate each recognised operator; all must pass (implicit AND).
	if (Object.hasOwn(predicate, 'eq')) {
		if (value !== predicate.eq) return false
	}

	if (Object.hasOwn(predicate, 'in')) {
		if (!Array.isArray(predicate.in) || !predicate.in.includes(value)) return false
	}

	if (Object.hasOwn(predicate, 'notIn')) {
		if (!Array.isArray(predicate.notIn) || predicate.notIn.includes(value)) return false
	}

	// Numeric / date comparisons — convert ISO date strings to timestamps for consistent ordering.
	const toComparable = (v) => {
		if (typeof v === 'number') return v
		if (typeof v === 'string') {
			const ts = Date.parse(v)
			return isNaN(ts) ? v : ts
		}
		return v
	}

	if (Object.hasOwn(predicate, 'gt')) {
		if (!(toComparable(value) > toComparable(predicate.gt))) return false
	}
	if (Object.hasOwn(predicate, 'gte')) {
		if (!(toComparable(value) >= toComparable(predicate.gte))) return false
	}
	if (Object.hasOwn(predicate, 'lt')) {
		if (!(toComparable(value) < toComparable(predicate.lt))) return false
	}
	if (Object.hasOwn(predicate, 'lte')) {
		if (!(toComparable(value) <= toComparable(predicate.lte))) return false
	}

	if (Object.hasOwn(predicate, 'truthy')) {
		const expected = Boolean(predicate.truthy)
		if (Boolean(value) !== expected) return false
	}

	return true
}

/**
 * Known `visibleIf` reserved keys that are NOT context-path predicates.
 *
 * When `passesContextPredicates` encounters one of these it skips it
 * (the caller handles them via their own specialised logic, e.g.
 * `appInstalled` is handled by `isAppInstalled` in CnAppNav).
 *
 * @type {Set<string>}
 */
const RESERVED_KEYS = new Set(['appInstalled'])

/**
 * Evaluate all context-path predicates in a `visibleIf` block against
 * the manifest's `runtime` data.
 *
 * A context-path predicate is any key in `visibleIf` that is NOT one of
 * the reserved specialised keys (currently only `appInstalled`).
 * The key is treated as a dot-separated path into `runtime`; the value
 * is the predicate expression.
 *
 * All predicate conditions must pass for the function to return `true`
 * (implicit AND across keys). When `visibleIf` is absent or has no
 * context-path keys, returns `true` (visible by default).
 *
 * Example:
 * ```json
 * {
 *   "id": "compliance-dashboard",
 *   "visibleIf": {
 *     "user.primaryRole": { "in": ["compliance-officer", "hr-coordinator"] }
 *   }
 * }
 * ```
 * With `runtime = { user: { primaryRole: "compliance-officer" } }` → `true`.
 * With `runtime = { user: { primaryRole: "employee" } }` → `false`.
 * With `runtime = null` (no runtime data yet) → `false` (fail-safe).
 *
 * @param {object|null|undefined} visibleIf The `visibleIf` block from the manifest item.
 * @param {object|null|undefined} runtime The `runtime` data from the manifest.
 * @return {boolean} Whether all context-path predicates pass.
 */
export function passesContextPredicates(visibleIf, runtime) {
	if (!visibleIf || typeof visibleIf !== 'object') return true

	// Gather the context-path keys (non-reserved keys).
	const contextKeys = Object.keys(visibleIf).filter((k) => !RESERVED_KEYS.has(k))
	if (contextKeys.length === 0) return true

	// When context-path predicates are declared but no runtime data is
	// available, the item is hidden (fail-safe: don't show role-gated
	// content to unidentified users).
	if (!runtime || typeof runtime !== 'object') return false

	for (const path of contextKeys) {
		const value = resolvePath(runtime, path)
		const predicate = visibleIf[path]
		if (!evaluatePredicate(value, predicate)) return false
	}

	return true
}

/**
 * Validate the context-path keys in a `visibleIf` block.
 *
 * Returns an array of error strings (empty when valid). Called from the
 * `validateManifest` helper so validation messages use the same style
 * as the rest of the FE validator.
 *
 * Rules:
 * - Each context-path key must be a non-empty dot-separated string
 *   (`segment.segment…`; each segment must be non-empty).
 * - The predicate value may be a scalar (string/number/boolean/null) OR
 *   a plain object with recognised operator keys (`eq`, `in`, `notIn`,
 *   `gt`, `gte`, `lt`, `lte`, `truthy`); objects with unknown-only keys
 *   are allowed (forward-compat) but produce a warning-level message.
 *
 * @param {object} visibleIf The candidate `visibleIf` block.
 * @param {string} path JSON-pointer-style path prefix for error messages.
 * @return {string[]} Validation error messages.
 */
export function validateContextPredicates(visibleIf, path) {
	const errors = []
	const contextKeys = Object.keys(visibleIf).filter((k) => !RESERVED_KEYS.has(k))

	for (const key of contextKeys) {
		// Path key validation: non-empty segments separated by dots.
		const segments = key.split('.')
		const hasEmptySegment = segments.some((s) => s.length === 0)
		if (hasEmptySegment || key.length === 0) {
			errors.push(`${path}/${key}: context path "${key}" must be a non-empty dot-separated string with non-empty segments`)
			continue
		}

		// Predicate value validation.
		const predicate = visibleIf[key]
		if (predicate !== null && typeof predicate === 'object') {
			const KNOWN_OPERATORS = new Set(['eq', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte', 'truthy'])
			const predicateKeys = Object.keys(predicate)

			for (const op of predicateKeys) {
				if (!KNOWN_OPERATORS.has(op)) {
					// Unknown operator — permissive (forward-compat), not an error.
					continue
				}
			}

			if (Object.hasOwn(predicate, 'in') && !Array.isArray(predicate.in)) {
				errors.push(`${path}/${key}/in: "in" operator value must be an array`)
			}
			if (Object.hasOwn(predicate, 'notIn') && !Array.isArray(predicate.notIn)) {
				errors.push(`${path}/${key}/notIn: "notIn" operator value must be an array`)
			}
		}
		// Scalar predicates (string, number, boolean, null) are always valid.
	}

	return errors
}
