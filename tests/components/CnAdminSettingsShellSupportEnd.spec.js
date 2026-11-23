/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The support lines can be their own wide card at the end of the admin page
 * (`supportPosition: "end"`, board PqBeheer) instead of the version card's
 * footer, and the board version card always draws its "Configured version" row.
 *
 * @spec openspec/changes/admin-shell-support-end/specs/settings-board-look/spec.md#requirement-support-can-be-its-own-card-at-the-end
 * @spec openspec/changes/admin-shell-support-end/specs/settings-board-look/spec.md#requirement-the-board-version-card-draws-the-configured-version
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
const CnVersionInfoCard = require('../../src/components/CnVersionInfoCard/CnVersionInfoCard.vue').default

const SECTION = { template: '<div class="settings-section"><h2 class="settings-section__name"><slot name="name" /></h2><slot /></div>' }
const stubs = { NcSettingsSection: SECTION, CnBuildiqEditButton: true, CnEnvironmentBanner: true, CnCredentials: true }

/**
 * @param {object} props Shell props.
 * @return {object} The mounted shell.
 */
function mountShell(props = {}) {
	return mount(CnAdminSettingsShell, {
		props: { appId: 'pipelinq', appName: 'Pipelinq', environment: 'production', ...props },
		slots: { default: '<section data-testid="app-section">Leadbeheer</section>' },
		global: { stubs },
	})
}

describe('CnAdminSettingsShell supportPosition', () => {
	it('keeps the support lines in the version card by default', () => {
		const wrapper = mountShell()
		expect(wrapper.find('.cn-support-info').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-admin-settings-support"]').exists()).toBe(false)
	})

	it('draws them as the last, wide card with supportPosition "end"', () => {
		const wrapper = mountShell({ supportPosition: 'end' })
		expect(wrapper.find('.cn-support-info').exists()).toBe(false)
		const card = wrapper.find('[data-testid="cn-admin-settings-support"]')
		expect(card.classes()).toContain('cn-settings-section--wide')
		expect(card.text()).toContain('support@conduction.nl')
		expect(card.text()).toContain('sales@conduction.nl')
		const children = Array.from(wrapper.element.children)
		const app = children.findIndex((child) => child.matches('[data-testid="app-section"]'))
		expect(children.indexOf(card.element)).toBeGreaterThan(app)
	})

	it('draws no support at all with showSupport false', () => {
		expect(mountShell({ supportPosition: 'end', showSupport: false }).find('[data-testid="cn-admin-settings-support"]').exists()).toBe(false)
	})
})

describe('CnVersionInfoCard configured version', () => {
	const make = (look, configuredVersion = '') => mount(CnVersionInfoCard, {
		props: { appName: 'Pipelinq', appVersion: '2.14.0', configuredVersion, look },
		global: { stubs: { NcSettingsSection: SECTION } },
	})

	it('always draws the configured version row in the board look', () => {
		expect(make('board').find('[data-testid="cn-version-info-configured"]').text()).toContain('Unknown')
		expect(make('board', '2.14.0').find('[data-testid="cn-version-info-configured"]').text()).toContain('2.14.0')
	})

	it('leaves the row out in the default look until there is a value', () => {
		expect(make('nextcloud').find('[data-testid="cn-version-info-configured"]').exists()).toBe(false)
	})
})
