import { ref, shallowRef } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { resolveManifestSentinels } from '../utils/resolveManifestSentinels.js'
import { mergeManifestDelta } from '../utils/mergeManifestDelta.js'

/**
 * Lazily import the manifest validator. The validator plus its compiled Ajv
 * artifact weigh ~340KB minified and most apps never validate at runtime —
 * a static import makes every consumer bundle carry them. The dynamic import
 * splits them into an async chunk fetched on first validation only.
 *
 * @return {Promise<Function>} The validateManifest function.
 */
function loadValidator() {
	return import(/* webpackChunkName: "cn-manifest-validator" */ '../utils/validateManifest.js')
		.then((mod) => mod.validateManifest)
}

/**
 * Composable that loads, resolves, and validates a Conduction app manifest.
 *
 * Two call shapes are supported:
 *
 *  1. **Legacy positional signature** —
 *     `useAppManifest(appId, bundledManifest, options?)`.
 *     Implements the four-phase flow specified in REQ-JMR-002 of the
 *     `json-manifest-renderer` capability + the substitution step from the
 *     `manifest-resolve-sentinel` capability:
 *
 *      1. Synchronous bundled load — `bundledManifest` is the immediate value.
 *      2. Async backend merge — fetches `/index.php/apps/{appId}/api/manifest`
 *         and deep-merges any 200 response over the bundled manifest. 4xx /
 *         5xx / network errors are silently ignored so apps work without a
 *         backend endpoint.
 *      3. Sentinel resolution — `@resolve:<key>` strings under
 *         `pages[].config` are substituted with `IAppConfig` values via
 *         the `resolveManifestSentinels` utility (see its module docs for
 *         the resolution source chain). Unresolved keys surface on the
 *         returned `unresolvedSentinels` ref.
 *      4. Validation — the resolved result is validated against
 *         `app-manifest.schema.json`. On failure, the bundled manifest is
 *         kept and a `console.warn` is emitted with the error list.
 *
 *  2. **In-memory signature** —
 *     `useAppManifest({ manifest, validate? })`.
 *     Mounts an already-constructed manifest object synchronously, with no
 *     backend fetch, no deep-merge, and no sentinel resolution. Designed
 *     for virtual-app hosts (e.g. the OpenBuilt app builder) that build
 *     their manifests in memory from store state. When `validate: true`,
 *     `validateManifest` is called synchronously before returning and any
 *     failures populate `validationErrors`; validation is informational —
 *     the input manifest is never replaced.
 *
 * The two shapes are discriminated by inspecting `typeof arguments[0]`:
 *  - `string` → legacy fetch-and-merge branch
 *  - non-null plain `object` → in-memory branch
 *
 * Both branches return the same shape:
 * `{ manifest, isLoading, validationErrors, unresolvedSentinels }`.
 *
 * The returned manifest ref is **shallow by default** (`shallowRef`) —
 * reactivity tracks `.value` reassignment (the hot-swap the future "app
 * builder" backend performs) but NOT deep mutation of the manifest's own
 * nested properties, so the whole manifest graph is not deep-observed on
 * boot. Every read-only consumer (`CnAppNav`, `CnPageRenderer`,
 * `CnDashboardPage`, …) only reads the tree and re-renders on the ref swap.
 * `CnAppRoot` upgrades the *same* object to deep-reactive IN PLACE (Vue 2.7
 * `reactive()`, preserving object identity) only when OpenBuild in-app
 * editing is available — see `manifest-shallow-reactivity-by-default` and
 * `useManifestEditor.upgradeManifestToEditable`. The object is deliberately
 * NOT `markRaw`'d, because `markRaw` would make that in-place `reactive()`
 * upgrade a silent no-op and break ADR-041 live editing.
 *
 * @param {string | { manifest: object, validate?: boolean }} appIdOrOptions
 *   Either a Nextcloud app ID (legacy positional signature) OR an options
 *   object whose `manifest` field is the canonical, in-memory manifest
 *   (in-memory signature).
 * @param {object} [bundledManifest] Manifest shipped with the app. Only
 *   read when `appIdOrOptions` is a string (legacy signature); ignored in
 *   the in-memory signature.
 * @param {object} [options] Configuration options. Only read in the
 *   legacy signature; ignored in the in-memory signature.
 * @param {string} [options.endpoint] Override the backend fetch URL.
 *   Useful for tests and alternative-host deployments.
 * @param {Function} [options.fetcher] Override the fetch function. Must
 *   return a promise resolving to `{ status: number, data: object }`.
 *   Defaults to `axios.get` from `@nextcloud/axios` (which inherits the
 *   Nextcloud CSRF token automatically).
 * @param {Function} [options.getAppConfigValue] Override the
 *   IAppConfig resolver consumed by `resolveManifestSentinels`. Useful
 *   for tests that want to mount a fixture-driven config map.
 * @return {{ manifest: import('vue').Ref<object>, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null>, unresolvedSentinels: import('vue').Ref<string[]> }}
 *
 * @example Basic usage (Composition API)
 * const { manifest, isLoading } = useAppManifest('decidesk', bundled)
 *
 * @example Inside an Options API component
 * export default {
 *   setup() {
 *     return useAppManifest('decidesk', bundled)
 *   },
 * }
 *
 * @example Custom endpoint and fetcher (e.g. for tests)
 * useAppManifest('decidesk', bundled, {
 *   endpoint: '/custom/manifest/url',
 *   fetcher: (url) => Promise.resolve({ status: 200, data: { ... } }),
 * })
 *
 * @example With sentinel resolution + admin warning surface
 * const { manifest, unresolvedSentinels } = useAppManifest('softwarecatalog', bundled)
 * // unresolvedSentinels.value is e.g. ['voorzieningen_register']
 * // when that IAppConfig key is unset on the tenant.
 *
 * @example In-memory manifest (virtual-app host, e.g. OpenBuilt)
 * const builderManifest = buildManifestFromStore()
 * const { manifest, isLoading } = useAppManifest({ manifest: builderManifest })
 * // isLoading.value === false immediately; no HTTP fetch is issued.
 *
 * @example In-memory manifest with pre-mount validation
 * const { manifest, validationErrors } = useAppManifest({
 *   manifest: builderManifest,
 *   validate: true,
 * })
 * // validationErrors.value is null on success or string[] on failure.
 * // Validation is informational — the manifest is mounted either way.
 */
export function useAppManifest(appIdOrOptions, bundledManifest, options = {}) {
	// REQ-IMM-001 / REQ-IMM-004 — discriminate the call shape on the
	// first argument: a string enters the legacy fetch-and-merge branch;
	// a non-null plain object enters the new in-memory branch.
	if (isPlainObject(appIdOrOptions)) {
		return loadInMemory(appIdOrOptions)
	}

	return loadFromBackend(appIdOrOptions, bundledManifest, options)
}

/**
 * In-memory branch — mount a manifest object synchronously without any
 * backend fetch, deep-merge, or sentinel resolution.
 *
 * Implements REQ-IMM-001..REQ-IMM-003 of the
 * `in-memory-app-manifest-loader` capability:
 *
 *  - `manifest` ref holds the input object by reference (no clone, no
 *    mutation).
 *  - `isLoading` is `false` from the first read because nothing is queued.
 *  - `validationErrors` is `null` unless `options.validate === true` and
 *    `validateManifest` returns a non-empty error list.
 *  - `unresolvedSentinels` is always `[]` — sentinel resolution is a
 *    backend-merge concern and does not apply to in-memory manifests.
 *
 * Validation is informational, mirroring the legacy branch's policy
 * (REQ-JMR-002 / Decision 2 in the change design): a failure emits a
 * `console.warn` and populates `validationErrors`, but the manifest is
 * never replaced.
 *
 * @param {{ manifest: object, validate?: boolean }} input The options
 *   object passed to `useAppManifest`.
 * @return {{ manifest: import('vue').Ref<object>, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null>, unresolvedSentinels: import('vue').Ref<string[]> }}
 */
function loadInMemory(input) {
	// Shallow by default (manifest-shallow-reactivity-by-default): track the
	// ref reassignment, not deep mutation of the manifest tree. NOT markRaw'd —
	// CnAppRoot upgrades this same object in place via reactive() when OpenBuild
	// editing is available, which markRaw would silently block.
	const manifest = shallowRef(input.manifest)
	const isLoading = ref(false)
	const validationErrors = ref(null)
	const unresolvedSentinels = ref([])
	const orphanedDeltaPaths = ref([])

	if (input.validate === true) {
		// Fire-and-forget: validation here is informational (the manifest is
		// mounted unchanged either way), so the lazy validator load may
		// resolve after mount — validationErrors is a ref consumers watch.
		loadValidator().then((validateManifest) => {
			const result = validateManifest(input.manifest)
			if (!result.valid) {
				validationErrors.value = result.errors
				// eslint-disable-next-line no-console
				console.warn(
					'[useAppManifest] In-memory manifest failed schema validation; manifest is mounted unchanged (validation is informational).',
					result.errors,
				)
			}
		})
	}

	return { manifest, isLoading, validationErrors, unresolvedSentinels, orphanedDeltaPaths }
}

/**
 * Legacy fetch-and-merge branch — synchronous bundled load, async backend
 * merge, sentinel resolution, validation. Implements REQ-JMR-002 of the
 * `json-manifest-renderer` capability. Preserved verbatim for backwards
 * compatibility with all current consumers (OpenRegister, OpenCatalogi,
 * Procest, Pipelinq, LaunchPad, decidesk, docudesk, larpingapp,
 * softwarecatalog).
 *
 * @param {string} appId Nextcloud app ID.
 * @param {object} bundledManifest The manifest shipped with the app.
 * @param {object} options Configuration options (endpoint / fetcher /
 *   getAppConfigValue overrides).
 * @return {{ manifest: import('vue').Ref<object>, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null>, unresolvedSentinels: import('vue').Ref<string[]> }}
 */
function loadFromBackend(appId, bundledManifest, options) {
	// Shallow by default (manifest-shallow-reactivity-by-default) — see
	// loadInMemory. The later `manifest.value = resolved` swap still triggers
	// reactivity because reassigning the shallowRef itself is tracked.
	const manifest = shallowRef(bundledManifest)
	const isLoading = ref(true)
	const validationErrors = ref(null)
	const unresolvedSentinels = ref([])
	const orphanedDeltaPaths = ref([])

	const endpoint = options.endpoint ?? generateUrl(`/apps/${appId}/api/manifest`)
	const fetcher = options.fetcher ?? ((url) => axios.get(url))

	;(async () => {
		try {
			// Phase 1: optional backend merge. The fetch is best-effort —
			// most apps DON'T serve `/api/manifest` (Nextcloud returns the
			// SPA index HTML with a 200, which is not a plain object), so
			// `base` stays the bundled manifest in the common case. Any
			// failure here is swallowed and we proceed with `bundledManifest`.
			let base = bundledManifest
			try {
				const response = await fetcher(endpoint)
				// Only a 200 with a plain-object body is a real manifest
				// response. An HTML string (SPA fallback), a non-200, or a
				// missing body all mean "no backend manifest" → keep bundled.
				if (response && response.status === 200 && isPlainObject(response.data)) {
					// `delta` mode applies a keyed structural delta to the
					// bundled manifest (ADR-036 Amendment); default mode
					// deep-merges as before.
					if (options.mergeStrategy === 'delta') {
						const deltaResult = mergeManifestDelta(bundledManifest, response.data)
						base = deltaResult.manifest
						orphanedDeltaPaths.value = deltaResult.orphanedDeltaPaths
					} else {
						base = deepMerge(bundledManifest, response.data)
					}
				}
			} catch (fetchErr) {
				// Network / 404 / unauthenticated — keep the bundled manifest.
			}

			// Phase 2: sentinel resolution ALWAYS runs, on the bundled (or
			// merged) manifest, INDEPENDENT of whether the backend fetch
			// succeeded. `@resolve:<key>` sentinels resolve from
			// `@nextcloud/initial-state` (zero-network) then a per-key
			// `/api/configs/{key}` fetch — neither depends on `/api/manifest`
			// serving a valid body. Previously this only ran inside the
			// successful-fetch branch, so the >90% of apps that don't serve
			// `/api/manifest` never had their sentinels substituted.
			//
			// Runs BEFORE validation per REQ-MRS-002: the validator MUST
			// NEVER observe an unresolved sentinel. Resolution failures
			// (unset IAppConfig keys) substitute null and accumulate on
			// `unresolvedSentinels`; they do NOT block validation.
			const { manifest: resolved, unresolved } = await resolveManifestSentinels(base, appId, {
				getAppConfigValue: options.getAppConfigValue,
			})
			unresolvedSentinels.value = unresolved

			// Phase 3: validation. On failure, keep the bundled manifest
			// (informational policy — never replace with an invalid doc).
			const validateManifest = await loadValidator()
			const result = validateManifest(resolved)
			if (!result.valid) {
				validationErrors.value = result.errors
				// eslint-disable-next-line no-console
				console.warn(
					'[useAppManifest] Resolved manifest failed schema validation; keeping the unresolved bundled manifest.',
					result.errors,
				)
				return
			}
			// Publish the resolved manifest whenever it differs from the
			// bundled input (sentinels substituted and/or backend merged).
			// The shallowRef reassignment is what re-renders consumers; the new
			// object stays shallow (not deep-observed) unless CnAppRoot upgrades it.
			manifest.value = resolved
		} catch (err) {
			// Defensive: any unexpected error leaves the bundled manifest in
			// place. Apps without a backend endpoint keep working.
		} finally {
			isLoading.value = false
		}
	})()

	return { manifest, isLoading, validationErrors, unresolvedSentinels, orphanedDeltaPaths }
}

/**
 * Deep-merge `source` into `target`, returning a new object. Plain
 * objects are merged recursively; arrays are replaced (not concatenated)
 * to match typical deep-merge semantics expected by manifest overrides.
 *
 * @param {object} target Base object.
 * @param {object} source Object whose values take precedence.
 * @return {object} New merged object.
 */
function deepMerge(target, source) {
	if (!isPlainObject(target)) return source
	if (!isPlainObject(source)) return source
	const out = { ...target }
	for (const key of Object.keys(source)) {
		if (isPlainObject(source[key]) && isPlainObject(target[key])) {
			out[key] = deepMerge(target[key], source[key])
		} else {
			out[key] = source[key]
		}
	}
	return out
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}
