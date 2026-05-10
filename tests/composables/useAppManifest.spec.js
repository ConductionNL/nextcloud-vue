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
				// Two duplicate ids — duplicates are still rejected even with
				// the open-type registry because uniqueness is independent of
				// the type field.
				pages: [
					{ id: 'dup', route: '/a', type: 'index', title: 'a' },
					{ id: 'dup', route: '/b', type: 'index', title: 'b' },
				],
			},
		})
		const { manifest, validationErrors } = useAppManifest('myapp', validBundled)
		await flush()
		expect(manifest.value).toEqual(validBundled)
		expect(validationErrors.value).not.toBeNull()
		expect(validationErrors.value.some((e) => e.includes('unique'))).toBe(true)
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

	// -----------------------------------------------------------------
	// manifest-dynamic-menu — backend-populated `menu[]` contract
	// -----------------------------------------------------------------
	// Locks the lib-side contract documented in
	// openspec/changes/manifest-dynamic-menu/specs/manifest-dynamic-menu/spec.md.
	// Verifies the existing array-replace deep-merge semantic is the
	// dynamic-per-tenant-menu mechanism (Option A from the design).
	describe('dynamic per-tenant menu entries (manifest-dynamic-menu)', () => {
		const bundledWithPlaceholder = {
			version: '1.0.0',
			menu: [
				{ id: 'catalogs', label: 'menu.catalogs', route: 'catalogs-index' },
			],
			pages: [
				{ id: 'catalogs-index', route: '/catalogs', type: 'index', title: 'app.catalogs', config: { register: 'r1', schema: 's1' } },
				{ id: 'catalog-detail', route: '/catalogs/:slug', type: 'detail', title: 'app.catalog', config: { register: 'r1', schema: 's1' } },
			],
		}

		it('replaces the bundled placeholder menu with a backend-supplied resolved menu (children form)', async () => {
			axios.get.mockResolvedValue({
				status: 200,
				data: {
					menu: [
						{
							id: 'catalogs',
							label: 'menu.catalogs',
							route: 'catalogs-index',
							children: [
								{ id: 'catalog-a', label: 'menu.catalog.a', route: 'catalog-detail' },
								{ id: 'catalog-b', label: 'menu.catalog.b', route: 'catalog-detail' },
								{ id: 'catalog-c', label: 'menu.catalog.c', route: 'catalog-detail' },
							],
						},
					],
				},
			})
			const { manifest, validationErrors, isLoading } = useAppManifest('myapp', bundledWithPlaceholder)
			await flush()
			expect(validationErrors.value).toBeNull()
			expect(isLoading.value).toBe(false)
			expect(manifest.value.menu).toHaveLength(1)
			expect(manifest.value.menu[0].id).toBe('catalogs')
			expect(manifest.value.menu[0].children).toHaveLength(3)
			expect(manifest.value.menu[0].children.map((c) => c.id)).toEqual([
				'catalog-a',
				'catalog-b',
				'catalog-c',
			])
		})

		it('replaces the bundled menu wholesale when the backend returns a flat resolved list', async () => {
			axios.get.mockResolvedValue({
				status: 200,
				data: {
					menu: [
						{ id: 'org-1', label: 'menu.org.1', route: 'catalog-detail' },
						{ id: 'org-2', label: 'menu.org.2', route: 'catalog-detail' },
					],
				},
			})
			const { manifest } = useAppManifest('myapp', bundledWithPlaceholder)
			await flush()
			// Arrays are replaced, not concatenated — the bundled "catalogs"
			// placeholder MUST NOT survive a backend-supplied menu.
			expect(manifest.value.menu).toHaveLength(2)
			expect(manifest.value.menu.map((m) => m.id)).toEqual(['org-1', 'org-2'])
		})

		it('keeps the bundled placeholder menu when the backend returns 404', async () => {
			axios.get.mockRejectedValue({ response: { status: 404 } })
			const { manifest, validationErrors } = useAppManifest('myapp', bundledWithPlaceholder)
			await flush()
			expect(manifest.value.menu).toEqual(bundledWithPlaceholder.menu)
			expect(validationErrors.value).toBeNull()
		})

		it('falls back to bundled when a backend menu item is missing required `id`', async () => {
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			axios.get.mockResolvedValue({
				status: 200,
				data: {
					menu: [
						{ label: 'menu.broken' }, // id required by menuItem $def
					],
				},
			})
			const { manifest, validationErrors } = useAppManifest('myapp', bundledWithPlaceholder)
			await flush()
			expect(manifest.value).toEqual(bundledWithPlaceholder)
			expect(validationErrors.value).not.toBeNull()
			expect(warnSpy).toHaveBeenCalled()
			warnSpy.mockRestore()
		})

		it('passes through a backend `dynamicSource` field on the runtime path (Option B not enforced FE-side)', async () => {
			// The FE validator (validateManifest) is intentionally narrow —
			// per its own JSDoc, additionalProperties:false is enforced by
			// Ajv at build time (the BE / hydra CI validator), not by the
			// runtime FE validator. So a backend that erroneously ships a
			// `dynamicSource` field MUST NOT crash the FE — the loader
			// merges it through and the runtime renderer ignores unknown
			// fields. Build-time `npm run check:manifest` catches the
			// schema violation and fails CI.
			axios.get.mockResolvedValue({
				status: 200,
				data: {
					menu: [
						{
							id: 'catalogs',
							label: 'menu.catalogs',
							dynamicSource: { register: 'listing_register', schema: 'listing_schema' },
						},
					],
				},
			})
			const { manifest, validationErrors } = useAppManifest('myapp', bundledWithPlaceholder)
			await flush()
			// Runtime: merge succeeds, no FE validation crash.
			expect(manifest.value.menu).toHaveLength(1)
			expect(manifest.value.menu[0].id).toBe('catalogs')
			// dynamicSource is preserved on the merged value (renderer ignores it).
			expect(manifest.value.menu[0].dynamicSource).toBeDefined()
			// FE validator does not flag it (narrow validator).
			expect(validationErrors.value).toBeNull()
		})
	})
})
