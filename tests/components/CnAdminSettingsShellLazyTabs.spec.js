/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The admin settings shell can mount a tab's panel only while that tab is
 * open (`lazyTabs`), so an app no longer wraps each `tab-<id>` slot in its
 * own `v-if`. Without it every panel stays mounted, as before.
 *
 * @spec openspec/changes/admin-settings-lazy-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-mount-only-the-open-tab
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
}))

const { mount } = require('@vue/test-utils')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default

const TABS = [
	{ id: 'algemeen', label: 'Algemeen' },
	{ id: 'velden', label: 'Verplichte velden' },
	{ id: 'koppelingen', label: 'Koppelingen' },
]

const mounts = []
const Panel = {
	props: ['name'],
	mounted() {
		mounts.push(this.name)
	},
	template: '<p :data-testid="name">{{ name }}</p>',
}

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper, once the tabs registered.
 */
async function mountShell(props = {}) {
	const wrapper = mount(CnAdminSettingsShell, {
		props: { appId: 'shillinq', appName: 'Shillinq', look: 'board', tabs: TABS, ...props },
		slots: {
			default: '<p data-testid="home">Algemeen-inhoud</p>',
			'tab-algemeen': { components: { Panel }, template: '<Panel name="algemeen" />' },
			'tab-velden': { components: { Panel }, template: '<Panel name="velden" />' },
			'tab-koppelingen': { components: { Panel }, template: '<Panel name="koppelingen" />' },
		},
		global: { stubs: { CnVersionInfoCard: true, CnBuildiqEditButton: true, CnEnvironmentBanner: true } },
	})
	await wrapper.vm.$nextTick()
	return wrapper
}

beforeEach(() => {
	mounts.length = 0
	window.history.replaceState(null, '', '/settings/admin/shillinq')
})

describe('CnAdminSettingsShell lazyTabs', () => {
	it('mounts every panel without lazyTabs, as before', async () => {
		const wrapper = await mountShell()
		expect(mounts.sort()).toEqual(['algemeen', 'koppelingen', 'velden'])
		expect(wrapper.find('[data-testid="velden"]').exists()).toBe(true)
	})

	it('mounts only the open panel with lazyTabs', async () => {
		const wrapper = await mountShell({ lazyTabs: true })
		expect(mounts).toEqual(['algemeen'])
		expect(wrapper.find('[data-testid="velden"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="koppelingen"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="home"]').exists()).toBe(true)
	})

	it('mounts a panel when its tab opens and unmounts the one it leaves', async () => {
		const wrapper = await mountShell({ lazyTabs: true })
		await wrapper.findAll('[role="tab"]')[1].trigger('click')
		expect(wrapper.find('[data-testid="velden"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="algemeen"]').exists()).toBe(false)
		await wrapper.findAll('[role="tab"]')[0].trigger('click')
		await wrapper.findAll('[role="tab"]')[1].trigger('click')
		expect(mounts).toEqual(['algemeen', 'velden', 'algemeen', 'velden'])
	})

	it('mounts the tab the address names, not the first', async () => {
		window.history.replaceState(null, '', '/settings/admin/shillinq?tab=koppelingen')
		const wrapper = await mountShell({ lazyTabs: true })
		expect(mounts).toEqual(['koppelingen'])
		expect(wrapper.find('[data-testid="home"]').exists()).toBe(false)
	})
})
