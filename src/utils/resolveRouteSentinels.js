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
 * Reference-preserving: a subtree containing no `@route.<param>` sentinel
 * is returned by IDENTITY, not deep-copied. This matters for the in-place
 * manifest editor (ADR-041) — `CnPageRenderer` resolves sentinels over
 * `page.config`, then passes e.g. `config.widgets` to `CnDashboardPage`;
 * if that array were always cloned, the editor's cog/add edits would mutate
 * the clone and `diffManifest` would see no change. Only changed paths are
 * rebuilt; unchanged ones stay pointer-identical to the manifest.
 *
 * @param {*} value The input value (any depth).
 * @param {object} params The route params map (e.g. `$route.params`).
 * @param {string} pageId Page identifier used for warning dedup.
 * @return {*} Value with sentinels resolved; identical reference when unchanged.
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
		let changed = false
		const out = value.map((item) => {
			const resolved = resolveRouteSentinels(item, safeParams, pageId)
			if (resolved !== item) changed = true
			return resolved
		})
		// Preserve the original array reference when no element changed.
		return changed ? out : value
	}

	if (isPlainObject(value)) {
		let changed = false
		const out = {}
		for (const [key, val] of Object.entries(value)) {
			const resolved = resolveRouteSentinels(val, safeParams, pageId)
			if (resolved !== val) changed = true
			out[key] = resolved
		}
		// Preserve the original object reference when no key changed.
		return changed ? out : value
	}

	return value
}

export default resolveRouteSentinels
