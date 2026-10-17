/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A shell tab can hold its own tab strip (`tabs[].tabs`), as PqBeheerPortaal
 * draws "Portalen 3 | Auditlog 1284" inside pipelinq's Klantportaal tab. Each
 * inner panel is the `tab-<id>-<subId>` slot, and the address keeps the open
 * inner tab.
 *
 * @spec openspec/changes/admin-shell-sub-tabs/specs/settings-board-look/spec.md#requirement-a-tab-can-hold-its-own-tab-strip
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const TABS = [
	{ id: 'general', label: 'Algemeen' },
	{ id: 'portal', label: 'Klantportaal', tabs: [{ id: 'portals', label: 'Portalen', count: 3 }, { id: 'audit', label: 'Auditlog', count: 1284 }] },
]

/**
 * @param {object} props Shell props.
 * @return {Promise<object>} The mounted shell.
 */
async function mountShell(props = {}) {
	const wrapper = mount(CnAdminSettingsShell, {
		props: { appId: 'pipelinq', appName: 'Pipelinq', environment: 'production', tabs: TABS, ...props },
		slots: {
			'tab-portal': '<p data-testid="portal-intro">Intro</p>',
			'tab-portal-portals': '<p data-testid="portals">Portalen</p>',
			'tab-portal-audit': '<p data-testid="audit">Auditlog</p>',
		},
		global: { stubs: { NcSettingsSection: true, CnVersionInfoCard: true, CnBuildiqEditButton: true, CnEnvironmentBanner: true } },
		attachTo: document.body,
	})
	await flush()
	return wrapper
}

function shown(wrapper, testid) {
	const el = wrapper.find(`[data-testid="${testid}"]`)
	return el.exists() && el.element.closest('[role="tabpanel"]')?.hidden !== true && !String(el.element.closest('[role="tabpanel"]')?.getAttribute('style') || '').includes('display: none')
}

describe('CnAdminSettingsShell tabs inside a tab', () => {
	beforeEach(() => {
		window.history.replaceState(null, '', '/settings/admin/pipelinq?tab=portal')
	})

	it('draws a second strip with its counts inside the tab', async () => {
		const wrapper = await mountShell()
		const strip = wrapper.find('[data-testid="cn-admin-settings-subtabs-portal"]')
		expect(strip.exists()).toBe(true)
		const tabs = strip.findAll('[role="tab"]')
		expect(tabs.map((tab) => tab.text().replace(/\s+/g, ' '))).toEqual(['Portalen 3', 'Auditlog 1284'])
		expect(wrapper.find('[data-testid="portal-intro"]').exists()).toBe(true)
		expect(shown(wrapper, 'portals')).toBe(true)
		wrapper.unmount()
	})

	it('opens an inner tab and keeps it in the address', async () => {
		const wrapper = await mountShell()
		const strip = wrapper.find('[data-testid="cn-admin-settings-subtabs-portal"]')
		await strip.findAll('[role="tab"]')[1].trigger('click')
		await flush()
		expect(new URLSearchParams(window.location.search).get('subtab')).toBe('audit')
		expect(wrapper.emitted('sub-tab-change')[0][0]).toEqual({ tab: 'portal', subTab: 'audit' })
		expect(strip.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')
		wrapper.unmount()
	})

	it('opens on the inner tab the address names', async () => {
		window.history.replaceState(null, '', '/settings/admin/pipelinq?tab=portal&subtab=audit')
		const wrapper = await mountShell()
		const strip = wrapper.find('[data-testid="cn-admin-settings-subtabs-portal"]')
		expect(strip.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')
		wrapper.unmount()
	})

	it('mounts only the open inner panel with lazyTabs', async () => {
		const wrapper = await mountShell({ lazyTabs: true })
		expect(wrapper.find('[data-testid="portals"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="audit"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('draws no inner strip for a tab without tabs', async () => {
		window.history.replaceState(null, '', '/settings/admin/pipelinq')
		const wrapper = await mountShell()
		expect(wrapper.find('[data-testid="cn-admin-settings-subtabs-general"]').exists()).toBe(false)
		wrapper.unmount()
	})
})
