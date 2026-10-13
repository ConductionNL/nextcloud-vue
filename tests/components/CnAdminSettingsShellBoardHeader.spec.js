/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The admin settings shell under the board look: a path line under the title
 * (`breadcrumbs`, `breadcrumbNote`), and the board class on a shell told
 * `look: "board"` itself (screens-admin-settings-board-header).
 *
 * @spec openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md
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

const crumbs = [{ label: 'Beheerinstellingen', href: '/settings/admin' }, { label: 'Launchpad' }, { label: 'Algemeen' }]

function mountShell(propsData = {}, provide = {}) {
	return shallowMount(CnAdminSettingsShell, {
		propsData: { appId: 'launchpad', appName: 'Launchpad', showVersionCard: false, ...propsData },
		global: { provide },
	})
}

describe('CnAdminSettingsShell board header', () => {
	it('draws the path and its note in place of the description', () => {
		const wrapper = mountShell({ look: 'board', title: 'Launchpad-beheer: algemeen', breadcrumbs: crumbs, breadcrumbNote: 'geldt voor de hele organisatie' })
		const line = wrapper.find('[data-testid="cn-admin-settings-breadcrumbs"]')
		expect(line.exists()).toBe(true)
		expect(line.findAll('nav > *').map((part) => part.text())).toEqual(['Beheerinstellingen', '/', 'Launchpad', '/', 'Algemeen'])
		expect(line.findAll(':scope > span').map((part) => part.text())).toEqual(['·', 'geldt voor de hele organisatie'])
		expect(line.find('a').attributes('href')).toBe('/settings/admin')
		expect(line.find('[aria-current="page"]').text()).toBe('Algemeen')
		expect(line.find('nav').attributes('aria-label')).toBe('Breadcrumb')
		expect(wrapper.find('.cn-admin-settings-shell__description').exists()).toBe(false)
	})

	it('keeps the description without breadcrumbs', () => {
		const wrapper = mountShell({ look: 'board' })
		expect(wrapper.find('[data-testid="cn-admin-settings-breadcrumbs"]').exists()).toBe(false)
		expect(wrapper.find('.cn-admin-settings-shell__description').text()).toBe('Configure your Launchpad installation')
	})

	it('carries the board class only when told look "board" itself', () => {
		expect(mountShell({ look: 'board' }).classes()).toContain('cn-look-board')
		// Under a CnAppRoot that provides the look, the ancestor carries the class.
		expect(mountShell({}, { cnLook: 'board' }).classes()).not.toContain('cn-look-board')
		expect(mountShell({}).classes()).not.toContain('cn-look-board')
		expect(mountShell({ look: 'nextcloud' }).classes()).not.toContain('cn-look-board')
	})
})
