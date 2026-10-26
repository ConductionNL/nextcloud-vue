/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An admin page has no CnAppRoot, so the shell provides the cell formatters a
 * column names by id.
 *
 * @spec openspec/changes/admin-shell-formatters/specs/settings-board-look/spec.md#requirement-the-admin-shell-provides-the-cell-formatters
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
	translatePlural: (app, one, many, count) => (count === 1 ? one : many),
}))

const { mount } = require('@vue/test-utils')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default
const { BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')

const SECTION = { template: '<div class="settings-section"><slot /></div>' }
const stubs = { NcSettingsSection: SECTION, CnBuildiqEditButton: true, CnEnvironmentBanner: true, CnCredentials: true }

const Probe = {
	inject: { cnFormatters: { default: () => ({}) } },
	template: '<i data-testid="probe" />',
}

/**
 * @param {object} props Shell props.
 * @param {object} [provide] What an ancestor provides.
 * @return {object} The registry the shell's content sees.
 */
function registryInside(props = {}, provide = {}) {
	const wrapper = mount(CnAdminSettingsShell, {
		props: { appId: 'dossiq', appName: 'Dossiq', environment: 'production', ...props },
		slots: { default: Probe },
		global: { stubs, provide },
	})
	return wrapper.findComponent(Probe).vm.cnFormatters
}

describe('CnAdminSettingsShell cnFormatters', () => {
	it('provides the built-in formatters on an admin page', () => {
		const registry = registryInside()
		expect(registry.relativeDate).toBe(BUILT_IN_FORMATTERS.relativeDate)
		expect(registry.connectionStatus).toBe(BUILT_IN_FORMATTERS.connectionStatus)
	})

	it('adds the formatters prop over the built-ins', () => {
		const own = jest.fn(() => 'Omgevingsvergunning')
		const registry = registryInside({ formatters: { caseTypeTitles: own, date: own } })
		expect(registry.caseTypeTitles).toBe(own)
		expect(registry.date).toBe(own)
		expect(registry.currency).toBe(BUILT_IN_FORMATTERS.currency)
	})

	it('keeps an ancestor registry', () => {
		const fromRoot = jest.fn()
		const registry = registryInside({}, { cnFormatters: { caseTitle: fromRoot } })
		expect(registry.caseTitle).toBe(fromRoot)
		expect(registry.relativeDate).toBe(BUILT_IN_FORMATTERS.relativeDate)
	})
})
