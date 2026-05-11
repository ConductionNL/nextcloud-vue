import { getCapabilities } from '@nextcloud/capabilities'

/**
 * Per-page-load cache for app-installed lookups.
 *
 * The key is the appId string; the value is a boolean — `true` when the
 * app is installed and enabled for the current user. The cache is
 * populated lazily on first access and is never invalidated during the
 * page lifetime (apps cannot be installed/enabled at runtime without a
 * page reload).
 *
 * @type {Map<string, boolean>}
 */
const _cache = new Map()

/**
 * Check whether a given Nextcloud app is currently installed and enabled.
 *
 * Uses the same two-step detection strategy as `useAppStatus`:
 *  1. `OC.appswebroots[appId]` — the global map Nextcloud injects on
 *     every authenticated page. One key per app enabled for the current
 *     user; this is the most reliable signal and does NOT require the
 *     target app to register a capability.
 *  2. `getCapabilities()[appId]` — fallback for environments where
 *     `window.OC` is absent (tests, headless builds). Only apps that
 *     implement `\OCP\Capabilities\ICapability` appear here.
 *
 * Results are cached for the lifetime of the page load so nav filtering
 * never issues more than one lookup per appId.
 *
 * On any error the function returns `false` and logs a console warning —
 * the nav item hides on uncertainty rather than leaking a cross-app link
 * to a possibly-missing app.
 *
 * @param {string} appId Nextcloud app id to check (e.g. `"mydash"`).
 * @return {boolean} True when the app is installed and enabled.
 */
export function isAppInstalled(appId) {
	if (_cache.has(appId)) {
		return _cache.get(appId)
	}

	let result = false

	try {
		// Primary check: OC.appswebroots (most reliable — set per-user).
		const ocAppsWebRoots = (typeof OC !== 'undefined' && OC && OC.appswebroots) || null
		if (ocAppsWebRoots && Object.prototype.hasOwnProperty.call(ocAppsWebRoots, appId)) {
			result = true
		} else {
			// Secondary check: capabilities bootstrap.
			const capabilities = getCapabilities()
			if (
				capabilities
				&& typeof capabilities === 'object'
				&& Object.prototype.hasOwnProperty.call(capabilities, appId)
			) {
				result = true
			}
		}
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn(`[appInstalled] Failed to determine status for "${appId}":`, err)
		result = false
	}

	_cache.set(appId, result)
	return result
}

/**
 * Test-only helper that clears the per-appId cache. Not re-exported
 * from the package barrel — tests import it directly.
 *
 * @internal
 */
export function __resetAppInstalledCacheForTests() {
	_cache.clear()
}
