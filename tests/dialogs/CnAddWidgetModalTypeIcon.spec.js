/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The add-widget type picker shows the chosen type's icon (launchpad
 * calendar-widget::widget-appears-in-picker: "the picker shows the type with
 * an icon"). A native option cannot draw one, so it stands before the select.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'

const form = { name: 'FakeForm', props: { editingWidget: { default: null }, value: { default: () => ({}) } }, render: () => h('div'), methods: { validate: () => [] } }

/**
 * Load the modal against a fresh registry holding `entries`.
 *
 * @param {Record<string, object>} entries type → registry entry fields.
 * @return {object} the modal component.
 */
function loadModal(entries) {
	let modal
	let registry
	jest.isolateModules(() => {
		registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		modal = require('../../src/dialogs/CnAddWidgetModal.vue').default
	})
	for (const [type, entry] of Object.entries(entries)) {
		registry.registerDashboardWidget(type, { renderer: { name: 'R' }, form, defaultContent: {}, displayName: type, ...entry })
	}
	return modal
}

describe('CnAddWidgetModal type icon', () => {
	it('draws the icon of the chosen type and follows a type switch', async () => {
		const CnAddWidgetModal = loadModal({ calendar: { icon: 'Calendar' }, video: { icon: 'Video' } })
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })

		const icon = () => wrapper.find('[data-testid="widget-type-icon"]')
		expect(icon().find('svg').exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CnWidgetIcon' }).props('name')).toBe('Calendar')

		await wrapper.find('[data-testid="widget-type-select"]').setValue('video')
		expect(wrapper.findComponent({ name: 'CnWidgetIcon' }).props('name')).toBe('Video')
		expect(icon().attributes('aria-hidden')).toBe('true')
	})

	it('falls back to the default widget icon for a type that declares none', () => {
		const CnAddWidgetModal = loadModal({ plain: { icon: undefined } })
		const wrapper = mount(CnAddWidgetModal, { propsData: { show: true } })
		expect(wrapper.findComponent({ name: 'CnWidgetIcon' }).props('name')).toBeNull()
		expect(wrapper.find('[data-testid="widget-type-icon"] svg').exists()).toBe(true)
	})
})
