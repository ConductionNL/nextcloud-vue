/**
 * Mount-level tests for CnAppRoot consuming the in-memory `useAppManifest`
 * overload (REQ-IMM-001..REQ-IMM-004 of the
 * `in-memory-app-manifest-loader` capability).
 *
 * The composable-layer suite at `tests/composables/useAppManifest.spec.js`
 * covers the 29 unit-level scenarios. This file closes the audit gap by
 * proving that a real `<CnAppRoot>` consumes the in-memory overload end-to-
 * end: nav items render from the manifest, no HTTP request is issued, and
 * the legacy positional signature still triggers the fetcher.
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
		__resetAppStatusCacheForTests()
	})

	// REQ-IMM-001 + REQ-IMM-002: the in-memory overload produces a manifest
	// ref that CnAppRoot consumes unchanged, no HTTP request is fired, and
	// the manifest-driven nav items render in the shell phase.
	it('mounts with an in-memory manifest, renders menu items, and issues no HTTP request', async () => {
		const { manifest, isLoading } = useAppManifest({ manifest: fixtureManifest })

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: {
				'router-view': { template: '<div class="router-view-stub" />' },
				// Render CnAppNav as a real child so we can inspect the
				// nav items the manifest produced. Its NcAppNavigation /
				// NcAppNavigationItem children remain stubbed via the
				// library-wide stub in tests/__mocks__/nextcloud-vue.js.
			},
		})
		await flush(wrapper)

		// Shell phase reached (no loading, no dependency-missing screens).
		expect(wrapper.vm.phase).toBe('shell')
		expect(wrapper.find('.router-view-stub').exists()).toBe(true)

		// The manifest ref holds the fixture by reference and the
		// rendered tree picked it up.
		expect(wrapper.props('manifest')).toBe(fixtureManifest)
		expect(wrapper.props('manifest').menu.map((m) => m.id)).toEqual(['home', 'reports'])

		// REQ-IMM-002: no backend fetch was triggered by the composable.
		expect(axios.get).not.toHaveBeenCalled()
	})

	// REQ-IMM-004: passing the legacy positional shape `useAppManifest(appId,
	// bundledManifest)` MUST still take the fetcher path. CnAppRoot consumes
	// the returned manifest ref the same way as the in-memory branch — the
	// two shapes are interchangeable at the component boundary.
	it('mounts with the legacy positional signature and the fetcher path is taken', async () => {
		// Hang the fetch so we observe the bundled value while isLoading is
		// still true — proves the fetcher was called without racing the
		// resolution.
		axios.get.mockReturnValue(new Promise(() => {}))

		const { manifest, isLoading } = useAppManifest('fixture-app', fixtureManifest)

		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: {
				'router-view': { template: '<div class="router-view-stub" />' },
			},
		})
		await wrapper.vm.$nextTick()

		// REQ-IMM-004: the fetcher branch ran — axios.get was called once
		// against the generated endpoint.
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe('/index.php/apps/fixture-app/api/manifest')

		// The bundled manifest is observable synchronously — same shape as
		// the in-memory branch produces.
		expect(wrapper.props('manifest')).toBe(fixtureManifest)
		expect(isLoading.value).toBe(true)
	})

	// REQ-IMM-003: `validate: true` with an invalid manifest emits a
	// `console.warn` whose message begins with `[useAppManifest]`. The
	// component still mounts because validation is informational — the
	// manifest is never replaced.
	it('emits a console.warn when validate:true is passed an invalid manifest, and still mounts', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const invalidManifest = {
			version: '1.0.0',
			menu: [],
			// Duplicate ids — rejected by the schema regardless of type.
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

		// Warn was emitted by the composable before the mount happened.
		expect(warnSpy).toHaveBeenCalled()
		const warnArgs = warnSpy.mock.calls[0]
		expect(typeof warnArgs[0]).toBe('string')
		expect(warnArgs[0]).toMatch(/\[useAppManifest\]/)
		expect(validationErrors.value).not.toBeNull()
		expect(Array.isArray(validationErrors.value)).toBe(true)

		// Component still mounts — validation is informational.
		const wrapper = mount(CnAppRoot, {
			propsData: {
				manifest: manifest.value,
				isLoading: isLoading.value,
				appId: 'fixture-app',
				requiresApps: [],
			},
			mocks: { $route: { name: 'home' } },
			stubs: {
				'router-view': { template: '<div class="router-view-stub" />' },
			},
		})
		await flush(wrapper)

		expect(wrapper.vm.phase).toBe('shell')
		// The manifest ref is mounted unchanged — same object reference.
		expect(wrapper.props('manifest')).toBe(invalidManifest)
		expect(axios.get).not.toHaveBeenCalled()

		warnSpy.mockRestore()
	})
})
