/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A tab without a panel of its own (its cards are the default slot below the
 * strip) marks the strip bare, so the strip adds no panel spacing above them.
 *
 * @spec openspec/changes/admin-shell-empty-tab-gap/specs/admin-shell-empty-tab-gap/spec.md#requirement-a-tab-without-a-panel-adds-no-space-under-the-strip
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default

const TABS = [
	{ id: 'general', label: 'Algemeen' },
	{ id: 'system', label: 'Systeem' },
]

/**
 * @return {Promise<object>} The wrapper, once the tabs registered.
 */
async function mountShell() {
	const wrapper = mount(CnAdminSettingsShell, {
		props: { appId: 'dossiq', appName: 'Dossiq', look: 'board', tabs: TABS, tabsVariant: 'underline' },
		slots: { default: '<p data-testid="general">Algemeen</p>', 'tab-system': '<p data-testid="system">Systeem</p>' },
		global: { stubs: { CnVersionInfoCard: true, CnBuildiqEditButton: true, CnEnvironmentBanner: true } },
	})
	await wrapper.vm.$nextTick()
	return wrapper
}

beforeEach(() => {
	window.history.replaceState(null, '', '/settings/admin/dossiq')
})

describe('CnAdminSettingsShell: a tab without a panel', () => {
	it('marks the strip bare on a tab whose cards follow the strip', async () => {
		const wrapper = await mountShell()
		expect(wrapper.find('[data-testid="cn-admin-settings-tabs"]').classes()).toContain('cn-admin-settings-shell__tabs--bare')
	})

	it('keeps the panel spacing on a tab with a panel', async () => {
		const wrapper = await mountShell()
		await wrapper.findAll('[role="tab"]')[1].trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-admin-settings-tabs"]').classes()).not.toContain('cn-admin-settings-shell__tabs--bare')
	})

	it('draws no panel padding under a bare strip', () => {
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue'), 'utf8')
		expect(sfc).toMatch(/\.cn-admin-settings-shell__tabs--bare > :deep\(\.cn-tabs__content\) \{\s*padding-top: 0;/)
	})
})
