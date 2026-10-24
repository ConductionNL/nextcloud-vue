/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The board version card title follows the app's board: 17px by default, the
 * size `versionTitleSize` names otherwise.
 *
 * @spec openspec/changes/board-version-title-size/specs/board-settings-card-controls/spec.md#requirement-the-version-card-title-follows-its-board
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

const stubs = { NcSettingsSection: { template: '<div><slot /></div>' }, CnBuildiqEditButton: true, CnEnvironmentBanner: true, CnCredentials: true }

/**
 * @param {object} props Shell props.
 * @return {object} The shell's root element.
 */
function root(props = {}) {
	return mount(CnAdminSettingsShell, {
		props: { appId: 'pipelinq', appName: 'Pipelinq', environment: 'production', ...props },
		global: { stubs },
	}).element
}

describe('CnAdminSettingsShell versionTitleSize', () => {
	it('sets no size of its own by default', () => {
		expect(root().style.getPropertyValue('--cn-board-version-title-size')).toBe('')
	})

	it('hands the board\'s size to the version card title', () => {
		expect(root({ versionTitleSize: 19 }).style.getPropertyValue('--cn-board-version-title-size')).toBe('19px')
	})
})
