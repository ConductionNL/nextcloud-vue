/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A shell told `plainNotes` draws its cards' notes as the NcBeheerInstellingen
 * boards do: no icon, and a warning on the peach ground with its own edge
 * (DqBeheerGeavanceerd "KCC-werkplek-integratie", "Financiële integratie").
 * jsdom draws no layout, so the board look's rules are read from the source.
 *
 * @spec openspec/changes/admin-settings-plain-notes/specs/admin-settings-plain-notes/spec.md
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

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const stubs = { NcSettingsSection: { template: '<div><slot /></div>' }, CnBuildiqEditButton: true, CnEnvironmentBanner: true, CnCredentials: true }

/**
 * @param {object} props Shell props.
 * @return {object} The shell's root element.
 */
function root(props = {}) {
	return mount(CnAdminSettingsShell, {
		props: { appId: 'dossiq', appName: 'Dossiq', environment: 'production', ...props },
		global: { stubs },
	}).element
}

/**
 * @param {string} selector One selector of a rule.
 * @return {string} The body of the first rule that lists it, or ''.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('CnAdminSettingsShell plainNotes', () => {
	it('keeps the notes as they are by default', () => {
		expect(root().classList.contains('cn-admin-settings-shell--plain-notes')).toBe(false)
	})

	it('marks the shell when the board draws plain notes', () => {
		expect(root({ plainNotes: true }).classList.contains('cn-admin-settings-shell--plain-notes')).toBe(true)
	})

	it('hides a card note\'s icon under the board look', () => {
		expect(bodyOf('.cn-look-board .cn-admin-settings-shell--plain-notes .settings-section .notecard:not(.cn-look-nextcloud *) .notecard__icon')).toContain('display: none;')
	})

	it('draws a warning note on the board\'s peach ground and edge', () => {
		const body = bodyOf('.cn-look-board .cn-admin-settings-shell--plain-notes .settings-section .notecard.notecard--warning:not(.cn-look-nextcloud *)')
		expect(body).toContain('--cn-banner-ground: var(--cn-board-note-warning-ground, #fff4e5);')
		expect(body).toContain('--cn-banner-edge: var(--cn-board-note-warning-edge, #f0c987);')
	})
})
