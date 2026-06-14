/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnObjectMetadataModal — a small NcDialog wrapping
 * CnObjectMetadataWidget (header suppressed) that surfaces an object's
 * @self metadata on demand.
 */

import { mount } from '@vue/test-utils'
import CnObjectMetadataModal from '../../src/components/CnObjectMetadataModal/CnObjectMetadataModal.vue'

const stubs = {
	NcDialog: {
		props: ['open', 'name', 'size'],
		template: '<div v-if="open" class="nc-dialog-stub"><slot /></div>',
	},
	CnObjectMetadataWidget: {
		props: ['title', 'objectData', 'include', 'exclude'],
		template: '<div class="meta-widget-stub" :data-title="title" />',
	},
}

const mountModal = (props = {}) => mount(CnObjectMetadataModal, {
	propsData: { objectData: { id: '42', '@self': { schema: 'lead' } }, ...props },
	stubs,
})

describe('CnObjectMetadataModal', () => {
	it('renders the metadata widget with the card header suppressed', () => {
		const wrapper = mountModal()
		const meta = wrapper.find('.meta-widget-stub')
		expect(meta.exists()).toBe(true)
		// title="" suppresses CnObjectMetadataWidget's own card header.
		expect(meta.attributes('data-title')).toBe('')
	})

	it('is open by default and hidden when :open is false', () => {
		expect(mountModal().find('.nc-dialog-stub').exists()).toBe(true)
		expect(mountModal({ open: false }).find('.nc-dialog-stub').exists()).toBe(false)
	})

	it('emits update:open and close when dismissed', () => {
		const wrapper = mountModal()
		wrapper.vm.onUpdateOpen(false)
		expect(wrapper.emitted('update:open')[0]).toEqual([false])
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('does not emit close when opening', () => {
		const wrapper = mountModal({ open: false })
		wrapper.vm.onUpdateOpen(true)
		expect(wrapper.emitted('update:open')[0]).toEqual([true])
		expect(wrapper.emitted('close')).toBeFalsy()
	})
})
