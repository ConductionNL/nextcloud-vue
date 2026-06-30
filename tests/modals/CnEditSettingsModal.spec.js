/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditSettingsModal — edits the SETTINGS MENU (menu items tagged
 * `section: "settings"`) plus the foldout's personal-settings entry. The tree
 * itself is CnMenuTreeNode (stubbed here). @nextcloud/vue is auto-stubbed.
 */
import { mount } from '@vue/test-utils'
import CnEditSettingsModal from '../../src/modals/CnEditSettingsModal.vue'

const CnMenuTreeNodeStub = { name: 'CnMenuTreeNode', props: ['list', 'depth', 'maxDepth', 'pages', 'section'], template: '<div class="menu-tree-stub" />' }

function mountModal(working) {
	return mount(CnEditSettingsModal, { propsData: { working }, stubs: { CnMenuTreeNode: CnMenuTreeNodeStub } })
}

describe('CnEditSettingsModal', () => {
	it('normalises a missing menu array', () => {
		const working = {}
		const wrapper = mountModal(working)
		expect(wrapper.vm.menu).toEqual([])
		expect(Array.isArray(working.menu)).toBe(true)
	})

	it('scopes the menu tree to the settings section', () => {
		const wrapper = mountModal({ menu: [] })
		expect(wrapper.findComponent(CnMenuTreeNodeStub).props('section')).toBe('settings')
	})

	it('settingsItemCount counts only section:settings items', () => {
		const wrapper = mountModal({ menu: [{ id: 'a' }, { id: 'b', section: 'settings' }, { id: 'c', section: 'footer' }] })
		expect(wrapper.vm.settingsItemCount).toBe(1)
	})

	it('add appends a settings-section item (does not touch main items)', () => {
		const working = { menu: [{ id: 'home', section: undefined }] }
		const wrapper = mountModal(working)
		wrapper.vm.add()
		expect(working.menu.length).toBe(2)
		const added = working.menu[1]
		expect(added.section).toBe('settings')
		expect(added.icon).toBe('icon-settings')
	})

	it('exposes pages as route options for the tree', () => {
		const working = { menu: [], pages: [{ id: 'Settings', title: 'Settings' }, { id: 'x', title: '' }] }
		const wrapper = mountModal(working)
		expect(wrapper.vm.pageOptions).toEqual([
			{ value: 'Settings', label: 'Settings' },
			{ value: 'x', label: 'x' },
		])
	})

	it('personal-settings entry toggles and label write into nav in place', () => {
		const working = { menu: [] }
		const wrapper = mountModal(working)
		expect(wrapper.vm.includePersonalSettings).toBe(false)
		wrapper.vm.setIncludePersonalSettings(true)
		wrapper.vm.setSettingsLabel('Preferences')
		expect(working.nav.includePersonalSettings).toBe(true)
		expect(working.nav.settingsLabel).toBe('Preferences')
	})
})
