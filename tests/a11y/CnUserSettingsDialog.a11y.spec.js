/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for the board user settings dialog, against the REAL
 * @nextcloud/vue: no WCAG 2.1 AA violations in the navigation with Nextcloud's
 * own settings as links and the app's sections under one entry.
 *
 * @spec openspec/changes/user-settings-nav-groups/specs/user-settings-board-dialog/spec.md
 */

const { NcAppSettingsSection } = require('@nextcloud/vue')
const { h } = require('vue')
const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnUserSettingsDialog = require('../../src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue').default

describe('CnUserSettingsDialog: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with Nextcloud links and the app group', async () => {
		wrapper = mountAttached(CnUserSettingsDialog, {
			props: {
				open: true,
				title: 'User settings',
				appName: 'Dossiq',
				nextcloudLinks: [{ label: 'Personal info', href: '/settings/user/personal-info' }, { label: 'Privacy', href: '/settings/user/privacy' }],
			},
			slots: {
				default: () => [h(NcAppSettingsSection, { id: 'menu', name: 'Case types in my menu' }, { default: () => h('p', 'Your case types.') })],
			},
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		const nav = document.querySelector('[data-testid="cn-user-settings-nav"]')
		expect(nav).not.toBeNull()
		expect(nav.getAttribute('aria-label')).toBeTruthy()
		await expectAccessible(nav)
	})

	it('has no WCAG 2.1 AA violations with every section stacked in the pane', async () => {
		wrapper = mountAttached(CnUserSettingsDialog, {
			props: { open: true, title: 'User settings', appName: 'Dossiq' },
			slots: {
				default: () => [
					h(NcAppSettingsSection, { id: 'menu', name: 'Case types in my menu', order: 1 }, { default: () => h('p', 'Your case types.') }),
					h(NcAppSettingsSection, { id: 'notify', name: 'Notifications', order: 2 }, { default: () => h('p', 'What reaches you.') }),
				],
			},
		})
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		expect(document.getElementById('settings-section_menu').hidden).toBe(false)
		expect(document.getElementById('settings-section_notify').hidden).toBe(false)
		await expectAccessible(document.querySelector('.cn-user-settings-dialog__body'))
	})
})
