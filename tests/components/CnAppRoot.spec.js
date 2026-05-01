/**
 * Tests for CnAppRoot.
 *
 * Covers REQ-JMR-003 (provide/inject + slots) and REQ-JMR-013 (phase
 * orchestration: loading → dependency-check → shell) from the
 * json-manifest-renderer spec.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(),
}))
const { getCapabilities } = require('@nextcloud/capabilities')
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const baseManifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}

function mountRoot({
	manifest = baseManifest,
	isLoading = false,
	slots = {},
	customComponents = {},
	t = (k) => k,
} = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'myapp', isLoading, customComponents, translate: t },
		mocks: {
			$route: { name: 'home' },
		},
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
		},
		slots,
	})
}

describe('CnAppRoot', () => {
	beforeEach(() => {
		getCapabilities.mockReset()
		__resetAppStatusCacheForTests()
	})

	describe('phase orchestration (REQ-JMR-013)', () => {
		it('renders the loading phase while isLoading is true', () => {
			getCapabilities.mockReturnValue({})
			const wrapper = mountRoot({ isLoading: true })
			expect(wrapper.vm.phase).toBe('loading')
			expect(wrapper.find('.cn-app-loading').exists()).toBe(true)
			expect(wrapper.find('.router-view-stub').exists()).toBe(false)
		})

		it('renders the dependency-missing phase when a declared dependency is absent', () => {
			getCapabilities.mockReturnValue({}) // no openregister key
			const wrapper = mountRoot({
				manifest: { ...baseManifest, dependencies: ['openregister'] },
			})
			expect(wrapper.vm.phase).toBe('dependency-missing')
			expect(wrapper.find('.cn-dependency-missing').exists()).toBe(true)
			expect(wrapper.find('.router-view-stub').exists()).toBe(false)
		})

		it('renders the shell phase when all dependencies are installed', () => {
			getCapabilities.mockReturnValue({ openregister: {} })
			const wrapper = mountRoot({
				manifest: { ...baseManifest, dependencies: ['openregister'] },
			})
			expect(wrapper.vm.phase).toBe('shell')
			expect(wrapper.find('.router-view-stub').exists()).toBe(true)
		})

		it('renders the shell phase when manifest declares no dependencies', () => {
			const wrapper = mountRoot()
			expect(wrapper.vm.phase).toBe('shell')
		})
	})

	describe('slot overrides', () => {
		it('renders the #loading slot when provided', () => {
			const wrapper = mountRoot({
				isLoading: true,
				slots: { loading: '<div class="custom-loading" />' },
			})
			expect(wrapper.find('.custom-loading').exists()).toBe(true)
			expect(wrapper.find('.cn-app-loading').exists()).toBe(false)
		})

		it('renders the #dependency-missing slot when provided', () => {
			getCapabilities.mockReturnValue({})
			const wrapper = mountRoot({
				manifest: { ...baseManifest, dependencies: ['openregister'] },
				slots: { 'dependency-missing': '<div class="custom-dep-missing" />' },
			})
			expect(wrapper.find('.custom-dep-missing').exists()).toBe(true)
			expect(wrapper.find('.cn-dependency-missing').exists()).toBe(false)
		})

		it('renders the #menu slot in the shell phase, replacing CnAppNav', () => {
			const wrapper = mountRoot({
				slots: { menu: '<div class="custom-menu" />' },
			})
			expect(wrapper.find('.custom-menu').exists()).toBe(true)
			// Default CnAppNav (NcAppNavigation stub) does not render
			expect(wrapper.find('.stub.NcAppNavigation').exists()).toBe(false)
		})

		it('falls back to CnAppNav when no #menu slot is given', () => {
			const wrapper = mountRoot()
			// NcAppNavigation stub renders — confirms CnAppNav was used
			expect(wrapper.find('.stub.NcAppNavigation').exists()).toBe(true)
		})

		it('renders #header-actions, #sidebar, and #footer slots in the shell phase', () => {
			const wrapper = mountRoot({
				slots: {
					'header-actions': '<div class="ha" />',
					sidebar: '<div class="sb" />',
					footer: '<div class="ft" />',
				},
			})
			expect(wrapper.find('.ha').exists()).toBe(true)
			expect(wrapper.find('.sb').exists()).toBe(true)
			expect(wrapper.find('.ft').exists()).toBe(true)
		})
	})

	describe('provide / inject (REQ-JMR-003)', () => {
		// Inspect the provide() return directly. CnAppRoot's provide is a
		// function on the component options; calling it with `this` bound
		// to the instance gives the object Vue would expose to descendants.
		function getProvided(wrapper) {
			return wrapper.vm.$options.provide.call(wrapper.vm)
		}

		it('provides cnManifest, cnCustomComponents, and cnTranslate to descendants', () => {
			const wrapper = mountRoot({
				customComponents: { SettingsPage: { name: 'X', template: '<div />' } },
				t: (k) => `[t]${k}`,
			})
			const provided = getProvided(wrapper)
			expect(provided.cnManifest).toBe(wrapper.vm.manifest)
			expect(provided.cnManifest.version).toBe('1.0.0')
			expect(provided.cnCustomComponents).toEqual({
				SettingsPage: { name: 'X', template: '<div />' },
			})
			expect(typeof provided.cnTranslate).toBe('function')
			expect(provided.cnTranslate('key')).toBe('[t]key')
		})

		it('provides an identity-fn cnTranslate when no t prop is given', () => {
			const wrapper = mount(CnAppRoot, {
				propsData: { manifest: baseManifest, appId: 'myapp' },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': true },
			})
			const provided = getProvided(wrapper)
			expect(typeof provided.cnTranslate).toBe('function')
			expect(provided.cnTranslate('key')).toBe('key')
		})

		it('provides an empty registry when no customComponents prop is given', () => {
			const wrapper = mount(CnAppRoot, {
				propsData: { manifest: baseManifest, appId: 'myapp' },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': true },
			})
			const provided = getProvided(wrapper)
			expect(provided.cnCustomComponents).toEqual({})
		})
	})

	describe('multiple dependencies', () => {
		it('treats the manifest as resolved only when every dependency is installed', () => {
			getCapabilities.mockReturnValue({ openregister: {} }) // missing opencatalogi
			const wrapper = mountRoot({
				manifest: { ...baseManifest, dependencies: ['openregister', 'opencatalogi'] },
			})
			expect(wrapper.vm.phase).toBe('dependency-missing')
			expect(wrapper.vm.unresolvedDependencies.map((d) => d.id)).toEqual(['opencatalogi'])
		})
	})
})
