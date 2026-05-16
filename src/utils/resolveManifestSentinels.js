/**
 * Manifest `@resolve:` sentinel resolver.
 *
 * Implements the `manifest-resolve-sentinel` capability: walks the
 * `pages[].config` subtrees of an assembled manifest and replaces every
 * fully-matched `@resolve:<key>` string with the result of the consuming
 * app's `IAppConfig` lookup for `<key>`. Other manifest paths
 * (`route`, `id`, top-level fields, `menu[]`, `pages[].component` etc.)
 * are intentionally untouched — sentinels there are router / registry
 * invariants and the schema validator rejects them.
 *
 * Resolution source (canonical, per spec):
 *
 *  1. `@nextcloud/initial-state` provisioned key
 *     `app-{appId}-{key}` — zero-network, preferred.
 *  2. Runtime `GET /index.php/apps/{appId}/api/configs/{key}` — falls
 *     through silently on 4xx / network error.
 *  3. `null` — unresolved.
 *
 * Empty-state semantics: an unset / empty value substitutes `null` (not
 * empty string) and is accumulated into the returned `unresolved` array
 * so consumers can render an admin warning. A `console.warn` is emitted
 * once per unresolved key with the offending sentinel.
 *
 * The resolver is intentionally split into a synchronous walk + an
 * asynchronous batch resolution: every sentinel is collected first, then
 * each unique `(appId, key)` is resolved exactly once (initial-state
 * lookup is synchronous; runtime fetch is per-key cached for the page
 * lifetime), and finally the manifest is rewritten in a second walk
 * with the resolved values. This makes the substitution deterministic
 * — five `@resolve:foo` references in five pages share one fetch.
 *
 * @module utils/resolveManifestSentinels
 */

const SENTINEL_PATTERN = /^@resolve:([a-z][a-z0-9_-]*)$/

/**
 * Process-wide cache of resolved IAppConfig values, keyed by
 * `${appId}::${key}`. Cleared via `clearResolveCache()` (test-only).
 *
 * @type {Map<string, Promise<*>>}
 */
const resolveCache = new Map()

/**
 * Test-only helper to reset the per-page resolve cache between runs.
 * Production callers do not need this — the cache is page-lifetime by
 * design, consistent with the manifest's load-once model.
 *
 * @return {void}
 */
export function clearResolveCache() {
	resolveCache.clear()
}

/**
 * Walk the manifest's `pages[].config` subtrees and replace every
 * `@resolve:<key>` sentinel with the resolved IAppConfig value.
 *
 * Returns a Promise resolving to `{ manifest, unresolved }`:
 *  - `manifest` — a NEW manifest object with sentinels substituted; the
 *    input is NOT mutated.
 *  - `unresolved` — array of IAppConfig keys whose sentinels resolved
 *    to `null` (unset / empty / fetch failure). Useful for surfacing
 *    "n settings unconfigured" admin warnings.
 *
 * Sentinels OUTSIDE `pages[].config` are left intact; the schema
 * validator rejects them downstream so consumers see a clear error
 * rather than a silent substitution that breaks routing or registry
 * lookups.
 *
 * @param {object} manifest The merged (bundled + backend) manifest.
 *   Walked but not mutated.
 * @param {string} appId Nextcloud app ID. Used to scope the
 *   IAppConfig lookup namespace.
 * @param {object} [options] Resolver overrides.
 * @param {Function} [options.getAppConfigValue] Async (appId, key) =>
 *   value resolver. Override for tests; defaults to the
 *   initial-state-then-fetch chain documented above.
 * @param {Function} [options.warn] Override for `console.warn`. Used in
 *   tests to capture warning calls without polluting test output.
 * @return {Promise<{ manifest: object, unresolved: string[] }>}
 */
export async function resolveManifestSentinels(manifest, appId, options = {}) {
	if (!isPlainObject(manifest)) {
		return { manifest, unresolved: [] }
	}

	const getAppConfigValue = options.getAppConfigValue ?? defaultGetAppConfigValue
	const warn = options.warn ?? ((...args) => {
		// eslint-disable-next-line no-console
		console.warn(...args)
	})

	// Phase 1: scan for sentinels under pages[].config only. We only
	// need the unique key set — the second walk does the substitution.
	const keys = new Set()
	const pages = Array.isArray(manifest.pages) ? manifest.pages : []
	for (const page of pages) {
		if (!isPlainObject(page) || !isPlainObject(page.config)) continue
		collectSentinelKeys(page.config, keys)
	}

	if (keys.size === 0) {
		return { manifest, unresolved: [] }
	}

	// Phase 2: resolve each unique (appId, key) exactly once.
	const resolved = new Map()
	const unresolved = []
	await Promise.all(Array.from(keys).map(async (key) => {
		const value = await getAppConfigValue(appId, key)
		if (value === undefined || value === null || value === '') {
			resolved.set(key, null)
			unresolved.push(key)
			warn(`[resolveManifestSentinels] Manifest sentinel '@resolve:${key}' resolved to null (key unset)`)
		} else {
			resolved.set(key, value)
		}
	}))

	// Phase 3: rebuild the manifest immutably, substituting sentinels in
	// pages[].config only. Other fields are passed through by reference.
	const out = { ...manifest }
	out.pages = pages.map((page) => {
		if (!isPlainObject(page) || !isPlainObject(page.config)) return page
		return { ...page, config: substituteInTree(page.config, resolved) }
	})

	return { manifest: out, unresolved }
}

/**
 * Recursively scan a tree, accumulating every sentinel key into the
 * provided `keys` Set. Plain objects + arrays are descended; primitive
 * leaves are checked against the sentinel pattern.
 *
 * @param {*} node Current tree node (object, array, or primitive).
 * @param {Set<string>} keys Accumulator for unique sentinel keys.
 * @return {void}
 */
function collectSentinelKeys(node, keys) {
	if (typeof node === 'string') {
		const match = node.match(SENTINEL_PATTERN)
		if (match) keys.add(match[1])
		return
	}
	if (Array.isArray(node)) {
		for (const item of node) collectSentinelKeys(item, keys)
		return
	}
	if (isPlainObject(node)) {
		for (const value of Object.values(node)) collectSentinelKeys(value, keys)
	}
}

/**
 * Recursively rebuild a tree, replacing each fully-matched sentinel
 * with its resolved value. Returns a NEW tree; input is unchanged.
 *
 * @param {*} node Current tree node.
 * @param {Map<string,*>} resolved Map of key → resolved value (or null).
 * @return {*} New tree with sentinels substituted.
 */
function substituteInTree(node, resolved) {
	if (typeof node === 'string') {
		const match = node.match(SENTINEL_PATTERN)
		if (match && resolved.has(match[1])) {
			return resolved.get(match[1])
		}
		return node
	}
	if (Array.isArray(node)) {
		return node.map((item) => substituteInTree(item, resolved))
	}
	if (isPlainObject(node)) {
		const out = {}
		for (const [key, value] of Object.entries(node)) {
			out[key] = substituteInTree(value, resolved)
		}
		return out
	}
	return node
}

/**
 * Default `getAppConfigValue` implementation: consult
 * `@nextcloud/initial-state` first (zero-network), fall back to a
 * runtime fetch with per-(appId, key) caching for the page lifetime.
 *
 * Returns `null` when neither source resolves a value. Network / 4xx
 * errors are swallowed silently — the resolver downgrades to "key
 * unset" in that case (consistent with the silent-fallback pattern in
 * `useAppManifest`'s backend-merge step).
 *
 * @param {string} appId Nextcloud app ID.
 * @param {string} key IAppConfig key (already validated as
 *   lowercase + alphanumeric + `_-` by the sentinel regex).
 * @return {Promise<*>} Resolved value or `null` when unset.
 */
async function defaultGetAppConfigValue(appId, key) {
	const cacheKey = `${appId}::${key}`
	if (resolveCache.has(cacheKey)) {
		return resolveCache.get(cacheKey)
	}
	const promise = (async () => {
		// Step 1: initial-state — synchronous, zero-network.
		const initial = readInitialState(appId, key)
		if (initial !== undefined && initial !== null && initial !== '') {
			return initial
		}
		// Step 2: runtime fetch — silent fallback on any error.
		try {
			const { default: axios } = await import('@nextcloud/axios')
			const { generateUrl } = await import('@nextcloud/router')
			const url = generateUrl(`/apps/${appId}/api/configs/${key}`)
			const response = await axios.get(url)
			if (response && response.status === 200 && response.data !== undefined) {
				const data = response.data
				// API may return either a raw scalar or `{ value: ... }`.
				if (isPlainObject(data) && 'value' in data) return data.value
				return data
			}
		} catch (e) {
			// Silent — caller treats as "unset".
		}
		return null
	})()
	resolveCache.set(cacheKey, promise)
	return promise
}

/**
 * Read a key from `@nextcloud/initial-state`. Looks up the conventional
 * `app-{appId}-{key}` slot. Returns `undefined` when the package is not
 * installed (e.g. older host) or the key is not provisioned.
 *
 * @param {string} appId Nextcloud app ID.
 * @param {string} key IAppConfig key.
 * @return {*} Provisioned value or `undefined`.
 */
function readInitialState(appId, key) {
	try {
		// `@nextcloud/initial-state` is an optional peer; the host page
		// may not provision the slot at all. We resolve via require so
		// jest mocks the import; bundle-side, the package is treeshaken
		// when no caller pulls it in.
		// eslint-disable-next-line global-require, import/no-unresolved, n/no-extraneous-require
		const mod = require('@nextcloud/initial-state')
		if (typeof mod.loadState === 'function') {
			return mod.loadState(appId, key, undefined)
		}
	} catch (e) {
		// Package not installed or no slot provisioned — fall through.
	}
	return undefined
}

/**
 * Type guard — true when value is a plain (non-array, non-null) object.
 *
 * @param {*} value Candidate.
 * @return {boolean} True when value is a plain object.
 */
function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}
