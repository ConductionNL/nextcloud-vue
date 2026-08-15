/**
 * Tests for the migrated `links` dashboard widget (cn-widget-library Wave 1).
 *
 * Covers: renderer renders its config (empty-state, visible-section filtering,
 * column CSS var), the form edits the sections shape and validates URLs, and
 * the registry entry is present after importing the renderer index.
 */

import { mount } from '@vue/test-utils'
import CnLinksWidget from '@/components/CnLinksWidget/CnLinksWidget.vue'
import CnLinksWidgetForm from '@/components/CnLinksWidgetForm/CnLinksWidgetForm.vue'

describe('CnLinksWidget renderer', () => {
	it('renders the empty state with no sections', () => {
		const wrapper = mount(CnLinksWidget, { propsData: { content: { sections: [] } } })
		expect(wrapper.find('.cn-links-widget__empty').exists()).toBe(true)
	})

	it('renders configured sections and exposes the column count', () => {
		const wrapper = mount(CnLinksWidget, {
			propsData: {
				content: {
					columns: 4,
					sections: [
						{ title: 'Tools', links: [{ label: 'Files', url: '/apps/files', icon: 'Star' }] },
						{ title: 'Empty', links: [] },
					],
				},
			},
		})
		// Empty sections are filtered out at render time.
		expect(wrapper.findAll('.cn-links-widget__section').length).toBe(1)
		expect(wrapper.find('.cn-links-widget__section-title').text()).toBe('Tools')
		expect(wrapper.vm.columns).toBe(4)
	})
})

describe('CnLinksWidgetForm', () => {
	it('adds a section and emits the assembled shape', () => {
		const wrapper = mount(CnLinksWidgetForm)
		wrapper.vm.addSection()
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(Array.isArray(payload.sections)).toBe(true)
		expect(payload.sections.length).toBe(1)
		expect(payload).toMatchObject({
			columns: 3,
			linkLayout: 'card',
			iconSize: 'medium',
			openInNewTab: true,
			showSectionTitles: true,
			showLinkDescriptions: true,
		})
	})

	it('validate rejects an empty link URL', () => {
		const wrapper = mount(CnLinksWidgetForm)
		wrapper.vm.addSection()
		// The new section starts with one empty link → invalid.
		expect(wrapper.vm.validate().length).toBeGreaterThan(0)
	})
})

describe('links registry registration', () => {
	it('registers the links type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnLinksWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('links')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({
			sections: [],
			columns: 3,
			linkLayout: 'card',
			iconSize: 'medium',
			openInNewTab: true,
			showSectionTitles: true,
			showLinkDescriptions: true,
		})
		expect(mod.listWidgetTypes()).toContain('links')
	})
})
