/**
 * Tests for useBuildiqEditAvailability (ADR-041).
 *
 * The availability signal is an `OC.appswebroots` lookup keyed by the
 * Nextcloud app id, and that id moved from `openbuild` to `buildiq`. A stale
 * key is a SILENT no-op — the map has no such key, `available` reads false,
 * and the edit button renders nothing without an error — so the `buildiq`-only
 * case below is the one that matters: it fails against a single-key lookup on
 * the old name, which is how the button vanished from every host app.
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

	it('is true under the current `buildiq` app id', () => {
		global.OC.appswebroots.buildiq = '/apps/buildiq'
		const { available } = useBuildiqEditAvailability()
		expect(available.value).toBe(true)
	})

	it('is true under the legacy `openbuild` app id', () => {
		global.OC.appswebroots.openbuild = '/apps/openbuild'
		const { available } = useBuildiqEditAvailability()
		expect(available.value).toBe(true)
	})

	it('is true when both app ids are present', () => {
		global.OC.appswebroots.buildiq = '/apps/buildiq'
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

	it('is false for an unrelated app, so the lookup is not a blanket true', () => {
		global.OC.appswebroots.opencatalogi = '/apps/opencatalogi'
		const { available } = useBuildiqEditAvailability()
		expect(available.value).toBe(false)
	})

	it('still exposes the deprecated useOpenBuildEditAvailability alias', () => {
		expect(useOpenBuildEditAvailability).toBe(useBuildiqEditAvailability)
	})
})
