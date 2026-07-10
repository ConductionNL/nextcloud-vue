import { ref } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { confirmPassword } from '@nextcloud/password-confirmation'
import '@nextcloud/password-confirmation/style.css'

/**
 * Composable that installs-and-enables (or just enables) a missing
 * Nextcloud app from within a Conduction app's dependency surface.
 *
 * Implements REQ-DIA-1 of the dependency-install-actions capability.
 *
 * It wraps Nextcloud's own one-call primitive
 * `POST /index.php/settings/apps/enable`, which downloads the app from
 * the (signature-verified) app store if it is missing, runs its
 * migrations, and enables it — so a single call covers both the
 * "install and enable" (not installed) and "enable" (installed but
 * disabled) cases; only the calling button's *label* differs.
 *
 * The endpoint is admin-only, CSRF-protected (handled automatically by
 * `@nextcloud/axios`) and carries `#[PasswordConfirmationRequired]`,
 * which is why `confirmPassword()` from `@nextcloud/password-confirmation`
 * MUST run first. A cancelled/rejected confirmation short-circuits
 * without ever calling the endpoint.
 *
 * The exposed refs are shared per composable instance:
 *  - `installing` — `true` for the whole duration (download + migrations
 *    can take 10–30s), `false` once settled. Drives a busy/disabled
 *    button in the calling surface.
 *  - `error` — `null` until a failure, then the server's `data.message`
 *    (or a generic fallback). Surfaced inline so the original store link
 *    stays usable as a fallback.
 *
 * On success the caller is expected to `window.location.reload()` — a
 * freshly installed app's JS/CSS and its `OC.appswebroots` entry only
 * exist after a full page load, and `useAppStatus` caches results
 * module-side for the page lifetime.
 *
 * @return {{ installing: import('vue').Ref<boolean>, error: import('vue').Ref<string|null>, installAndEnable: (appId: string) => Promise<void> }}
 *
 * @example
 * const { installing, error, installAndEnable } = useAppInstaller()
 * try {
 *   await installAndEnable('openregister')
 *   window.location.reload()
 * } catch (e) {
 *   // error.value holds the message; the store link remains as fallback
 * }
 */
export function useAppInstaller() {
	const installing = ref(false)
	const error = ref(null)

	/**
	 * Confirm the admin's password, then install-and-enable `appId`.
	 *
	 * @param {string} appId The Nextcloud app id to install/enable.
	 * @return {Promise<void>} Resolves on HTTP 200; rejects on a cancelled
	 *   password confirmation or an enable failure (with `error` set).
	 */
	async function installAndEnable(appId) {
		error.value = null

		// #[PasswordConfirmationRequired] — a rejected/cancelled dialog
		// short-circuits before we touch the endpoint. Do NOT flip
		// `installing` yet: cancelling must leave it `false`.
		try {
			await confirmPassword()
		} catch (err) {
			// User dismissed the password dialog — not an error to surface.
			installing.value = false
			throw err
		}

		installing.value = true
		try {
			await axios.post(generateUrl('/settings/apps/enable'), {
				appIds: [appId],
				groups: [],
			})
		} catch (err) {
			error.value = (err && err.response && err.response.data && err.response.data.message)
				|| 'Could not install and enable the app'
			throw err
		} finally {
			installing.value = false
		}
	}

	return { installing, error, installAndEnable }
}
