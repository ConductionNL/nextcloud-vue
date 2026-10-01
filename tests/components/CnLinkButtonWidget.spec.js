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

	it('renders an external button as a new-tab link and does not window.open', async () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => {})
		const wrapper = mount(CnLinkButtonWidget, {
			propsData: { content: { label: 'Go', url: 'https://example.com' } },
		})
		const el = wrapper.find('.cn-link-button-widget__button')
		expect(el.element.tagName).toBe('A')
		expect(el.attributes('href')).toBe('https://example.com')
		expect(el.attributes('target')).toBe('_blank')
		expect(el.attributes('rel')).toBe('noopener noreferrer')
		await el.trigger('click')
		expect(open).not.toHaveBeenCalled()
		open.mockRestore()
	})

	it('neutralises a javascript: URL', () => {
		const wrapper = mount(CnLinkButtonWidget, {
			propsData: { content: { label: 'Go', url: 'javascript:alert(1)' } },
		})
		expect(wrapper.find('.cn-link-button-widget__button').attributes('href')).toBe('#')
	})

	it('renders a button, not a link, in edit mode', () => {
		const wrapper = mount(CnLinkButtonWidget, {
			propsData: { content: { label: 'Go', url: 'https://example.com' }, isAdmin: true, canEdit: true },
		})
		const el = wrapper.find('.cn-link-button-widget__button')
		expect(el.element.tagName).toBe('BUTTON')
		expect(el.attributes('href')).toBeUndefined()
	})

	it('keeps internal and createFile entries as buttons that emit', async () => {
		const wrapper = mount(CnLinkButtonWidget, {
			propsData: {
				content: {
					displayMode: 'list',
					links: [
						{ label: 'Ext', url: 'https://a.test' },
						{ label: 'Int', url: 'my-action', actionType: 'internal' },
						{ label: 'New', url: '', value: 'docx', actionType: 'createFile' },
					],
				},
			},
		})
		const items = wrapper.findAll('.cn-link-button-widget__list-item')
		expect(items.at(0).element.tagName).toBe('A')
		expect(items.at(0).attributes('href')).toBe('https://a.test')
		expect(items.at(1).element.tagName).toBe('BUTTON')
		expect(items.at(2).element.tagName).toBe('BUTTON')
		await items.at(1).trigger('click')
		await items.at(2).trigger('click')
		expect(wrapper.emitted('internal-action')[0]).toEqual(['my-action'])
		expect(wrapper.emitted('create-file')[0]).toEqual(['docx'])
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
