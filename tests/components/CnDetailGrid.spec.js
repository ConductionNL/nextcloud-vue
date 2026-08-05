/**
 * Tests for CnDetailGrid — focused on the `referenceType` integration
 * hook (AD-18): an item carrying `referenceType: '<integration-id>'`
 * renders the integration's single-entity widget for its value, with
 * a consumer-supplied `#item-<index>` slot still overriding it.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDetailGrid from '../../src/components/CnDetailGrid/CnDetailGrid.vue'

const { integrations } = require('../../src/integrations/registry.js')

const ContactEntityWidget = {
	name: 'ContactEntityWidget',
	props: ['surface', 'value', 'item', 'register', 'schema', 'objectId'],
	render() {
		return h('div', { class: 'contact-entity-widget' }, `${this.surface}|${this.value || ''}`)
	},
}
const RegistryTab = { name: 'RegistryTab', render() { return h('div') } }

describe('CnDetailGrid — referenceType hook', () => {
	afterEach(() => integrations.__resetForTests())

	it('renders the integration single-entity widget for a referenceType item', () => {
		integrations.register({ id: 'contacts', label: 'Contacts', tab: RegistryTab, widget: ContactEntityWidget })
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'Owner', value: 'c-42', referenceType: 'contacts' }] },
		})
		const w = wrapper.find('.contact-entity-widget')
		expect(w.exists()).toBe(true)
		expect(w.text()).toBe('single-entity|c-42')
		wrapper.destroy()
	})

	it('forwards referenceContext to the widget', () => {
		integrations.register({ id: 'contacts', label: 'Contacts', tab: RegistryTab, widget: ContactEntityWidget })
		const wrapper = mount(CnDetailGrid, {
			propsData: {
				items: [{ label: 'Owner', value: 'c-42', referenceType: 'contacts' }],
				referenceContext: { register: 'r1', schema: 's1', objectId: 'o1' },
			},
		})
		expect(wrapper.findComponent(ContactEntityWidget).props('register')).toBe('r1')
		wrapper.destroy()
	})

	it('renders the plain value when no integration is registered for the referenceType', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'Owner', value: 'c-42', referenceType: 'contacts' }] },
		})
		expect(wrapper.find('.contact-entity-widget').exists()).toBe(false)
		expect(wrapper.text()).toContain('c-42')
		wrapper.destroy()
	})

	it('renders the plain value for items without a referenceType', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'ID', value: '12345' }] },
		})
		expect(wrapper.text()).toContain('12345')
		wrapper.destroy()
	})

	it('a consumer #item-<index> slot overrides the referenceType widget', () => {
		integrations.register({ id: 'contacts', label: 'Contacts', tab: RegistryTab, widget: ContactEntityWidget })
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'Owner', value: 'c-42', referenceType: 'contacts' }] },
			scopedSlots: { 'item-0': '<span class="slot-override">mine</span>' },
		})
		expect(wrapper.find('.slot-override').exists()).toBe(true)
		expect(wrapper.find('.contact-entity-widget').exists()).toBe(false)
		wrapper.destroy()
	})
})
