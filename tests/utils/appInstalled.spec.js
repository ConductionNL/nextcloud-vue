/**
 * Tests for the isAppInstalled utility.
 *
 * Covers the two detection paths (OC.appswebroots primary,
 * capabilities fallback) and the per-page-load cache.
 */

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(),
}))

const { getCapabilities } = require('@nextcloud/capabilities')
const {
	isAppInstalled,
	__resetAppInstalledCacheForTests,
} = require('../../src/utils/appInstalled.js')

describe('isAppInstalled', () => {
	beforeEach(() => {
		__resetAppInstalledCacheForTests()
		getCapabilities.mockReset()
		getCapabilities.mockReturnValue({})
		delete global.OC
	})

	describe('OC.appswebroots (primary path)', () => {
		it('returns true when the appId key is present in OC.appswebroots', () => {
			global.OC = { appswebroots: { mydash: '/apps/mydash' } }
			expect(isAppInstalled('mydash')).toBe(true)
		})

		it('returns false when OC.appswebroots exists but does not contain the appId', () => {
			global.OC = { appswebroots: { files: '/apps/files' } }
			expect(isAppInstalled('mydash')).toBe(false)
		})

		it('falls through to capabilities when OC.appswebroots does not contain the appId', () => {
			global.OC = { appswebroots: {} }
			// appswebroots exists but does not list mydash — fall through to capabilities.
			getCapabilities.mockReturnValue({ mydash: {} })
			expect(isAppInstalled('mydash')).toBe(true)
		})
	})

	describe('capabilities fallback path', () => {
		it('returns true when the appId key is in capabilities (no OC global)', () => {
			delete global.OC
			getCapabilities.mockReturnValue({ opencatalogi: { version: '1.0' } })
			expect(isAppInstalled('opencatalogi')).toBe(true)
		})

		it('returns false when the appId is absent from capabilities', () => {
			delete global.OC
			getCapabilities.mockReturnValue({ files: {} })
			expect(isAppInstalled('mydash')).toBe(false)
		})

		it('returns false and warns when getCapabilities throws', () => {
			delete global.OC
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			getCapabilities.mockImplementation(() => { throw new Error('boom') })
			expect(isAppInstalled('mydash')).toBe(false)
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('[appInstalled]'),
				expect.any(Error),
			)
			warnSpy.mockRestore()
		})

		it('handles getCapabilities returning null without crashing', () => {
			delete global.OC
			getCapabilities.mockReturnValue(null)
			expect(isAppInstalled('mydash')).toBe(false)
		})
	})

	describe('per-page-load cache', () => {
		it('returns the same value on repeated calls without re-checking', () => {
			delete global.OC
			getCapabilities.mockReturnValue({ mydash: {} })
			const first = isAppInstalled('mydash')
			const second = isAppInstalled('mydash')
			expect(first).toBe(true)
			expect(second).toBe(true)
			// Only one getCapabilities call — second is served from cache.
			expect(getCapabilities).toHaveBeenCalledTimes(1)
		})

		it('caches true and false results independently per appId', () => {
			delete global.OC
			getCapabilities.mockReturnValue({ mydash: {} })
			expect(isAppInstalled('mydash')).toBe(true)
			expect(isAppInstalled('opencatalogi')).toBe(false)
			expect(getCapabilities).toHaveBeenCalledTimes(2)
		})
	})
})
