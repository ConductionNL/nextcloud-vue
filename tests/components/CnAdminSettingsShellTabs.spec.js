/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The admin settings shell's tab strip (`tabs`, boards ShInstellingen and
 * LpBeheerAlgemeen): a strip under the header, a panel per tab from the
 * `tab-<id>` slot, the shell's own content on the first tab only, and the
 * open tab in the address.
 *
 * @spec openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-a-tab-strip
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
	{ id: 'velden', label: 'Verplichte velden', count: 12 },
	{ id: 'koppelingen', label: 'Koppelingen', count: 5 },
]

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper, once the tabs registered.
 */
async function mountShell(props = {}) {
	const wrapper = mount(CnAdminSettingsShell, {
		props: { appId: 'shillinq', appName: 'Shillinq', look: 'board', tabs: TABS, ...props },
		slots: {
			default: '<p data-testid="home">Algemeen-inhoud</p>',
			'tab-velden': '<p data-testid="velden">Velden-inhoud</p>',
			'tab-koppelingen': '<p data-testid="koppelingen">Koppelingen-inhoud</p>',
		},
		global: { stubs: { CnVersionInfoCard: { template: '<div data-testid="version-card" />' }, CnBuildiqEditButton: true, CnEnvironmentBanner: true } },
	})
	await wrapper.vm.$nextTick()
	return wrapper
}

beforeEach(() => {
	window.history.replaceState(null, '', '/settings/admin/shillinq')
})

describe('CnAdminSettingsShell tabs', () => {
	it('draws no strip without tabs', async () => {
		const wrapper = await mountShell({ tabs: [] })
		expect(wrapper.find('[data-testid="cn-admin-settings-tabs"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="home"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="version-card"]').exists()).toBe(true)
	})

	it('draws a tab per entry with its count, the first one open', async () => {
		const wrapper = await mountShell()
		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs.map((tab) => tab.text())).toEqual(['Algemeen', 'Verplichte velden 12', 'Koppelingen 5'])
		expect(tabs[0].attributes('aria-selected')).toBe('true')
		expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Shillinq Settings')
		expect(wrapper.find('[data-testid="home"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="version-card"]').exists()).toBe(true)
	})

	it('opens a tab on click, writes it to the address and keeps the shell content to the first tab', async () => {
		const wrapper = await mountShell()
		await wrapper.findAll('[role="tab"]')[2].trigger('click')

		expect(wrapper.emitted('tab-change')).toEqual([['koppelingen']])
		expect(new URLSearchParams(window.location.search).get('tab')).toBe('koppelingen')
		expect(wrapper.findAll('[role="tab"]')[2].attributes('aria-selected')).toBe('true')
		expect(wrapper.find('[data-tab="koppelingen"]').isVisible()).toBe(true)
		expect(wrapper.find('[data-testid="home"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="version-card"]').exists()).toBe(false)
	})

	it('opens the tab the address names', async () => {
		window.history.replaceState(null, '', '/settings/admin/shillinq?tab=velden')
		const wrapper = await mountShell()
		expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')
		expect(wrapper.find('[data-testid="home"]').exists()).toBe(false)
	})

	it('falls back to the first tab when the address names none of them', async () => {
		window.history.replaceState(null, '', '/settings/admin/shillinq?tab=onbekend')
		const wrapper = await mountShell()
		expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
	})

	it('reads another query key with tabQueryKey', async () => {
		window.history.replaceState(null, '', '/settings/admin/shillinq?sectie=koppelingen')
		const wrapper = await mountShell({ tabQueryKey: 'sectie' })
		expect(wrapper.findAll('[role="tab"]')[2].attributes('aria-selected')).toBe('true')
	})
})
