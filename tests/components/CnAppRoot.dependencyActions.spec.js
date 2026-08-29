/**
 * Tests for CnAppRoot's HARD/SOFT dependency model and install/enable
 * surfaces (REQ-DIA-3, REQ-DIA-5, REQ-DIA-6, REQ-DIA-7).
 *
 * Covers: dependency normalisation (string vs object), that only unresolved
 * HARD deps gate the shell, the dismissible soft-dependency banner + its
 * localStorage persistence, the or-missing admin/non-admin action, and the
 * English default copy for the app-availability.* keys. The install success
 * path installs a real app + reloads against the live instance, so those
 * branches are @e2e-excluded and driven here with the installer and
 * @nextcloud/auth mocked at the network / auth boundary only.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')) },
}))
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })),
}))
const mockInstallAndEnable = jest.fn()
const mockInstallerRefs = { installing: { value: false }, error: { value: null } }
jest.mock('../../src/composables/useAppInstaller.js', () => ({
	useAppInstaller: () => ({
		installing: mockInstallerRefs.installing,
		error: mockInstallerRefs.error,
		installAndEnable: mockInstallAndEnable,
	}),
}))

const { getCurrentUser } = require('@nextcloud/auth')
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

function mountRoot({ manifest, requiresApps = [], translate, props = {} } = {}) {
	return mount(CnAppRoot, {
		propsData: {
			manifest,
			appId: 'myapp',
			requiresApps,
			...(translate ? { translate } : {}),
			...props,
		},
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

/**
 * Mount with the DEPRECATED in-shell soft-dependency banners switched back
 * on. They are off by default now (they stacked one per optional leaf and
 * pushed the app's own content below the fold); the markup survives behind
 * `softDependencyNotices` for one release, and these tests cover that path.
 *
 * @param {object} opts Same shape as mountRoot.
 * @return {object} The mounted wrapper.
 */
const mountRootWithBanners = (opts) => mountRoot({ ...opts, props: { ...(opts.props || {}), softDependencyNotices: true } })

const baseManifest = (dependencies) => ({
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	dependencies,
})

describe('CnAppRoot HARD/SOFT dependencies (REQ-DIA-5)', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		mockInstallAndEnable.mockReset().mockResolvedValue(undefined)
		mockInstallerRefs.installing.value = false
		mockInstallerRefs.error.value = null
		try { window.localStorage.clear() } catch (e) { /* noop */ }
	})

	it('normalises a string entry to a HARD dependency', () => {
		const wrapper = mountRoot({ manifest: baseManifest(['openregister']) })
		const norm = wrapper.vm.dependencyStatuses
		expect(norm).toHaveLength(1)
		expect(norm[0]).toMatchObject({ id: 'openregister', required: true, name: 'openregister' })
	})

	it('normalises an object entry with required:false to a SOFT dependency', () => {
		const wrapper = mountRoot({ manifest: baseManifest([{ id: 'deck', required: false, name: 'Deck' }]) })
		const norm = wrapper.vm.dependencyStatuses
		expect(norm[0]).toMatchObject({ id: 'deck', required: false, name: 'Deck' })
	})

	it('defaults an object entry without required to HARD', () => {
		const wrapper = mountRoot({ manifest: baseManifest([{ id: 'openregister' }]) })
		expect(wrapper.vm.dependencyStatuses[0]).toMatchObject({ id: 'openregister', required: true })
	})

	it('an unresolved HARD dependency blocks the shell (phase dependency-missing)', () => {
		const wrapper = mountRoot({ manifest: baseManifest(['openregister']) })
		expect(wrapper.vm.phase).toBe('dependency-missing')
		expect(wrapper.find('[data-testid="cn-dependency-missing"]').exists()).toBe(true)
	})

	it('an unresolved SOFT dependency does NOT block the shell', () => {
		const wrapper = mountRoot({ manifest: baseManifest([{ id: 'deck', required: false }]) })
		expect(wrapper.vm.phase).not.toBe('dependency-missing')
		expect(wrapper.vm.phase).toBe('shell')
	})
})

describe('CnAppRoot soft-dependency banner (REQ-DIA-6) — DEPRECATED, opt-in', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		mockInstallAndEnable.mockReset().mockResolvedValue(undefined)
		mockInstallerRefs.installing.value = false
		mockInstallerRefs.error.value = null
		try { window.localStorage.clear() } catch (e) { /* noop */ }
	})

	it('renders a dismissible banner with an install action for an unresolved soft dep', () => {
		const wrapper = mountRootWithBanners({ manifest: baseManifest([{ id: 'deck', required: false, name: 'Deck' }]) })
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-deck"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-install-deck"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-dismiss-deck"]').exists()).toBe(true)
	})

	it('persists dismissal in localStorage and hides the banner', async () => {
		const wrapper = mountRootWithBanners({ manifest: baseManifest([{ id: 'deck', required: false, name: 'Deck' }]) })
		await wrapper.find('[data-testid="cn-app-root-soft-dep-dismiss-deck"]').trigger('click')
		await wrapper.vm.$nextTick()

		expect(window.localStorage.getItem('cn-soft-dep-dismissed:myapp:deck')).toBe('1')
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-deck"]').exists()).toBe(false)
	})

	it('does not render a banner that was dismissed in a previous session', () => {
		window.localStorage.setItem('cn-soft-dep-dismissed:myapp:deck', '1')
		const wrapper = mountRootWithBanners({ manifest: baseManifest([{ id: 'deck', required: false }]) })
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-deck"]').exists()).toBe(false)
	})

	it('dismisses multiple soft dependencies independently', async () => {
		const wrapper = mountRootWithBanners({
			manifest: baseManifest([
				{ id: 'deck', required: false },
				{ id: 'spreed', required: false },
			]),
		})
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-deck"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-spreed"]').exists()).toBe(true)

		await wrapper.find('[data-testid="cn-app-root-soft-dep-dismiss-deck"]').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-deck"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-spreed"]').exists()).toBe(true)
	})

	it('shows ask-your-administrator copy instead of the install button for a non-admin', () => {
		getCurrentUser.mockReturnValue({ uid: 'bob', isAdmin: false })
		const wrapper = mountRootWithBanners({ manifest: baseManifest([{ id: 'deck', required: false, name: 'Deck' }]) })
		expect(wrapper.find('[data-testid="cn-app-root-soft-dep-install-deck"]').exists()).toBe(false)
		expect(wrapper.find('.cn-app-root__soft-dep-ask-admin').text()).toContain('Deck')
	})

	// The deprecation itself. Four optional leaves used to mean four stacked
	// orange cards above the app's own content, on every page load.
	it('renders NO banners by default, however many soft deps are unresolved', () => {
		const wrapper = mountRoot({
			manifest: baseManifest([
				{ id: 'deck', required: false },
				{ id: 'spreed', required: false },
				{ id: 'forms', required: false },
				{ id: 'integriq', required: false },
			]),
		})
		expect(wrapper.findAll('.cn-app-root__soft-dep')).toHaveLength(0)
		// The data is still computed and still exposed — only the in-shell
		// surface is gone, so an app rendering its own list keeps working.
		expect(wrapper.vm.unresolvedSoftDependencies.map((d) => d.id)).toEqual(
			['deck', 'spreed', 'forms', 'integriq'],
		)
	})
})

describe('CnAppRoot or-missing guard action (REQ-DIA-3)', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		mockInstallAndEnable.mockReset().mockResolvedValue(undefined)
		mockInstallerRefs.installing.value = false
		mockInstallerRefs.error.value = null
	})

	it('renders an admin install button that targets the missing app', async () => {
		const wrapper = mountRootWithBanners({ manifest: baseManifest([]), requiresApps: ['openregister'] })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.missingApps).toEqual(['openregister'])
		const btn = wrapper.find('[data-testid="cn-app-root-or-missing-install"]')
		expect(btn.exists()).toBe(true)
		await btn.trigger('click')
		expect(mockInstallAndEnable).toHaveBeenCalledWith('openregister')
	})

	it('renders ask-your-administrator copy for a non-admin', async () => {
		getCurrentUser.mockReturnValue({ uid: 'bob', isAdmin: false })
		const wrapper = mountRootWithBanners({ manifest: baseManifest([]), requiresApps: ['openregister'] })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-app-root-or-missing-install"]').exists()).toBe(false)
		const ask = wrapper.find('[data-testid="cn-app-root-or-missing-ask-admin"]')
		expect(ask.exists()).toBe(true)
		expect(ask.text().toLowerCase()).toContain('administrator')
	})
})

describe('CnAppRoot app-availability English defaults (REQ-DIA-7)', () => {
	beforeEach(() => {
		__resetAppStatusCacheForTests()
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
	})

	it('renders English prose, not the raw app-availability.* keys', async () => {
		const wrapper = mountRootWithBanners({ manifest: baseManifest([]), requiresApps: ['openregister'] })
		await wrapper.vm.$nextTick()
		const html = wrapper.find('.cn-app-root__or-missing').html()
		expect(html).not.toContain('app-availability.title')
		expect(html).not.toContain('app-availability.description')
		expect(wrapper.vm.orMissingTitle).toBe('Required app not available')
		expect(wrapper.vm.orMissingDescription).toContain('openregister')
	})

	it('uses the translated string when the translate prop resolves the key', async () => {
		const translate = (k) => (k === 'app-availability.title' ? 'Localised title' : k)
		const wrapper = mountRootWithBanners({ manifest: baseManifest([]), requiresApps: ['openregister'], translate })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.orMissingTitle).toBe('Localised title')
	})
})
