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

	// `manifest-resolve-sentinel` integration scenarios — the loader
	// substitutes sentinels under `pages[].config` with IAppConfig
	// values BEFORE the validator runs. The validator MUST never
	// observe an unresolved sentinel at runtime (the resolved value
	// is what gets validated).
	it('substitutes @resolve: sentinels under pages[].config before validation', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				version: '1.0.0',
				menu: validBundled.menu,
				pages: [
					{
						id: 'home',
						route: '/',
						type: 'index',
						title: 'app.home',
						config: { register: '@resolve:theme_register', schema: '@resolve:listing_schema' },
					},
				],
			},
		})
		const { manifest, isLoading, validationErrors, unresolvedSentinels } = useAppManifest(
			'myapp',
			validBundled,
			{
				getAppConfigValue: async (_, key) => ({
					theme_register: 'theme-2026',
					listing_schema: 'listing-v3',
				})[key],
			},
		)
		await flush()
		expect(manifest.value.pages[0].config.register).toBe('theme-2026')
		expect(manifest.value.pages[0].config.schema).toBe('listing-v3')
		expect(unresolvedSentinels.value).toEqual([])
		expect(validationErrors.value).toBeNull()
		expect(isLoading.value).toBe(false)
	})

	it('exposes unresolved sentinel keys when an IAppConfig key is unset', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				version: '1.0.0',
				menu: validBundled.menu,
				pages: [
					{
						id: 'home',
						route: '/',
						type: 'index',
						title: 'app.home',
						config: {
							register: '@resolve:set_key',
							schema: '@resolve:unset_key',
						},
					},
				],
			},
		})
		const { manifest, unresolvedSentinels } = useAppManifest(
			'myapp',
			validBundled,
			{
				getAppConfigValue: async (_, key) => (key === 'set_key' ? 'value-set' : null),
			},
		)
		await flush()
		expect(manifest.value.pages[0].config.register).toBe('value-set')
		expect(manifest.value.pages[0].config.schema).toBeNull()
		expect(unresolvedSentinels.value).toEqual(['unset_key'])
		warnSpy.mockRestore()
	})

	it('surface a softwarecatalog-style fixture with @resolve:voorzieningen_register', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				version: '1.2.0',
				menu: [{ id: 'voorzieningen', label: 'app.voorzieningen' }],
				pages: [
					{
						id: 'voorzieningen-index',
						route: '/voorzieningen',
						type: 'index',
						title: 'app.voorzieningen.title',
						config: { register: '@resolve:voorzieningen_register', schema: 'voorziening' },
					},
					{
						id: 'voorzieningen-detail',
						route: '/voorzieningen/:id',
						type: 'detail',
						title: 'app.voorzieningen.detail',
						config: { register: '@resolve:voorzieningen_register', schema: 'voorziening' },
					},
				],
			},
		})
		const { manifest, validationErrors, unresolvedSentinels } = useAppManifest(
			'softwarecatalog',
			validBundled,
			{
				getAppConfigValue: async (_, key) => (key === 'voorzieningen_register' ? 'voorzieningen' : null),
			},
		)
		await flush()
		expect(manifest.value.pages[0].config.register).toBe('voorzieningen')
		expect(manifest.value.pages[1].config.register).toBe('voorzieningen')
		expect(unresolvedSentinels.value).toEqual([])
		expect(validationErrors.value).toBeNull()
	})

	it('resolves shared keys with a single getAppConfigValue call', async () => {
		const calls = []
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				version: '1.0.0',
				menu: validBundled.menu,
				pages: [
					{ id: 'a', route: '/a', type: 'index', title: 'a', config: { register: '@resolve:shared' } },
					{ id: 'b', route: '/b', type: 'index', title: 'b', config: { register: '@resolve:shared' } },
				],
			},
		})
		useAppManifest('myapp', validBundled, {
			getAppConfigValue: async (appId, key) => {
				calls.push([appId, key])
				return 'shared-value'
			},
		})
		await flush()
		expect(calls).toEqual([['myapp', 'shared']])
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

	// -----------------------------------------------------------------
	// in-memory-app-manifest-loader — REQ-IMM-001..REQ-IMM-004
	// -----------------------------------------------------------------
	// The new overload `useAppManifest({ manifest, validate? })` mounts an
	// already-constructed manifest object synchronously, with no backend
	// fetch, no deep-merge, no sentinel resolution. Designed for
	// virtual-app hosts (OpenBuilt) and any future consumer that
	// constructs its manifest in memory.
	describe('in-memory manifest overload', () => {
		it('returns the input manifest by reference and emits no HTTP request', () => {
			// REQ-IMM-001 + REQ-IMM-002: no fetcher / axios / generateUrl
			// call MUST be made; manifest ref MUST hold the input object
			// (by reference, not a clone); isLoading is false from the
			// first read.
			axios.get.mockImplementation(() => {
				throw new Error('axios.get must not be called in in-memory branch')
			})
			const inMemoryManifest = {
				version: '1.0.0',
				menu: [{ id: 'home', label: 'app.home' }],
				pages: [
					{ id: 'home', route: '/', type: 'index', title: 'app.home', config: { register: 'r1', schema: 's1' } },
				],
			}
			const { manifest, isLoading, validationErrors, unresolvedSentinels } = useAppManifest({
				manifest: inMemoryManifest,
			})
			// Same reference — composable MUST NOT clone.
			expect(manifest.value).toBe(inMemoryManifest)
			expect(isLoading.value).toBe(false)
			expect(validationErrors.value).toBeNull()
			expect(unresolvedSentinels.value).toEqual([])
			expect(axios.get).not.toHaveBeenCalled()
		})

		it('skips validation when `validate` is omitted', () => {
			// REQ-IMM-003: when `validate` is omitted/undefined/false the
			// composable MUST NOT invoke validateManifest. The simplest
			// proof is that a structurally invalid manifest produces no
			// validationErrors and no console.warn.
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const invalidManifest = { /* missing required version/menu/pages */ }
			const { validationErrors } = useAppManifest({ manifest: invalidManifest })
			expect(validationErrors.value).toBeNull()
			expect(warnSpy).not.toHaveBeenCalled()
			warnSpy.mockRestore()
		})

		it('runs validateManifest on `validate: true` with a valid manifest and emits no warning', () => {
			// REQ-IMM-003 happy path.
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const { manifest, validationErrors, isLoading } = useAppManifest({
				manifest: validBundled,
				validate: true,
			})
			expect(manifest.value).toBe(validBundled)
			expect(validationErrors.value).toBeNull()
			expect(isLoading.value).toBe(false)
			expect(warnSpy).not.toHaveBeenCalled()
			warnSpy.mockRestore()
		})

		it('populates validationErrors and warns on `validate: true` with an invalid manifest', () => {
			// REQ-IMM-003 failure path: validation is informational —
			// manifest ref MUST still hold the input value, isLoading MUST
			// still be false, console.warn MUST be emitted with the
			// `[useAppManifest]` prefix.
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const invalidManifest = {
				version: '1.0.0',
				menu: [],
				pages: [
					{ id: 'dup', route: '/a', type: 'index', title: 'a' },
					{ id: 'dup', route: '/b', type: 'index', title: 'b' },
				],
			}
			const { manifest, validationErrors, isLoading } = useAppManifest({
				manifest: invalidManifest,
				validate: true,
			})
			// Validation populated but manifest is mounted unchanged.
			expect(manifest.value).toBe(invalidManifest)
			expect(isLoading.value).toBe(false)
			expect(validationErrors.value).not.toBeNull()
			expect(Array.isArray(validationErrors.value)).toBe(true)
			expect(validationErrors.value.some((e) => e.includes('unique'))).toBe(true)
			// REQ-IMM-003: warn message MUST begin with `[useAppManifest]`.
			expect(warnSpy).toHaveBeenCalled()
			const warnArgs = warnSpy.mock.calls[0]
			expect(typeof warnArgs[0]).toBe('string')
			expect(warnArgs[0].startsWith('[useAppManifest]')).toBe(true)
			warnSpy.mockRestore()
		})

		it('does not invoke generateUrl when called via in-memory shape', () => {
			// REQ-IMM-002: no backend endpoint URL is computed.
			const generateUrlMock = require('@nextcloud/router').generateUrl
			generateUrlMock.mockClear()
			useAppManifest({ manifest: validBundled })
			expect(generateUrlMock).not.toHaveBeenCalled()
		})

		it('returns the canonical { manifest, isLoading, validationErrors, unresolvedSentinels } shape', () => {
			// REQ-IMM-001: same return shape as the legacy branch.
			const result = useAppManifest({ manifest: validBundled })
			expect(result).toHaveProperty('manifest')
			expect(result).toHaveProperty('isLoading')
			expect(result).toHaveProperty('validationErrors')
			expect(result).toHaveProperty('unresolvedSentinels')
			expect(result.manifest).toHaveProperty('value')
			expect(result.isLoading).toHaveProperty('value')
			expect(result.validationErrors).toHaveProperty('value')
			expect(result.unresolvedSentinels).toHaveProperty('value')
		})

		it('regression: legacy positional signature still triggers the fetcher', async () => {
			// REQ-IMM-004: a string first argument MUST enter the legacy
			// fetch-and-merge branch unchanged.
			axios.get.mockResolvedValue({ status: 200, data: validBundled })
			const { manifest, isLoading } = useAppManifest('openregister', validBundled)
			// Initial state: bundled mounted, loading true.
			expect(manifest.value).toEqual(validBundled)
			expect(isLoading.value).toBe(true)
			await flush()
			expect(axios.get).toHaveBeenCalledTimes(1)
			expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/manifest')
			expect(isLoading.value).toBe(false)
		})
	})
})
