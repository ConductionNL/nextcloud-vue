/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The admin shell's underline tab strip (`tabsVariant: "underline"`, board
 * LpBeheerAlgemeen): the shell passes the variant to CnTabs, which marks the
 * strip so its underline styles apply. Without the prop the folder strip
 * stays.
 *
 * @spec openspec/changes/admin-settings-underline-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-an-underline-tab-strip
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))

const { mount } = require('@vue/test-utils')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default
const { CnTabs } = require('../../src/components/CnTabs/index.js')

const TABS = [
	{ id: 'algemeen', label: 'Algemeen' },
	{ id: 'sjablonen', label: 'Sjablonen' },
	{ id: 'delen', label: 'Delen' },
]

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper, once the tabs registered.
 */
async function mountShell(props = {}) {
	const wrapper = mount(CnAdminSettingsShell, {
		props: { appId: 'launchpad', appName: 'Launchpad', look: 'board', tabs: TABS, ...props },
		slots: { 'tab-sjablonen': '<p data-testid="sjablonen">Sjablonen-inhoud</p>' },
		global: { stubs: { CnVersionInfoCard: true, CnBuildiqEditButton: true, CnEnvironmentBanner: true } },
	})
	await wrapper.vm.$nextTick()
	return wrapper
}

beforeEach(() => {
	window.history.replaceState(null, '', '/settings/admin/launchpad')
})

describe('CnAdminSettingsShell tabsVariant', () => {
	it('draws the folder strip by default', async () => {
		const wrapper = await mountShell()
		const strip = wrapper.find('[data-testid="cn-admin-settings-tabs"]')
		expect(wrapper.findComponent(CnTabs).props('variant')).toBe('line')
		expect(strip.classes()).toContain('cn-tabs--board')
		expect(strip.classes()).not.toContain('cn-tabs--underline')
	})

	it('draws the underline strip when asked', async () => {
		const wrapper = await mountShell({ tabsVariant: 'underline' })
		const strip = wrapper.find('[data-testid="cn-admin-settings-tabs"]')
		expect(wrapper.findComponent(CnTabs).props('variant')).toBe('underline')
		expect(strip.classes()).toContain('cn-tabs--underline')
		expect(strip.classes()).not.toContain('cn-tabs--board')
	})

	it('keeps the tabs, the address and the panels', async () => {
		const wrapper = await mountShell({ tabsVariant: 'underline' })
		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs.map((tab) => tab.text())).toEqual(['Algemeen', 'Sjablonen', 'Delen'])
		await tabs[1].trigger('click')
		expect(new URL(window.location.href).searchParams.get('tab')).toBe('sjablonen')
		expect(wrapper.emitted('tab-change')).toEqual([['sjablonen']])
		expect(wrapper.find('[data-testid="sjablonen"]').isVisible()).toBe(true)
	})

	it('accepts only the CnTabs variants it draws', () => {
		const { validator } = CnAdminSettingsShell.props.tabsVariant
		expect(validator('line')).toBe(true)
		expect(validator('underline')).toBe(true)
		expect(validator('segmented')).toBe(false)
	})
})
