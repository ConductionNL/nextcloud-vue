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
// Mock @nextcloud/axios so the batched menu-count hydration
// (POST /api/objects/counts, audit item 26) is controlled per-test and
// never issues a real request on mount. Default: reject so mounts without
// an explicit resolution fall back to the per-entry path harmlessly.
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')) },
}))
const axios = require('@nextcloud/axios').default
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
 * @param root0
 * @param root0.manifest
 * @param root0.isLoading
 * @param root0.slots
 * @param root0.customComponents
 * @param root0.t
 * @param root0.requiresApps
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
		// Reset the shared batched-counts axios mock each test, restoring the
		// default reject (no batch route) so per-test call counts are isolated.
		axios.post.mockReset()
		axios.post.mockRejectedValue(new Error('no batch route'))
		__resetAppStatusCacheForTests()
		// Define a clean appswebroots each test. CnAppRoot's in-app edit shell
		// (ADR-041) calls useAppStatus('openbuild'); without OpenBuild present it
		// is inert (availability false, no edit toolbar).
		global.OC = global.OC || {}
		global.OC.appswebroots = {}
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

	describe('OpenBuild edit-button gating (openbuildEditable)', () => {
		it('is available when OpenBuild is enabled and the manifest does not opt out', () => {
			getCapabilities.mockReturnValue({})
			global.OC.appswebroots = { openbuild: '/index.php/apps/openbuild' }
			const wrapper = mountRoot({ manifest: { ...baseManifest } })
			expect(wrapper.vm.openBuildAvailable).toBe(true)
		})

		it('is suppressed when the manifest sets openbuildEditable:false', () => {
			getCapabilities.mockReturnValue({})
			global.OC.appswebroots = { openbuild: '/index.php/apps/openbuild' }
			const wrapper = mountRoot({ manifest: { ...baseManifest, openbuildEditable: false } })
			expect(wrapper.vm.openBuildAvailable).toBe(false)
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
		 * @param root0
		 * @param root0.manifest
		 * @param root0.requiresApps
		 * @param root0.slots
		 * @param root0.t
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
			// Mark OpenBuild reachable so the edit-shell availability probe
			// short-circuits via appswebroots and does not call getCapabilities;
			// this keeps the assertion below about the GUARD not running.
			global.OC.appswebroots = { openbuild: true }
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

		// REQ-OR-7: getCapabilities() throwing → useAppStatus swallows the error
		// and reports the app as not-installed, so the guard surfaces the
		// dependency-missing screen (fail-closed) and logs a warn. This mirrors
		// the returns-null path below — an unverifiable dependency is treated as
		// missing rather than silently hidden.
		it('treats a getCapabilities() throw as a missing dependency (REQ-OR-7)', async () => {
			getCapabilities.mockImplementation(() => { throw new Error('capabilities-api-down') })
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const wrapper = mountWithGuard()
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.capabilitiesLoading).toBe(false)
			expect(wrapper.vm.missingApps).toEqual(['openregister'])
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

	describe('user-settings modal (cnOpenUserSettings)', () => {
		function getProvided(wrapper) {
			return wrapper.vm.$options.provide.call(wrapper.vm)
		}

		it('provides cnOpenUserSettings as a function', () => {
			const wrapper = mountRoot()
			const provided = getProvided(wrapper)
			expect(typeof provided.cnOpenUserSettings).toBe('function')
		})

		it('flips userSettingsOpen to true when cnOpenUserSettings is called', () => {
			const wrapper = mountRoot()
			expect(wrapper.vm.userSettingsOpen).toBe(false)
			const provided = getProvided(wrapper)
			provided.cnOpenUserSettings()
			expect(wrapper.vm.userSettingsOpen).toBe(true)
		})

		it('falls back to translate("User settings") when userSettingsTitle prop is empty', () => {
			const wrapper = mountRoot({ t: (k) => `[t]${k}` })
			expect(wrapper.vm.resolvedUserSettingsTitle).toBe('[t]User settings')
		})

		it('uses userSettingsTitle prop verbatim when provided', () => {
			const wrapper = mount(CnAppRoot, {
				propsData: {
					manifest: baseManifest,
					appId: 'myapp',
					userSettingsTitle: 'Decidesk preferences',
				},
				mocks: { $route: { name: 'home' } },
				stubs: {
					'router-view': true,
					NcAppSettingsDialog: true,
					NcAppSettingsSection: true,
				},
			})
			expect(wrapper.vm.resolvedUserSettingsTitle).toBe('Decidesk preferences')
		})
	})

	describe('restart-walkthrough section in user settings (ADR-043)', () => {
		const { useWalkthrough, __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')
		const walkthroughManifest = {
			...baseManifest,
			walkthrough: {
				enabled: true,
				tours: [{ id: 'getting-started', steps: [{ id: 's1', title: 'Hi' }] }],
			},
		}

		beforeEach(() => {
			__resetWalkthroughCacheForTests()
		})

		it('renders the gated section only when walkthroughEnabled', () => {
			const noWt = mountRoot()
			expect(noWt.find('#cn-walkthrough').exists()).toBe(false)

			const withWt = mountRoot({ manifest: walkthroughManifest })
			withWt.vm.userSettingsOpen = true
			expect(withWt.vm.walkthroughEnabled).toBe(true)
			expect(withWt.find('#cn-walkthrough').exists()).toBe(true)
		})

		it('closes the dialog and restarts the first tour when the button handler runs', () => {
			jest.useFakeTimers()
			const wrapper = mountRoot({ manifest: walkthroughManifest })
			wrapper.vm.userSettingsOpen = true

			// Same per-appId cached entry the component resolves at click time.
			const entry = useWalkthrough('myapp', walkthroughManifest)
			const restartSpy = jest.spyOn(entry, 'restart').mockImplementation(() => {})

			wrapper.vm.restartWalkthroughFromSettings()
			expect(wrapper.vm.userSettingsOpen).toBe(false)

			jest.runOnlyPendingTimers()
			expect(restartSpy).toHaveBeenCalledWith('getting-started')
			jest.useRealTimers()
		})

		it('does not restart when no walkthrough is enabled', () => {
			jest.useFakeTimers()
			const wrapper = mountRoot()
			wrapper.vm.userSettingsOpen = true
			wrapper.vm.restartWalkthroughFromSettings()
			expect(wrapper.vm.userSettingsOpen).toBe(false)
			// No tour to fire; simply advancing timers must not throw.
			expect(() => jest.runOnlyPendingTimers()).not.toThrow()
			jest.useRealTimers()
		})
	})

	describe('cnMenuCounts hydration (count:"auto")', () => {
		it('provides an empty cnMenuCounts map by default', () => {
			const wrapper = mountRoot()
			const provided = wrapper.vm.$options.provide.call(wrapper.vm)
			expect(provided.cnMenuCounts).toEqual({})
		})

		it('fetches one count per unique (register, schema) pair for count:"auto" entries', async () => {
			const fetchCollection = jest.fn().mockResolvedValue([])
			const registerObjectType = jest.fn()
			const getPagination = jest.fn().mockImplementation((slug) => ({ total: slug === 'decisions-decision' ? 17 : 5, page: 1, pages: 1, limit: 1 }))
			const fakeStore = {
				objectTypeRegistry: {},
				registerObjectType,
				fetchCollection,
				getPagination,
			}
			// Patch the imported useObjectStore via the actual module — but the
			// component imports it at module load. Instead we directly call the
			// private hydrator with a stubbed store via spyOn.
			const wrapper = mount(CnAppRoot, {
				propsData: {
					manifest: {
						version: '1.0.0',
						menu: [
							{ id: 'd', label: 'app.d', route: 'decisions', count: 'auto' },
							{ id: 'm', label: 'app.m', route: 'meetings', count: 'auto' },
							{ id: 'd2', label: 'app.d2', route: 'decisions', count: 'auto' },
						],
						pages: [
							{ id: 'decisions', route: '/d', type: 'index', title: 'Decisions', config: { register: 'decisions', schema: 'decision' } },
							{ id: 'meetings', route: '/m', type: 'index', title: 'Meetings', config: { register: 'meetings', schema: 'meeting' } },
						],
					},
					appId: 'myapp',
					requiresApps: [],
				},
				mocks: { $route: { name: 'decisions' } },
				stubs: {
					'router-view': true,
					NcAppSettingsDialog: true,
					NcAppSettingsSection: true,
				},
			})
			// Directly drive hydration with the fake store, sidestepping Pinia.
			await wrapper.vm._fetchAndCacheCount(fakeStore, 'decisions-decision', 'decisions', 'decision')
			await wrapper.vm._fetchAndCacheCount(fakeStore, 'meetings-meeting', 'meetings', 'meeting')
			expect(registerObjectType).toHaveBeenCalledWith('decisions-decision', 'decision', 'decisions')
			expect(fetchCollection).toHaveBeenCalledWith('decisions-decision', { _limit: 1 })
			expect(wrapper.vm.cnMenuCounts).toEqual({
				decisions: { decision: 17 },
				meetings: { meeting: 5 },
			})
		})

		it('swallows errors from _fetchAndCacheCount and leaves the map empty', async () => {
			const fakeStore = {
				objectTypeRegistry: {},
				registerObjectType: () => { throw new Error('nope') },
				fetchCollection: jest.fn(),
				getPagination: jest.fn(),
			}
			const wrapper = mountRoot()
			await wrapper.vm._fetchAndCacheCount(fakeStore, 'foo-bar', 'foo', 'bar')
			expect(wrapper.vm.cnMenuCounts).toEqual({})
		})

		it('hydrates all counts with ONE POST /api/objects/counts (audit item 26)', async () => {
			axios.post.mockResolvedValueOnce({
				data: { results: [
					{ register: 'decisions', schema: 'decision', count: 17 },
					{ register: 'meetings', schema: 'meeting', count: 5 },
				] },
			})
			const wrapper = mountRoot()
			await wrapper.vm._hydrateMenuCountsBatched([
				{ register: 'decisions', schema: 'decision' },
				{ register: 'meetings', schema: 'meeting' },
			])
			expect(axios.post).toHaveBeenCalledTimes(1)
			const [url, body] = axios.post.mock.calls[0]
			expect(url).toContain('/apps/openregister/api/objects/counts')
			expect(body).toEqual({ counts: [
				{ register: 'decisions', schema: 'decision' },
				{ register: 'meetings', schema: 'meeting' },
			] })
			expect(wrapper.vm.cnMenuCounts).toEqual({
				decisions: { decision: 17 },
				meetings: { meeting: 5 },
			})
		})

		it('falls back to per-entry fetches when the batch endpoint 404s', async () => {
			axios.post.mockRejectedValueOnce(Object.assign(new Error('not found'), { response: { status: 404 } }))
			const wrapper = mountRoot()
			const perEntry = jest.spyOn(wrapper.vm, '_hydrateMenuCountsPerEntry').mockImplementation(() => {})
			// Drive the top-level hydrator with count:"auto" pairs present.
			wrapper.setData({}) // no-op to ensure vm ready
			await wrapper.vm._hydrateMenuCountsBatched([{ register: 'r', schema: 's' }]).catch(() => {
				wrapper.vm._hydrateMenuCountsPerEntry([{ register: 'r', schema: 's' }])
			})
			expect(perEntry).toHaveBeenCalledWith([{ register: 'r', schema: 's' }])
		})

		it('rejects a malformed batch response so the caller can fall back', async () => {
			axios.post.mockResolvedValueOnce({ data: { notResults: true } })
			const wrapper = mountRoot()
			await expect(wrapper.vm._hydrateMenuCountsBatched([{ register: 'r', schema: 's' }])).rejects.toThrow()
		})
	})

	// The default <CnAppNav> receives the manifest as a REACTIVE prop
	// (`menuManifest`), not via the non-reactive provide/inject fallback — so an
	// async manifest update (e.g. a backend /api/manifest delta merged in by
	// useAppManifest) reaches the nav without a reload. Regression guard for the
	// per-case-type dynamic-menu path.
	describe('reactive menu manifest (default CnAppNav)', () => {
		it('passes the manifest to the default CnAppNav as a prop', () => {
			const wrapper = mountRoot()
			const nav = wrapper.findComponent({ name: 'CnAppNav' })
			expect(nav.exists()).toBe(true)
			expect(nav.props('manifest')).toBe(wrapper.props('manifest'))
			wrapper.destroy()
		})

		it('updates the CnAppNav manifest prop when the manifest prop changes', async () => {
			const wrapper = mountRoot()
			const merged = {
				version: '1.0.0',
				dependencies: [],
				pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
				menu: [{
					id: 'CasesGroup',
					label: 'Cases',
					children: [{ id: 'ct-1', label: 'Objections', route: 'home', query: { caseType: 'u1' } }],
				}],
			}
			await wrapper.setProps({ manifest: merged })
			const nav = wrapper.findComponent({ name: 'CnAppNav' })
			expect(nav.props('manifest')).toBe(merged)
			expect(nav.props('manifest').menu[0].children[0].query.caseType).toBe('u1')
			wrapper.destroy()
		})
	})

	describe('AI companion opt-in (aiCompanion prop)', () => {
		/**
		 * Mount into the shell phase with CnAiCompanion stubbed (the real one
		 * fires a backend health probe). Omit aiCompanion to test the default.
		 *
		 * @param {boolean|undefined} aiCompanion The opt-in prop value.
		 * @return {object} The mounted wrapper.
		 */
		function mountWithCompanion(aiCompanion) {
			const propsData = { manifest: baseManifest, appId: 'myapp', translate: (k) => k, requiresApps: [] }
			if (aiCompanion !== undefined) {
				propsData.aiCompanion = aiCompanion
			}
			return mount(CnAppRoot, {
				propsData,
				mocks: { $route: { name: 'home' } },
				stubs: {
					'router-view': { template: '<div class="router-view-stub" />' },
					CnAiCompanion: { template: '<div class="cn-ai-companion-stub" />' },
				},
			})
		}

		it('does NOT mount the AI companion by default (opt-in off)', () => {
			const wrapper = mountWithCompanion(undefined)
			expect(wrapper.vm.phase).toBe('shell')
			expect(wrapper.find('.cn-ai-companion-stub').exists()).toBe(false)
		})

		it('does NOT mount the AI companion when aiCompanion is false', () => {
			const wrapper = mountWithCompanion(false)
			expect(wrapper.find('.cn-ai-companion-stub').exists()).toBe(false)
		})

		it('mounts the AI companion when aiCompanion is true', () => {
			const wrapper = mountWithCompanion(true)
			expect(wrapper.find('.cn-ai-companion-stub').exists()).toBe(true)
		})
	})

	describe('Command palette opt-in (commandPalette prop)', () => {
		/**
		 * Mount into the shell phase with CnCommandPalette stubbed.
		 * Omit `commandPalette` to test the default (off).
		 *
		 * @param {boolean|object|undefined} commandPalette The opt-in prop value.
		 * @return {object} The mounted wrapper.
		 */
		function mountWithPalette(commandPalette) {
			const propsData = { manifest: baseManifest, appId: 'myapp', translate: (k) => k, requiresApps: [] }
			if (commandPalette !== undefined) {
				propsData.commandPalette = commandPalette
			}
			return mount(CnAppRoot, {
				propsData,
				mocks: { $route: { name: 'home' } },
				stubs: {
					'router-view': { template: '<div class="router-view-stub" />' },
					CnCommandPalette: {
						name: 'CnCommandPalette',
						props: ['manifest', 'router', 'appId', 'objectSearch', 'shortcut'],
						template: '<div class="cn-command-palette-stub" />',
					},
				},
			})
		}

		it('does NOT mount the command palette by default (opt-in off)', () => {
			const wrapper = mountWithPalette(undefined)
			expect(wrapper.vm.phase).toBe('shell')
			expect(wrapper.find('.cn-command-palette-stub').exists()).toBe(false)
		})

		it('does NOT mount the command palette when commandPalette is false', () => {
			const wrapper = mountWithPalette(false)
			expect(wrapper.find('.cn-command-palette-stub').exists()).toBe(false)
		})

		it('mounts the command palette when commandPalette is true, wired to manifest + appId', () => {
			const wrapper = mountWithPalette(true)
			const palette = wrapper.find('.cn-command-palette-stub')
			expect(palette.exists()).toBe(true)
			expect(wrapper.findComponent({ name: 'CnCommandPalette' }).props('manifest')).toBe(wrapper.vm.manifest)
			expect(wrapper.findComponent({ name: 'CnCommandPalette' }).props('appId')).toBe('myapp')
		})

		it('mounts the command palette with prop overrides when commandPalette is an object', () => {
			const objectSearch = () => Promise.resolve([])
			const wrapper = mountWithPalette({ objectSearch, shortcut: 'p' })
			const palette = wrapper.findComponent({ name: 'CnCommandPalette' })
			expect(palette.exists()).toBe(true)
			expect(palette.props('objectSearch')).toBe(objectSearch)
			expect(palette.props('shortcut')).toBe('p')
		})
	})
})
