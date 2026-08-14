/**
 * Tests for CnAppRoot registry validation and customComponents deprecation.
 *
 * Covers REQ-MVR-002 and REQ-MVR-003 (manifest-v2-renderer):
 * - Unknown kind throws RegistryKindError
 * - Missing metadata emits console.warn
 * - Valid registry passes silently
 * - RegistryKindError is instanceof Error
 * - customComponents deprecation warning on v2 manifest
 * - No warning on v1 manifest + customComponents
 * - No repeat warning on re-render
 */

import { mount } from '@vue/test-utils'
import { toRaw } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))

const CnAppRoot = require('../../../src/components/CnAppRoot/CnAppRoot.vue').default
const { RegistryKindError } = require('../../../src/errors/RegistryKindError.js')
const { __resetAppStatusCacheForTests } = require('../../../src/composables/useAppStatus.js')

const baseManifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	dependencies: [],
}

const v2Manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{
		id: 'home',
		route: '/',
		type: 'index',
		title: 'Home',
		widgets: [],
	}],
}

const MockModal = { template: '<div class="mock-modal" />', name: 'MockModal' }
const MockPage = { template: '<div class="mock-page" />', name: 'MockPage' }

function mountRoot(propsData = {}) {
	return mount(CnAppRoot, {
		propsData: {
			manifest: baseManifest,
			appId: 'testapp',
			requiresApps: [],
			...propsData,
		},
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div />' } },
	})
}

describe('CnAppRoot registry validation', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
	})

	it('throws RegistryKindError for an unknown kind', () => {
		expect(() => {
			mountRoot({
				registry: {
					myWidget: { kind: 'unknown-kind', component: MockPage },
				},
			})
		}).toThrow(RegistryKindError)
	})

	it('RegistryKindError message identifies the registry key and unknown kind', () => {
		let caught = null
		try {
			mountRoot({
				registry: {
					myThing: { kind: 'robot', component: MockPage },
				},
			})
		} catch (err) {
			caught = err
		}
		expect(caught).toBeInstanceOf(RegistryKindError)
		expect(caught.message).toContain('myThing')
		expect(caught.message).toContain('robot')
	})

	it('RegistryKindError is instanceof Error', () => {
		const err = new RegistryKindError('key', 'bad-kind')
		expect(err).toBeInstanceOf(Error)
		expect(err).toBeInstanceOf(RegistryKindError)
	})

	it('emits console.warn for a widget entry missing allowedSlots', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountRoot({
			registry: {
				myWidget: {
					kind: 'widget',
					component: MockPage,
					defaultSize: { w: 4, h: 2 },
					minSize: { w: 2, h: 1 },
					maxSize: { w: 12, h: 4 },
					// allowedSlots is missing
					propsSchema: null,
				},
			},
		})
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('allowedSlots'),
		)
		warnSpy.mockRestore()
	})

	it('does NOT throw for a widget entry missing allowedSlots (non-fatal)', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			mountRoot({
				registry: {
					myWidget: {
						kind: 'widget',
						component: MockPage,
						defaultSize: { w: 4, h: 2 },
						minSize: { w: 2, h: 1 },
						maxSize: { w: 12, h: 4 },
						propsSchema: null,
					},
				},
			})
		}).not.toThrow()
		warnSpy.mockRestore()
	})

	it('passes silently for a fully valid registry', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(() => {
			mountRoot({
				registry: {
					myModal: {
						kind: 'modal',
						component: MockModal,
						propsSchema: null,
					},
					myPage: {
						kind: 'page',
						component: MockPage,
					},
				},
			})
		}).not.toThrow()
		// No registry-related warnings (there may be unrelated ones from the app guard)
		const registryWarnings = warnSpy.mock.calls.filter((args) => args[0] && args[0].includes('[CnAppRoot] Registry'))
		expect(registryWarnings.length).toBe(0)
		warnSpy.mockRestore()
	})

	it('does NOT throw for a create-override handler entry', () => {
		// `create-override` is a no-component handler kind CnPageRenderer resolves
		// by name for CnIndexPage's createOverride prop; the mount-time validator
		// must accept it (regression: it previously threw RegistryKindError).
		expect(() => {
			mountRoot({
				registry: {
					createClientContactAware: {
						kind: 'create-override',
						handler: async () => ({}),
					},
				},
			})
		}).not.toThrow()
	})

	it('provides cnRegistry to descendants', () => {
		const registry = {
			myModal: { kind: 'modal', component: MockModal, propsSchema: null },
		}
		const wrapper = mountRoot({ registry })
		// `toRaw` on the received side: the registry is provided out of
		// reactive state, so descendants inject a Proxy around it. The
		// assertion is still identity — the caller's registry object is what
		// gets provided, not a rebuilt one.
		expect(toRaw(wrapper.vm.$.provides.cnRegistry)).toBe(registry)
	})

	it('provides empty object when no registry prop is passed', () => {
		const wrapper = mountRoot({})
		expect(wrapper.vm.$.provides.cnRegistry).toEqual({})
	})
})

describe('CnAppRoot customComponents deprecation warning', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
	})

	it('emits console.warn when customComponents is non-empty and manifest is v2', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountRoot({
			manifest: v2Manifest,
			customComponents: { MyComp: MockPage },
		})
		const deprecationWarnings = warnSpy.mock.calls.filter(
			(args) => args[0] && args[0].includes('customComponents') && args[0].includes('deprecated'),
		)
		expect(deprecationWarnings.length).toBe(1)
		warnSpy.mockRestore()
	})

	it('does NOT emit warning when customComponents is non-empty and manifest is v1', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountRoot({
			manifest: baseManifest,
			customComponents: { MyComp: MockPage },
		})
		const deprecationWarnings = warnSpy.mock.calls.filter(
			(args) => args[0] && args[0].includes('customComponents') && args[0].includes('deprecated'),
		)
		expect(deprecationWarnings.length).toBe(0)
		warnSpy.mockRestore()
	})

	it('does NOT emit warning when customComponents is empty and manifest is v2', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountRoot({
			manifest: v2Manifest,
			customComponents: {},
		})
		const deprecationWarnings = warnSpy.mock.calls.filter(
			(args) => args[0] && args[0].includes('customComponents') && args[0].includes('deprecated'),
		)
		expect(deprecationWarnings.length).toBe(0)
		warnSpy.mockRestore()
	})

	it('warning does not repeat on update (instance flag guard)', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountRoot({
			manifest: v2Manifest,
			customComponents: { MyComp: MockPage },
		})
		// Force an update
		await wrapper.setProps({ manifest: { ...v2Manifest } })
		const deprecationWarnings = warnSpy.mock.calls.filter(
			(args) => args[0] && args[0].includes('customComponents') && args[0].includes('deprecated'),
		)
		// Only 1 warning despite re-render
		expect(deprecationWarnings.length).toBe(1)
		warnSpy.mockRestore()
	})
})
