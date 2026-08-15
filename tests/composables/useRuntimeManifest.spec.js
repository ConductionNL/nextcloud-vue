/**
 * Tests for useRuntimeManifest composable.
 *
 * Covers REQ-MVR-001 (manifest-v2-renderer):
 * - Successful runtime manifest load
 * - 404 fallback
 * - Network error fallback
 * - Validation failure warning + fallback
 * - No-stub null fallback
 * - Custom fetcher override
 * - No-merge verification
 */

// `toRaw` unwraps Vue 3's reactive Proxy. Vue 2's `Vue.observable(obj)`
// returned the SAME object, so `toBe` identity held; `reactive(obj)` returns a
// new Proxy, so the identity assertions below have to compare the raw target.
// Using toRaw rather than switching to toEqual keeps what these specs actually
// assert — that the composable exposes the very object it was handed, not a copy.
import { nextTick, toRaw } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { useRuntimeManifest } = require('../../src/composables/useRuntimeManifest.js')

/** A minimal valid v2 manifest. */
const validV2Manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{
			id: 'home',
			route: '/',
			type: 'index',
			title: 'Home',
			widgets: [],
		},
	],
}

const stubManifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '0.0.1',
	menu: [{ id: 'stub', label: 'Stub', route: 'stub' }],
	pages: [
		{
			id: 'stub',
			route: '/stub',
			type: 'index',
			title: 'Stub',
			widgets: [],
		},
	],
}

/** Wait for the async IIFE to resolve. */
async function flush() {
	await nextTick()
	await Promise.resolve()
	await nextTick()
}

describe('useRuntimeManifest', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('isLoading is true synchronously before fetch resolves', () => {
		const fetcher = jest.fn().mockReturnValue(new Promise(() => {}))
		const { isLoading } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		expect(isLoading.value).toBe(true)
	})

	it('manifest starts as stubManifest synchronously', () => {
		const fetcher = jest.fn().mockReturnValue(new Promise(() => {}))
		const { manifest } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		expect(toRaw(manifest.value)).toBe(stubManifest)
	})

	it('sets manifest to API response on 200 + valid manifest', async () => {
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: validV2Manifest })
		const { manifest, isLoading, validationErrors } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		await flush()
		expect(toRaw(manifest.value)).toBe(validV2Manifest)
		expect(isLoading.value).toBe(false)
		expect(validationErrors.value).toBeNull()
	})

	it('transitions isLoading from true to false after fetch', async () => {
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: validV2Manifest })
		const { isLoading } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		expect(isLoading.value).toBe(true)
		await flush()
		expect(isLoading.value).toBe(false)
	})

	it('falls back to stubManifest on 404 response', async () => {
		const fetcher = jest.fn().mockResolvedValue({ status: 404, data: null })
		const { manifest, isLoading } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		await flush()
		expect(toRaw(manifest.value)).toBe(stubManifest)
		expect(isLoading.value).toBe(false)
	})

	it('falls back to stubManifest on network error', async () => {
		const fetcher = jest.fn().mockRejectedValue(new Error('Network error'))
		const { manifest, isLoading } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		await flush()
		expect(toRaw(manifest.value)).toBe(stubManifest)
		expect(isLoading.value).toBe(false)
	})

	it('falls back to null when no stub and 404', async () => {
		const fetcher = jest.fn().mockResolvedValue({ status: 404, data: null })
		const { manifest } = useRuntimeManifest('YOUR_APP_ID', null, { fetcher })
		await flush()
		expect(manifest.value).toBeNull()
	})

	it('falls back to null when no stub and network error', async () => {
		const fetcher = jest.fn().mockRejectedValue(new Error('net fail'))
		const { manifest } = useRuntimeManifest('YOUR_APP_ID', undefined, { fetcher })
		await flush()
		expect(manifest.value).toBeNull()
	})

	it('falls back to stub and sets validationErrors on invalid v2 manifest', async () => {
		const invalidManifest = { $schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json', bad: true }
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: invalidManifest })
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const { manifest, validationErrors } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		await flush()
		expect(toRaw(manifest.value)).toBe(stubManifest)
		expect(Array.isArray(validationErrors.value)).toBe(true)
		expect(validationErrors.value.length).toBeGreaterThan(0)
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[useRuntimeManifest]'),
			expect.any(Array),
		)
		warnSpy.mockRestore()
	})

	it('no-merge: manifest is the API response verbatim, not a merge of stub+response', async () => {
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: validV2Manifest })
		const { manifest } = useRuntimeManifest('YOUR_APP_ID', stubManifest, { fetcher })
		await flush()
		// Should be the exact API response, not a merged object
		expect(toRaw(manifest.value)).toBe(validV2Manifest)
		// Stub-only field is NOT present in the result
		expect(manifest.value.menu[0].id).toBe('home')
		expect(manifest.value.menu[0].id).not.toBe('stub')
	})

	it('calls custom fetcher with generated URL', async () => {
		const fetcher = jest.fn().mockResolvedValue({ status: 200, data: validV2Manifest })
		useRuntimeManifest('myapp', stubManifest, { fetcher })
		await flush()
		expect(fetcher).toHaveBeenCalledWith('/index.php/apps/myapp/api/manifest')
	})
})
