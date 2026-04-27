import { ref } from 'vue'
import { getCapabilities } from '@nextcloud/capabilities'

/**
 * Per-`appId` cache of status results. Populated lazily on first call.
 *
 * The Vue refs themselves are stored in the cache; subsequent calls for
 * the same `appId` return the same refs so all consumers share state.
 *
 * Module-level lifetime — survives until the page is reloaded.
 */
const cache = new Map()

/**
 * Composable that reports whether a given Nextcloud app is installed
 * and enabled, by checking the bootstrapped capabilities object.
 *
 * Implements REQ-JMR-012 of the json-manifest-renderer capability:
 *  - generic over `appId` so callers can check `openregister`,
 *    `opencatalogi`, or any other Conduction app
 *  - results are cached per `appId` for the page lifetime; repeated
 *    calls reuse the same refs without re-invoking `getCapabilities()`
 *  - on error the composable falls back to `{ installed: false,
 *    enabled: false }` and logs a `console.warn`, so a failed
 *    capabilities read never crashes the app shell
 *
 * The current implementation reads from `@nextcloud/capabilities`,
 * which is populated synchronously at page bootstrap. The OCS apps
 * endpoint is not used as a fallback today; if/when capabilities turn
 * out to lag a fresh app install, that fallback is a small addition.
 *
 * @param {string} appId Nextcloud app id (e.g. `"openregister"`).
 * @return {{ installed: import('vue').Ref<boolean>, enabled: import('vue').Ref<boolean>, loading: import('vue').Ref<boolean> }}
 *
 * @example
 * const { installed, enabled, loading } = useAppStatus('openregister')
 * // After loading.value flips to false, installed.value is the answer.
 */
export function useAppStatus(appId) {
	if (cache.has(appId)) {
		return cache.get(appId)
	}

	const installed = ref(false)
	const enabled = ref(false)
	const loading = ref(true)

	const result = { installed, enabled, loading }
	cache.set(appId, result)

	try {
		const capabilities = getCapabilities()
		if (
			capabilities
			&& typeof capabilities === 'object'
			&& Object.prototype.hasOwnProperty.call(capabilities, appId)
		) {
			installed.value = true
			enabled.value = true
		}
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn(
			`[useAppStatus] Failed to read capabilities for "${appId}":`,
			err,
		)
		// installed and enabled stay false
	} finally {
		loading.value = false
	}

	return result
}

/**
 * Test-only helper to reset the per-`appId` cache. Not exported from
 * the package barrel — only the test suite imports it directly.
 *
 * @internal
 */
export function __resetAppStatusCacheForTests() {
	cache.clear()
}
