import { ref } from 'vue'
// Namespace import + explicit default-unwrap: @nextcloud/axios stays external, so
// a consumer that resolves its ESM build makes `require('@nextcloud/axios')` a
// namespace `{default: axiosInstance, …}`. A plain `import axios from …` compiles
// to a bare require in our CJS dist, so `axios.interceptors` would be undefined
// → `addPasswordConfirmationInterceptors(axios)` crashes ("reading 'request'").
// Unwrap the default ourselves so it works under either resolution.
import * as axiosModule from '@nextcloud/axios'
import { generateOcsUrl, generateUrl } from '@nextcloud/router'
import {
	addPasswordConfirmationInterceptors,
	confirmPassword,
	PwdConfirmationMode,
} from '@nextcloud/password-confirmation'
import '@nextcloud/password-confirmation/style.css'
// password-confirmation renders its prompt via @nextcloud/dialogs'
// `spawnDialog`, and this composable also fires `showSuccess`/`showError`
// toasts through @nextcloud/dialogs. Since rollup now BUNDLES @nextcloud/dialogs
// (see rollup.config.js), its stylesheet is imported here so the dialog chrome
// and toasts render styled from the library's own extracted CSS — the
// password-confirmation stylesheet only covers the inner form. The rules are
// scoped (toasts under `.dialogs`, dialog/file-picker chrome under their own
// classes), so this adds no app-wide restyling.
import '@nextcloud/dialogs/style.css'

const axios = axiosModule.default || axiosModule

/**
 * Composable that installs-and-enables (or just enables) a missing
 * Nextcloud app from within a Conduction app's dependency surface.
 *
 * Implements REQ-DIA-1 of the dependency-install-actions capability.
 *
 * It wraps Nextcloud's own one-call install-and-enable primitive, which
 * downloads the app from the (signature-verified) app store if it is
 * missing, runs its migrations, and enables it — so a single call covers
 * both the "install and enable" (not installed) and "enable" (installed
 * but disabled) cases; only the calling button's *label* differs.
 *
 * The endpoint moved between Nextcloud majors, so two are tried in order:
 *  1. NC34+ — the bundled `appstore` app's OCS API:
 *     `POST /ocs/v2.php/apps/appstore/api/v1/apps/enable` with a SINGULAR
 *     `{ appId, groups: [] }` body. The legacy `/settings/apps/enable`
 *     route was REMOVED in NC34 (405).
 *  2. ≤NC33 fallback — the classic `POST /index.php/settings/apps/enable`
 *     with a PLURAL `{ appIds: [appId], groups: [] }` body. Only reached
 *     when the OCS route is absent (404/405); any other OCS error (500,
 *     403, network) is a real failure and is NOT retried on the legacy
 *     route.
 *
 * ## Password confirmation — why the two paths differ
 *
 * Both endpoints carry `#[PasswordConfirmationRequired]`, but the NC34+ OCS
 * route declares it in **strict** mode (`strict: true`,
 * `apps/appstore/lib/Controller/ApiController.php::enableApp`). In strict
 * mode Nextcloud's `PasswordConfirmationMiddleware` IGNORES the session
 * `last-password-confirm` timestamp and requires an
 * `Authorization: Basic base64(login:password)` header ON THE REQUEST
 * itself — a session-based `confirmPassword()` can therefore NEVER satisfy
 * it (it 403s with "Required authorization header missing").
 *
 * The canonical client mechanism — the one NC34's own `appstore` front-end
 * uses — is `@nextcloud/password-confirmation`'s axios interceptors:
 * `addPasswordConfirmationInterceptors(axios)` registers a request
 * interceptor that, for any request tagged
 * `{ confirmPassword: PwdConfirmationMode.Strict }`, prompts for the
 * password in a dialog and injects it as `config.auth = { username:
 * getCurrentUser().uid, password }` (which axios serialises to the required
 * Basic header) for THAT SINGLE request. The password is never stored. This
 * mirrors NC34's `appstore-main` bundle verbatim:
 * `axios.post(enableUrl, { appId, groups }, { confirmPassword: Strict })`.
 *
 * The legacy `settings/apps/enable` route is non-strict, so the session
 * `confirmPassword()` still satisfies it — that call is kept ONLY on the
 * fallback path. The two paths are mutually exclusive per Nextcloud major,
 * so a normal NC34+ install prompts exactly once (strict, in the request).
 *
 * The interceptor and `confirmPassword()` both REJECT with
 * `new Error('Dialog closed')` when the admin dismisses the prompt; that is
 * treated as a quiet user abort (no `error` surfaced), not a failure.
 *
 * The exposed refs are shared per composable instance:
 *  - `installing` — `true` for the whole duration (the strict password
 *    prompt + download + migrations can take 10–30s), `false` once settled.
 *    Drives a busy/disabled button in the calling surface.
 *  - `error` — `null` until a failure, then the server's message (from the
 *    OCS `ocs.meta.message` or the legacy `data.message`, or a generic
 *    fallback). Surfaced inline so the original store link stays usable
 *    as a fallback. Stays `null` on a cancelled password prompt.
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
 *   // error.value holds the message (null on a cancelled password dialog);
 *   // the store link remains as fallback
 * }
 */

// Register the strict/lax password-confirmation interceptors on the shared
// `@nextcloud/axios` instance ONCE at module load. The package guards against
// double-registration internally, and the interceptor is a no-op for any
// request that does NOT carry a `confirmPassword` config flag — so this never
// affects unrelated requests.
addPasswordConfirmationInterceptors(axios)

// Message the password-confirmation dialog (strict interceptor AND the
// session `confirmPassword()`) rejects with when the admin dismisses it.
const DIALOG_CANCELLED = 'Dialog closed'

/**
 * Whether a rejection is the admin dismissing the password-confirmation
 * dialog (strict interceptor or session `confirmPassword()`), as opposed to
 * a real enable failure. Cancels are quiet aborts — no `error` is surfaced.
 *
 * @param {*} err The rejected error.
 * @return {boolean} True when the admin cancelled the password prompt.
 */
function isPasswordDialogCancelled(err) {
	return Boolean(err) && err.message === DIALOG_CANCELLED
}

/**
 * Pull the most specific human-readable message out of an enable failure,
 * handling both the OCS envelope (NC34+ appstore API) and the legacy
 * settings-controller shape, then a generic fallback.
 *
 * - OCS error:    `err.response.data.ocs.meta.message`
 * - legacy error: `err.response.data.data.message` or `err.response.data.message`
 *
 * @param {*} err The rejected axios error.
 * @return {string} A message safe to surface inline.
 */
function extractErrorMessage(err) {
	const data = err && err.response && err.response.data
	return (data && data.ocs && data.ocs.meta && data.ocs.meta.message)
		|| (data && data.data && data.data.message)
		|| (data && data.message)
		|| 'Could not install and enable the app'
}

export function useAppInstaller() {
	const installing = ref(false)
	const error = ref(null)

	/**
	 * Install-and-enable `appId`, confirming the admin's password as the
	 * active endpoint requires.
	 *
	 * @param {string} appId The Nextcloud app id to install/enable.
	 * @return {Promise<void>} Resolves on HTTP 200; rejects on a cancelled
	 *   password prompt (with `error` left `null`) or an enable failure
	 *   (with `error` set to the server message).
	 */
	async function installAndEnable(appId) {
		error.value = null
		installing.value = true
		try {
			try {
				// NC34+ — bundled `appstore` OCS API (singular appId), STRICT
				// password confirmation. The registered interceptor prompts and
				// attaches `Authorization: Basic …` to THIS request; the session
				// timestamp is not consulted. No separate confirmPassword() call.
				await axios.post(
					generateOcsUrl('/apps/appstore/api/v1/apps/enable'),
					{ appId, groups: [] },
					{ confirmPassword: PwdConfirmationMode.Strict },
				)
			} catch (err) {
				// Admin dismissed the strict password prompt — abort quietly,
				// never fall back or surface an error.
				if (isPasswordDialogCancelled(err)) {
					throw err
				}
				const status = err && err.response && err.response.status
				// Only 404/405 means "route not present" (older NC without the
				// appstore app) — fall back to the legacy endpoint. Any other
				// error (500, 403, network) is a real failure: rethrow it.
				if (status !== 404 && status !== 405) {
					throw err
				}
				// ≤NC33 — classic settings route (plural appIds). This route is
				// NON-strict, so the session-based confirmPassword() satisfies
				// its PasswordConfirmationRequired; run it before the POST.
				await confirmPassword()
				await axios.post(generateUrl('/settings/apps/enable'), {
					appIds: [appId],
					groups: [],
				})
			}
		} catch (err) {
			// A cancelled password prompt (strict interceptor or legacy
			// confirmPassword()) is a user abort, not a failure: leave `error`
			// null so no spurious message is surfaced.
			if (!isPasswordDialogCancelled(err)) {
				error.value = extractErrorMessage(err)
			}
			throw err
		} finally {
			installing.value = false
		}
	}

	return { installing, error, installAndEnable }
}
