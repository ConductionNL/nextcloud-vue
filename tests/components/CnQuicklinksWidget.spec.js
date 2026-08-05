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

	it('sets a title tooltip with the label when labels are disabled', () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: {
				content: {
					links: [{ label: 'Docs', url: 'https://docs.test' }],
					showLabels: false,
				},
			},
		})
		expect(wrapper.find('.cn-quicklinks-widget__link').attributes('title')).toBe('Docs')
	})

	it('omits the title tooltip in the below label position when the label fits (not truncated)', async () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: {
				content: {
					links: [{ label: 'Docs', url: 'https://docs.test' }],
					showLabels: true,
					labelPosition: 'below',
				},
			},
		})
		// jsdom reports scrollWidth === clientWidth === 0 by default (no real
		// layout), i.e. never truncated — the tooltip must not appear here.
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-quicklinks-widget__link').attributes('title')).toBeUndefined()
	})

	it('sets a title tooltip once the below-position label is measured as truncated', async () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: {
				content: {
					links: [{ label: 'A Very Long Quicklink Label That Overflows', url: 'https://docs.test' }],
					showLabels: true,
					labelPosition: 'below',
				},
			},
		})
		const label = wrapper.find('.cn-quicklinks-widget__label').element
		Object.defineProperty(label, 'scrollWidth', { configurable: true, value: 200 })
		Object.defineProperty(label, 'clientWidth', { configurable: true, value: 80 })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-quicklinks-widget__link').attributes('title'))
			.toBe('A Very Long Quicklink Label That Overflows')
	})

	it('omits the title tooltip in the overlay label position', () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: {
				content: {
					links: [{ label: 'Docs', url: 'https://docs.test' }],
					showLabels: true,
					labelPosition: 'overlay',
				},
			},
		})
		expect(wrapper.find('.cn-quicklinks-widget__link').attributes('title')).toBeUndefined()
	})

	it('omits the title tooltip when the label is empty', () => {
		const wrapper = mount(CnQuicklinksWidget, {
			propsData: {
				content: {
					links: [{ label: '', url: 'https://docs.test' }],
					showLabels: false,
				},
			},
		})
		expect(wrapper.find('.cn-quicklinks-widget__link').attributes('title')).toBeUndefined()
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
