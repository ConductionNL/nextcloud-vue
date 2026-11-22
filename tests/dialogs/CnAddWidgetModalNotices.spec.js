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

const NOTE_STUB = { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' }

describe('CnAddWidgetModal notices', () => {
	it('shows each notice as a note card, warning by default', () => {
		const Modal = loadModal()
		const wrapper = mount(Modal, {
			props: { show: true, notices: [{ text: 'This widget consumes wijkCode but no hierarchy on this dashboard publishes it' }, { text: 'Heads up', type: 'info' }, { text: 'Odd', type: 'shout' }] },
			global: { stubs: { NcNoteCard: NOTE_STUB } },
		})
		const notes = wrapper.findAll('.note')
		expect(notes.map((note) => note.attributes('data-type'))).toEqual(['warning', 'info', 'warning'])
		expect(notes[0].text()).toContain('wijkCode')
	})

	it('gives a dismissible notice a Dismiss button that names it, and the others none', async () => {
		const Modal = loadModal()
		const wrapper = mount(Modal, {
			props: { show: true, notices: [{ id: 'consumes-unknown-dimension:wijkCode', text: 'Off the bus', dismissible: true }, { text: 'Stays' }, { text: 'No id', dismissible: true }] },
			global: { stubs: { NcNoteCard: NOTE_STUB } },
		})
		const buttons = wrapper.findAll('[data-testid="cn-add-widget-modal-notice-dismiss"]')
		expect(buttons).toHaveLength(2)
		expect(buttons[0].attributes('aria-label')).toBe('Dismiss')
		await buttons[0].trigger('click')
		await buttons[1].trigger('click')
		expect(wrapper.emitted('dismiss-notice')).toEqual([['consumes-unknown-dimension:wijkCode'], [2]])
		expect(wrapper.findAll('.note')[1].find('[data-testid="cn-add-widget-modal-notice-dismiss"]').exists()).toBe(false)
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
