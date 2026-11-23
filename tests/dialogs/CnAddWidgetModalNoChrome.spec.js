/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A type registered with `noChrome` (the divider) gets no Appearance block
 * (Show title, Custom title, Background, Icon) in the add / edit modal.
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'
const registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
const Modal = require('../../src/dialogs/CnAddWidgetModal.vue').default

const form = {
	name: 'FakeForm',
	props: { editingWidget: { default: null }, value: { default: () => ({}) } },
	methods: { validate: () => [] },
	render: () => h('div', { class: 'fake-form' }),
}

function register(type, extra = {}) {
	registry.registerDashboardWidget(type, { renderer: { name: 'R' }, form, defaultContent: {}, displayName: type, icon: 'Star', ...extra })
}

describe('CnAddWidgetModal noChrome', () => {
	it('hides the whole Appearance block for a noChrome type and keeps it for others', async () => {
		register('no-chrome-test', { noChrome: true })
		register('chrome-test')
		const wrapper = mount(Modal, { propsData: { show: true, preselectedType: 'no-chrome-test' } })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.fake-form').exists()).toBe(true)
		expect(wrapper.find('.cn-add-widget-modal__chrome').exists()).toBe(false)
		wrapper.vm.state.type = 'chrome-test'
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-add-widget-modal__chrome').exists()).toBe(true)
	})

	it('registers the divider without chrome', () => {
		require('../../src/components/CnDividerWidget/index.js')
		expect(registry.getWidgetTypeEntry('divider').noChrome).toBe(true)
	})
})
