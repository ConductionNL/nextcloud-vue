import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { ref } from 'vue'
import { resolveManifestSentinels } from '../utils/resolveManifestSentinels.js'
import { validateManifest } from '../utils/validateManifest.js'

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
 * The returned manifest is reactive, so the future "app builder" backend
 * can hot-swap the manifest without a page reload.
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
	const manifest = ref(input.manifest)
	const isLoading = ref(false)
	const validationErrors = ref(null)
	const unresolvedSentinels = ref([])

	if (input.validate === true) {
		const result = validateManifest(input.manifest)
		if (!result.valid) {
			validationErrors.value = result.errors

			console.warn(
				'[useAppManifest] In-memory manifest failed schema validation; manifest is mounted unchanged (validation is informational).',
				result.errors,
			)
		}
	}

	return { manifest, isLoading, validationErrors, unresolvedSentinels }
}

/**
 * Legacy fetch-and-merge branch — synchronous bundled load, async backend
 * merge, sentinel resolution, validation. Implements REQ-JMR-002 of the
 * `json-manifest-renderer` capability. Preserved verbatim for backwards
 * compatibility with all current consumers (OpenRegister, OpenCatalogi,
 * Procest, Pipelinq, MyDash, decidesk, docudesk, larpingapp,
 * softwarecatalog).
 *
 * @param {string} appId Nextcloud app ID.
 * @param {object} bundledManifest The manifest shipped with the app.
 * @param {object} options Configuration options (endpoint / fetcher /
 *   getAppConfigValue overrides).
 * @return {{ manifest: import('vue').Ref<object>, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null>, unresolvedSentinels: import('vue').Ref<string[]> }}
 */
function loadFromBackend(appId, bundledManifest, options) {
	const manifest = ref(bundledManifest)
	const isLoading = ref(true)
	const validationErrors = ref(null)
	const unresolvedSentinels = ref([])

	const endpoint = options.endpoint ?? generateUrl(`/apps/${appId}/api/manifest`)
	const fetcher = options.fetcher ?? ((url) => axios.get(url))

	;(async () => {
		try {
			const response = await fetcher(endpoint)
			if (!response || response.status !== 200 || !response.data) {
				return
			}
			const merged = deepMerge(bundledManifest, response.data)

			// Sentinel resolution runs BEFORE validation per
			// REQ-MRS-002: the validator MUST NEVER observe an
			// unresolved sentinel at runtime. Resolution failures
			// (unset IAppConfig keys) substitute null and accumulate
			// on `unresolvedSentinels`; they do NOT block validation.
			const { manifest: resolved, unresolved } = await resolveManifestSentinels(merged, appId, {
				getAppConfigValue: options.getAppConfigValue,
			})
			unresolvedSentinels.value = unresolved

			const result = validateManifest(resolved)
			if (!result.valid) {
				validationErrors.value = result.errors

				console.warn(
					'[useAppManifest] Backend manifest failed schema validation; falling back to bundled manifest.',
					result.errors,
				)
				return
			}
			manifest.value = resolved
		} catch (_err) {
			// Silent fallback on 404, network errors, non-200 responses.
			// Apps without a backend endpoint should keep working.
		} finally {
			isLoading.value = false
		}
	})()

	return { manifest, isLoading, validationErrors, unresolvedSentinels }
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
