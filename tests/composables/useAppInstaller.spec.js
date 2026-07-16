/**
 * Tests for useAppInstaller — install-and-enable a missing Nextcloud app
 * dependency from a Conduction app's dependency surface (REQ-DIA-1).
 *
 * The install round-trip is admin-only and mutates the live instance, so it
 * is @e2e-excluded and covered here with @nextcloud/axios and
 * @nextcloud/password-confirmation mocked at the network / password-dialog
 * boundary only.
 *
 * ## Password confirmation is now request-scoped (strict) on the modern path
 *
 * The NC34+ OCS enable route declares `#[PasswordConfirmationRequired(strict:
 * true)]`, which IGNORES the session confirmation timestamp and demands an
 * `Authorization: Basic` header ON THE REQUEST. The canonical client
 * mechanism (used by NC34's own appstore front-end) is
 * `@nextcloud/password-confirmation`'s axios interceptors:
 * `addPasswordConfirmationInterceptors(axios)` + a
 * `{ confirmPassword: PwdConfirmationMode.Strict }` request flag. The
 * interceptor prompts and injects the Basic header for that single request,
 * so the composable does NOT call the session `confirmPassword()` on the
 * modern path. Here the interceptor is mocked out (no-op), so a cancelled
 * strict prompt is simulated by the modern POST rejecting with
 * `Error('Dialog closed')` — the exact error the real interceptor throws.
 *
 * The legacy `/settings/apps/enable` route is non-strict, so the session
 * `confirmPassword()` is still called on the fallback path only.
 *
 * The composable tries the NC34+ bundled-`appstore` OCS endpoint first and
 * only falls back to the legacy route when the OCS route is absent (404/405).
 * Any other error is a real failure.
 */

const PwdConfirmationMode = { Lax: 'lax', Strict: 'strict' }

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateOcsUrl: jest.fn((path) => `/ocs/v2.php${path}`),
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))
jest.mock('@nextcloud/password-confirmation', () => ({
	addPasswordConfirmationInterceptors: jest.fn(),
	confirmPassword: jest.fn(),
	PwdConfirmationMode: { Lax: 'lax', Strict: 'strict' },
}))

const axios = require('@nextcloud/axios').default
const { generateOcsUrl, generateUrl } = require('@nextcloud/router')
const {
	addPasswordConfirmationInterceptors,
	confirmPassword,
} = require('@nextcloud/password-confirmation')
const { useAppInstaller } = require('../../src/composables/useAppInstaller.js')

const OCS_URL = '/ocs/v2.php/apps/appstore/api/v1/apps/enable'
const LEGACY_URL = '/index.php/settings/apps/enable'
// The strict-mode request flag the modern POST must carry so the interceptor
// prompts and attaches the Basic auth header.
const STRICT_CFG = { confirmPassword: PwdConfirmationMode.Strict }

describe('useAppInstaller', () => {
	beforeEach(() => {
		axios.post.mockReset()
		confirmPassword.mockReset()
		generateOcsUrl.mockClear()
		generateUrl.mockClear()
	})

	it('registers the password-confirmation axios interceptors once at module load', () => {
		// The interceptors must be wired onto the shared @nextcloud/axios
		// instance so the strict `confirmPassword` request flag is honoured.
		expect(addPasswordConfirmationInterceptors).toHaveBeenCalledWith(axios)
	})

	it('POSTs the NC34+ OCS appstore endpoint with a singular appId and the STRICT confirm flag', async () => {
		// Scenario: confirm password (strict, in-request) then enable.
		axios.post.mockResolvedValue({ status: 200, data: { ocs: { data: { update_required: false } } } })

		const { installing, error, installAndEnable } = useAppInstaller()
		expect(installing.value).toBe(false)

		await installAndEnable('openregister')

		// Modern path carries the strict flag; the interceptor (real) adds the
		// Authorization: Basic header. The session confirmPassword() is NOT used.
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenCalledWith(
			OCS_URL,
			{ appId: 'openregister', groups: [] },
			STRICT_CFG,
		)
		expect(confirmPassword).not.toHaveBeenCalled()
		// Never touches the legacy route on success.
		expect(axios.post).not.toHaveBeenCalledWith(LEGACY_URL, expect.anything())
		// Settles back to idle with no error on success.
		expect(installing.value).toBe(false)
		expect(error.value).toBe(null)
	})

	it('flips installing to true while the request is in flight', async () => {
		let resolvePost
		axios.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))

		const { installing, installAndEnable } = useAppInstaller()
		const pending = installAndEnable('openregister')
		// Let the post start (the strict prompt is inside the interceptor).
		await Promise.resolve()
		await Promise.resolve()
		expect(installing.value).toBe(true)

		resolvePost({ status: 200, data: {} })
		await pending
		expect(installing.value).toBe(false)
	})

	it('aborts WITHOUT an error when the strict password prompt is cancelled', async () => {
		// Scenario: password confirmation cancelled. The real strict interceptor
		// rejects the request with Error('Dialog closed'); here the mocked axios
		// stands in for it.
		axios.post.mockRejectedValueOnce(new Error('Dialog closed'))

		const { installing, error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('openregister')).rejects.toThrow('Dialog closed')
		// The modern POST was attempted (the prompt lives inside it), but the
		// cancel must NOT fall back to the legacy route…
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post).not.toHaveBeenCalledWith(LEGACY_URL, expect.anything())
		// …and must NOT surface a spurious error.
		expect(error.value).toBe(null)
		expect(installing.value).toBe(false)
	})

	it('falls back to the legacy /settings/apps/enable route (with session confirmPassword) when the OCS route is absent (405)', async () => {
		// Scenario: 405 -> legacy fallback success. The legacy route is
		// non-strict, so the session confirmPassword() is used there.
		confirmPassword.mockResolvedValue(undefined)
		axios.post
			.mockRejectedValueOnce({ response: { status: 405 } })
			.mockResolvedValueOnce({ status: 200, data: { update_required: false } })

		const { installing, error, installAndEnable } = useAppInstaller()

		await installAndEnable('deck')

		expect(axios.post).toHaveBeenCalledTimes(2)
		expect(axios.post).toHaveBeenNthCalledWith(1, OCS_URL, { appId: 'deck', groups: [] }, STRICT_CFG)
		// Session confirmPassword() runs before the legacy POST.
		expect(confirmPassword).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenNthCalledWith(2, LEGACY_URL, { appIds: ['deck'], groups: [] })
		expect(installing.value).toBe(false)
		expect(error.value).toBe(null)
	})

	it('falls back on a 404 as well (older NC without the appstore app)', async () => {
		confirmPassword.mockResolvedValue(undefined)
		axios.post
			.mockRejectedValueOnce({ response: { status: 404 } })
			.mockResolvedValueOnce({ status: 200, data: {} })

		const { error, installAndEnable } = useAppInstaller()

		await installAndEnable('deck')

		expect(axios.post).toHaveBeenCalledTimes(2)
		expect(confirmPassword).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenNthCalledWith(2, LEGACY_URL, { appIds: ['deck'], groups: [] })
		expect(error.value).toBe(null)
	})

	it('surfaces the legacy failure when the fallback route also fails (405 -> legacy failure)', async () => {
		// Scenario: 405 -> legacy fallback failure
		confirmPassword.mockResolvedValue(undefined)
		axios.post
			.mockRejectedValueOnce({ response: { status: 405 } })
			.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Could not download app' } } })

		const { installing, error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('deck')).rejects.toBeDefined()
		expect(axios.post).toHaveBeenCalledTimes(2)
		expect(error.value).toBe('Could not download app')
		expect(installing.value).toBe(false)
	})

	it('aborts WITHOUT an error when the legacy-path session confirmPassword is cancelled', async () => {
		// 405 sends us to the legacy path; the admin then cancels the session
		// password dialog — confirmPassword() rejects with Error('Dialog closed').
		confirmPassword.mockRejectedValueOnce(new Error('Dialog closed'))
		axios.post.mockRejectedValueOnce({ response: { status: 405 } })

		const { installing, error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('deck')).rejects.toThrow('Dialog closed')
		// Only the modern POST ran; the legacy POST is never reached because the
		// session confirmation was cancelled first.
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(error.value).toBe(null)
		expect(installing.value).toBe(false)
	})

	it('does NOT fall back on a modern 500 — it is a real failure, not a missing route', async () => {
		// Scenario: modern 500 does NOT fall back
		axios.post.mockRejectedValueOnce({
			response: { status: 500, data: { ocs: { meta: { statuscode: 500, message: 'could not enable app' } } } },
		})

		const { installing, error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('openregister')).rejects.toBeDefined()
		// Only the OCS endpoint is called; the legacy route is never tried and
		// the session confirmPassword() is never used.
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenCalledWith(OCS_URL, { appId: 'openregister', groups: [] }, STRICT_CFG)
		expect(confirmPassword).not.toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalledWith(LEGACY_URL, expect.anything())
		expect(installing.value).toBe(false)
		expect(error.value).toBe('could not enable app')
	})

	it('does NOT fall back on a modern 403 (strict auth rejected) — it is a real failure', async () => {
		// A 403 from the strict middleware ("Required authorization header
		// missing" / wrong password) is a genuine failure, NOT a missing route.
		axios.post.mockRejectedValueOnce({
			response: { status: 403, data: { ocs: { meta: { message: 'Password confirmation is required' } } } },
		})

		const { error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('openregister')).rejects.toBeDefined()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post).not.toHaveBeenCalledWith(LEGACY_URL, expect.anything())
		expect(error.value).toBe('Password confirmation is required')
	})

	it('extracts the message from the OCS error envelope (ocs.meta.message)', async () => {
		// Scenario: OCS error message extraction
		axios.post.mockRejectedValueOnce({
			response: { status: 500, data: { ocs: { meta: { message: 'App not found in any app store' } } } },
		})

		const { error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('nope')).rejects.toBeDefined()
		expect(error.value).toBe('App not found in any app store')
	})

	it('extracts the message from the legacy data.message shape', async () => {
		// Scenario: legacy enable endpoint fails after fallback
		confirmPassword.mockResolvedValue(undefined)
		axios.post
			.mockRejectedValueOnce({ response: { status: 405 } })
			.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Could not download app' } } })

		const { error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('openregister')).rejects.toBeDefined()
		expect(error.value).toBe('Could not download app')
	})

	it('falls back to a generic error message when the failure carries no message', async () => {
		axios.post.mockRejectedValueOnce({ response: { status: 500 } })

		const { error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('deck')).rejects.toBeDefined()
		expect(error.value).toBe('Could not install and enable the app')
	})
})
