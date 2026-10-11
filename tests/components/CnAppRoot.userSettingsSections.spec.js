/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The sections of CnAppRoot's user settings dialog.
 *
 * Filling the original `#user-settings` slot dropped every default section
 * (notifications, credentials, walkthrough replay), so dossiq, decidiq,
 * openregister and launchpad each drew credentials and the walkthrough again
 * by hand. `#user-settings-sections` adds an app's sections instead, and the
 * `userSettingsSections` prop places, orders or hides the defaults, the
 * integrations section included. These tests pin both sides: the new slot and
 * prop, and the old slot drawing exactly what it drew before.
 *
 * @spec openspec/changes/user-settings-sections/specs/user-settings-sections/spec.md#requirement-the-user-settings-dialog-keeps-its-default-sections-next-to-the-apps-own
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
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

const MANIFEST = {
	version: '1.0.0',
	menu: [
		{ id: 'home', label: 'Home', route: 'home' },
		{ id: 'Avg', label: 'Processing activities', href: '/apps/openregister/#/avg', section: 'integrations' },
	],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	walkthrough: {
		enabled: true,
		tours: [{ id: 'getting-started', steps: [{ id: 's1', title: 'Hi' }] }],
	},
}

const APP_SECTION = '<div id="app-own" class="app-own-section">App content</div>'

/**
 * Mount the root with the dialog open.
 *
 * @param {object} opts Mount options.
 * @param {object} [opts.slots] Slot content.
 * @param {Array<string>|null} [opts.sections] The `userSettingsSections` prop.
 * @return {Promise<object>} The mounted wrapper.
 */
async function openDialog({ slots = {}, sections = null } = {}) {
	const wrapper = mount(CnAppRoot, {
		propsData: { manifest: MANIFEST, appId: 'myapp', requiresApps: [], userSettingsSections: sections },
		mocks: { $route: { name: 'home', params: {} } },
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
			CnNotificationPreferences: { template: '<div id="notifications" />' },
			CnCredentials: { template: '<div class="credentials-stub" />' },
			CnWalkthrough: true,
		},
		slots,
	})
	wrapper.vm.userSettingsOpen = true
	await wrapper.vm.$nextTick()
	return wrapper
}

/**
 * The sections the dialog draws, in document order.
 *
 * @param {object} wrapper The mounted wrapper.
 * @return {Array<string>} Section names.
 */
function drawn(wrapper) {
	const html = wrapper.html()
	const markers = {
		app: 'id="app-own"',
		notifications: 'id="notifications"',
		credentials: 'id="credentials"',
		walkthrough: 'id="cn-walkthrough"',
		integrations: 'id="cn-integrations"',
	}
	return Object.entries(markers)
		.filter(([, marker]) => html.includes(marker))
		.sort(([, a], [, b]) => html.indexOf(a) - html.indexOf(b))
		.map(([name]) => name)
}

describe('CnAppRoot user settings sections', () => {
	beforeEach(() => {
		__resetWalkthroughCacheForTests()
	})

	it('draws every default section when the app adds nothing', async () => {
		expect(drawn(await openDialog())).toEqual(['notifications', 'credentials', 'walkthrough', 'integrations'])
	})

	it('keeps the defaults after the sections an app adds through #user-settings-sections', async () => {
		const wrapper = await openDialog({ slots: { 'user-settings-sections': APP_SECTION } })
		expect(drawn(wrapper)).toEqual(['app', 'notifications', 'credentials', 'walkthrough', 'integrations'])
	})

	it('draws only the app content and the integrations for the older #user-settings slot, as before', async () => {
		const wrapper = await openDialog({ slots: { 'user-settings': APP_SECTION } })
		expect(drawn(wrapper)).toEqual(['app', 'integrations'])
	})

	it('orders and hides the defaults with userSettingsSections, integrations included', async () => {
		const wrapper = await openDialog({
			slots: { 'user-settings-sections': APP_SECTION },
			sections: ['credentials', 'app', 'walkthrough'],
		})
		expect(drawn(wrapper)).toEqual(['credentials', 'app', 'walkthrough'])
	})

	it('lets an app on the older slot take defaults back', async () => {
		const wrapper = await openDialog({
			slots: { 'user-settings': APP_SECTION },
			sections: ['app', 'credentials', 'walkthrough'],
		})
		expect(drawn(wrapper)).toEqual(['app', 'credentials', 'walkthrough'])
	})

	it('never drops the app content: without `app` in the list it comes first', async () => {
		const wrapper = await openDialog({
			slots: { 'user-settings-sections': APP_SECTION },
			sections: ['walkthrough', 'nonsense', 'walkthrough'],
		})
		expect(drawn(wrapper)).toEqual(['app', 'walkthrough'])
	})

	it('hides every default with an empty list', async () => {
		expect(drawn(await openDialog({ sections: [] }))).toEqual([])
	})
})
