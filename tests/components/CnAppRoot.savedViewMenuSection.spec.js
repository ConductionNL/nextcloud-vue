/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The "Views in my menu" section of CnAppRoot's user settings dialog.
 *
 * An app with a page that offers saved views gets the section after its own
 * sections; an app without one does not. The section's changes go through
 * the menu holder's `set`, which replaces the stored list.
 *
 * @spec openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-the-user-settings-dialog-offers-the-views-in-my-menu
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		post: jest.fn().mockRejectedValue(new Error('no batch route')),
		get: jest.fn().mockRejectedValue(new Error('no route')),
	},
}))
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })),
}))
jest.mock('../../src/utils/appInstalled.js', () => ({
	isAppInstalled: () => true,
}))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

/**
 * @param {boolean} offers Whether the index page offers saved views.
 * @return {object} A manifest.
 */
function manifest(offers) {
	return {
		version: '1.0.0',
		menu: [{ id: 'cases', label: 'Cases', route: 'cases' }],
		pages: [{ id: 'cases', route: '/', type: 'index', title: 'Cases', config: { register: 'r', schema: 'case', allowSavedViews: offers } }],
	}
}

/**
 * Mount the root with the dialog open.
 *
 * @param {boolean} offers Whether the page offers saved views.
 * @return {Promise<object>} The mounted wrapper.
 */
async function openDialog(offers) {
	const wrapper = mount(CnAppRoot, {
		propsData: { manifest: manifest(offers), appId: 'myapp', requiresApps: [] },
		mocks: { $route: { name: 'cases', params: {} } },
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
			CnNotificationPreferences: { template: '<div id="notifications" />' },
			CnCredentials: { template: '<div class="credentials-stub" />' },
			CnSavedViewMenuSettings: { template: '<div class="saved-view-menu-stub" />' },
			CnWalkthrough: true,
		},
		slots: { 'user-settings-sections': '<div id="app-own" />' },
	})
	wrapper.vm.userSettingsOpen = true
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('CnAppRoot views in my menu', () => {
	it('draws the section after the app\'s own sections when a page offers saved views', async () => {
		const html = (await openDialog(true)).html()
		expect(html).toContain('id="cn-saved-view-menu"')
		expect(html.indexOf('id="app-own"')).toBeLessThan(html.indexOf('id="cn-saved-view-menu"'))
		expect(html.indexOf('id="cn-saved-view-menu"')).toBeLessThan(html.indexOf('id="notifications"'))
	})

	it('leaves the section out when no page offers saved views', async () => {
		expect((await openDialog(false)).html()).not.toContain('id="cn-saved-view-menu"')
	})

	it('replaces and stores the list through the menu holder', async () => {
		const wrapper = await openDialog(true)
		const write = jest.fn().mockResolvedValue(undefined)
		Object.defineProperty(wrapper.vm, 'userPreferences', { get: () => ({ write }), configurable: true })
		await wrapper.vm.savedViewMenu.set([{ id: '7', page: 'cases', name: 'Mine' }, { id: '7', page: 'cases', name: 'Again' }])
		expect(wrapper.vm.savedViewMenu.entries).toEqual([{ id: '7', page: 'cases', name: 'Mine' }])
		expect(write).toHaveBeenCalledWith('cn_saved_view_menu', [{ id: '7', page: 'cases', name: 'Mine' }])
	})
})
