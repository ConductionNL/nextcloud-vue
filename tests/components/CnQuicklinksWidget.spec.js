/**
 * Tests for the migrated `quicklinks` dashboard widget (cn-widget-library
 * Wave 1).
 *
 * Covers: renderer renders the empty state + the link grid, the form assembles
 * the content shape and validates, and the registry entry is present after
 * importing the renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnQuicklinksWidget from '@/components/CnQuicklinksWidget/CnQuicklinksWidget.vue'
import CnQuicklinksWidgetForm from '@/components/CnQuicklinksWidgetForm/CnQuicklinksWidgetForm.vue'

describe('CnQuicklinksWidget renderer', () => {
	it('renders the empty state with no links', () => {
		const wrapper = mount(CnQuicklinksWidget, { propsData: { content: { links: [] } } })
		expect(wrapper.find('.cn-quicklinks-widget__empty').exists()).toBe(true)
	})

	it('renders a link tile when links are present', () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: { content: { links: [{ label: 'Docs', url: 'https://docs.test' }] } },
		})
		expect(wrapper.find('.cn-quicklinks-widget__link').exists()).toBe(true)
	})
})

describe('CnQuicklinksWidgetForm', () => {
	it('emits the assembled shape with a sanitised link', () => {
		const wrapper = mount(CnQuicklinksWidgetForm)
		wrapper.vm.addLink()
		wrapper.vm.links[0].url = 'https://docs.test'
		wrapper.vm.onContentChange()
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload.links[0].url).toBe('https://docs.test')
		expect(payload).toMatchObject({
			iconSize: 'medium',
			iconShape: 'rounded',
			columns: 'auto',
			hoverEffect: 'lift',
		})
	})

	it('validate rejects an empty link URL', () => {
		const wrapper = mount(CnQuicklinksWidgetForm)
		wrapper.vm.addLink()
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('quicklinks registry registration', () => {
	it('registers the quicklinks type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnQuicklinksWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('quicklinks')
		expect(entry).not.toBeNull()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent.iconSize).toBe('medium')
	})
})
