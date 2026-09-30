/**
 * Tests for the migrated `menu` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders its config (empty-state + dropdown items), the form
 * edits the items shape and validates the 3-level depth cap, and the registry
 * entry is present after importing the renderer index.
 */

import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import CnMenuWidget from '@/components/CnMenuWidget/CnMenuWidget.vue'
import CnMenuWidgetForm from '@/components/CnMenuWidgetForm/CnMenuWidgetForm.vue'

/**
 * A single top-level "Docs" item with one "Guide" child, for tests that
 * exercise dropdown/megamenu open-close state.
 *
 * @return {object[]} the items array.
 */
function itemsWithOneChild() {
	return [
		{
			label: 'Docs',
			url: '',
			icon: '',
			children: [
				{ label: 'Guide', url: '/guide', icon: '', children: [] },
			],
		},
	]
}

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

	it('closes an open dropdown when clicking outside the widget', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: { style: 'dropdown', items: itemsWithOneChild() },
			},
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)
		expect(wrapper.find('.cn-menu-widget__dropdown').exists()).toBe(true)

		document.body.click()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.dropOpenIndex).toBe(null)
		expect(wrapper.find('.cn-menu-widget__dropdown').exists()).toBe(false)

		wrapper.unmount()
	})

	it('does not immediately re-close a dropdown opened by the same click bubbling to document', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: { style: 'dropdown', items: itemsWithOneChild() },
			},
		})
		// A real click bubbles to document, exercising the outside-click
		// listener alongside the button's own toggle handler for the SAME
		// event — the widget must stay open (contains() short-circuits it).
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)

		wrapper.unmount()
	})

	it('closes an open megamenu panel when clicking outside the widget', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: { style: 'megamenu', items: itemsWithOneChild() },
			},
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.megaOpenIndex).toBe(0)

		document.body.click()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.megaOpenIndex).toBe(null)

		wrapper.unmount()
	})

	it('stays open when clicking non-interactive space inside its own dropdown panel', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: { style: 'dropdown', items: itemsWithOneChild() },
			},
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)

		// The click bubbles to document like any real click would, but since
		// the target is still inside the OPEN item's own <li> (button + its
		// panel), the outside-click listener must not close it.
		await wrapper.find('.cn-menu-widget__dropdown').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)

		wrapper.unmount()
	})

	it('closes an open dropdown when clicking empty space elsewhere in the widget (not the open item)', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: { style: 'dropdown', items: itemsWithOneChild() },
			},
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)

		// The widget's own root — inside the widget as a whole, but outside
		// the open item's button + panel.
		await wrapper.find('.cn-menu-widget').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(null)

		wrapper.unmount()
	})

	it('closes an open megamenu panel when clicking empty space elsewhere in the widget', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: { style: 'megamenu', items: itemsWithOneChild() },
			},
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.megaOpenIndex).toBe(0)

		await wrapper.find('.cn-menu-widget').trigger('click')
		expect(wrapper.vm.megaOpenIndex).toBe(null)

		wrapper.unmount()
	})

	it('closes a dropdown when clicking a DIFFERENT top-level item\'s empty bar space, not just its button', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: {
					style: 'dropdown',
					items: [
						...itemsWithOneChild(),
						{ label: 'Other', url: '/other', icon: '', children: [] },
					],
				},
			},
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)

		// The shared <ul class="cn-menu-widget__bar"> — inside the widget, and
		// even inside the bar itself, but outside the specific open <li>.
		await wrapper.find('.cn-menu-widget__bar').trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(null)

		wrapper.unmount()
	})

	it('switches to a different top-level dropdown when its button is clicked while another is open', async () => {
		const wrapper = mount(CnMenuWidget, {
			attachTo: document.body,
			propsData: {
				content: {
					style: 'dropdown',
					items: [
						...itemsWithOneChild(),
						{
							label: 'Other',
							url: '',
							icon: '',
							children: [
								{ label: 'Leaf', url: '/leaf', icon: '', children: [] },
							],
						},
					],
				},
			},
		})
		const buttons = wrapper.findAll('.cn-menu-widget__bar-button')
		await buttons.at(0).trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(0)

		// Clicking the OTHER item's own button must open it (not just close
		// everything) — this is the exact interaction the containment check
		// (button + panel, not the whole widget) must not break.
		await buttons.at(1).trigger('click')
		expect(wrapper.vm.dropOpenIndex).toBe(1)

		wrapper.unmount()
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

	it('hides each item row\'s icon picker when showIcons is off', () => {
		const wrapper = mount(CnMenuWidgetForm, {
			propsData: {
				value: {
					items: [{ label: 'Home', url: '/', icon: '', children: [] }],
					showIcons: false,
				},
			},
		})
		expect(wrapper.find('.cn-icon-browser').exists()).toBe(false)
	})

	it('shows each item row\'s icon picker when showIcons is on', () => {
		const wrapper = mount(CnMenuWidgetForm, {
			propsData: {
				value: {
					items: [{ label: 'Home', url: '/', icon: '', children: [] }],
					showIcons: true,
				},
			},
		})
		expect(wrapper.find('.cn-icon-browser').exists()).toBe(true)
	})

	it('validate flags nesting deeper than 3 levels', () => {
		const wrapper = mount(CnMenuWidgetForm, {
			propsData: {
				value: {
					items: [
						{
							label: 'a',
							url: '',
							icon: '',
							children: [
								{
									label: 'b',
									url: '',
									icon: '',
									children: [
										{
											label: 'c',
											url: '',
											icon: '',
											children: [
												{ label: 'd', url: '', icon: '', children: [] },
											],
										},
									],
								},
							],
						},
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

describe('CnMenuWidget items with a URL are real links', () => {
	it('renders a top-level leaf as an anchor; external URLs open in a new tab', () => {
		const wrapper = mount(CnMenuWidget, {
			propsData: {
				content: {
					style: 'dropdown',
					items: [
						{ label: 'Home', url: '/home', icon: '', children: [] },
						{ label: 'Ext', url: 'https://example.test', icon: '', children: [] },
					],
				},
			},
		})
		const [home, ext] = wrapper.findAll('.cn-menu-widget__bar-button')
		expect(home.element.tagName).toBe('A')
		expect(home.attributes('href')).toBe('/home')
		expect(home.attributes('target')).toBeUndefined()
		expect(ext.attributes('href')).toBe('https://example.test')
		expect(ext.attributes('target')).toBe('_blank')
		expect(ext.attributes('rel')).toBe('noopener noreferrer')
	})

	it('gives an internal link the router base, as a Nextcloud app mounts under one', async () => {
		const router = createRouter({
			history: createWebHistory('/index.php/apps/pipelinq'),
			routes: [{ path: '/:rest(.*)*', component: { render: () => null } }],
		})
		const wrapper = mount(CnMenuWidget, {
			propsData: {
				content: {
					style: 'tree',
					items: [
						{ label: 'Clients', url: '/clients', icon: '', children: [] },
						{ label: 'Tree', url: '', icon: '', children: [{ label: 'Leads', url: '/leads?open=1', icon: '', children: [] }] },
					],
				},
			},
			global: { plugins: [router] },
		})
		const links = wrapper.findAll('a')
		const clients = links.find((a) => a.text().includes('Clients'))
		expect(clients.attributes('href')).toBe('/index.php/apps/pipelinq/clients')
		expect(wrapper.vm.linkAttrs({ url: '/leads?open=1' }).href).toBe('/index.php/apps/pipelinq/leads?open=1')
	})

	it('never renders or follows a javascript: URL', () => {
		const assign = jest.fn()
		const wrapper = mount(CnMenuWidget, {
			propsData: { content: { style: 'dropdown', items: [{ label: 'Bad', url: 'javascript:alert(1)', icon: '', children: [] }] } },
			global: { mocks: { $router: { push: assign, resolve: jest.fn(() => ({ href: '/x' })) } } },
		})
		expect(wrapper.find('.cn-menu-widget__bar-button').attributes('href')).toBe('#')
		wrapper.vm.onNavigate({ url: 'javascript:alert(1)' })
		expect(assign).not.toHaveBeenCalled()
	})

	it('keeps a top-level item with children a toggle button', async () => {
		const wrapper = mount(CnMenuWidget, {
			propsData: { content: { style: 'dropdown', items: itemsWithOneChild() } },
		})
		const top = wrapper.find('.cn-menu-widget__bar-button')
		expect(top.element.tagName).toBe('BUTTON')
		await top.trigger('click')
		const child = wrapper.find('.cn-menu-widget__dropdown-item')
		expect(child.element.tagName).toBe('A')
		expect(child.attributes('href')).toBe('/guide')
	})

	it('routes a plain click on an internal link and closes the menu', async () => {
		const push = jest.fn().mockResolvedValue()
		const wrapper = mount(CnMenuWidget, {
			propsData: { content: { style: 'dropdown', items: itemsWithOneChild() } },
			global: { mocks: { $router: { push } } },
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		await wrapper.find('.cn-menu-widget__dropdown-item').trigger('click')
		expect(push).toHaveBeenCalledWith('/guide')
		expect(wrapper.vm.dropOpenIndex).toBe(null)
	})

	it('leaves a ctrl-click to the browser', async () => {
		const push = jest.fn().mockResolvedValue()
		const wrapper = mount(CnMenuWidget, {
			propsData: { content: { style: 'dropdown', items: [{ label: 'Home', url: '/home', icon: '', children: [] }] } },
			global: { mocks: { $router: { push } } },
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click', { ctrlKey: true })
		expect(push).not.toHaveBeenCalled()
	})

	it('does not window.open an external link; the anchor opens it', async () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => {})
		const wrapper = mount(CnMenuWidget, {
			propsData: { content: { style: 'megamenu', items: [{ label: 'Ext', url: 'https://example.test', icon: '', children: [] }] } },
		})
		await wrapper.find('.cn-menu-widget__bar-button').trigger('click')
		expect(open).not.toHaveBeenCalled()
		open.mockRestore()
	})

	it('renders a tree node with a URL as a link and one without as a toggle', () => {
		const wrapper = mount(CnMenuWidget, {
			propsData: {
				content: {
					style: 'tree',
					items: [
						{ label: 'Docs', url: '', icon: '', children: [{ label: 'Guide', url: '/guide', icon: '', children: [] }] },
						{ label: 'Home', url: '/home', icon: '', children: [] },
					],
				},
			},
		})
		const labels = wrapper.findAll('.cn-menu-tree-node__label-button')
		expect(labels.at(0).element.tagName).toBe('BUTTON')
		expect(labels.at(1).element.tagName).toBe('A')
		expect(labels.at(1).attributes('href')).toBe('/home')
	})
})
