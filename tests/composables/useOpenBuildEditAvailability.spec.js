/**
 * Tests for useOpenBuildEditAvailability (ADR-041).
 *
 * - available true when OC.appswebroots.openbuild is present
 * - available false when absent (and no role/permission HTTP request is made)
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

import axios from '@nextcloud/axios'
const { useOpenBuildEditAvailability } = require('../../src/composables/useOpenBuildEditAvailability.js')
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')

describe('useOpenBuildEditAvailability', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		jest.clearAllMocks()
		global.OC = { appswebroots: {} }
	})

	it('is true when OpenBuild is reachable for the user', () => {
		global.OC.appswebroots.openbuild = '/apps/openbuild'
		const { available } = useOpenBuildEditAvailability()
		expect(available.value).toBe(true)
	})

	it('is false when OpenBuild is not reachable, with no HTTP request', () => {
		const { available } = useOpenBuildEditAvailability()
		expect(available.value).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalled()
		expect(axios.put).not.toHaveBeenCalled()
	})
})
