/**
 * CnAppRoot's Integrations section (ADR-110).
 *
 * The section lists the manifest's `section: "integrations"` entries — the
 * links that leave this app for another one — at the bottom of the per-user
 * settings modal, instead of in the navigation.
 *
 * The load-bearing test here is the slot one. Six fleet apps override
 * `#user-settings`; anything placed inside that slot's default fallback
 * vanishes for all of them the moment they supply their own content, silently,
 * because an unmatched slot renders nothing and reports nothing. So the
 * section is mounted OUTSIDE the slot, and the test pins that.
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

const mockIsAppInstalled = jest.fn(() => true)
jest.mock('../../src/utils/appInstalled.js', () => ({
	isAppInstalled: (id) => mockIsAppInstalled(id),
}))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const AVG = {
	id: 'AvgRegisterLink',
	label: 'Processing activities (AVG)',
	href: '/apps/openregister/#/avg',
	section: 'integrations',
	order: 20,
}
const AI = {
	id: 'AiOversightLink',
	label: 'AI oversight',
	href: '/apps/hermiq/ai-oversight',
	section: 'integrations',
	order: 10,
}

function manifestWith(menu) {
	return {
		version: '1.0.0',
		menu,
		pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	}
}

/**
 * `requiresApps` defaults to `['openregister']`, and with capabilities mocked
 * empty the shell renders its missing-app screen instead of the app — the
 * settings dialog never mounts at all. Opting out of the gate is what lets
 * these tests reach the surface under test.
 *
 * @param {object} opts Mount options.
 * @param {object} opts.manifest The manifest under test.
 * @param {Array<string>} [opts.permissions] Permission strings the user holds.
 * @param {object} [opts.slots] Slot overrides.
 * @return {object} The mounted wrapper.
 */
function mountRoot({ manifest, permissions = [], slots = {} } = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'myapp', permissions, requiresApps: [] },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
		slots,
	})
}

describe('CnAppRoot — integrationEntries', () => {
	beforeEach(() => {
		mockIsAppInstalled.mockReset().mockReturnValue(true)
	})

	it('collects only section: "integrations" entries', () => {
		const wrapper = mountRoot({
			manifest: manifestWith([
				{ id: 'home', label: 'Home', route: 'home' },
				{ id: 'cfg', label: 'Config', route: 'cfg', section: 'settings' },
				AVG,
			]),
		})
		expect(wrapper.vm.integrationEntries.map((e) => e.id)).toEqual(['AvgRegisterLink'])
	})

	it('orders by `order`', () => {
		const wrapper = mountRoot({ manifest: manifestWith([AVG, AI]) })
		expect(wrapper.vm.integrationEntries.map((e) => e.id)).toEqual(['AiOversightLink', 'AvgRegisterLink'])
	})

	it('drops an entry with no href — a row here is a link or it is nothing', () => {
		const wrapper = mountRoot({
			manifest: manifestWith([{ id: 'Broken', label: 'Broken', section: 'integrations' }]),
		})
		expect(wrapper.vm.integrationEntries).toHaveLength(0)
	})

	it('hides a link into an app that is not installed', () => {
		// Unlike a nav entry pointing at this app's own route, a cross-app link
		// can be dead through no fault of this app. Listing it would present a
		// guaranteed 404 as a feature.
		mockIsAppInstalled.mockImplementation((id) => id !== 'hermiq')
		const wrapper = mountRoot({
			manifest: manifestWith([{ ...AI, visibleIf: { appInstalled: 'hermiq' } }, AVG]),
		})
		expect(wrapper.vm.integrationEntries.map((e) => e.id)).toEqual(['AvgRegisterLink'])
	})

	it('applies the permission gate the same way the nav does', () => {
		const admin = { ...AVG, permission: 'admin' }
		expect(mountRoot({ manifest: manifestWith([admin]), permissions: ['user'] })
			.vm.integrationEntries).toHaveLength(0)
		expect(mountRoot({ manifest: manifestWith([admin]), permissions: ['admin'] })
			.vm.integrationEntries).toHaveLength(1)
	})

	it('does not filter when no permissions prop is supplied (same escape as CnAppNav)', () => {
		const wrapper = mountRoot({ manifest: manifestWith([{ ...AVG, permission: 'admin' }]), permissions: [] })
		expect(wrapper.vm.integrationEntries).toHaveLength(1)
	})
})

describe('CnAppRoot — the Integrations section survives a #user-settings override', () => {
	beforeEach(() => {
		mockIsAppInstalled.mockReset().mockReturnValue(true)
	})

	it('renders the section when the host app supplies its own user-settings slot', async () => {
		const wrapper = mountRoot({
			manifest: manifestWith([AVG]),
			slots: { 'user-settings': '<div class="host-own-section">Host content</div>' },
		})
		wrapper.vm.userSettingsOpen = true
		await wrapper.vm.$nextTick()
		expect(wrapper.html()).toContain('host-own-section')
		expect(wrapper.find('#cn-integrations').exists()).toBe(true)
	})

	it('renders the section with the default slot content too', async () => {
		const wrapper = mountRoot({ manifest: manifestWith([AVG]) })
		wrapper.vm.userSettingsOpen = true
		await wrapper.vm.$nextTick()
		expect(wrapper.find('#cn-integrations').exists()).toBe(true)
	})

	it('renders no section at all when the app declares no integrations', async () => {
		const wrapper = mountRoot({ manifest: manifestWith([{ id: 'home', label: 'Home', route: 'home' }]) })
		wrapper.vm.userSettingsOpen = true
		await wrapper.vm.$nextTick()
		expect(wrapper.find('#cn-integrations').exists()).toBe(false)
	})
})
