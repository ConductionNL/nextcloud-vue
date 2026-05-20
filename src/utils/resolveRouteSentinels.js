/**
 * Manifest `@route.<param>` sentinel resolver.
 *
 * Implements the `manifest-route-param-sentinel` capability: walks an
 * input value (typically a `pages[].config` subtree) replacing every
 * fully-matched `@route.<param>` string with `params[param]` —
 * the corresponding vue-router param captured from the URL.
 *
 * Pattern: `^@route\\.([A-Za-z][A-Za-z0-9_-]*)$`
 *
 * Resolution rules:
 *  - exact-match strings substitute with the resolved value.
 *  - unresolved (param absent or `params` empty) → `null`, plus
 *    one `console.warn` per `(pageId, sentinel)` pair for the page
 *    lifetime.
 *  - non-matching strings pass through (a literal "@route.foo.bar"
 *    string is NOT a sentinel — the regex requires a single
 *    `\\.` followed by a JS-identifier-shaped tail).
 *  - non-string primitives pass through unchanged.
 *  - arrays + plain objects walked recursively.
 *  - other object shapes (Date, Map, etc.) returned as-is.
 *
 * @module utils/resolveRouteSentinels
 */

const SENTINEL_PATTERN = /^@route\.([A-Za-z][A-Za-z0-9_-]*)$/

/**
 * Per-page set of (pageId, sentinel) warnings already emitted, so a
 * config block referencing the same unresolved sentinel from 5 places
 * doesn't spam the console. Keys are `${pageId}::${sentinel}`.
 *
 * @type {Set<string>}
 */
const _warnedKeys = new Set()

/**
 * Drop the warning-dedup set. Test-only — production code never
 * needs to clear it (the set is small + grows boundedly with the
 * number of distinct sentinels).
 *
 * @return {void}
 */
export function clearRouteSentinelWarnings() {
	_warnedKeys.clear()
}

/**
 * Check whether `value` is a JSON-style plain object (not Array,
 * Map, Set, Date, etc.).
 *
 * @param {*} value Value to test.
 * @return {boolean} True when value is a plain object.
 */
function isPlainObject(value) {
	if (value === null || typeof value !== 'object') return false
	const proto = Object.getPrototypeOf(value)
	return proto === Object.prototype || proto === null
}

/**
 * Walk `value` recursively, substituting `@route.<param>` strings.
 *
 * @param {*} value The input value (any depth).
 * @param {object} params The route params map (e.g. `$route.params`).
 * @param {string} pageId Page identifier used for warning dedup.
 * @return {*} A deep-copy of value with sentinels resolved.
 */
export function resolveRouteSentinels(value, params, pageId = '<unknown>') {
	const safeParams = params && typeof params === 'object' ? params : {}

	if (typeof value === 'string') {
		const match = SENTINEL_PATTERN.exec(value)
		if (!match) return value
		const param = match[1]
		if (Object.prototype.hasOwnProperty.call(safeParams, param)) {
			return safeParams[param]
		}
		const dedupKey = `${pageId}::${value}`
		if (!_warnedKeys.has(dedupKey)) {
			_warnedKeys.add(dedupKey)
			// eslint-disable-next-line no-console
			console.warn(
				`[resolveRouteSentinels] page "${pageId}": `
				+ `sentinel "${value}" — param "${param}" is not in $route.params. `
				+ 'Substituting null.',
			)
		}
		return null
	}

	if (Array.isArray(value)) {
		return value.map((item) => resolveRouteSentinels(item, safeParams, pageId))
	}

	if (isPlainObject(value)) {
		const out = {}
		for (const [key, val] of Object.entries(value)) {
			out[key] = resolveRouteSentinels(val, safeParams, pageId)
		}
		return out
	}

	return value
}

export default resolveRouteSentinels
