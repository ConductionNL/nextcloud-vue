/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The widget dialog shows the host's notices about the widget above its form
 * (launchpad drill-down-cross-widget-filter task 9).
 *
 * @spec openspec/changes/add-widget-modal-notices/specs/add-widget-modal-notices/spec.md#requirement-the-widget-dialog-can-show-the-hosts-notices
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'

/**
 * The modal with one registered type, from a fresh registry.
 *
 * @return {object} The modal component.
 */
function loadModal() {
	let Modal
	jest.isolateModules(() => {
		const registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		Modal = require('../../src/dialogs/CnAddWidgetModal.vue').default
		registry.registerDashboardWidget('label', {
			renderer: { name: 'R' },
			form: { name: 'F', props: ['editingWidget', 'value', 'fileUploadFn'], render: () => h('div', { class: 'fake-form' }), methods: { validate: () => [] } },
			defaultContent: {},
			displayName: 'Label',
			icon: 'Star',
		})
	})
	return Modal
}

describe('CnAddWidgetModal notices', () => {
	it('shows each notice as a note card, warning by default', () => {
		const Modal = loadModal()
		const wrapper = mount(Modal, {
			props: { show: true, notices: [{ text: 'This widget consumes wijkCode but no hierarchy on this dashboard publishes it' }, { text: 'Heads up', type: 'info' }, { text: 'Odd', type: 'shout' }] },
			global: { stubs: { NcNoteCard: { props: ['type', 'text'], template: '<p class="note" :data-type="type">{{ text }}</p>' } } },
		})
		const notes = wrapper.findAll('.note')
		expect(notes.map((note) => note.attributes('data-type'))).toEqual(['warning', 'info', 'warning'])
		expect(notes[0].text()).toContain('wijkCode')
	})

	it('renders no notice area without notices', () => {
		const Modal = loadModal()
		const wrapper = mount(Modal, { props: { show: true } })
		expect(wrapper.find('[data-testid="cn-add-widget-modal-notices"]').exists()).toBe(false)
	})

	it('takes extra notices through the notices slot', () => {
		const Modal = loadModal()
		const wrapper = mount(Modal, { props: { show: true }, slots: { notices: '<p class="slotted">From the slot</p>' } })
		expect(wrapper.find('[data-testid="cn-add-widget-modal-notices"] .slotted').exists()).toBe(true)
	})
})
