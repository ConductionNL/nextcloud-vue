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
		wrapper.unmount()
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
		wrapper.unmount()
	})

	it('renders the plain value when no integration is registered for the referenceType', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'Owner', value: 'c-42', referenceType: 'contacts' }] },
		})
		expect(wrapper.find('.contact-entity-widget').exists()).toBe(false)
		expect(wrapper.text()).toContain('c-42')
		wrapper.unmount()
	})

	it('renders the plain value for items without a referenceType', () => {
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'ID', value: '12345' }] },
		})
		expect(wrapper.text()).toContain('12345')
		wrapper.unmount()
	})

	it('a consumer #item-<index> slot overrides the referenceType widget', () => {
		integrations.register({ id: 'contacts', label: 'Contacts', tab: RegistryTab, widget: ContactEntityWidget })
		const wrapper = mount(CnDetailGrid, {
			propsData: { items: [{ label: 'Owner', value: 'c-42', referenceType: 'contacts' }] },
			scopedSlots: { 'item-0': '<span class="slot-override">mine</span>' },
		})
		expect(wrapper.find('.slot-override').exists()).toBe(true)
		expect(wrapper.find('.contact-entity-widget').exists()).toBe(false)
		wrapper.unmount()
	})
})

describe('CnDetailGrid — an item that carries a link', () => {
	/**
	 * Mount one item and read back its rendered link, if it has one.
	 *
	 * @param {object} item The single item to render.
	 * @return {object} The wrapper and the anchor it rendered.
	 */
	function linkFor(item) {
		const wrapper = mount(CnDetailGrid, { propsData: { items: [item] } })
		return { wrapper, link: wrapper.find('.cn-detail-grid__link') }
	}

	it('renders an item with an href as a link on its own value', () => {
		const { wrapper, link } = linkFor({ label: 'Folder', value: '4213', href: '/apps/files/?fileid=4213' })
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('/apps/files/?fileid=4213')
		expect(link.text()).toBe('4213')
		wrapper.unmount()
	})

	it('renders an item with no href as plain text', () => {
		const { wrapper, link } = linkFor({ label: 'ID', value: '12345' })
		expect(link.exists()).toBe(false)
		expect(wrapper.text()).toContain('12345')
		wrapper.unmount()
	})

	it('refuses a javascript: href rather than rendering a dead link', () => {
		// safeHref answers '#' for an unsafe scheme. Rendering that '#' would
		// give the reader something that looks clickable and is not, so the
		// item falls back to plain text and keeps its value visible.
		const { wrapper, link } = linkFor({ label: 'Folder', value: 'payload', href: 'javascript:alert(1)' })
		expect(link.exists()).toBe(false)
		expect(wrapper.text()).toContain('payload')
		wrapper.unmount()
	})

	it('refuses a protocol-relative href, which safeHref treats as unsafe', () => {
		const { wrapper, link } = linkFor({ label: 'Folder', value: 'elsewhere', href: '//attacker.example/x' })
		expect(link.exists()).toBe(false)
		expect(wrapper.text()).toContain('elsewhere')
		wrapper.unmount()
	})

	it('shows a dash for a linked item that carries no value', () => {
		const { wrapper, link } = linkFor({ label: 'Folder', value: null, href: '/apps/files/' })
		expect(link.exists()).toBe(true)
		expect(link.text()).toBe('-')
		wrapper.unmount()
	})
})
