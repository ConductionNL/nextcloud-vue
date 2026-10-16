/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The admin settings shell remembers the last opened tab under
 * `tabStorageKey` (launchpad's BeheerTabs did this), so the page opens on it
 * again. The address still wins, and without a key nothing is remembered.
 *
 * @spec openspec/changes/admin-shell-remembers-tab/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-remember-the-last-tab
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

const KEY = 'launchpad.admin.activeTab'

beforeEach(() => {
	window.history.replaceState(null, '', '/settings/admin/launchpad')
	window.localStorage.clear()
})

/**
 * @param {object} wrapper The shell.
 * @return {string} The selected tab's label.
 */
function openTab(wrapper) {
	return wrapper.findAll('[role="tab"]').find((tab) => tab.attributes('aria-selected') === 'true').text()
}

describe('CnAdminSettingsShell remembers the last tab', () => {
	it('stores the tab the reader opens', async () => {
		const wrapper = await mountShell({ tabStorageKey: KEY })
		await wrapper.findAll('[role="tab"]')[2].trigger('click')
		expect(window.localStorage.getItem(KEY)).toBe('koppelingen')
	})

	it('opens on the remembered tab when the address names none', async () => {
		window.localStorage.setItem(KEY, 'velden')
		const wrapper = await mountShell({ tabStorageKey: KEY })
		expect(openTab(wrapper)).toContain('Verplichte velden')
	})

	it('lets the address win over the remembered tab', async () => {
		window.localStorage.setItem(KEY, 'velden')
		window.history.replaceState(null, '', '/settings/admin/launchpad?tab=koppelingen')
		const wrapper = await mountShell({ tabStorageKey: KEY })
		expect(openTab(wrapper)).toContain('Koppelingen')
	})

	it('remembers nothing without a key', async () => {
		window.localStorage.setItem(KEY, 'velden')
		const wrapper = await mountShell()
		expect(openTab(wrapper)).toContain('Algemeen')
		await wrapper.findAll('[role="tab"]')[2].trigger('click')
		expect(window.localStorage.getItem(KEY)).toBe('velden')
	})
})
