/**
 * Tests for the migrated `link` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders button + list modes, the form assembles the content
 * shape and validates, and the registry entry is present after importing the
 * renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnLinkButtonWidget from '@/components/CnLinkButtonWidget/CnLinkButtonWidget.vue'
import CnLinkButtonWidgetForm from '@/components/CnLinkButtonWidgetForm/CnLinkButtonWidgetForm.vue'

describe('CnLinkButtonWidget renderer', () => {
	it('renders a single button by default', () => {
		const wrapper = mount(CnLinkButtonWidget, {
			propsData: { content: { label: 'Go', url: 'https://example.com' } },
		})
		expect(wrapper.find('.cn-link-button-widget__button').exists()).toBe(true)
	})

	it('renders a list when in list mode with links', () => {
		const wrapper = mount(CnLinkButtonWidget, {
			propsData: {
				content: {
					displayMode: 'list',
					links: [{ label: 'A', url: 'https://a.test' }],
				},
			},
		})
		expect(wrapper.find('.cn-link-button-widget__list').exists()).toBe(true)
	})
})

describe('CnLinkButtonWidgetForm', () => {
	it('emits the assembled button shape', () => {
		const wrapper = mount(CnLinkButtonWidgetForm)
		wrapper.vm.updateField('label', 'Docs')
		wrapper.vm.updateField('url', 'https://docs.test')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({
			label: 'Docs',
			url: 'https://docs.test',
			displayMode: 'button',
			actionType: 'external',
			listOrientation: 'vertical',
			listItemGap: 'normal',
			links: [],
		})
	})

	it('validate requires label and url in button mode', () => {
		const wrapper = mount(CnLinkButtonWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})

	it('toggling to list mode seeds the first link from the single fields', () => {
		const wrapper = mount(CnLinkButtonWidgetForm)
		wrapper.vm.updateField('label', 'Seed')
		wrapper.vm.updateField('url', 'https://seed.test')
		wrapper.vm.updateDisplayMode('list')
		expect(wrapper.vm.links.length).toBe(1)
		expect(wrapper.vm.links[0].label).toBe('Seed')
	})
})

describe('link registry registration', () => {
	it('registers the link type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnLinkButtonWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('link')
		expect(entry).not.toBeNull()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent.displayMode).toBe('button')
	})
})
