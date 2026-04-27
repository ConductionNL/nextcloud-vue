/**
 * Tests for the useAppStatus composable.
 *
 * Covers REQ-JMR-012 scenarios from the json-manifest-renderer spec:
 *  - returns installed=true when the given app's capability is present
 *  - returns installed=false when the capability is absent
 *  - caches results per appId across repeated calls
 *  - returns safe defaults and logs a warning on capabilities error
 */

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(),
}))

const { getCapabilities } = require('@nextcloud/capabilities')
const {
	useAppStatus,
	__resetAppStatusCacheForTests,
} = require('../../src/composables/useAppStatus.js')

describe('useAppStatus', () => {
	beforeEach(() => {
		getCapabilities.mockReset()
		__resetAppStatusCacheForTests()
	})

	it('returns installed=true and enabled=true when the appId capability is present', () => {
		getCapabilities.mockReturnValue({
			files: {},
			openregister: { version: '1.0.0' },
		})
		const { installed, enabled, loading } = useAppStatus('openregister')
		expect(installed.value).toBe(true)
		expect(enabled.value).toBe(true)
		expect(loading.value).toBe(false)
	})

	it('returns installed=false when the appId capability is absent', () => {
		getCapabilities.mockReturnValue({ files: {} })
		const { installed, enabled, loading } = useAppStatus('opencatalogi')
		expect(installed.value).toBe(false)
		expect(enabled.value).toBe(false)
		expect(loading.value).toBe(false)
	})

	it('caches the result per appId and does not re-fetch on repeated calls', () => {
		getCapabilities.mockReturnValue({ openregister: {} })
		const first = useAppStatus('openregister')
		const second = useAppStatus('openregister')
		expect(getCapabilities).toHaveBeenCalledTimes(1)
		// Returns the same ref objects so all consumers share state.
		expect(second.installed).toBe(first.installed)
		expect(second.enabled).toBe(first.enabled)
		expect(second.loading).toBe(first.loading)
	})

	it('caches separately per appId', () => {
		getCapabilities.mockReturnValue({ openregister: {} })
		useAppStatus('openregister')
		useAppStatus('opencatalogi')
		// Two distinct cache misses → two reads.
		expect(getCapabilities).toHaveBeenCalledTimes(2)
		// And the two results differ.
		const orStatus = useAppStatus('openregister')
		const ocStatus = useAppStatus('opencatalogi')
		expect(orStatus.installed.value).toBe(true)
		expect(ocStatus.installed.value).toBe(false)
	})

	it('returns safe defaults and warns when getCapabilities throws', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		getCapabilities.mockImplementation(() => {
			throw new Error('capabilities boot failure')
		})
		const { installed, enabled, loading } = useAppStatus('openregister')
		expect(installed.value).toBe(false)
		expect(enabled.value).toBe(false)
		expect(loading.value).toBe(false)
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('handles getCapabilities returning null without crashing', () => {
		getCapabilities.mockReturnValue(null)
		const { installed, loading } = useAppStatus('openregister')
		expect(installed.value).toBe(false)
		expect(loading.value).toBe(false)
	})
})
