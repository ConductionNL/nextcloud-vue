/**
 * Tests for the migrated `header` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders the banner config, the form assembles the content
 * shape and validates, and the registry entry is present after importing the
 * renderer's self-registering index.
 */

import { mount } from '@vue/test-utils'
import CnHeaderWidget from '@/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnHeaderWidgetForm from '@/components/CnHeaderWidgetForm/CnHeaderWidgetForm.vue'

describe('CnHeaderWidget renderer', () => {
	it('renders the title and subtitle', () => {
		const wrapper = mount(CnHeaderWidget, {
			propsData: { content: { title: 'Welcome', subtitle: 'Subtitle' } },
		})
		expect(wrapper.find('.cn-header-widget__title').text()).toBe('Welcome')
		expect(wrapper.find('.cn-header-widget__subtitle').text()).toBe('Subtitle')
	})

	it('renders a complete CTA as an anchor', () => {
		const wrapper = mount(CnHeaderWidget, {
			propsData: { content: { title: 'T', cta: { label: 'Go', url: 'https://x.test' } } },
		})
		const cta = wrapper.find('.cn-header-widget__cta')
		expect(cta.exists()).toBe(true)
		expect(cta.attributes('target')).toBe('_blank')
	})
})

describe('CnHeaderWidgetForm', () => {
	it('emits the assembled shape on a title edit', () => {
		const wrapper = mount(CnHeaderWidgetForm)
		wrapper.vm.updateField('title', 'Hello')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload.title).toBe('Hello')
		expect(payload).toMatchObject({ overlayMode: 'none', height: 'medium', cta: null })
	})

	it('validate requires a title', () => {
		const wrapper = mount(CnHeaderWidgetForm)
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})

	it('validate flags a half-filled CTA', () => {
		const wrapper = mount(CnHeaderWidgetForm)
		wrapper.vm.updateField('title', 'T')
		wrapper.vm.updateCta('label', 'Only label')
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('header registry registration', () => {
	it('registers the header type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnHeaderWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('header')
		expect(entry).not.toBeNull()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent.height).toBe('medium')
	})
})
