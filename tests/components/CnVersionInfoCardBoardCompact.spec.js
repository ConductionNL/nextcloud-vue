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
	it('drops the application name row on request and reads the up-to-date state inline', () => {
		const wrapper = card({ showUpdateButton: true, isUpToDate: true, showAppName: false, inlineUpToDate: true })
		const labels = wrapper.findAll('.cn-version-info__label').map((l) => l.text())
		expect(labels).toEqual(['Version:', 'Configured version:'])
		expect(wrapper.find('[data-testid="cn-version-info-configured"]').text()).toContain('0.4.47, up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').text()).not.toContain('Up to date')
	})

	it('keeps the update button while an update is due', () => {
		const wrapper = card({ showUpdateButton: true, isUpToDate: false, inlineUpToDate: true })
		expect(wrapper.find('[data-testid="cn-version-info-configured"]').text()).not.toContain('up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').text()).toContain('Update')
	})

	it('keeps the default look as it was', () => {
		const wrapper = card({ look: 'nextcloud', showUpdateButton: true })
		expect(wrapper.findAll('.cn-version-info__label').map((l) => l.text())).toEqual(['Application name:', 'Version:', 'Configured version:'])
	})
})

describe('CnVersionInfoCard board props showAppName and actionsDivider', () => {
	it('draws the application name row and the rule above the buttons by default, as PqBeheer does', () => {
		const wrapper = card()
		expect(wrapper.find('[data-testid="cn-version-info-app-name"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').classes()).toContain('cn-version-info__footer-row--divided')
	})

	it('leaves both out for dossiq\'s boards', () => {
		const wrapper = card({ showAppName: false, actionsDivider: false })
		expect(wrapper.find('[data-testid="cn-version-info-app-name"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').classes()).not.toContain('cn-version-info__footer-row--divided')
	})

	it('keeps the application name row in the default look whatever showAppName says', () => {
		expect(card({ look: 'nextcloud', showAppName: false }).find('[data-testid="cn-version-info-app-name"]').exists()).toBe(true)
	})

	it('keeps PqBeheer\'s disabled "Up to date" button unless inlineUpToDate', () => {
		const wrapper = card({ showUpdateButton: true, isUpToDate: true })
		expect(wrapper.find('[data-testid="cn-version-info-configured"]').text()).not.toContain('up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').text()).toContain('Up to date')
	})

	it('passes both through from the shell', () => {
		const wrapper = shell({ showAppName: false, actionsDivider: false })
		expect(wrapper.find('[data-testid="cn-version-info-app-name"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').classes()).not.toContain('cn-version-info__footer-row--divided')
		expect(shell().find('[data-testid="cn-version-info-app-name"]').exists()).toBe(true)
	})

	it('draws the rule only for the divided row', () => {
		expect(rulesFor('.cn-look-board .cn-version-info--board .cn-version-info__footer-row--divided')).toMatch(/border-top: 1px solid var\(--cn-board-hairline\)/)
		expect(rulesFor('.cn-look-board .cn-version-info--board .cn-version-info__footer-row')).not.toMatch(/border-top/)
	})
})

describe('CnAdminSettingsShell board version card', () => {
	it('keeps PqBeheer\'s card in the board look by default (the l15-admin-chrome-dutch contract)', () => {
		const wrapper = shell({ showUpdateButton: true, isUpToDate: true })
		expect(wrapper.findAll('.cn-version-info__label').map((l) => l.text())).toEqual(['Application name:', 'Version:', 'Configured version:'])
		expect(wrapper.text()).toContain('Information about the current Dossiq installation')
		expect(wrapper.find('.cn-support-info').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-admin-settings-support-row"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').text()).toContain('Up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').classes()).toContain('cn-version-info__footer-row--divided')
		expect(wrapper.findAll('[data-testid="cn-version-info-footer-row"] .NcButton').find((b) => b.text() === 'Re-import configuration').attributes('variant')).toBe('primary')
		expect(wrapper.find('.cn-version-info--compact').exists()).toBe(false)
	})

	it('draws dossiq\'s compact card with compact', () => {
		const wrapper = shell({ compact: true, showUpdateButton: true, isUpToDate: true })
		expect(wrapper.findAll('.cn-version-info__label').map((l) => l.text())).toEqual(['Version:', 'Configured version:', 'Support:'])
		expect(wrapper.find('[data-testid="cn-version-info-configured"]').text()).toContain('0.4.47, up to date')
		expect(wrapper.find('[data-testid="cn-version-info-footer-row"]').classes()).not.toContain('cn-version-info__footer-row--divided')
		expect(wrapper.find('.cn-version-info--compact').exists()).toBe(true)
		expect(rulesFor('.cn-look-board .cn-version-info--compact .cn-version-info__details')).toMatch(/font-size: 15px/)
		expect(rulesFor('.cn-look-board .cn-version-info--board .cn-version-info__details')).toMatch(/font-size: 14px/)
	})

	it('says what the card is about in one line and puts support in one row', () => {
		const wrapper = shell({ compact: true })
		expect(wrapper.text()).toContain('About this Dossiq installation.')
		const row = wrapper.find('[data-testid="cn-admin-settings-support-row"]')
		expect(row.find('.cn-version-info__label').text()).toBe('Support:')
		expect(row.find('.cn-version-info__value').text().replace(/\s+/g, ' ')).toBe('support@conduction.nl, for an SLA sales@conduction.nl')
		expect(wrapper.find('.cn-support-info').exists()).toBe(false)
	})

	it('draws re-import and the setup wizard as secondary buttons on dossiq\'s card', () => {
		const wrapper = shell({ compact: true })
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
