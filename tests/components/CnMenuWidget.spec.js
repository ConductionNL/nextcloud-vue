/**
 * Tests for the migrated `menu` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders its config (empty-state + dropdown items), the form
 * edits the items shape and validates the 3-level depth cap, and the registry
 * entry is present after importing the renderer index.
 */

import { mount } from '@vue/test-utils'
import CnMenuWidget from '@/components/CnMenuWidget/CnMenuWidget.vue'
import CnMenuWidgetForm from '@/components/CnMenuWidgetForm/CnMenuWidgetForm.vue'

describe('CnMenuWidget renderer', () => {
	it('renders the empty state with no items', () => {
		const wrapper = mount(CnMenuWidget, { propsData: { content: { items: [] } } })
		expect(wrapper.find('.cn-menu-widget__empty').exists()).toBe(true)
	})

	it('renders dropdown top-level items from config', () => {
		const wrapper = mount(CnMenuWidget, {
			propsData: {
				content: {
					style: 'dropdown',
					items: [
						{ label: 'Home', url: '/', icon: '', children: [] },
						{ label: 'Docs', url: '/docs', icon: '', children: [] },
					],
				},
			},
		})
		const buttons = wrapper.findAll('.cn-menu-widget__bar-button')
		expect(buttons.length).toBe(2)
		expect(buttons.at(0).text()).toContain('Home')
	})
})

describe('CnMenuWidgetForm', () => {
	it('adds a top-level item and emits the assembled shape', () => {
		const wrapper = mount(CnMenuWidgetForm)
		wrapper.vm.onAddTop()
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload.items.length).toBe(1)
		expect(payload.items[0]).toMatchObject({ label: '', url: '', icon: '', children: [] })
		expect(payload).toMatchObject({
			style: 'dropdown',
			orientation: 'horizontal',
			showIcons: true,
			expandedByDefault: false,
			activeItemHighlight: 'underline',
		})
	})

	it('validate flags nesting deeper than 3 levels', () => {
		const wrapper = mount(CnMenuWidgetForm, {
			propsData: {
				value: {
					items: [
						{ label: 'a', url: '', icon: '', children: [
							{ label: 'b', url: '', icon: '', children: [
								{ label: 'c', url: '', icon: '', children: [
									{ label: 'd', url: '', icon: '', children: [] },
								] },
							] },
						] },
					],
				},
			},
		})
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('menu registry registration', () => {
	it('registers the menu type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnMenuWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('menu')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({
			items: [],
			style: 'dropdown',
			orientation: 'horizontal',
			showIcons: true,
			expandedByDefault: false,
			activeItemHighlight: 'underline',
		})
		expect(mod.listWidgetTypes()).toContain('menu')
	})
})
