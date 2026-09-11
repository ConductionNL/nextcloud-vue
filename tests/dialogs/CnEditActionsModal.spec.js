/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditActionsModal — the empty-state hint, the icon picker, and the
 * add/remove/reorder edits. @nextcloud/vue is auto-stubbed via
 * tests/__mocks__/nextcloud-vue.js.
 */
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnEditActionsModal from '../../src/dialogs/CnEditActionsModal.vue'

const CnIconBrowserStub = {
	name: 'CnIconBrowser',
	props: ['value', 'label', 'clearable'],
	emits: ['input'],
	template: '<div class="icon-browser-stub" />',
}

function mountModal(working, pageId = '') {
	return mount(CnEditActionsModal, {
		propsData: { working, pageId },
		stubs: { CnIconBrowser: CnIconBrowserStub },
	})
}

const pageWith = (actions) => reactive({ pages: [{ id: 'dogs', config: { actions } }] })

describe('CnEditActionsModal', () => {
	it('hints that an action must be added when the page has none', () => {
		const wrapper = mountModal(pageWith([]))
		expect(wrapper.find('.cn-edit-actions__hint').exists()).toBe(true)
		expect(wrapper.find('.cn-edit-actions__hint').text()).toContain('Add action')
	})

	it('drops the hint once an action exists', async () => {
		const wrapper = mountModal(pageWith([]))
		wrapper.vm.add()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-edit-actions__hint').exists()).toBe(false)
		expect(wrapper.findAll('.cn-edit-actions__row')).toHaveLength(1)
	})

	it('edits the icon through the icon browser, not a text field', async () => {
		const working = pageWith([{ id: 'a1', label: 'Open', icon: 'Plus', type: 'open-page', target: 'dogs' }])
		const wrapper = mountModal(working)
		const browser = wrapper.findComponent(CnIconBrowserStub)
		expect(browser.props('value')).toBe('Plus')

		browser.vm.$emit('input', 'Trophy')
		expect(working.pages[0].config.actions[0].icon).toBe('Trophy')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(CnIconBrowserStub).props('value')).toBe('Trophy')
	})

	it('clearing the icon stores an empty string, not null', () => {
		const working = pageWith([{ id: 'a1', label: 'Open', icon: 'Plus', type: 'open-page', target: '' }])
		const wrapper = mountModal(working)
		wrapper.findComponent(CnIconBrowserStub).vm.$emit('input', null)
		expect(working.pages[0].config.actions[0].icon).toBe('')
	})

	it('an icon-less action passes null to the browser rather than an empty string', () => {
		const wrapper = mountModal(pageWith([{ id: 'a1', label: 'Open', icon: '', type: 'open-page', target: '' }]))
		expect(wrapper.findComponent(CnIconBrowserStub).props('value')).toBe(null)
	})

	it('remove and move edit the working page in place', () => {
		const working = pageWith([
			{ id: 'a1', label: 'One', icon: '', type: 'open-page', target: '' },
			{ id: 'a2', label: 'Two', icon: '', type: 'navigate', target: '' },
			{ id: 'a3', label: 'Three', icon: '', type: 'handler', target: '' },
		])
		const wrapper = mountModal(working)
		wrapper.vm.move(2, -1)
		expect(working.pages[0].config.actions.map((a) => a.id)).toEqual(['a1', 'a3', 'a2'])
		wrapper.vm.remove(0)
		expect(working.pages[0].config.actions.map((a) => a.id)).toEqual(['a3', 'a2'])
	})

	it('targetLabel names what each action type targets', () => {
		const wrapper = mountModal(pageWith([]))
		expect(wrapper.vm.targetLabel({ type: 'open-page' })).toBe('Target page id')
		expect(wrapper.vm.targetLabel({ type: 'navigate' })).toBe('URL or route')
		expect(wrapper.vm.targetLabel({ type: 'open-modal' })).toBe('Modal key')
		expect(wrapper.vm.targetLabel({ type: 'handler' })).toBe('Handler name')
	})
})
