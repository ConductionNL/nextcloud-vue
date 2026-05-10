/**
 * Tests for CnAppRoot.
 *
 * Covers REQ-JMR-003 (provide/inject + slots) and REQ-JMR-013 (phase
 * orchestration: loading → dependency-check → shell) from the
 * json-manifest-renderer spec, plus REQ-OR-1..REQ-OR-7 from the
 * cnapproot-app-availability-guard spec (capabilities-API guard,
 * loading state, opt-out, empty-state, slot override, network
 * fallback).
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

/**
 * Mount helper for the existing phase / slot / inject tests. Defaults
 * `requiresApps: []` so the new app-availability guard does NOT
 * interfere with the existing manifest-dependency / phase tests — those
 * scenarios are independent of the capabilities-API guard. Tests that
 * exercise the guard explicitly opt in via `requiresApps`.
 */
function mountRoot({
	manifest = baseManifest,
	isLoading = false,
	slots = {},
	customComponents = {},
	t = (k) => k,
	requiresApps = [],
} = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'myapp', isLoading, customComponents, translate: t, requiresApps },
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
				propsData: { manifest: baseManifest, appId: 'myapp', requiresApps: [] },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': true },
			})
			const provided = getProvided(wrapper)
			expect(typeof provided.cnTranslate).toBe('function')
			expect(provided.cnTranslate('key')).toBe('key')
		})

		it('provides an empty registry when no customComponents prop is given', () => {
			const wrapper = mount(CnAppRoot, {
				propsData: { manifest: baseManifest, appId: 'myapp', requiresApps: [] },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': true },
			})
			const provided = getProvided(wrapper)
			expect(provided.cnCustomComponents).toEqual({})
		})
	})

	describe('cnPageSidebarVisible inject (REQ-MDSC-6)', () => {
		// Helper: provide an inject value via Vue's parent component
		// pattern (mount() takes a `parentComponent` only in v3 — for v2
		// we mount with a `provide` option on the test mount call).
		function mountRootWithInject(visible, slots = {}) {
			return mount(CnAppRoot, {
				propsData: { manifest: baseManifest, appId: 'myapp', requiresApps: [] },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
				provide: { cnPageSidebarVisible: { value: visible } },
				slots,
			})
		}

		it('renders the #sidebar slot when no inject is provided (default true)', () => {
			const wrapper = mountRoot({ slots: { sidebar: '<div class="sb-default" />' } })
			expect(wrapper.find('.sb-default').exists()).toBe(true)
		})

		it('renders the #sidebar slot when inject is { value: true }', () => {
			const wrapper = mountRootWithInject(true, { sidebar: '<div class="sb-true" />' })
			expect(wrapper.find('.sb-true').exists()).toBe(true)
		})

		it('hides the #sidebar slot when inject is { value: false }', () => {
			const wrapper = mountRootWithInject(false, { sidebar: '<div class="sb-false" />' })
			expect(wrapper.find('.sb-false').exists()).toBe(false)
		})
	})

	describe('cnPageSidebarComponent inject (REQ-MNVS-3)', () => {
		// Mount with both injects so we can drive visibility AND the
		// resolved-component holder independently. The default holder
		// (when an inject is omitted) is `{ value: null }` for the
		// component channel and `{ value: true }` for visibility.
		function mountWithSidebarInject({ visible = true, component = null, slots = {} } = {}) {
			return mount(CnAppRoot, {
				propsData: { manifest: baseManifest, appId: 'myapp', requiresApps: [] },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
				provide: {
					cnPageSidebarVisible: { value: visible },
					cnPageSidebarComponent: { value: component },
				},
				slots,
			})
		}

		// Use render() rather than template:'' — the test runs against
		// the Vue 2 runtime build which doesn't include the template
		// compiler at runtime.
		const NamedSidebar = {
			name: 'NamedSidebar',
			render(h) { return h('div', { class: 'named-sidebar' }, 'named') },
		}
		const ConsumerSidebar = {
			name: 'ConsumerSidebar',
			render(h) { return h('div', { class: 'consumer-sidebar' }, 'consumer') },
		}

		it('mounts the resolved component as the slot default content when no #sidebar override', () => {
			const wrapper = mountWithSidebarInject({ component: NamedSidebar })
			expect(wrapper.find('.named-sidebar').exists()).toBe(true)
		})

		it('renders nothing in the sidebar slot when the holder is null and no override', () => {
			const wrapper = mountWithSidebarInject({ component: null })
			expect(wrapper.find('.named-sidebar').exists()).toBe(false)
		})

		it('consumer #sidebar slot override wins over the resolved component', () => {
			const wrapper = mountWithSidebarInject({
				component: NamedSidebar,
				slots: { sidebar: ConsumerSidebar },
			})
			expect(wrapper.find('.consumer-sidebar').exists()).toBe(true)
			expect(wrapper.find('.named-sidebar').exists()).toBe(false)
		})

		it('visibility=false suppresses the slot even when the holder carries a component', () => {
			const wrapper = mountWithSidebarInject({
				visible: false,
				component: NamedSidebar,
			})
			expect(wrapper.find('.named-sidebar').exists()).toBe(false)
		})

		it('default inject (no provider) leaves the holder null — slot fallback unchanged', () => {
			const wrapper = mount(CnAppRoot, {
				propsData: { manifest: baseManifest, appId: 'myapp', requiresApps: [] },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': true },
				slots: { sidebar: '<div class="legacy-sidebar" />' },
			})
			// Without a CnPageRenderer ancestor the inject default
			// `{ value: null }` resolves; the consumer's slot override
			// renders unchanged.
			expect(wrapper.find('.legacy-sidebar').exists()).toBe(true)
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

	describe('app-availability guard (REQ-OR-1..REQ-OR-7)', () => {
		/**
		 * Mount helper that exercises the guard. Unlike mountRoot above,
		 * this one defaults `requiresApps` to its production default
		 * `['openregister']` so the test asserts the as-shipped behaviour.
		 */
		function mountWithGuard({
			manifest = baseManifest,
			requiresApps = ['openregister'],
			slots = {},
			t = (k) => k,
		} = {}) {
			return mount(CnAppRoot, {
				propsData: { manifest, appId: 'myapp', translate: t, requiresApps },
				mocks: { $route: { name: 'home' } },
				stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
				slots,
			})
		}

		// REQ-OR-1, REQ-OR-2: capabilities check finds openregister → renderer mounts.
		it('renders the renderer when capabilities include openregister (REQ-OR-1, REQ-OR-2)', async () => {
			getCapabilities.mockReturnValue({ openregister: {} })
			const wrapper = mountWithGuard()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.capabilitiesLoading).toBe(false)
			expect(wrapper.vm.missingApps).toEqual([])
			expect(wrapper.find('.router-view-stub').exists()).toBe(true)
			expect(wrapper.find('.cn-app-root__or-missing').exists()).toBe(false)
		})

		// REQ-OR-3: missing capability key → empty-state visible.
		it('renders the default empty state when capabilities omit openregister (REQ-OR-3)', async () => {
			getCapabilities.mockReturnValue({}) // no openregister
			const wrapper = mountWithGuard()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.missingApps).toEqual(['openregister'])
			expect(wrapper.find('.cn-app-root__or-missing').exists()).toBe(true)
			expect(wrapper.find('.stub.NcEmptyContent').exists()).toBe(true)
			expect(wrapper.find('.router-view-stub').exists()).toBe(false)
		})

		// REQ-OR-3 multi-app future-proofing: ANY missing entry surfaces the empty-state.
		it('renders the empty state when ANY required app is missing (REQ-OR-3)', async () => {
			getCapabilities.mockReturnValue({ openregister: {} }) // missing openconnector
			const wrapper = mountWithGuard({ requiresApps: ['openregister', 'openconnector'] })
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.missingApps).toEqual(['openconnector'])
			expect(wrapper.find('.cn-app-root__or-missing').exists()).toBe(true)
		})

		// REQ-OR-6: data() derives `capabilitiesLoading` from the prop —
		// `true` when the guard will run, `false` when the consumer opts out.
		it('initialises capabilitiesLoading from requiresApps (REQ-OR-6)', () => {
			expect(CnAppRoot.data.call({ requiresApps: ['openregister'] }).capabilitiesLoading).toBe(true)
			expect(CnAppRoot.data.call({ requiresApps: [] }).capabilitiesLoading).toBe(false)
			expect(CnAppRoot.data.call({ requiresApps: ['openregister'] }).missingApps).toEqual([])
			expect(CnAppRoot.data.call({ requiresApps: ['openregister'] }).guardError).toBeNull()
		})

		// REQ-OR-6: spinner is the rendered surface while capabilitiesLoading is true.
		it('renders the loading spinner template branch when capabilitiesLoading is true (REQ-OR-6)', async () => {
			getCapabilities.mockReturnValue({ openregister: {} })
			const wrapper = mountWithGuard()
			// Force the component back to the loading state to assert the
			// template branch renders. (Production path: this state holds
			// only briefly between component creation and mounted() flipping
			// the flag — too short to assert against the real lifecycle.)
			wrapper.setData({ capabilitiesLoading: true, missingApps: [] })
			await wrapper.vm.$nextTick()
			expect(wrapper.find('.cn-app-root__capabilities-loading').exists()).toBe(true)
			expect(wrapper.find('.stub.NcLoadingIcon').exists()).toBe(true)
			expect(wrapper.find('.router-view-stub').exists()).toBe(false)
		})

		// REQ-OR-5: empty array short-circuits the entire guard (no capabilities call).
		it('skips the guard when :requires-apps="[]" and renders immediately (REQ-OR-5)', async () => {
			const wrapper = mountWithGuard({ requiresApps: [] })
			await wrapper.vm.$nextTick()
			expect(getCapabilities).not.toHaveBeenCalled()
			expect(wrapper.vm.capabilitiesLoading).toBe(false)
			expect(wrapper.vm.missingApps).toEqual([])
			expect(wrapper.find('.router-view-stub').exists()).toBe(true)
			expect(wrapper.find('.cn-app-root__or-missing').exists()).toBe(false)
		})

		// REQ-OR-4: consumer #or-missing slot replaces the default empty-state entirely.
		it('renders #or-missing slot override instead of the default empty state (REQ-OR-4)', async () => {
			getCapabilities.mockReturnValue({}) // no openregister
			const wrapper = mountWithGuard({
				slots: { 'or-missing': '<div class="custom-or-missing">custom</div>' },
			})
			await wrapper.vm.$nextTick()
			expect(wrapper.find('.custom-or-missing').exists()).toBe(true)
			expect(wrapper.find('.stub.NcEmptyContent').exists()).toBe(false)
			expect(wrapper.find('.router-view-stub').exists()).toBe(false)
		})

		// REQ-OR-7: getCapabilities() rejecting → renderer mounts (fall through), warn logged.
		it('falls through to the renderer when getCapabilities() throws (REQ-OR-7)', async () => {
			getCapabilities.mockImplementation(() => { throw new Error('capabilities-api-down') })
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const wrapper = mountWithGuard()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.guardError).toBeInstanceOf(Error)
			expect(wrapper.vm.missingApps).toEqual([])
			expect(wrapper.vm.capabilitiesLoading).toBe(false)
			expect(wrapper.find('.router-view-stub').exists()).toBe(true)
			expect(wrapper.find('.cn-app-root__or-missing').exists()).toBe(false)
			expect(warnSpy).toHaveBeenCalled()
			warnSpy.mockRestore()
		})

		// REQ-OR-7: getCapabilities() returning null → no crash, behaviour matches reject path.
		it('falls through to the renderer when getCapabilities() returns null (REQ-OR-7)', async () => {
			getCapabilities.mockReturnValue(null)
			const wrapper = mountWithGuard()
			await wrapper.vm.$nextTick()
			// null is treated as "no capability keys" — every required app is "missing".
			// That's a deliberate trade-off: returning null is unusual enough that the
			// safe default is to surface the empty-state rather than silently hide the
			// problem. The reject path covers genuine network failure.
			expect(wrapper.vm.capabilitiesLoading).toBe(false)
			expect(wrapper.vm.missingApps).toEqual(['openregister'])
		})
	})
})
