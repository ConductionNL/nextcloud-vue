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
 * and enabled.
 *
 * Implements REQ-JMR-012 of the json-manifest-renderer capability:
 *  - generic over `appId` so callers can check `openregister`,
 *    `opencatalogi`, or any other Nextcloud app
 *  - results are cached per `appId` for the page lifetime; repeated
 *    calls reuse the same refs without re-checking
 *  - on error the composable falls back to `{ installed: false,
 *    enabled: false }` and logs a `console.warn`, so a failed
 *    lookup never crashes the app shell
 *
 * Detection order:
 *  1. `OC.appswebroots[appId]` — a global object Nextcloud injects on
 *     every authenticated page load that contains a key for every app
 *     enabled for the current user. This is the most reliable signal:
 *     it doesn't require the target app to opt into the capabilities
 *     API, and it reflects per-user enablement.
 *  2. `getCapabilities()[appId]` — falls back to the capabilities
 *     bootstrap when `OC` is not available (rare; mostly for tests).
 *     Apps that implement `\OCP\Capabilities\ICapability` advertise
 *     themselves here.
 *
 * Most Conduction / OpenRegister-backed apps do NOT register a
 * capability key, which is why the appswebroots check has to come
 * first — capabilities alone would report every Conduction app as
 * "missing" even when they are installed and enabled.
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
		// Primary check: the global `OC.appswebroots` map. NC populates
		// this with one key per app enabled for the current user. Tests
		// running outside a real Nextcloud page won't have it, in which
		// case we fall through to the capabilities check.
		const ocAppsWebRoots = (typeof OC !== 'undefined' && OC && OC.appswebroots) || null
		if (ocAppsWebRoots && Object.prototype.hasOwnProperty.call(ocAppsWebRoots, appId)) {
			installed.value = true
			enabled.value = true
			return result
		}

		// Secondary check: capabilities API. Only apps that implement
		// `ICapability` advertise themselves here.
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
			`[useAppStatus] Failed to determine status for "${appId}":`,
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
