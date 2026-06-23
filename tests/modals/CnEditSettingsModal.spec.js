/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditSettingsModal — verifies the in-place edits to the working
 * manifest's top-level settings: openbuildEditable, nav settings, and the
 * dependency list. @nextcloud/vue is auto-stubbed via the manual mock.
 */
import { mount } from '@vue/test-utils'
import CnEditSettingsModal from '../../src/modals/CnEditSettingsModal.vue'

function mountModal(working) {
	return mount(CnEditSettingsModal, { propsData: { working } })
}

describe('CnEditSettingsModal', () => {
	it('openbuildEditable defaults to true and reflects an explicit false', () => {
		expect(mountModal({}).vm.openbuildEditable).toBe(true)
		expect(mountModal({ openbuildEditable: false }).vm.openbuildEditable).toBe(false)
	})

	it('setEditable writes the flag onto the working manifest', () => {
		const working = {}
		const wrapper = mountModal(working)
		wrapper.vm.setEditable(false)
		expect(working.openbuildEditable).toBe(false)
	})

	it('nav settings are lazily created and written in place', () => {
		const working = {}
		const wrapper = mountModal(working)
		expect(wrapper.vm.includePersonalSettings).toBe(false)
		expect(wrapper.vm.settingsLabel).toBe('')
		wrapper.vm.setIncludePersonalSettings(true)
		wrapper.vm.setSettingsLabel('Preferences')
		expect(working.nav.includePersonalSettings).toBe(true)
		expect(working.nav.settingsLabel).toBe('Preferences')
	})

	it('dependencies reads the array and setDependencies replaces it with strings', () => {
		const working = { dependencies: ['openregister'] }
		const wrapper = mountModal(working)
		expect(wrapper.vm.dependencies).toEqual(['openregister'])
		wrapper.vm.setDependencies(['openregister', 'openconnector'])
		expect(working.dependencies).toEqual(['openregister', 'openconnector'])
		// non-array clears to []
		wrapper.vm.setDependencies(null)
		expect(working.dependencies).toEqual([])
	})

	it('renders an empty-state when working is null', () => {
		const wrapper = mountModal(null)
		expect(wrapper.vm.dependencies).toEqual([])
		expect(wrapper.vm.openbuildEditable).toBe(true)
	})
})
