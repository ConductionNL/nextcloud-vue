/**
 * Tests for the useAppManifest composable.
 *
 * Covers REQ-JMR-002 scenarios from the json-manifest-renderer spec:
 *  - synchronous bundled load
 *  - deep-merge of BE response on 200
 *  - silent fallback on 404 / network error
 *  - fallback on schema validation failure
 *  - Options API compatibility (via setup())
 *  - options.endpoint and options.fetcher overrides
 */

import { nextTick } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { useAppManifest } = require('../../src/composables/useAppManifest.js')

const validBundled = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home' }],
	pages: [
		{ id: 'home', route: '/', type: 'index', title: 'app.home', config: { register: 'r1', schema: 's1' } },
	],
}

/** Wait one microtask for the IIFE inside useAppManifest to resolve. */
async function flush() {
	await nextTick()
	await Promise.resolve()
	await nextTick()
}

describe('useAppManifest', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('returns the bundled manifest synchronously before the BE fetch resolves', () => {
		// Make axios.get hang forever so the bundled value is what we observe.
		axios.get.mockReturnValue(new Promise(() => {}))
		const { manifest, isLoading } = useAppManifest('myapp', validBundled)
		expect(manifest.value).toEqual(validBundled)
		expect(isLoading.value).toBe(true)
	})

	it('deep-merges a 200 response over the bundled manifest', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				version: '2.0.0',
				menu: [{ id: 'extra', label: 'app.extra' }],
				pages: validBundled.pages,
			},
		})
		const { manifest, isLoading } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value.version).toBe('2.0.0')
		expect(manifest.value.menu[0].id).toBe('extra')
		expect(manifest.value.pages).toEqual(validBundled.pages)
		expect(isLoading.value).toBe(false)
	})

	it('silently falls back to bundled on a 404', async () => {
		axios.get.mockRejectedValue({ response: { status: 404 } })
		const { manifest, isLoading, validationErrors } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value).toEqual(validBundled)
		expect(isLoading.value).toBe(false)
		expect(validationErrors.value).toBeNull()
	})

	it('silently falls back on a network error', async () => {
		axios.get.mockRejectedValue(new Error('network down'))
		const { manifest } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value).toEqual(validBundled)
	})

	it('falls back to bundled and sets validationErrors when the merged manifest fails schema validation', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				pages: [{ id: 'bad', route: '/bad', type: 'wizard', title: 'app.bad' }],
			},
		})
		const { manifest, validationErrors } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value).toEqual(validBundled)
		expect(validationErrors.value).not.toBeNull()
		expect(validationErrors.value.some((e) => e.includes('type'))).toBe(true)
		expect(warnSpy).toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	it('uses options.endpoint over the default generateUrl path', async () => {
		axios.get.mockResolvedValue({ status: 200, data: validBundled })
		useAppManifest('myapp', validBundled, { endpoint: '/custom/manifest/url' })
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/custom/manifest/url')
	})

	it('uses options.fetcher when provided, bypassing axios entirely', async () => {
		const customFetcher = jest.fn().mockResolvedValue({
			status: 200,
			data: { version: '3.5.0', menu: validBundled.menu, pages: validBundled.pages },
		})
		const { manifest, isLoading } = useAppManifest('myapp', validBundled, { fetcher: customFetcher })
		await flush()
		expect(customFetcher).toHaveBeenCalled()
		expect(axios.get).not.toHaveBeenCalled()
		expect(manifest.value.version).toBe('3.5.0')
		expect(isLoading.value).toBe(false)
	})

	it('returns refs that are accessible from a Vue 2 Options API setup()', async () => {
		axios.get.mockResolvedValue({ status: 200, data: validBundled })
		const result = useAppManifest('myapp', validBundled)
		// The contract: the returned object is { manifest, isLoading, validationErrors }
		// where each value is a Vue ref. Returning this from setup() exposes
		// `this.manifest`, `this.isLoading`, `this.validationErrors` automatically
		// in Vue 2.7's bridge.
		expect(result).toHaveProperty('manifest')
		expect(result).toHaveProperty('isLoading')
		expect(result).toHaveProperty('validationErrors')
		// Each must look like a ref (has a .value getter).
		expect(result.manifest).toHaveProperty('value')
		expect(result.isLoading).toHaveProperty('value')
		expect(result.validationErrors).toHaveProperty('value')
		await flush()
	})

	it('rejects a manifest with duplicate page ids', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				pages: [
					{ id: 'dup', route: '/a', type: 'index', title: 'a' },
					{ id: 'dup', route: '/b', type: 'index', title: 'b' },
				],
			},
		})
		const { manifest, validationErrors } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value).toEqual(validBundled)
		expect(validationErrors.value.some((e) => e.includes('unique'))).toBe(true)
		warnSpy.mockRestore()
	})

	it('rejects a manifest with a non-semver version', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get.mockResolvedValue({ status: 200, data: { version: 'not-semver' } })
		const { manifest, validationErrors } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value).toEqual(validBundled)
		expect(validationErrors.value.some((e) => e.includes('semver'))).toBe(true)
		warnSpy.mockRestore()
	})
})
