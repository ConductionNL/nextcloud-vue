/**
 * The manifest validator stays off the critical path of a page load.
 *
 * - Its chunk starts loading beside the backend fetch, not after it.
 * - When nothing is merged or substituted, nothing is validated: the bundled
 *   manifest is already the published one.
 */

import { nextTick } from 'vue'

const mockEvents = []
const mockValidate = jest.fn(() => ({ valid: true, errors: [] }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))
jest.mock('../../src/utils/validateManifest.js', () => {
	mockEvents.push('validator loaded')
	return { validateManifest: (...args) => mockValidate(...args) }
})

const { useAppManifest } = require('../../src/composables/useAppManifest.js')

const bundled = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home', config: { register: 'r1', schema: 's1' } }],
}

/**
 * Drain the composable's async chain.
 */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0))
	await nextTick()
}

describe('useAppManifest validator load', () => {
	beforeEach(() => {
		mockEvents.length = 0
		mockValidate.mockClear()
	})

	it('loads the validator while the backend fetch is still pending', async () => {
		let answer
		const fetcher = jest.fn(() => new Promise((resolve) => {
			answer = resolve
		}))

		const { manifest, isLoading } = useAppManifest('app', bundled, { fetcher })
		await flush()
		mockEvents.push('fetch answered')
		answer({ status: 200, data: { menu: [{ id: 'home', label: 'app.start' }] } })
		await flush()

		expect(mockEvents).toEqual(['validator loaded', 'fetch answered'])
		expect(mockValidate).toHaveBeenCalledTimes(1)
		expect(manifest.value.menu[0].label).toBe('app.start')
		expect(isLoading.value).toBe(false)
	})

	it('validates nothing when the backend adds nothing and no sentinel is substituted', async () => {
		const fetcher = jest.fn(() => Promise.resolve({ status: 404, data: null }))

		const { manifest, isLoading, validationErrors } = useAppManifest('app', bundled, { fetcher })
		await flush()

		expect(mockValidate).not.toHaveBeenCalled()
		expect(manifest.value).toBe(bundled)
		expect(validationErrors.value).toBeNull()
		expect(isLoading.value).toBe(false)
	})
})
