/**
 * Mount-level tests for CnAppRoot consuming the in-memory `useAppManifest`
 * overload (REQ-IMM-001..REQ-IMM-004 of the
 * `in-memory-app-manifest-loader` capability).
 *
 * The composable-layer suite at `tests/composables/useAppManifest.spec.js`
 * covers the 29 unit-level scenarios. This file closes the audit gap by
 * proving that a real `<CnAppRoot>` consumes the in-memory overload end-to-
 * end:
 *
 *   1. Legitimate in-memory manifest mounts — no HTTP fetch attempted.
 *   2. Inner page surface (router-view) renders content keyed on the
 *      manifest's first page id (proves provide/inject flowed through).
 *   3. `validate: true` with a legitimate manifest emits no warning.
 *   4. `validate: true` with an invalid manifest warns and still mounts
 *      (manifest is held unchanged — validation is informational).
 *   5. Legacy positional signature `useAppManifest(appId, bundled)` still
 *      triggers the fetcher (regression guard for REQ-IMM-004).
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { getCapabilities } = require('@nextcloud/capabilities')
const axios = require('@nextcloud/axios').default
const { generateUrl } = require('@nextcloud/router')
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const { useAppManifest } = require('../../src/composables/useAppManifest.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const fixtureManifest = {
	version: '1.0.0',
	menu: [
		{ id: 'home', label: 'fixture.home', route: 'home', order: 1 },
		{ id: 'reports', label: 'fixture.reports', route: 'reports', order: 2 },
	],
	pages: [
		{ id: 'home', route: '/', type: 'index', title: 'fixture.home' },
		{ id: 'reports', route: '/reports', type: 'index', title: 'fixture.reports' },
	],
	dependencies: [],
}

/**
 * Router-view stub that injects `cnManifest` (provided by CnAppRoot) and
 * renders the manifest's first page id. This collapses vue-router and
 * CnPageRenderer to a single observable surface so the mount assertion
 * "inner page renders something matching the manifest's first page id"
 * runs without a full router setup.
 */
const ManifestInjectingRouterView = {
	name: 'ManifestInjectingRouterView',
	inject: ['cnManifest'],
	render(h) {
		const firstPageId = this.cnManifest?.pages?.[0]?.id ?? '(no-page)'
		return h('div', { class: 'router-view-stub', attrs: { 'data-page-id': firstPageId } }, firstPageId)
	},
}

/** Flush the IIFE used by the legacy fetch-and-merge branch. */
async function flush(wrapper) {
	await wrapper.vm.$nextTick()
	await Promise.resolve()
	await wrapper.vm.$nextTick()
}

describe('CnAppRoot — in-memory manifest mount (REQ-IMM-001..REQ-IMM-004)', () => {
	beforeEach(() => {
		getCapabilities.mockReset()
		getCapabilities.mockReturnValue({ openregister: {} })
		axios.get.mockReset()
		generateUrl.mockClear()
		__resetAppStatusCacheForTests()
	})

	// REQ-IMM-001 + REQ-IMM-002: in-memory overload + CnAppRoot mount
	// produces no manifest HTTP traffic and propagates the manifest by reference.
	// NOTE: the unrelated AI-companion health probe (GET /apps/openregister/api/chat/health)
	// may issue a single axios call from CnAppRoot's mounted child — that is not
	// the manifest endpoint and is irrelevant to REQ-IMM-002. We assert that
	// no call hits a `*/api/manifest` URL.
	it('mounts with an in-memory manifest and issues no HTTP request', async () => {
		// Hard guarantee: any axios.get to the manifest endpoint throws — proves
		// the composable is fully synchronous on the in-memory branch.
		axios.get.mockImplementation((url) => {
			if (typeof url === 'string' && url.includes('/api/manifest')) {
				throw new Error('axios.get must not be called for the manifest endpoint in the in-memory branch')
			}
			// AI-companion health probe + any other unrelated call: return a benign
			// rejected promise so its catch path runs and no manifest fetch is implied.
			return Promise.reject(new Error('unrelated probe ignored'))
		})

		const { manifest, isLoading, validationErrors } = useAppManifest({ manifest: fixtureManifest })
		// REQ-IMM-001: manifest ref holds the input by reference.
		expect(manifest.value).toBe(fixtureManifest)
		expect(isLoading.value).toBe(false)
		expect(validationErrors.value).toBeNull()

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: { 'router-view': ManifestInjectingRouterView },
		})
		await flush(wrapper)

		// Shell phase reached (no loading / no dependency-missing screens).
		expect(wrapper.vm.phase).toBe('shell')
		expect(wrapper.find('.router-view-stub').exists()).toBe(true)

		// REQ-IMM-001: the same object reference made it through provide/inject.
		expect(wrapper.props('manifest')).toBe(fixtureManifest)
		expect(wrapper.props('manifest').menu.map((m) => m.id)).toEqual(['home', 'reports'])

		// REQ-IMM-002: no manifest backend fetch / URL computation happened.
		// (Unrelated AI-companion health probe is permitted; the manifest
		// endpoint must not be hit.)
		const manifestCalls = axios.get.mock.calls.filter(
			(call) => typeof call[0] === 'string' && call[0].includes('/api/manifest'),
		)
		expect(manifestCalls).toHaveLength(0)
		expect(generateUrl).not.toHaveBeenCalled()
	})

	// REQ-IMM-001 — provide/inject flow: the inner page surface receives
	// `cnManifest` from CnAppRoot and renders content keyed on the
	// manifest's first page id.
	it('renders the inner page surface keyed on the manifest first page id', async () => {
		const { manifest, isLoading } = useAppManifest({ manifest: fixtureManifest })

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: { 'router-view': ManifestInjectingRouterView },
		})
		await flush(wrapper)

		const stub = wrapper.find('.router-view-stub')
		expect(stub.exists()).toBe(true)
		// The first page id in the manifest is 'home' — proves the
		// manifest ref reached the inner surface via provide/inject.
		expect(stub.attributes('data-page-id')).toBe('home')
		expect(stub.text()).toBe('home')
	})

	// REQ-IMM-003: `validate: true` + legitimate manifest → no warning.
	it('does not warn when validate:true is passed a legitimate manifest', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		axios.get.mockImplementation((url) => {
			if (typeof url === 'string' && url.includes('/api/manifest')) {
				throw new Error('axios.get must not be called for the manifest endpoint in the in-memory branch')
			}
			return Promise.reject(new Error('unrelated probe ignored'))
		})

		const { manifest, isLoading, validationErrors } = useAppManifest({
			manifest: fixtureManifest,
			validate: true,
		})
		expect(validationErrors.value).toBeNull()

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: { 'router-view': ManifestInjectingRouterView },
		})
		await flush(wrapper)

		expect(wrapper.vm.phase).toBe('shell')
		expect(wrapper.find('.router-view-stub').attributes('data-page-id')).toBe('home')
		// Validation passed → no warn emitted by the composable.
		expect(warnSpy).not.toHaveBeenCalled()
		warnSpy.mockRestore()
	})

	// REQ-IMM-003: `validate: true` with an invalid manifest emits a
	// `console.warn` whose message begins with `[useAppManifest]`. The
	// component still mounts because validation is informational — the
	// manifest ref is held unchanged ("placeholder fallback" in the
	// sense that the input mounts as-is rather than being replaced).
	it('warns when validate:true is passed an invalid manifest and still mounts', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const invalidManifest = {
			version: '1.0.0',
			menu: [],
			// Duplicate ids — rejected by the schema regardless of `type`.
			pages: [
				{ id: 'dup', route: '/a', type: 'index', title: 'a' },
				{ id: 'dup', route: '/b', type: 'index', title: 'b' },
			],
			dependencies: [],
		}

		const { manifest, isLoading, validationErrors } = useAppManifest({
			manifest: invalidManifest,
			validate: true,
		})

		// Composable emitted the `[useAppManifest]` warn before mount.
		expect(warnSpy).toHaveBeenCalled()
		const warnArgs = warnSpy.mock.calls[0]
		expect(typeof warnArgs[0]).toBe('string')
		expect(warnArgs[0]).toMatch(/\[useAppManifest\]/)
		expect(validationErrors.value).not.toBeNull()
		expect(Array.isArray(validationErrors.value)).toBe(true)
		expect(validationErrors.value.some((e) => e.includes('unique'))).toBe(true)

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: { 'router-view': ManifestInjectingRouterView },
		})
		await flush(wrapper)

		// Component still mounts — validation is informational.
		expect(wrapper.vm.phase).toBe('shell')
		// REQ-IMM-003: manifest ref is held unchanged — same reference.
		expect(wrapper.props('manifest')).toBe(invalidManifest)
		// Inner surface receives the invalid manifest's first page id (dup)
		// rather than a placeholder — the mount is not blocked.
		expect(wrapper.find('.router-view-stub').attributes('data-page-id')).toBe('dup')
		// No manifest endpoint hit (AI-companion health probe is unrelated).
		const manifestCalls = axios.get.mock.calls.filter(
			(call) => typeof call[0] === 'string' && call[0].includes('/api/manifest'),
		)
		expect(manifestCalls).toHaveLength(0)

		warnSpy.mockRestore()
	})

	// REQ-IMM-004: passing the legacy positional shape `useAppManifest(appId,
	// bundledManifest)` MUST still take the fetcher path. CnAppRoot consumes
	// the returned manifest ref the same way as the in-memory branch — the
	// two shapes are interchangeable at the component boundary.
	it('legacy positional signature still triggers the fetcher (regression)', async () => {
		// Hang the manifest fetch so we observe the bundled value while
		// isLoading is still true — proves the fetcher was called without
		// racing the resolution. Other axios.get callers (e.g. AI-companion
		// health probe) receive a benign rejected promise.
		axios.get.mockImplementation((url) => {
			if (typeof url === 'string' && url.includes('/api/manifest')) {
				return new Promise(() => {})
			}
			return Promise.reject(new Error('unrelated probe ignored'))
		})

		const { manifest, isLoading } = useAppManifest('fixture-app', fixtureManifest)

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: { 'router-view': ManifestInjectingRouterView },
		})
		await wrapper.vm.$nextTick()

		// REQ-IMM-004: the fetcher branch ran — axios.get called once
		// against the generated manifest endpoint.
		const manifestCalls = axios.get.mock.calls.filter(
			(call) => typeof call[0] === 'string' && call[0].includes('/api/manifest'),
		)
		expect(manifestCalls).toHaveLength(1)
		expect(manifestCalls[0][0]).toBe('/index.php/apps/fixture-app/api/manifest')
		expect(generateUrl).toHaveBeenCalledWith('/apps/fixture-app/api/manifest')

		// The bundled manifest is observable synchronously — same shape as
		// the in-memory branch produces.
		expect(wrapper.props('manifest')).toBe(fixtureManifest)
		expect(isLoading.value).toBe(true)
	})
})
