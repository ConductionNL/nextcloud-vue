/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings dialog in the board look (board PqPersoonlijk): eyebrow,
 * title and subtitle, a navigation listing the sections the app registers,
 * and a footer note with a Close button. CnAppRoot draws it under the board
 * look only; the Nextcloud look keeps NcAppSettingsDialog.
 *
 * @spec openspec/changes/user-settings-board-dialog/specs/user-settings-board-dialog/spec.md#requirement-the-user-settings-dialog-takes-the-board-look
 */

import { mount } from '@vue/test-utils'
import { h, inject, onMounted } from 'vue'
import CnUserSettingsDialog from '../../src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no route')), get: jest.fn().mockRejectedValue(new Error('no route')) },
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'pieter', isAdmin: false })) }))
jest.mock('../../src/utils/appInstalled.js', () => ({ isAppInstalled: () => true }))

/**
 * A section that registers itself the way NcAppSettingsSection does.
 *
 * @param {string} id Section id.
 * @param {string} name Section name.
 * @param {number} [order] Section order.
 * @return {object} Component.
 */
function section(id, name, order) {
	return {
		setup() {
			const registration = inject(Symbol.for('NcAppSettingsDialog:registration'))
			onMounted(() => registration.registerSection(id, name, order, [h('svg', { class: `icon-${id}` })]))
			return () => h('section', { id: `settings-section_${id}` }, name)
		},
	}
}

const AVAILABILITY = section('availability', 'Availability', 2)
const MAIL = section('mail', 'Email and calendar', 1)

/**
 * @param {object} [props] Dialog props.
 * @return {object} Wrapper.
 */
function mountDialog(props = {}) {
	return mount(CnUserSettingsDialog, {
		props: { open: true, title: 'User settings', appName: 'Pipelinq', ...props },
		slots: { default: () => [h(AVAILABILITY), h(MAIL)] },
		attachTo: document.body,
	})
}

describe('CnUserSettingsDialog', () => {
	it('lists the registered sections in order, with their icons, the first current', async () => {
		const w = mountDialog()
		await w.vm.$nextTick()
		const links = w.findAll('.cn-user-settings-dialog__nav-link')
		expect(links.map((l) => l.text())).toEqual(['Email and calendar', 'Availability'])
		expect(links[0].attributes('aria-current')).toBe('true')
		expect(links[1].attributes('aria-current')).toBeUndefined()
		expect(links[0].find('.icon-mail').exists()).toBe(true)
		expect(links[1].attributes('href')).toBe('#settings-section_availability')
		w.unmount()
	})

	it('moves the current mark to a clicked section', async () => {
		const w = mountDialog()
		await w.vm.$nextTick()
		await w.find('[data-testid="cn-user-settings-nav-availability"]').trigger('click')
		expect(w.find('[data-testid="cn-user-settings-nav-availability"]').attributes('aria-current')).toBe('true')
		expect(w.find('[data-testid="cn-user-settings-nav-mail"]').attributes('aria-current')).toBeUndefined()
		w.unmount()
	})

	it('draws the board header and the footer note, and closes from the footer', async () => {
		const w = mountDialog()
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').text()).toBe('Your account')
		expect(w.find('[data-testid="cn-dialog-title"]').text()).toBe('User settings')
		expect(w.find('[data-testid="cn-dialog-subtitle"]').text()).toBe('Only for you. Colleagues keep their own settings.')
		expect(w.find('[data-testid="cn-user-settings-note"]').text()).toBe('Changes are saved straight away · Pipelinq')
		await w.find('[data-testid="cn-user-settings-close"]').trigger('click')
		expect(w.emitted('update:open')).toEqual([[false]])
		w.unmount()
	})

	it('drops a section that unregisters', async () => {
		const w = mountDialog()
		await w.vm.$nextTick()
		w.vm.unregisterSection('mail')
		await w.vm.$nextTick()
		const links = w.findAll('.cn-user-settings-dialog__nav-link')
		expect(links.map((l) => l.text())).toEqual(['Availability'])
		expect(links[0].attributes('aria-current')).toBe('true')
		w.unmount()
	})
})

describe('CnAppRoot: the user settings dialog by look', () => {
	const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
	const MANIFEST = { version: '1.0.0', name: 'Pipelinq', menu: [], pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }] }

	/**
	 * @param {object} props Root props.
	 * @return {Promise<object>} Wrapper with the dialog open.
	 */
	async function openRoot(props) {
		const w = mount(CnAppRoot, {
			propsData: { manifest: MANIFEST, appId: 'pipelinq', requiresApps: [], ...props },
			mocks: { $route: { name: 'home', params: {} } },
			stubs: {
				'router-view': { template: '<div />' },
				CnNotificationPreferences: { template: '<div />' },
				CnCredentials: { template: '<div />' },
				CnWalkthrough: true,
			},
		})
		w.vm.userSettingsOpen = true
		await w.vm.$nextTick()
		return w
	}

	it('keeps NcAppSettingsDialog in the Nextcloud look', async () => {
		const w = await openRoot({})
		expect(w.findComponent(CnUserSettingsDialog).exists()).toBe(false)
		expect(w.find('.stub.NcAppSettingsDialog').exists()).toBe(true)
	})

	it('draws CnUserSettingsDialog in the board look, with the app name and an own subtitle', async () => {
		const w = await openRoot({ look: 'board', userSettingsSubtitle: 'Just yours' })
		const dialog = w.findComponent(CnUserSettingsDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('appName')).toBe('Pipelinq')
		expect(dialog.props('subtitle')).toBe('Just yours')
		expect(dialog.props('eyebrow')).toBe('Your account')
		expect(w.find('.stub.NcAppSettingsDialog').exists()).toBe(false)
	})
})
