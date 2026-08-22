/**
 * Tests for useBuildiqEditAvailability (ADR-041).
 *
 * - available true when OC.appswebroots.openbuild is present
 * - available false when absent (and no role/permission HTTP request is made)
 * - the deprecated `useOpenBuildEditAvailability` alias still resolves to the
 *   same implementation (kept for consumers after the 2026-08-21 rename)
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

import axios from '@nextcloud/axios'
const {
	useBuildiqEditAvailability,
	useOpenBuildEditAvailability,
} = require('../../src/composables/useBuildiqEditAvailability.js')
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')

describe('useBuildiqEditAvailability', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		jest.clearAllMocks()
		global.OC = { appswebroots: {} }
	})

	it('is true when Buildiq is reachable for the user', () => {
		global.OC.appswebroots.openbuild = '/apps/openbuild'
		const { available } = useBuildiqEditAvailability()
		expect(available.value).toBe(true)
	})

	it('is false when Buildiq is not reachable, with no HTTP request', () => {
		const { available } = useBuildiqEditAvailability()
		expect(available.value).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalled()
		expect(axios.put).not.toHaveBeenCalled()
	})

	it('still exposes the deprecated useOpenBuildEditAvailability alias', () => {
		expect(useOpenBuildEditAvailability).toBe(useBuildiqEditAvailability)
	})
})
