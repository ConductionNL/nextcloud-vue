import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { validateManifest } from '../utils/validateManifest.js'

/**
 * Composable that loads and validates a Conduction app manifest.
 *
 * The composable implements the three-phase flow specified in
 * REQ-JMR-002 of the json-manifest-renderer capability:
 *
 *  1. Synchronous bundled load — `bundledManifest` is the immediate value.
 *  2. Async backend merge — fetches `/index.php/apps/{appId}/api/manifest`
 *     and deep-merges any 200 response over the bundled manifest. 4xx /
 *     5xx / network errors are silently ignored so apps work without a
 *     backend endpoint.
 *  3. Validation — the merged result is validated against
 *     `app-manifest.schema.json`. On failure, the bundled manifest is
 *     kept and a `console.warn` is emitted with the error list.
 *
 * The returned manifest is reactive, so the future "app builder" backend
 * can hot-swap the manifest without a page reload.
 *
 * @param {string} appId Nextcloud app ID. Used to build the default
 *   backend endpoint URL via `@nextcloud/router`.
 * @param {object} bundledManifest The manifest shipped with the app (the
 *   default value, available synchronously).
 * @param {object} [options] Configuration options.
 * @param {string} [options.endpoint] Override the backend fetch URL.
 *   Useful for tests and alternative-host deployments.
 * @param {Function} [options.fetcher] Override the fetch function. Must
 *   return a promise resolving to `{ status: number, data: object }`.
 *   Defaults to `axios.get` from `@nextcloud/axios` (which inherits the
 *   Nextcloud CSRF token automatically).
 * @return {{ manifest: import('vue').Ref<object>, isLoading: import('vue').Ref<boolean>, validationErrors: import('vue').Ref<string[]|null> }}
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
 */
export function useAppManifest(appId, bundledManifest, options = {}) {
	const manifest = ref(bundledManifest)
	const isLoading = ref(true)
	const validationErrors = ref(null)

	const endpoint = options.endpoint ?? generateUrl(`/apps/${appId}/api/manifest`)
	const fetcher = options.fetcher ?? ((url) => axios.get(url))

	;(async () => {
		try {
			const response = await fetcher(endpoint)
			if (!response || response.status !== 200 || !response.data) {
				return
			}
			const merged = deepMerge(bundledManifest, response.data)
			const result = validateManifest(merged)
			if (!result.valid) {
				validationErrors.value = result.errors
				// eslint-disable-next-line no-console
				console.warn(
					'[useAppManifest] Backend manifest failed schema validation; falling back to bundled manifest.',
					result.errors,
				)
				return
			}
			manifest.value = merged
		} catch (err) {
			// Silent fallback on 404, network errors, non-200 responses.
			// Apps without a backend endpoint should keep working.
		} finally {
			isLoading.value = false
		}
	})()

	return { manifest, isLoading, validationErrors }
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

