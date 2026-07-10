/**
 * Tests for useAppInstaller — install-and-enable a missing Nextcloud app
 * dependency from a Conduction app's dependency surface (REQ-DIA-1).
 *
 * The confirmPassword() + settings/apps/enable round-trip is admin-only
 * and mutates the live instance, so it is @e2e-excluded and covered here
 * with @nextcloud/axios and @nextcloud/password-confirmation mocked at the
 * network / password-dialog boundary only.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))
jest.mock('@nextcloud/password-confirmation', () => ({
	confirmPassword: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const { generateUrl } = require('@nextcloud/router')
const { confirmPassword } = require('@nextcloud/password-confirmation')
const { useAppInstaller } = require('../../src/composables/useAppInstaller.js')

describe('useAppInstaller', () => {
	beforeEach(() => {
		axios.post.mockReset()
		confirmPassword.mockReset()
		generateUrl.mockClear()
	})

	it('confirms the password, then POSTs settings/apps/enable with the right body', async () => {
		// Scenario: confirm password then enable
		confirmPassword.mockResolvedValue(undefined)
		axios.post.mockResolvedValue({ status: 200, data: { update_required: false } })

		const { installing, error, installAndEnable } = useAppInstaller()
		expect(installing.value).toBe(false)

		await installAndEnable('openregister')

		expect(confirmPassword).toHaveBeenCalledTimes(1)
		expect(axios.post).toHaveBeenCalledWith('/index.php/settings/apps/enable', {
			appIds: ['openregister'],
			groups: [],
		})
		// Settles back to idle with no error on success.
		expect(installing.value).toBe(false)
		expect(error.value).toBe(null)
	})

	it('flips installing to true while the request is in flight', async () => {
		confirmPassword.mockResolvedValue(undefined)
		let resolvePost
		axios.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))

		const { installing, installAndEnable } = useAppInstaller()
		const pending = installAndEnable('openregister')
		// Let confirmPassword resolve and the post start.
		await Promise.resolve()
		await Promise.resolve()
		expect(installing.value).toBe(true)

		resolvePost({ status: 200, data: {} })
		await pending
		expect(installing.value).toBe(false)
	})

	it('does NOT call the enable endpoint when the password confirmation is cancelled', async () => {
		// Scenario: password confirmation cancelled
		confirmPassword.mockRejectedValue(new Error('cancelled'))

		const { installing, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('openregister')).rejects.toThrow('cancelled')
		expect(axios.post).not.toHaveBeenCalled()
		expect(installing.value).toBe(false)
	})

	it('sets error from data.message and rejects when the enable endpoint fails', async () => {
		// Scenario: enable endpoint fails
		confirmPassword.mockResolvedValue(undefined)
		axios.post.mockRejectedValue({
			response: { status: 500, data: { message: 'Could not download app' } },
		})

		const { installing, error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('openregister')).rejects.toBeDefined()
		expect(error.value).toBe('Could not download app')
		expect(installing.value).toBe(false)
	})

	it('falls back to a generic error message when the failure has no data.message', async () => {
		confirmPassword.mockResolvedValue(undefined)
		axios.post.mockRejectedValue(new Error('network down'))

		const { error, installAndEnable } = useAppInstaller()

		await expect(installAndEnable('deck')).rejects.toBeDefined()
		expect(error.value).toBe('Could not install and enable the app')
	})
})
