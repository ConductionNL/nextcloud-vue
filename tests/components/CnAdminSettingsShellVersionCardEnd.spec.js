/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The version card can follow the app's sections (`versionCardPosition`), so a
 * board that starts with the app's own card (DcBeheer) can be drawn
 * (screens-admin-settings-version-card-end).
 *
 * @spec openspec/changes/screens-admin-settings-version-card-end/specs/settings-board-look/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
}))

const { shallowMount } = require('@vue/test-utils')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default

function mountShell(propsData = {}) {
	return shallowMount(CnAdminSettingsShell, {
		propsData: { appId: 'decidiq', appName: 'Decidiq', ...propsData },
		slots: { default: '<section data-testid="app-section">Organisatie</section>' },
	})
}

/**
 * The order of the version card and the app's section among the shell's children.
 *
 * @param {object} wrapper The mounted shell.
 * @return {string[]} 'version' and 'app' in document order.
 */
function order(wrapper) {
	return Array.from(wrapper.element.children)
		.map((child) => (child.matches('[data-testid="app-section"]') ? 'app' : (child.tagName.toLowerCase().includes('version-info-card') ? 'version' : null)))
		.filter(Boolean)
}

describe('CnAdminSettingsShell versionCardPosition', () => {
	it('draws the version card above the app sections by default', () => {
		expect(order(mountShell())).toEqual(['version', 'app'])
	})

	it('draws the app sections first with versionCardPosition "end"', () => {
		const wrapper = mountShell({ versionCardPosition: 'end' })
		expect(order(wrapper)).toEqual(['app', 'version'])
		// The slot renders once.
		expect(wrapper.findAll('[data-testid="app-section"]')).toHaveLength(1)
	})

	it('puts the credential broker after the sections too', () => {
		const wrapper = mountShell({ versionCardPosition: 'end', showOrganisationCredentials: true })
		const children = Array.from(wrapper.element.children)
		const app = children.findIndex((child) => child.matches('[data-testid="app-section"]'))
		const broker = children.findIndex((child) => child.matches('[data-testid="cn-admin-organisation-credentials"]'))
		expect(app).toBeGreaterThanOrEqual(0)
		expect(broker).toBeGreaterThan(app)
	})

	it('accepts only start and end', () => {
		const { validator } = CnAdminSettingsShell.props.versionCardPosition
		expect(validator('start')).toBe(true)
		expect(validator('end')).toBe(true)
		expect(validator('middle')).toBe(false)
	})
})
