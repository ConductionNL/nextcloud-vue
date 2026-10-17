/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The board version card is compact (DqBeheerinstellingen,
 * DqInstellingenAlgemeen): "About this <App> installation.", the rows Version,
 * Configured version with the up-to-date state inline, and Support with the
 * SLA address on one line, then secondary buttons. And `sectionColumns` fixes
 * the admin page's card columns in the board look.
 *
 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-board-version-card-is-compact
 * @spec openspec/changes/version-card-board-compact/specs/settings-board-look/spec.md#requirement-the-admin-page-can-fix-its-columns
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
}))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default
const CnVersionInfoCard = require('../../src/components/CnVersionInfoCard/CnVersionInfoCard.vue').default

const SECTION = { props: ['name', 'description'], template: '<div class="settings-section"><h2 class="settings-section__name">{{ name }}</h2><p class="settings-section__desc">{{ description }}</p><slot /></div>' }
const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list holds the selector.
 *
 * @param {string} selector One selector, as written in the stylesheet.
 * @return {string}
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

/**
 * @param {object} props Card props.
 * @return {object}
 */
function card(props = {}) {
	return mount(CnVersionInfoCard, {
		props: { appName: 'Dossiq', appVersion: '0.4.47', configuredVersion: '0.4.47', look: 'board', ...props },
		global: { stubs: { NcSettingsSection: SECTION } },
	})
}

/**
 * @param {object} props Shell props.
 * @return {object}
 */
function shell(props = {}) {
	return mount(CnAdminSettingsShell, {
		props: { appId: 'dossiq', appName: 'Dossiq', environment: 'production', look: 'board', configuredVersion: '0.4.47', showSetup: true, ...props },
		global: { stubs: { NcSettingsSection: SECTION, CnBuildiqEditButton: true, CnEnvironmentBanner: true, CnSetupWizard: true } },
	})
}

describe('CnVersionInfoCard board look', () => {
	it('drops the application name row and reads the up-to-date state inline', () => {
		const wrapper = card({ showUpdateButton: true, isUpToDate: true })
		const labels = wrapper.findAll('.cn-version-info__label').map((l) => l.text())
		expect(labels).toEqual(['Version:', 'Configured version:'])
		expect(wrapper.find('[data-testid="cn-version-info-configured"]').text()).toContain('0.4.47, up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').text()).not.toContain('Up to date')
	})

	it('keeps the update button while an update is due', () => {
		const wrapper = card({ showUpdateButton: true, isUpToDate: false })
		expect(wrapper.find('[data-testid="cn-version-info-configured"]').text()).not.toContain('up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').text()).toContain('Update')
	})

	it('keeps the default look as it was', () => {
		const wrapper = card({ look: 'nextcloud', showUpdateButton: true })
		expect(wrapper.findAll('.cn-version-info__label').map((l) => l.text())).toEqual(['Application name:', 'Version:', 'Configured version:'])
	})
})

describe('CnAdminSettingsShell board version card', () => {
	it('says what the card is about in one line and puts support in one row', () => {
		const wrapper = shell()
		expect(wrapper.text()).toContain('About this Dossiq installation.')
		const row = wrapper.find('[data-testid="cn-admin-settings-support-row"]')
		expect(row.find('.cn-version-info__label').text()).toBe('Support:')
		expect(row.find('.cn-version-info__value').text().replace(/\s+/g, ' ')).toBe('support@conduction.nl, for an SLA sales@conduction.nl')
		expect(wrapper.find('.cn-support-info').exists()).toBe(false)
	})

	it('draws re-import and the setup wizard as secondary buttons', () => {
		const wrapper = shell()
		// NcButton is stubbed globally (tests/setup.js) as a div that keeps its props as attributes.
		const buttons = wrapper.findAll('[data-testid="cn-version-info-footer-row"] .NcButton')
		expect(buttons.map((b) => b.text())).toEqual(['Re-import configuration', 'Run setup wizard'])
		expect(buttons[0].attributes('variant')).toBe('secondary')
	})

	it('keeps the default look as it was', () => {
		const wrapper = shell({ look: 'nextcloud' })
		expect(wrapper.find('.cn-support-info').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-admin-settings-support-row"]').exists()).toBe(false)
	})

	it('fixes the card columns with sectionColumns', () => {
		expect(shell({ sectionColumns: 1 }).classes()).toContain('cn-admin-settings-shell--columns-1')
		expect(shell().classes().some((c) => c.startsWith('cn-admin-settings-shell--columns-'))).toBe(false)
		expect(rulesFor('.cn-look-board.cn-admin-settings-shell--columns-1 .cn-admin-settings-shell__panel:not(.cn-look-nextcloud *)')).toMatch(/grid-template-columns: minmax\(0, 1fr\)/)
		expect(rulesFor('.cn-look-board .cn-admin-settings-shell--columns-2:not(.cn-look-nextcloud *)')).toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
	})
})
